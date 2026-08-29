# backend/controllers/settings.py
import os
from fastapi import APIRouter
from models.schemas import SystemSettingsDTO

router = APIRouter(prefix="/api/settings", tags=["Settings"])

# Global runtime memory cache for system settings
RUNTIME_SETTINGS = {
    "claude_api_key": "",
    "github_token": "",
    "webhook_secret": "",
    "max_log_tokens": 3000,
    "rate_limit_per_min": 60,
    "debug_mode": False
}

@router.get("", response_model=SystemSettingsDTO)
@router.get("/", response_model=SystemSettingsDTO)
async def get_settings():
    """Returns current system configuration masked for security."""
    def mask(val: str) -> str:
        if not val:
            return ""
        if len(val) <= 8:
            return "********"
        return val[:6] + "..." + val[-4:]

    current_claude = RUNTIME_SETTINGS.get("claude_api_key") or os.getenv("CLAUDE_API_KEY", "") or os.getenv("GEMINI_API_KEY", "")
    current_github = RUNTIME_SETTINGS.get("github_token") or os.getenv("GITHUB_TOKEN", "")
    current_secret = RUNTIME_SETTINGS.get("webhook_secret") or os.getenv("WEBHOOK_SECRET", "")

    return {
        "claude_api_key": mask(current_claude),
        "github_token": mask(current_github),
        "webhook_secret": mask(current_secret),
        "max_log_tokens": RUNTIME_SETTINGS.get("max_log_tokens", 3000),
        "rate_limit_per_min": RUNTIME_SETTINGS.get("rate_limit_per_min", 60),
        "debug_mode": RUNTIME_SETTINGS.get("debug_mode", False)
    }

@router.post("", response_model=SystemSettingsDTO)
@router.post("/", response_model=SystemSettingsDTO)
async def update_settings(settings: SystemSettingsDTO):
    """Updates runtime environment settings."""
    if settings.claude_api_key and not settings.claude_api_key.startswith("sk-ant-***") and not settings.claude_api_key.startswith("****"):
        RUNTIME_SETTINGS["claude_api_key"] = settings.claude_api_key
        os.environ["CLAUDE_API_KEY"] = settings.claude_api_key

    if settings.github_token and not settings.github_token.startswith("ghp_***") and not settings.github_token.startswith("****"):
        RUNTIME_SETTINGS["github_token"] = settings.github_token
        os.environ["GITHUB_TOKEN"] = settings.github_token

    if settings.webhook_secret and not settings.webhook_secret.startswith("***") and not settings.webhook_secret.startswith("****"):
        RUNTIME_SETTINGS["webhook_secret"] = settings.webhook_secret
        os.environ["WEBHOOK_SECRET"] = settings.webhook_secret

    RUNTIME_SETTINGS["max_log_tokens"] = settings.max_log_tokens
    RUNTIME_SETTINGS["rate_limit_per_min"] = settings.rate_limit_per_min
    RUNTIME_SETTINGS["debug_mode"] = settings.debug_mode

    return await get_settings()

