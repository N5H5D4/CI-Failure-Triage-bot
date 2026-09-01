# backend/controllers/settings.py
import os
import httpx
from typing import Optional
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


def is_secret_masked(val: Optional[str]) -> bool:
    if not val:
        return True
    val_clean = val.strip()
    return "..." in val_clean or "***" in val_clean or val_clean.startswith("****") or val_clean.startswith("********")


def get_effective_github_token() -> str:
    """Returns the actual unmasked GitHub token from memory or environment."""
    return RUNTIME_SETTINGS.get("github_token") or os.getenv("GITHUB_TOKEN", "")


def get_effective_claude_key() -> str:
    """Returns the actual unmasked Claude/Gemini API key from memory or environment."""
    return RUNTIME_SETTINGS.get("claude_api_key") or os.getenv("CLAUDE_API_KEY", "") or os.getenv("GEMINI_API_KEY", "")


def get_effective_webhook_secret() -> str:
    """Returns the actual unmasked Webhook secret from memory or environment."""
    return RUNTIME_SETTINGS.get("webhook_secret") or os.getenv("WEBHOOK_SECRET", "")


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

    current_claude = get_effective_claude_key()
    current_github = get_effective_github_token()
    current_secret = get_effective_webhook_secret()

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
    """Updates runtime environment settings, ignoring masked placeholders."""
    if settings.claude_api_key and not is_secret_masked(settings.claude_api_key):
        clean_key = settings.claude_api_key.strip()
        RUNTIME_SETTINGS["claude_api_key"] = clean_key
        os.environ["CLAUDE_API_KEY"] = clean_key

    if settings.github_token and not is_secret_masked(settings.github_token):
        clean_token = settings.github_token.strip()
        RUNTIME_SETTINGS["github_token"] = clean_token
        os.environ["GITHUB_TOKEN"] = clean_token

    if settings.webhook_secret and not is_secret_masked(settings.webhook_secret):
        clean_secret = settings.webhook_secret.strip()
        RUNTIME_SETTINGS["webhook_secret"] = clean_secret
        os.environ["WEBHOOK_SECRET"] = clean_secret

    RUNTIME_SETTINGS["max_log_tokens"] = settings.max_log_tokens
    RUNTIME_SETTINGS["rate_limit_per_min"] = settings.rate_limit_per_min
    RUNTIME_SETTINGS["debug_mode"] = settings.debug_mode

    return await get_settings()


@router.post("/test-github-token")
async def test_github_token(payload: Optional[dict] = None):
    """Actively verifies GitHub token validity and scopes against GitHub REST API."""
    token = None
    if payload and payload.get("token"):
        provided = payload.get("token", "").strip()
        if not is_secret_masked(provided):
            token = provided

    if not token:
        token = get_effective_github_token()

    if not token:
        return {
            "valid": False,
            "message": "No GITHUB_TOKEN configured. Please enter a Personal Access Token (PAT)."
        }

    # Format header
    auth_header = token if token.startswith(
        "Bearer ") or token.startswith("token ") else f"Bearer {token}"
    headers = {
        "Accept": "application/vnd.github+json",
        "Authorization": auth_header,
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "CI-Failure-Triage-Bot/1.0"
    }

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            # 1. Test user/token endpoint
            resp = await client.get("https://api.github.com/user", headers=headers)
            scopes = resp.headers.get("x-oauth-scopes", "fine-grained-token")

            if resp.status_code == 200:
                user_info = resp.json()
                login = user_info.get("login", "Authenticated User")
                return {
                    "valid": True,
                    "user": login,
                    "scopes": scopes,
                    "status_code": 200,
                    "message": f"Successfully authenticated as GitHub user: @{login}."
                }
            elif resp.status_code == 401:
                return {
                    "valid": False,
                    "status_code": 401,
                    "message": "GitHub API returned 401 Unauthorized: Bad credentials. Please double-check your PAT token string."
                }
            else:
                # Fine-grained tokens might not have access to /user if restricted to specific repos
                rate_resp = await client.get("https://api.github.com/rate_limit", headers=headers)
                if rate_resp.status_code == 200:
                    return {
                        "valid": True,
                        "user": "Fine-Grained PAT",
                        "scopes": scopes,
                        "status_code": 200,
                        "message": "Fine-grained Personal Access Token verified successfully (Rate limit accessible)."
                    }
                return {
                    "valid": False,
                    "status_code": resp.status_code,
                    "message": f"GitHub API error (HTTP {resp.status_code}): {resp.text}"
                }
    except Exception as e:
        return {
            "valid": False,
            "message": f"Connection error testing GitHub Token: {str(e)}"
        }
