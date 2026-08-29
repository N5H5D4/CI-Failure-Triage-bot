# backend/adapters/claude_client.py
import os
import json
from typing import Optional, Dict, Any
from anthropic import AsyncAnthropic

class ClaudeClient:
    """Infrastructure Adapter for Anthropic Claude LLM API."""

    def __init__(self, api_key: Optional[str] = None, model: str = "claude-3-haiku-20240307"):
        self.api_key = api_key or os.getenv("CLAUDE_API_KEY")
        self.model = model
        self.client = AsyncAnthropic(api_key=self.api_key) if self.api_key else None

    async def analyze_failure(self, system_prompt: str, user_prompt: str) -> str:
        """Calls Claude Messages API or provides structured analysis."""
        if not self.client:
            # If Claude API key is not configured, generate a deterministic rule-based analysis
            return self._fallback_local_analysis(user_prompt)

        try:
            response = await self.client.messages.create(
                model=self.model,
                max_tokens=1024,
                temperature=0.0,
                system=system_prompt,
                messages=[
                    {"role": "user", "content": user_prompt}
                ]
            )
            return response.content[0].text
        except Exception as e:
            print(f"[Claude API Error]: {str(e)}")
            return self._fallback_local_analysis(user_prompt, error_msg=str(e))

    def _fallback_local_analysis(self, prompt_text: str, error_msg: Optional[str] = None) -> str:
        """Intelligent local heuristic fallback when API key is not yet set."""
        lower = prompt_text.lower()
        
        category = "unknown"
        confidence = 0.85
        root_cause = "General CI pipeline execution failure."
        suggested_fix = "Check workflow job logs and verify build environment configuration."

        if "modulenotfounderror" in lower or "cannot find module" in lower or "no matching distribution" in lower or "requirements.txt" in lower or "npm err!" in lower:
            category = "dependency_issue"
            confidence = 0.94
            root_cause = "Missing or incompatible package dependency detected in environment setup step."
            suggested_fix = "Run `npm install` or `pip install -r requirements.txt` to sync dependencies, or pin compatible package versions in lockfile."
        elif "syntaxerror" in lower or "parsing error" in lower or "invalid syntax" in lower or "unexpected token" in lower or "ts(" in lower:
            category = "syntax_error"
            confidence = 0.96
            root_cause = "Code syntax or TypeScript compilation error found in source files before testing phase."
            suggested_fix = "Fix typos, missing brackets, or invalid type declarations at the flagged source line, then run linter locally."
        elif "assertionerror" in lower or "failed (" in lower or "failures=" in lower or "exit code 1" in lower and "test" in lower:
            category = "test_failure"
            confidence = 0.92
            root_cause = "One or more automated test cases failed assert verification."
            suggested_fix = "Inspect failed test assertions, verify recent logic changes against expected test inputs and mock data."
        elif "timeout" in lower or "timed out" in lower or "killed after" in lower or "operation timed out" in lower:
            category = "infrastructure_timeout"
            confidence = 0.90
            root_cause = "Job exceeded maximum execution duration limit or deadlocked on external network resource."
            suggested_fix = "Increase GitHub Actions step timeout or optimize slow database / integration test queries."
        elif "yaml" in lower or "action not found" in lower or ".github/workflows" in lower:
            category = "configuration_error"
            confidence = 0.88
            root_cause = "Workflow YAML specification or environment variable mapping is malformed."
            suggested_fix = "Validate `.github/workflows/*.yml` against GitHub Actions schema and check repository secrets configuration."

        return json.dumps({
            "failure_category": category,
            "confidence_score": confidence,
            "root_cause": root_cause,
            "suggested_fix": suggested_fix
        }, ensure_ascii=False)
