# backend/services/prompt_builder.py
import json
from typing import Optional

class PromptBuilder:
    """Constructs strict JSON-enforced prompts for LLMs with log and source code context."""

    def __init__(self):
        self.allowed_categories = [
            "flaky_test",
            "test_failure",
            "dependency_issue",
            "syntax_error",
            "configuration_error",
            "infrastructure_timeout",
            "unknown"
        ]

    def build_system_prompt(self) -> str:
        return (
            "You are an expert CI/CD SRE and senior full-stack software engineer. Your duty is to analyze "
            "Continuous Integration (CI) build, test, compilation, and lint failure logs along with the actual source code. "
            "You MUST output valid, parsable JSON ONLY without any Markdown code fences (no ```json), "
            "or conversational filler."
        )

    def build_user_prompt(
        self,
        repo_name: str,
        run_id: int,
        log_content: str,
        source_code_context: Optional[str] = None
        ) -> str:
        schema_format = {
            "failure_category": "One of [flaky_test, test_failure, dependency_issue, syntax_error, configuration_error, infrastructure_timeout, unknown]",
            "confidence_score": 0.98,
            "root_cause": "Detailed, specific plain-text explanation citing exact error lines, syntax mistakes, or mismatched types from the log/code.",
            "suggested_fix": "Exact actionable code replacement, corrected command, or configuration patch to fix the issue."
        }

        source_section = ""
        if source_code_context:
            source_section = f"""
SOURCE CODE EXCERPT (Retrieved directly from repository at failing commit):
\"\"\"
{source_code_context}
\"\"\"
"""

        return f"""
Analyze the following failed CI/CD workflow log and source code for repository `{repo_name}` (Run ID #{run_id}).

Strict Requirements:
1. Identify ALL root causes of the failure by inspecting the compiler errors, stack traces, and the provided source code. If multiple files or multiple lines have errors, analyze and report on ALL of them.
2. Classify into EXACTLY one of these categories (if multiple categories apply, select the most critical blocker like `syntax_error` or `dependency_issue`):
   - flaky_test (intermittent test timing/network glitch)
   - test_failure (assertion failed, unit/integration test regression)
   - dependency_issue (missing package, lockfile mismatch, npm/pip error)
   - syntax_error (compile error, TypeScript/JavaScript typo, syntax bug, unexpected token, invalid bracket/identifier/tag)
   - configuration_error (invalid YAML, missing env var, Dockerfile issue)
   - infrastructure_timeout (job exceeded runner time limit)
   - unknown (unclassified)
3. Provide a realistic confidence_score between 0.0 and 1.0.
4. In `root_cause`: Citing exact file names and line numbers. If multiple files have errors, provide a numbered list broken down by file.
5. In `suggested_fix`: Provide the EXACT corrected code snippets for EACH failing file with clear file headers.
6. Output STRICT JSON conforming to the following structure:
{json.dumps(schema_format, indent=2)}
{source_section}
CI LOG EXCERPT:
\"\"\"
{log_content}
\"\"\"
"""

