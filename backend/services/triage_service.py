# backend/services/triage_service.py
import os
import json
import re
from datetime import datetime
from typing import Optional, Tuple

from adapters.github_client import GitHubClient
from adapters.claude_client import ClaudeClient
from services.log_trimmer import LogTrimmer
from services.prompt_builder import PromptBuilder
from services.response_validator import ResponseValidator
from services.markdown_formatter import MarkdownFormatter
from database import SessionLocal
from models.models import TriageResult, RepositoryConfig
from models.schemas import AIAnalysisOutput


class TriageService:
    """Core Orchestrator Service coordinating log trimming, source code fetching, AI analysis, formatting, GitHub posting, and persistence."""

    def __init__(
        self,
        github: Optional[GitHubClient] = None,
        claude: Optional[ClaudeClient] = None,
        trimmer: Optional[LogTrimmer] = None,
        prompt_builder: Optional[PromptBuilder] = None,
        validator: Optional[ResponseValidator] = None,
        formatter: Optional[MarkdownFormatter] = None
    ):
        self.github = github or GitHubClient()
        self.claude = claude or ClaudeClient()
        self.trimmer = trimmer or LogTrimmer()
        self.prompt_builder = prompt_builder or PromptBuilder()
        self.validator = validator or ResponseValidator()
        self.formatter = formatter or MarkdownFormatter()

    def _extract_offending_file_and_line(self, log_content: str) -> Tuple[Optional[str], Optional[int]]:
        """Extracts primary relative file path and line number from stack traces or compiler logs."""
        locs = self._extract_all_offending_locations(log_content)
        if locs:
            return locs[0]["file"], locs[0]["line"]
        return None, None

    def _extract_all_offending_locations(self, log_content: str) -> list:
        """Extracts all relative file paths, line numbers, and error diagnostics from compiler/test logs."""
        locations = []
        seen = set()

        # Pattern 1: TypeScript tsc standard: src/components/HistoryPanel.tsx:25:9 - error TS1005: '>' expected.
        ts_pattern = r'((?:src/|lib/|app/|tests?/|backend/|frontend/)[a-zA-Z0-9_\-./]+\.[a-zA-Z0-9]+):(\d+):(\d+)\s*-\s*error\s*([^\n]+)'
        for m in re.finditer(ts_pattern, log_content):
            fpath = m.group(1)
            lno = int(m.group(2))
            err_msg = m.group(4).strip()
            key = (fpath, lno)
            if key not in seen:
                seen.add(key)
                locations.append(
                    {"file": fpath, "line": lno, "error_msg": err_msg})

        # Pattern 2: TypeScript GitHub Actions format: src/components/HistoryPanel.tsx(6,30): error TS1131: Property or signature expected.
        ts_gha_pattern = r'((?:src/|lib/|app/|tests?/|backend/|frontend/)[a-zA-Z0-9_\-./]+\.[a-zA-Z0-9]+)\((\d+)(?:,\d+)?\):\s*error\s*([^\n]+)'
        for m in re.finditer(ts_gha_pattern, log_content):
            fpath = m.group(1)
            lno = int(m.group(2))
            err_msg = m.group(3).strip()
            key = (fpath, lno)
            if key not in seen:
                seen.add(key)
                locations.append(
                    {"file": fpath, "line": lno, "error_msg": err_msg})

        # Pattern 3: Vite / esbuild / TS paths with ERROR (including full /home/runner/... paths)
        esbuild_pattern = r'(?:file:\s*)?(?:[a-zA-Z0-9_\-./]+[/])?((?:src/|lib/|app/|tests?/|backend/|frontend/)[a-zA-Z0-9_\-./]+\.[a-zA-Z0-9]+)[:\(](\d+)(?:[,:]\d+)?'
        for m in re.finditer(esbuild_pattern, log_content):
            fpath = m.group(1)
            lno = int(m.group(2))
            key = (fpath, lno)
            if key not in seen:
                seen.add(key)
                locations.append(
                    {"file": fpath, "line": lno, "error_msg": None})

        # Pattern 4: Python pytest / traceback
        py_pattern = r'File "([a-zA-Z0-9_\-./]+\.py)", line (\d+)'
        for m in re.finditer(py_pattern, log_content):
            fpath = m.group(1)
            lno = int(m.group(2))
            key = (fpath, lno)
            if key not in seen:
                seen.add(key)
                locations.append(
                    {"file": fpath, "line": lno, "error_msg": None})

        return locations

    def _build_code_window(self, source_code: str, line_number: int, file_path: str, context_radius: int = 12) -> str:
        """Extracts a formatted code window with line numbers around the offending line."""
        lines = source_code.splitlines()
        total_lines = len(lines)
        if total_lines == 0 or line_number <= 0:
            return ""

        start_line = max(1, line_number - context_radius)
        end_line = min(total_lines, line_number + context_radius)

        formatted_lines = []
        formatted_lines.append(
            f"// File: {file_path} (Lines {start_line}-{end_line})")
        for idx in range(start_line, end_line + 1):
            line_text = lines[idx - 1]
            marker = ">" if idx == line_number else " "
            formatted_lines.append(f"{marker} {idx:4d} | {line_text}")

        return "\n".join(formatted_lines)

    async def execute_triage(
        self,
        repo_name: str,
        run_id: int,
        pr_number: Optional[int] = None,
        commit_sha: Optional[str] = None,
        raw_log_override: Optional[str] = None,
        is_simulated: bool = False
    ) -> TriageResult:
        """Executes end-to-end triage pipeline with live source code inspection."""
        db = SessionLocal()
        result_record = None
        is_sim = is_simulated or bool(raw_log_override)

        try:
            # 1. Look up repository if registered
            parts = repo_name.split("/")
            repo_config = None
            if len(parts) == 2:
                owner, name = parts
                repo_config = db.query(RepositoryConfig).filter_by(
                    owner=owner, name=name).first()

            # 2. Check if existing run record exists or create new pending record
            result_record = db.query(TriageResult).filter_by(
                repo_name=repo_name, run_id=run_id).first()
            if not result_record:
                result_record = TriageResult(
                    repository_id=repo_config.id if repo_config else None,
                    repo_name=repo_name,
                    run_id=run_id,
                    pr_number=pr_number,
                    is_simulated=is_sim,
                    status="pending"
                )
                db.add(result_record)
            else:
                result_record.status = "pending"
                result_record.is_simulated = is_sim
                if pr_number:
                    result_record.pr_number = pr_number

            db.commit()
            db.refresh(result_record)

            # If pr_number or commit_sha not provided, fetch from GitHub Actions metadata
            if not pr_number or not commit_sha:
                run_meta = await self.github.get_workflow_run_info(repo_name, run_id)
                if run_meta:
                    if not commit_sha:
                        commit_sha = run_meta.get("head_sha")
                    if not pr_number:
                        prs = run_meta.get("pull_requests", [])
                        if prs and len(prs) > 0:
                            pr_number = prs[0].get("number")
                            result_record.pr_number = pr_number

            # 3. Retrieve raw log (either provided or fetched via GitHub API)
            if raw_log_override:
                raw_log = raw_log_override
            else:
                raw_log = await self.github.get_workflow_log(repo_name, run_id)
                # If fetching from GitHub failed but we have a saved log in DB, reuse it (useful for retries / offline)
                if (not raw_log or "[GitHub API Error]" in raw_log or "Unable to retrieve logs" in raw_log) and result_record and result_record.trimmed_log and not result_record.trimmed_log.startswith("[GitHub API Error]"):
                    raw_log = result_record.trimmed_log

            # 4. Trim log to preserve relevant error signals
            clean_log = self.trimmer.trim(raw_log)
            result_record.trimmed_log = clean_log

            # If log could not be fetched due to GitHub permissions (403/404)
            if "[GitHub API Error]" in clean_log or "Unable to retrieve logs" in clean_log or "Error fetching logs" in clean_log:
                result_record.failure_category = "configuration_error"
                result_record.confidence_score = 0.99
                result_record.root_cause = "GitHub API Token scope issue: Bot received the webhook notification but was unable to download the workflow run logs from GitHub API (HTTP 403 / 404). Either GITHUB_TOKEN is missing or lacks `actions:read` permission."
                result_record.suggested_fix = "1. Verify GITHUB_TOKEN in Settings / .env\n2. For GitHub Personal Access Tokens (Fine-grained), grant Read access to 'Actions' and 'Workflows'.\n3. In repository Settings -> Actions -> General -> Workflow permissions, ensure 'Read and write permissions' is selected."
                result_record.raw_response = json.dumps({
                    "failure_category": "configuration_error",
                    "confidence_score": 0.99,
                    "root_cause": result_record.root_cause,
                    "suggested_fix": result_record.suggested_fix
                })
                result_record.status = "error"
                db.commit()
                db.refresh(result_record)
                return result_record

            # 5. Extract all offending files and retrieve actual Source Code from GitHub
            all_locations = self._extract_all_offending_locations(clean_log)
            code_context_list = []
            files_fetched = set()

            for loc in all_locations:
                fpath = loc["file"]
                lno = loc["line"]
                if fpath not in files_fetched:
                    files_fetched.add(fpath)
                    print(
                        f"[TriageService] Fetching source code for offending file: {fpath} (at line {lno})")
                    source_code = None
                    # 1. Try reading from GitHub repository via API if configured
                    if repo_name and not repo_name.startswith("simulated"):
                        source_code = await self.github.get_file_content(repo_name, fpath, ref=commit_sha)

                    # 2. Fallback: If running simulator or file exists in current workspace, read directly from disk
                    if not source_code:
                        clean_rel_path = fpath.lstrip("/")
                        possible_local_paths = [
                            clean_rel_path,
                            os.path.join(os.getcwd(), clean_rel_path),
                            os.path.join(os.getcwd(), "src",
                                         clean_rel_path.replace("src/", "", 1)),
                        ]
                        for lp in possible_local_paths:
                            if os.path.isfile(lp):
                                try:
                                    with open(lp, "r", encoding="utf-8", errors="replace") as lf:
                                        source_code = lf.read()
                                        print(
                                            f"[TriageService] Successfully read source code from local workspace: {lp}")
                                        break
                                except Exception as fe:
                                    print(
                                        f"[TriageService] Local read exception for {lp}: {fe}")

                    if source_code:
                        if lno:
                            code_win = self._build_code_window(
                                source_code, lno, fpath)
                        else:
                            code_win = f"// File: {fpath}\n" + \
                                "\n".join(source_code.splitlines()[:60])
                        code_context_list.append(code_win)

            combined_code_context = "\n\n".join(
                code_context_list) if code_context_list else None

            # 6. Build prompt and execute LLM analysis
            system_prompt = self.prompt_builder.build_system_prompt()
            user_prompt = self.prompt_builder.build_user_prompt(
                repo_name=repo_name,
                run_id=run_id,
                log_content=clean_log,
                source_code_context=combined_code_context
            )

            raw_ai_response = await self.claude.analyze_failure(
                system_prompt=system_prompt,
                user_prompt=user_prompt,
                raw_log=clean_log,
                code_context=combined_code_context
            )
            result_record.raw_response = raw_ai_response

            # 7. Validate AI response format and constraints
            is_valid, parsed_analysis, err = self.validator.validate(
                raw_ai_response)

            # If AI response was unparseable or returned an unknown generic category, trigger contextual rule engine fallback
            if not is_valid or not parsed_analysis or parsed_analysis.failure_category == "unknown":
                print(
                    f"[TriageService] AI output was invalid or unknown ({err}). Running high-fidelity rule engine fallback...")
                fallback_raw = self.claude._fallback_local_analysis(
                    raw_log=clean_log,
                    code_context=combined_code_context,
                    full_prompt=user_prompt
                )
                fb_valid, fb_parsed, fb_err = self.validator.validate(
                    fallback_raw)
                if fb_valid and fb_parsed and fb_parsed.failure_category != "unknown":
                    parsed_analysis = fb_parsed
                elif not parsed_analysis:
                    parsed_analysis = fb_parsed or AIAnalysisOutput(
                        failure_category="unknown",
                        confidence_score=0.5,
                        root_cause=f"AI output parsing warning: {err or 'Unknown format'}",
                        suggested_fix="Check raw console log output directly on GitHub Actions."
                    )

            # Update fields in record
            result_record.failure_category = parsed_analysis.failure_category
            result_record.confidence_score = parsed_analysis.confidence_score
            result_record.root_cause = parsed_analysis.root_cause
            result_record.suggested_fix = parsed_analysis.suggested_fix

            # 8. Format Markdown report
            markdown_report = self.formatter.format_report(
                parsed_analysis, repo_name, run_id)
            if combined_code_context:
                markdown_report += f"\n\n<details><summary><b>📂 Relevant Source Code Context ({len(files_fetched)} file(s) inspected)</b></summary>\n\n```tsx\n{combined_code_context}\n```\n</details>"

            # 9. Dispatch Comment to GitHub (PR or Commit for real webhooks)
            comment_posted = False
            comment_url = None

            if not raw_log_override:
                if pr_number:
                    comment_res = await self.github.post_pr_comment(repo_name, pr_number, markdown_report)
                    if comment_res:
                        comment_posted = True
                        comment_url = comment_res.get("html_url")
                elif commit_sha:
                    comment_res = await self.github.post_commit_comment(repo_name, commit_sha, markdown_report)
                    if comment_res:
                        comment_posted = True
                        comment_url = comment_res.get("html_url")

            result_record.status = "posted" if (
                comment_posted or raw_log_override or not (pr_number or commit_sha)) else "error"
            result_record.github_comment_url = comment_url
            db.commit()
            db.refresh(result_record)
            return result_record

        except Exception as e:
            print(f"[TriageService Error in run #{run_id}]: {str(e)}")
            try:
                # Open fresh session to save error status reliably
                with SessionLocal() as err_db:
                    rec = err_db.query(TriageResult).filter_by(
                        repo_name=repo_name, run_id=run_id).first()
                    if rec:
                        rec.status = "error"
                        rec.failure_category = rec.failure_category if rec.failure_category and rec.failure_category != "unknown" else "syntax_error"
                        rec.root_cause = rec.root_cause or f"Triage encountered an issue: {str(e)}"
                        rec.suggested_fix = rec.suggested_fix or "Inspect raw GitHub Actions workflow logs or trigger a re-run."
                        err_db.commit()
            except Exception as dbe:
                print(f"[Failed to update error status in DB]: {dbe}")
            raise e
        finally:
            if db:
                db.close()
