# backend/services/prompt_builder.py
import json

class PromptBuilder:
    """Constructs strict JSON-enforced prompts for Anthropic Claude / LLMs."""

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
            "You are an expert CI/CD SRE and senior software engineer. Your duty is to analyze "
            "Continuous Integration (CI) build and test failure logs. "
            "You MUST output valid, parsable JSON ONLY without any Markdown fences, markdown backticks, "
            "or conversational filler."
        )

    def build_user_prompt(self, repo_name: str, run_id: int, log_content: str) -> str:
        schema_format = {
            "failure_category": "One of [flaky_test, test_failure, dependency_issue, syntax_error, configuration_error, infrastructure_timeout, unknown]",
            "confidence_score": 0.95,
            "root_cause": "Specific plain-text explanation citing exact error lines from the log.",
            "suggested_fix": "Concrete code, command, or configuration change to fix the issue."
        }

        return f"""
Analyze the following failed CI/CD workflow log for repository `{repo_name}` (Run ID #{run_id}).

Strict Requirements:
1. Identify the exact root cause of the build/test failure by examining stack traces, exit codes, and error lines.
2. Classify into EXACTLY one of these categories:
   - flaky_test (intermittent test timing/network glitch)
   - test_failure (assertion failed, unit/integration test regression)
   - dependency_issue (missing package, lockfile mismatch, npm/pip error)
   - syntax_error (compile error, TypeScript typo, syntax bug)
   - configuration_error (invalid YAML, missing env var, Dockerfile issue)
   - infrastructure_timeout (job hit runner timeout limit)
   - unknown (unclassified)
3. Provide a realistic confidence_score between 0.0 and 1.0.
4. Output STRICT JSON conforming to the following structure:
{json.dumps(schema_format, indent=2)}

CI LOG EXCERPT:
\"\"\"
{log_content}
\"\"\"
"""
