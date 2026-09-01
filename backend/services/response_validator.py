# backend/services/response_validator.py
import json
import re
from typing import Optional, Dict, Any, Tuple
from models.schemas import AIAnalysisOutput

class ResponseValidator:
    """Parses raw LLM text, repairs malformed JSON, and extracts structured fields even from conversational or partial output."""

    ALLOWED_CATEGORIES = {
        "flaky_test",
        "test_failure",
        "dependency_issue",
        "syntax_error",
        "configuration_error",
        "infrastructure_timeout",
        "unknown"
    }

    def __init__(self, strict: bool = True):
        self.strict = strict

    def _normalize_category(self, category_str: str) -> str:
        """Normalizes and maps arbitrary category strings to canonical categories."""
        cat = str(category_str or "").strip().lower()
        if cat in self.ALLOWED_CATEGORIES:
            return cat
        if "dep" in cat or "package" in cat or "module" in cat or "npm" in cat or "pip" in cat:
            return "dependency_issue"
        if "syntax" in cat or "compile" in cat or "type" in cat or "ts" in cat or "unexpected" in cat or "parse" in cat or "esbuild" in cat:
            return "syntax_error"
        if "test" in cat or "assert" in cat or "unit" in cat or "jest" in cat or "vitest" in cat or "pytest" in cat:
            return "test_failure"
        if "timeout" in cat or "time_out" in cat or "killed" in cat:
            return "infrastructure_timeout"
        if "config" in cat or "yaml" in cat or "workflow" in cat or "permission" in cat or "scope" in cat:
            return "configuration_error"
        if "flake" in cat or "flaky" in cat:
            return "flaky_test"
        return "unknown"

    def _try_regex_extraction(self, text: str) -> Optional[AIAnalysisOutput]:
        """Extracts fields using robust regex patterns if standard JSON parsing fails."""
        if not text:
            return None

        # Category search
        cat_match = re.search(r'["\']?failure_category["\']?\s*:\s*["\']?([a-zA-Z0-9_\-]+)["\']?', text, re.IGNORECASE)
        category = self._normalize_category(cat_match.group(1)) if cat_match else "unknown"

        # If category couldn't be found by key, inspect text content for error signals
        if category == "unknown":
            text_lower = text.lower()
            if any(k in text_lower for k in ["syntax", "unexpected", "ts1", "ts2", "compilation", "compile error", "transform failed"]):
                category = "syntax_error"
            elif any(k in text_lower for k in ["assertion", "test failed", "failing test"]):
                category = "test_failure"
            elif any(k in text_lower for k in ["missing module", "package not found", "cannot find module"]):
                category = "dependency_issue"

        # Confidence search
        conf_match = re.search(r'["\']?confidence_score["\']?\s*:\s*([0-9.]+)', text)
        confidence = 0.95
        if conf_match:
            try:
                confidence = float(conf_match.group(1))
            except Exception:
                confidence = 0.95

        # Root cause search
        root_cause = ""
        rc_match = re.search(r'["\']?root_cause["\']?\s*:\s*["\']((?:[^"\\\n]|\\.)+)["\']', text)
        if rc_match:
            root_cause = rc_match.group(1).encode('utf-8', 'ignore').decode('unicode_escape', 'ignore')
        else:
            # Fallback: look for block between root_cause and suggested_fix
            rc_block = re.search(r'root_cause["\']?\s*:\s*["\']?([\s\S]*?)(?:["\']?\s*,\s*["\']?suggested_fix|\Z)', text, re.IGNORECASE)
            if rc_block:
                root_cause = rc_block.group(1).strip().strip('"').strip("'")

        # Suggested fix search
        suggested_fix = ""
        fix_match = re.search(r'["\']?suggested_fix["\']?\s*:\s*["\']((?:[^"\\]|\\.)+)["\']', text)
        if fix_match:
            suggested_fix = fix_match.group(1).encode('utf-8', 'ignore').decode('unicode_escape', 'ignore')
        else:
            fix_block = re.search(r'suggested_fix["\']?\s*:\s*["\']?([\s\S]*?)(?:\Z|\}\s*$)', text, re.IGNORECASE)
            if fix_block:
                suggested_fix = fix_block.group(1).strip().rstrip('}').strip().strip('"').strip("'")

        if root_cause or suggested_fix or category != "unknown":
            return AIAnalysisOutput(
                failure_category=category,
                confidence_score=max(0.0, min(1.0, confidence)),
                root_cause=root_cause or "Automated CI failure diagnosis.",
                suggested_fix=suggested_fix or "Inspect the failing code and correct the error."
            )
        return None

    def validate(self, raw_text: str) -> Tuple[bool, Optional[AIAnalysisOutput], Optional[str]]:
        """
        Extracts and validates JSON from raw LLM output with multiple fallbacks.
        Returns (is_valid, parsed_dto, error_message).
        """
        if not raw_text or not raw_text.strip():
            return False, None, "Empty response from LLM"

        cleaned = raw_text.strip()

        # 1. Strip markdown code fences if wrapped in ```json ... ``` or ``` ... ```
        json_match = re.search(r'```(?:json)?\s*([\s\S]*?)\s*```', cleaned)
        if json_match:
            cleaned = json_match.group(1).strip()

        # 2. Extract outermost JSON object { ... }
        start = cleaned.find("{")
        end = cleaned.rfind("}")
        if start != -1 and end != -1 and end > start:
            cleaned = cleaned[start:end+1]

        # 3. Attempt direct JSON parsing
        try:
            data = json.loads(cleaned)
            category = self._normalize_category(data.get("failure_category", "unknown"))
            confidence = float(data.get("confidence_score", 0.95))
            root_cause = str(data.get("root_cause", "")).strip()
            suggested_fix = str(data.get("suggested_fix", "")).strip()

            if root_cause or suggested_fix:
                dto = AIAnalysisOutput(
                    failure_category=category,
                    confidence_score=max(0.0, min(1.0, confidence)),
                    root_cause=root_cause or "Build failure detected during CI pipeline execution.",
                    suggested_fix=suggested_fix or "Review code changes and fix the detected issue."
                )
                return True, dto, None
        except Exception:
            pass

        # 4. Attempt parsing after common JSON syntax repairs (trailing commas, escaped quotes)
        try:
            repaired = re.sub(r',\s*([}\]])', r'\1', cleaned)
            repaired = re.sub(r'[\r\n\t]', ' ', repaired)
            data = json.loads(repaired)
            category = self._normalize_category(data.get("failure_category", "unknown"))
            confidence = float(data.get("confidence_score", 0.95))
            root_cause = str(data.get("root_cause", "")).strip()
            suggested_fix = str(data.get("suggested_fix", "")).strip()

            dto = AIAnalysisOutput(
                failure_category=category,
                confidence_score=max(0.0, min(1.0, confidence)),
                root_cause=root_cause,
                suggested_fix=suggested_fix
            )
            return True, dto, None
        except Exception:
            pass

        # 5. Regex heuristic fallback
        regex_dto = self._try_regex_extraction(raw_text)
        if regex_dto and regex_dto.failure_category != "unknown":
            return True, regex_dto, None

        return False, None, "Could not parse structured JSON from LLM response"

