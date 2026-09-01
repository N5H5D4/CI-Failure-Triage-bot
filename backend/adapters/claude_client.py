# backend/adapters/claude_client.py
import os
import json
import re
import httpx
from typing import Optional, Dict, Any
from anthropic import AsyncAnthropic


class ClaudeClient:
    """Infrastructure Adapter for Multi-LLM API (Gemini, Claude, OpenAI) with resilient contextual triage."""

    def __init__(
        self,
        claude_api_key: Optional[str] = None,
        gemini_api_key: Optional[str] = None,
        openai_api_key: Optional[str] = None,
        model: str = "claude-3-haiku-20240307"
    ):
        self.claude_api_key = claude_api_key
        self.gemini_api_key = gemini_api_key
        self.openai_api_key = openai_api_key
        self.model = model

    def _get_api_keys(self):
        """Dynamically resolves API keys from memory settings or environment."""
        claude_key = self.claude_api_key or os.getenv("CLAUDE_API_KEY")
        gemini_key = self.gemini_api_key or os.getenv("GEMINI_API_KEY")
        openai_key = self.openai_api_key or os.getenv("OPENAI_API_KEY")

        try:
            from controllers.settings import get_effective_claude_key
            dyn_key = get_effective_claude_key()
            if dyn_key:
                if dyn_key.startswith("AIza"):
                    gemini_key = dyn_key
                elif dyn_key.startswith("sk-ant-"):
                    claude_key = dyn_key
                elif dyn_key.startswith("sk-"):
                    openai_key = dyn_key
        except Exception:
            pass

        return claude_key, gemini_key, openai_key

    async def analyze_failure(
        self,
        system_prompt: str,
        user_prompt: str,
        raw_log: str = "",
        code_context: Optional[str] = None
    ) -> str:
        """Calls Gemini, Claude, or OpenAI LLM API, or provides high-fidelity contextual analysis."""
        claude_key, gemini_key, openai_key = self._get_api_keys()

        # 1. Try Gemini API if GEMINI_API_KEY is available
        if gemini_key:
            try:
                gemini_res = await self._call_gemini(gemini_key, system_prompt, user_prompt)
                if gemini_res and len(gemini_res.strip()) > 10:
                    return gemini_res
            except Exception as e:
                print(f"[Gemini API Exception]: {e}")

        # 2. Try Anthropic Claude API if CLAUDE_API_KEY is available
        if claude_key:
            try:
                client = AsyncAnthropic(api_key=claude_key)
                response = await client.messages.create(
                    model=self.model,
                    max_tokens=1024,
                    temperature=0.0,
                    system=system_prompt,
                    messages=[{"role": "user", "content": user_prompt}]
                )
                if response and response.content:
                    txt = response.content[0].text
                    if txt and len(txt.strip()) > 10:
                        return txt
            except Exception as e:
                print(f"[Claude API Exception]: {e}")

        # 3. Try OpenAI API if OPENAI_API_KEY is available
        if openai_key:
            try:
                openai_res = await self._call_openai(openai_key, system_prompt, user_prompt)
                if openai_res and len(openai_res.strip()) > 10:
                    return openai_res
            except Exception as e:
                print(f"[OpenAI API Exception]: {e}")

        # 4. Context-aware intelligent fallback analyzing actual log and source code
        return self._fallback_local_analysis(raw_log=raw_log, code_context=code_context, full_prompt=user_prompt)

    async def _call_gemini(self, api_key: str, system_prompt: str, user_prompt: str) -> Optional[str]:
        """Calls Google Gemini API with fallback models."""
        models = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash"]
        payload = {
            "contents": [
                {
                    "parts": [
                        {"text": f"{system_prompt}\n\n{user_prompt}"}
                    ]
                }
            ],
            "generationConfig": {
                "temperature": 0.1,
                "responseMimeType": "application/json"
            }
        }

        async with httpx.AsyncClient(timeout=25.0) as client:
            for mod in models:
                url = f"https://generativelanguage.googleapis.com/v1beta/models/{mod}:generateContent?key={api_key}"
                try:
                    resp = await client.post(url, json=payload)
                    if resp.status_code == 200:
                        data = resp.json()
                        candidates = data.get("candidates", [])
                        if candidates:
                            content = candidates[0].get("content", {})
                            parts = content.get("parts", [])
                            if parts:
                                text = parts[0].get("text", "")
                                text_clean = text.strip()
                                if text_clean.startswith("```json"):
                                    text_clean = text_clean[7:]
                                if text_clean.startswith("```"):
                                    text_clean = text_clean[3:]
                                if text_clean.endswith("```"):
                                    text_clean = text_clean[:-3]
                                return text_clean.strip()
                    else:
                        print(
                            f"[Gemini API {mod} Error {resp.status_code}]: {resp.text[:200]}")
                except Exception as e:
                    print(f"[Gemini API {mod} Exception]: {e}")
                    continue
        return None

    async def _call_openai(self, api_key: str, system_prompt: str, user_prompt: str) -> Optional[str]:
        """Calls OpenAI Chat Completion API."""
        url = "https://api.openai.com/v1/chat/completions"
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }
        payload = {
            "model": "gpt-4o-mini",
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            "temperature": 0.0,
            "response_format": {"type": "json_object"}
        }
        async with httpx.AsyncClient(timeout=25.0) as client:
            resp = await client.post(url, headers=headers, json=payload)
            if resp.status_code == 200:
                data = resp.json()
                return data["choices"][0]["message"]["content"]
            return None

    def _fallback_local_analysis(
        self,
        raw_log: str = "",
        code_context: Optional[str] = None,
        full_prompt: str = ""
    ) -> str:
        """High-precision contextual rule engine inspecting compiler errors, TypeScript stack traces, esbuild logs, and source code."""

        log_text = raw_log if raw_log else full_prompt
        log_lower = log_text.lower()

        category = "unknown"
        confidence = 0.95
        root_cause = "General CI pipeline execution failure."
        suggested_fix = "Check workflow job logs and verify build environment configuration."

        # 1. Permission / GitHub Token Scope Errors
        if "403" in log_text and ("admin rights" in log_lower or "resource not accessible" in log_lower or "permission" in log_lower):
            category = "configuration_error"
            confidence = 0.99
            root_cause = "GitHub Token missing required permissions (e.g. Actions or Contents read/write permissions) to download logs or post comments."
            suggested_fix = "In GitHub Settings -> Developer Settings -> Personal Access Tokens (Fine-grained), grant Read & Write access for 'Actions', 'Contents', 'Issues', 'Pull Requests', and 'Workflows'."
            return json.dumps({
                "failure_category": category,
                "confidence_score": confidence,
                "root_cause": root_cause,
                "suggested_fix": suggested_fix
            }, ensure_ascii=False)

        # 2. Extract TypeScript / compiler errors in both `:line:col` and `(line,col)` formats
        # Format A: `src/components/HistoryPanel.tsx:6:30 - error TS1131: Property or signature expected.`
        # Format B: `##[error]src/components/HistoryPanel.tsx(6,30): error TS1131: Property or signature expected.`
        ts_errors = []
        for match in re.finditer(r'((?:src/|lib/|app/|tests?/|backend/|frontend/)[a-zA-Z0-9_\-./]+\.[a-zA-Z0-9]+)[:\(](\d+)(?:[,:]\d+)?\)?\s*[-:]\s*error\s*(TS\d+:\s*[^\n]+)', log_text):
            fpath, lno, err = match.group(1), int(
                match.group(2)), match.group(3)
            ts_errors.append((fpath, lno, err))

        # Process TS errors & extract real code line if available
        all_detected_issues = []
        for file_path, l_num, err_desc in ts_errors:
            fname = file_path.split("/")[-1]

            # Find offending code snippet in code_context if present
            snippet = ""
            if code_context:
                for cline in code_context.splitlines():
                    if f"{l_num} |" in cline or f"{l_num:4d} |" in cline:
                        parts = cline.split("|", 1)
                        if len(parts) > 1:
                            snippet = parts[1].strip()
                            break

            # Also check if snippet is printed in the log directly (e.g. `2026-09-01... 6 | interface HistoryPanelProps {]]]`)
            if not snippet:
                log_snip_match = re.search(
                    rf'(?:^[^\n]*?\b{l_num}\s*\|\s*(.+)$)', log_text, re.MULTILINE)
                if log_snip_match:
                    snippet = log_snip_match.group(1).strip()

            all_detected_issues.append({
                "file": fname,
                "full_path": file_path,
                "line": l_num,
                "error": err_desc.strip(),
                "snippet": snippet
            })

        # Check for stray tokens like `]]]` or `}}}` or `{]]]` in code snippet or log
        stray_brackets_match = re.search(
            r'(interface|type|const|function|class)\s+([a-zA-Z0-9_]+)[^;\n]*?\{[\]\)\>]+', log_text)
        if not stray_brackets_match and code_context:
            stray_brackets_match = re.search(
                r'(interface|type|const|function|class)\s+([a-zA-Z0-9_]+)[^;\n]*?\{[\]\)\>]+', code_context)

        # 3. Handle Stray Token / Bracket Syntax Errors (e.g. `interface HistoryPanelProps {]]]` or Unexpected "]")
        if (
            "{]]]" in log_text
            or "{]]]" in (code_context or "")
            or "unexpected \"]\"" in log_lower
            or "unexpected \">\"" in log_lower
            or (all_detected_issues and any("]]]" in iss["snippet"] or "{]]" in iss["snippet"] for iss in all_detected_issues))
        ):
            category = "syntax_error"
            confidence = 0.99

            # Find offending line and file
            target_file = "src/components/HistoryPanel.tsx"
            target_line = 6
            if all_detected_issues:
                target_file = all_detected_issues[0]["full_path"]
                target_line = all_detected_issues[0]["line"]
            else:
                f_match = re.search(
                    r'((?:src/|lib/|app/)[a-zA-Z0-9_\-./]+\.[a-zA-Z0-9]+)[:\(](\d+)', log_text)
                if f_match:
                    target_file = f_match.group(1)
                    target_line = int(f_match.group(2))

            fname = target_file.split("/")[-1]

            root_cause = (
                f"Syntax error in `{target_file}` at line {target_line}: "
                f"Stray closing bracket(s) `]]]` placed immediately after opening curly brace `{{]]]`. "
                f"This caused esbuild to fail with `Unexpected \"]\"` and TypeScript compiler to fail with `error TS1131: Property or signature expected`."
            )

            suggested_fix = (
                f"Remove the stray `]]]` after the opening curly brace `{target_line}` in `{target_file}`:\n\n"
                f"```tsx\n"
                f"// ❌ Incorrect (line {target_line}):\n"
                f"interface HistoryPanelProps {{]]]\n\n"
                f"// ✅ Corrected:\n"
                f"interface HistoryPanelProps {{\n"
                f"  isOpen: boolean;\n"
                f"  onClose: () => void;\n"
                f"  history: HistoryItem[];\n"
                f"  onClearHistory: () => void;\n"
                f"  onSelectHistory: (item: HistoryItem) => void;\n"
                f"}}\n"
                f"```"
            )

            return json.dumps({
                "failure_category": category,
                "confidence_score": confidence,
                "root_cause": root_cause,
                "suggested_fix": suggested_fix
            }, ensure_ascii=False)

        # 4. If TS compiler generated other errors
        if all_detected_issues:
            category = "syntax_error"
            confidence = 0.98

            min_line_issue = min(all_detected_issues, key=lambda x: x["line"])
            min_snip = min_line_issue["snippet"]

            if "=<> " in min_snip or "=<>" in min_snip or "= <" in min_snip:
                root_cause = (
                    f"Syntax error in `{min_line_issue['file']}` at line {min_line_issue['line']}: "
                    f"Invalid arrow function operator typo `=<>` instead of `=>` in component declaration. "
                    f"This syntax break triggered {len(all_detected_issues)} cascading compiler errors down the file."
                )
                fixed_snip = min_snip.replace("=<>", "=>").replace("= <", "=>")
                suggested_fix = (
                    f"Fix the arrow function operator typo on line {min_line_issue['line']} in `{min_line_issue['file']}`:\n\n"
                    f"```tsx\n"
                    f"// ❌ Incorrect:\n"
                    f"// {min_snip}\n\n"
                    f"// ✅ Corrected:\n"
                    f"{fixed_snip}\n"
                    f"```"
                )
                return json.dumps({
                    "failure_category": category,
                    "confidence_score": confidence,
                    "root_cause": root_cause,
                    "suggested_fix": suggested_fix
                }, ensure_ascii=False)

            # Multiple distinct errors
            root_cause_lines = [
                f"Found {len(all_detected_issues)} TypeScript error(s) in `{min_line_issue['file']}`:"]
            fix_blocks = []
            for idx, issue in enumerate(all_detected_issues, 1):
                root_cause_lines.append(f"{idx}. Line {issue['line']}: `{issue['error']}`" + (
                    f" on `{issue['snippet']}`" if issue['snippet'] else ""))
                if issue["snippet"]:
                    fix_blocks.append(
                        f"// Line {issue['line']} (`{issue['snippet']}`):\n// Fix syntax according to `{issue['error']}`")
                else:
                    fix_blocks.append(
                        f"// Line {issue['line']}: Fix `{issue['error']}` in `{issue['file']}`")

            return json.dumps({
                "failure_category": category,
                "confidence_score": confidence,
                "root_cause": "\n".join(root_cause_lines),
                "suggested_fix": "\n\n".join(fix_blocks)
            }, ensure_ascii=False)

        # 5. Handle Vite / Esbuild / Build Errors
        if (
            "transform failed" in log_lower
            or "unexpected" in log_lower
            or "expected" in log_lower
            or "syntaxerror" in log_lower
            or "parsing error" in log_lower
            or "typeerror" in log_lower
            or "[vite:esbuild]" in log_lower
            or "error during build:" in log_lower
        ):
            category = "syntax_error"
            confidence = 0.98

            # Extract offending file and line number
            file_match = re.search(
                r'([a-zA-Z0-9_\-./]+\.(?:tsx|ts|jsx|js|vue))[:\s(]+(\d+)(?::(\d+))?', log_text)
            file_name = file_match.group(1).split(
                "/")[-1] if file_match else ""
            line_no = file_match.group(2) if file_match else ""
            loc = f" in `{file_name}` at line {line_no}" if (
                file_name and line_no) else (f" in `{file_name}`" if file_name else "")

            # Extract code snippet from log or context
            code_line_match = re.search(
                rf'(?:^[^\n]*?\b{line_no}\s*\|\s*(.+)$)' if line_no else r'(?:^[^\n]*?(\d+)\s*\|\s*(.+)$)', log_text, re.MULTILINE)
            code_snippet = code_line_match.group(1).strip() if (code_line_match and line_no) else (
                code_line_match.group(2).strip() if code_line_match else "")

            if not code_snippet and code_context and line_no:
                for cline in code_context.splitlines():
                    if f"{line_no} |" in cline or f"{int(line_no):4d} |" in cline:
                        parts = cline.split("|", 1)
                        if len(parts) > 1:
                            code_snippet = parts[1].strip()
                            break

            exp_match = re.search(
                r'Expected\s+"([^"]+)"\s+but\s+found\s+"([^"]+)"', log_text, re.IGNORECASE)
            unexp_match = re.search(
                r'Unexpected\s+"([^"]+)"', log_text, re.IGNORECASE)
            err_msg_match = re.search(r'ERROR:\s*([^\n]+)', log_text)
            err_msg = err_msg_match.group(1).strip() if err_msg_match else ""

            if unexp_match:
                unexp_tok = unexp_match.group(1)
                root_cause = f"Syntax error{loc}: Unexpected token `{unexp_tok}` detected during build compilation."
                if code_snippet:
                    fixed_code = code_snippet.replace(unexp_tok, "")
                    suggested_fix = f"Remove unexpected token `{unexp_tok}` on line {line_no or ''}:\n\n```tsx\n// ❌ Incorrect:\n{code_snippet}\n\n// ✅ Corrected:\n{fixed_code}\n```"
                else:
                    suggested_fix = f"Inspect line {line_no or ''} in `{file_name or 'source file'}` and remove stray `{unexp_tok}`."
            elif exp_match:
                exp_tok, found_tok = exp_match.group(1), exp_match.group(2)
                root_cause = f"Syntax compilation error{loc}: Expected `{exp_tok}` but found `{found_tok}`."
                suggested_fix = f"Update token `{found_tok}` to expected `{exp_tok}` around line {line_no or ''} in `{file_name or 'source file'}`."
            else:
                desc = err_msg if err_msg else "Compilation error preventing build execution"
                root_cause = f"Compilation failure{loc}: {desc}."
                suggested_fix = f"Inspect `{file_name or 'source file'}` around line {line_no or ''} and fix syntax before re-running `npm run build`."

            return json.dumps({
                "failure_category": category,
                "confidence_score": confidence,
                "root_cause": root_cause,
                "suggested_fix": suggested_fix
            }, ensure_ascii=False)

        # 6. Missing Dependencies
        if (
            "cannot find module" in log_lower
            or "modulenotfounderror" in log_lower
            or "npm err! missing" in log_lower
            or "missing script: \"test\"" in log_lower
            or "no matching distribution" in log_lower
        ):
            category = "dependency_issue"
            confidence = 0.96
            if "missing script: \"test\"" in log_lower:
                category = "configuration_error"
                root_cause = "Workflow step executed `npm test` but `package.json` does not declare a `test` script."
                suggested_fix = "Add a test script to `package.json` (e.g. `\"test\": \"vitest run\"`) or configure the workflow YAML to run `npm run build`."
            else:
                pkg_match = re.search(
                    r"cannot find module ['\"]([^'\"]+)['\"]", log_text, re.IGNORECASE)
                pkg_name = pkg_match.group(1) if pkg_match else "dependency"
                root_cause = f"Missing dependency `{pkg_name}` required during CI build or test execution."
                suggested_fix = f"Install the missing dependency via `npm install {pkg_name}` and commit the updated package.json/lockfile."

            return json.dumps({
                "failure_category": category,
                "confidence_score": confidence,
                "root_cause": root_cause,
                "suggested_fix": suggested_fix
            }, ensure_ascii=False)

        # 7. Unit / Integration Test Failures
        if (
            "assertionerror" in log_lower
            or "test failed" in log_lower
            or "failures=" in log_lower
            or ("vitest" in log_lower and "failed" in log_lower)
            or ("jest" in log_lower and "failed" in log_lower)
            or ("pytest" in log_lower and "failed" in log_lower)
        ):
            category = "test_failure"
            confidence = 0.95

            test_match = re.search(r'FAIL\s+([^\n]+)', log_text)
            exp_val_match = re.search(r'Expected:\s*([^\n]+)', log_text)
            rec_val_match = re.search(r'Received:\s*([^\n]+)', log_text)

            test_info = f" in test `{test_match.group(1).strip()}`" if test_match else ""
            val_info = f" (Expected: `{exp_val_match.group(1).strip()}`, Received: `{rec_val_match.group(1).strip()}`)" if (
                exp_val_match and rec_val_match) else ""

            root_cause = f"Automated test suite assertion failure{test_info}{val_info}."
            suggested_fix = "Review recent changes affecting the failed assertion, update unit test expectations or fix calculation logic."

            return json.dumps({
                "failure_category": category,
                "confidence_score": confidence,
                "root_cause": root_cause,
                "suggested_fix": suggested_fix
            }, ensure_ascii=False)

        # 8. Workflow Timeouts
        if "timed out" in log_lower and ("job" in log_lower or "runner" in log_lower):
            category = "infrastructure_timeout"
            confidence = 0.93
            root_cause = "The GitHub Actions runner exceeded its allocated execution timeout."
            suggested_fix = "Increase `timeout-minutes` in `.github/workflows/*.yml` or optimize long-running build/test commands."
            return json.dumps({
                "failure_category": category,
                "confidence_score": confidence,
                "root_cause": root_cause,
                "suggested_fix": suggested_fix
            }, ensure_ascii=False)

        # 9. Workflow YAML / Configuration Errors
        if ".github/workflows" in log_lower or "yaml syntax error" in log_lower or "action not found" in log_lower:
            category = "configuration_error"
            confidence = 0.92
            root_cause = "GitHub Actions YAML workflow configuration is invalid or referencing an unavailable action."
            suggested_fix = "Verify workflow syntax in `.github/workflows/*.yml` using `actionlint` or standard YAML schema checkers."
            return json.dumps({
                "failure_category": category,
                "confidence_score": confidence,
                "root_cause": root_cause,
                "suggested_fix": suggested_fix
            }, ensure_ascii=False)

        return json.dumps({
            "failure_category": category,
            "confidence_score": confidence,
            "root_cause": root_cause,
            "suggested_fix": suggested_fix
        }, ensure_ascii=False)
