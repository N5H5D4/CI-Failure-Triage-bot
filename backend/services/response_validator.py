# backend/services/response_validator.py
import json
import re
from typing import Optional, Dict, Any, Tuple
from models.schemas import AIAnalysisOutput

class ResponseValidator:
    """Parses raw LLM text, strips possible markdown ticks, and validates JSON against schema constraints."""

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

    def validate(self, raw_text: str) -> Tuple[bool, Optional[AIAnalysisOutput], Optional[str]]:
        """
        Extracts and validates JSON from raw LLM output.
        Returns (is_valid, parsed_dto, error_message).
        """
        if not raw_text or not raw_text.strip():
            return False, None, "Empty response from LLM"

        # 1. Strip markdown code fences if LLM wrapped it in ```json ... ```
        cleaned = raw_text.strip()
        json_match = re.search(r'```(?:json)?\s*([\s\S]*?)\s*```', cleaned)
        if json_match:
            cleaned = json_match.group(1).strip()
        elif cleaned.startswith("{") and cleaned.endswith("}"):
            cleaned = cleaned
        else:
            # Look for outermost brace pair
            start = cleaned.find("{")
            end = cleaned.rfind("}")
            if start != -1 and end != -1 and end > start:
                cleaned = cleaned[start:end+1]

        try:
            data = json.loads(cleaned)
        except Exception as e:
            return False, None, f"JSON parse error: {str(e)}"

        # 2. Field verification and normalisation
        category = str(data.get("failure_category", "unknown")).strip().lower()
        if category not in self.ALLOWED_CATEGORIES:
            # Map loosely matching category names if possible
            if "dep" in category or "package" in category:
                category = "dependency_issue"
            elif "syntax" in category or "compile" in category or "type" in category:
                category = "syntax_error"
            elif "test" in category or "assert" in category:
                category = "test_failure"
            elif "timeout" in category:
                category = "infrastructure_timeout"
            elif "config" in category or "yaml" in category:
                category = "configuration_error"
            elif "flake" in category or "flaky" in category:
                category = "flaky_test"
            else:
                category = "unknown"

        confidence = data.get("confidence_score", 0.8)
        try:
            confidence = float(confidence)
            confidence = max(0.0, min(1.0, confidence))
        except (ValueError, TypeError):
            confidence = 0.85

        root_cause = str(data.get("root_cause", "Build failed during CI execution.")).strip()
        suggested_fix = str(data.get("suggested_fix", "Review log details and correct offending build step.")).strip()

        # 3. Enforce maximum reasonable character length
        if len(root_cause) > 800:
            root_cause = root_cause[:797] + "..."
        if len(suggested_fix) > 1200:
            suggested_fix = suggested_fix[:1197] + "..."

        dto = AIAnalysisOutput(
            failure_category=category,
            confidence_score=confidence,
            root_cause=root_cause,
            suggested_fix=suggested_fix
        )
        return True, dto, None
