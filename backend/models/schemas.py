# backend/models/schemas.py
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field

# Failure category enums / literals
# flaky_test, test_failure, dependency_issue, syntax_error, configuration_error, infrastructure_timeout, unknown


class AIAnalysisOutput(BaseModel):
    failure_category: str = Field(
        description="One of: flaky_test, test_failure, dependency_issue, syntax_error, configuration_error, infrastructure_timeout, unknown")
    confidence_score: float = Field(
        ge=0.0, le=1.0, description="Confidence between 0.0 and 1.0")
    root_cause: str = Field(
        description="Plain English or Vietnamese explanation referencing offending log lines")
    suggested_fix: str = Field(
        description="Concrete actionable remediation fix")


class TriageResultDTO(BaseModel):
    id: Optional[int] = None
    repo_name: str
    run_id: int
    pr_number: Optional[int] = None
    failure_category: str = "unknown"
    confidence_score: float = 0.0
    root_cause: Optional[str] = None
    suggested_fix: Optional[str] = None
    trimmed_log: Optional[str] = None
    raw_response: Optional[str] = None
    status: str = "pending"
    is_simulated: Optional[bool] = False
    github_comment_url: Optional[str] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class WebhookPayloadDTO(BaseModel):
    action: Optional[str] = None
    workflow_run: Optional[dict] = None
    repository: Optional[dict] = None


class SimulateTriageRequest(BaseModel):
    repo_name: str = "octocat/auth-service"
    run_id: Optional[int] = None
    pr_number: Optional[int] = None
    raw_log: str


class RepositoryConfigCreate(BaseModel):
    owner: str
    name: str
    webhook_secret: Optional[str] = None
    is_active: bool = True


class RepositoryConfigDTO(BaseModel):
    id: int
    owner: str
    name: str
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


class SystemSettingsDTO(BaseModel):
    claude_api_key: Optional[str] = None
    github_token: Optional[str] = None
    webhook_secret: Optional[str] = None
    max_log_tokens: int = 3000
    rate_limit_per_min: int = 60
    debug_mode: bool = False
