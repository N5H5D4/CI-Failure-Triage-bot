# backend/services/triage_service.py
import json
from datetime import datetime
from typing import Optional

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
    """Core Orchestrator Service coordinating log trimming, AI analysis, formatting, GitHub posting, and persistence."""

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

    async def execute_triage(
        self,
        repo_name: str,
        run_id: int,
        pr_number: Optional[int] = None,
        commit_sha: Optional[str] = None,
        raw_log_override: Optional[str] = None
    ) -> TriageResult:
        """Executes end-to-end triage pipeline."""
        db = SessionLocal()
        result_record = None

        try:
            # 1. Look up repository if registered
            parts = repo_name.split("/")
            repo_config = None
            if len(parts) == 2:
                owner, name = parts
                repo_config = db.query(RepositoryConfig).filter_by(owner=owner, name=name).first()

            # 2. Check if existing run record exists or create new pending record
            result_record = db.query(TriageResult).filter_by(repo_name=repo_name, run_id=run_id).first()
            if not result_record:
                result_record = TriageResult(
                    repository_id=repo_config.id if repo_config else None,
                    repo_name=repo_name,
                    run_id=run_id,
                    pr_number=pr_number,
                    status="pending"
                )
                db.add(result_record)
            else:
                result_record.status = "pending"
                if pr_number:
                    result_record.pr_number = pr_number

            db.commit()
            db.refresh(result_record)

            # 3. Retrieve raw log (either provided or fetched via GitHub API)
            if raw_log_override:
                raw_log = raw_log_override
            else:
                raw_log = await self.github.get_workflow_log(repo_name, run_id)

            # 4. Trim log to preserve relevant error signals and stay in token limits
            clean_log = self.trimmer.trim(raw_log)
            result_record.trimmed_log = clean_log

            # 5. Build prompt and execute LLM analysis via Claude
            system_prompt = self.prompt_builder.build_system_prompt()
            user_prompt = self.prompt_builder.build_user_prompt(repo_name, run_id, clean_log)

            raw_ai_response = await self.claude.analyze_failure(system_prompt, user_prompt)
            result_record.raw_response = raw_ai_response

            # 6. Validate AI response format and constraints
            is_valid, parsed_analysis, err = self.validator.validate(raw_ai_response)
            if not is_valid or not parsed_analysis:
                # Handle fallback if malformed
                parsed_analysis = AIAnalysisOutput(
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

            # 7. Format Markdown report
            markdown_report = self.formatter.format_report(parsed_analysis, repo_name, run_id)

            # 8. Dispatch Comment to GitHub (PR or Commit)
            comment_posted = False
            comment_url = None

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

            result_record.status = "posted" if (comment_posted or not (pr_number or commit_sha)) else "error"
            result_record.github_comment_url = comment_url
            db.commit()
            db.refresh(result_record)
            return result_record

        except Exception as e:
            if db:
                db.rollback()
            print(f"[TriageService Error in run #{run_id}]: {str(e)}")
            if result_record:
                result_record.status = "error"
                result_record.root_cause = f"System triage exception: {str(e)}"
                db.commit()
            raise e
        finally:
            db.close()
