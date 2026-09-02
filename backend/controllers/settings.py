# backend/controllers/settings.py
import os
from pathlib import Path
import httpx
from typing import Optional
from fastapi import APIRouter
from models.schemas import SystemSettingsDTO

router = APIRouter(prefix="/api/settings", tags=["Settings"])

# Global runtime memory cache for system settings
RUNTIME_SETTINGS = {
    "groq_api_key": "",
    "claude_api_key": "",
    "github_token": "",
    "webhook_secret": "",
    "max_log_tokens": 3000,
    "rate_limit_per_min": 60,
    "debug_mode": False
}


def persist_env_file(key: str, value: str):
    """Writes or updates an environment variable in all relevant .env files."""
    if not key or not value or is_secret_masked(value):
        return

    clean_val = value.strip().strip("'").strip('"')
    target_files = [
        Path.cwd() / ".env",
        Path(__file__).resolve().parent.parent / ".env",
        Path(__file__).resolve().parent.parent.parent / ".env"
    ]

    for env_path in target_files:
        try:
            lines = []
            found = False
            if env_path.exists():
                with open(env_path, "r", encoding="utf-8") as f:
                    for line in f:
                        if line.startswith(f"{key}=") or line.startswith(f"export {key}="):
                            lines.append(f"{key}={clean_val}\n")
                            found = True
                        else:
                            lines.append(line)
            if not found:
                lines.append(f"{key}={clean_val}\n")

            with open(env_path, "w", encoding="utf-8") as f:
                f.writelines(lines)
        except Exception as e:
            print(f"[Warn] Could not write {key} to {env_path}: {e}")


def is_secret_masked(val: Optional[str]) -> bool:
    if not val:
        return True
    val_clean = val.strip()
    return (
        "..." in val_clean
        or "***" in val_clean
        or "•" in val_clean
        or val_clean.startswith("****")
        or val_clean.startswith("********")
    )


def sanitize_key(val: Optional[str]) -> str:
    if not val:
        return ""
    clean = val.strip().strip("'").strip('"')
    return clean


def get_effective_groq_key() -> str:
    """Returns the actual unmasked Groq API key from memory or environment."""
    raw = RUNTIME_SETTINGS.get("groq_api_key") or os.getenv("GROQ_API_KEY", "")
    return sanitize_key(raw)


def get_effective_github_token() -> str:
    """Returns the actual unmasked GitHub token from memory or environment."""
    raw = RUNTIME_SETTINGS.get("github_token") or os.getenv("GITHUB_TOKEN", "")
    return sanitize_key(raw)


def get_effective_claude_key() -> str:
    """Returns the actual unmasked Claude API key from memory or environment."""
    raw = RUNTIME_SETTINGS.get("claude_api_key") or os.getenv(
        "CLAUDE_API_KEY", "") or os.getenv("ANTHROPIC_API_KEY", "")
    return sanitize_key(raw)


def get_effective_webhook_secret() -> str:
    """Returns the actual unmasked Webhook secret from memory or environment."""
    raw = RUNTIME_SETTINGS.get(
        "webhook_secret") or os.getenv("WEBHOOK_SECRET", "")
    return sanitize_key(raw)


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

    current_groq = get_effective_groq_key()
    current_claude = get_effective_claude_key()
    current_github = get_effective_github_token()
    current_secret = get_effective_webhook_secret()

    return {
        "groq_api_key": mask(current_groq),
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
    if settings.groq_api_key and not is_secret_masked(settings.groq_api_key):
        clean_key = sanitize_key(settings.groq_api_key)
        if clean_key:
            RUNTIME_SETTINGS["groq_api_key"] = clean_key
            os.environ["GROQ_API_KEY"] = clean_key
            persist_env_file("GROQ_API_KEY", clean_key)

    if settings.claude_api_key and not is_secret_masked(settings.claude_api_key):
        clean_key = sanitize_key(settings.claude_api_key)
        if clean_key:
            RUNTIME_SETTINGS["claude_api_key"] = clean_key
            os.environ["CLAUDE_API_KEY"] = clean_key
            persist_env_file("CLAUDE_API_KEY", clean_key)

    if settings.github_token and not is_secret_masked(settings.github_token):
        clean_token = sanitize_key(settings.github_token)
        if clean_token:
            RUNTIME_SETTINGS["github_token"] = clean_token
            os.environ["GITHUB_TOKEN"] = clean_token
            persist_env_file("GITHUB_TOKEN", clean_token)

    if settings.webhook_secret and not is_secret_masked(settings.webhook_secret):
        clean_secret = sanitize_key(settings.webhook_secret)
        if clean_secret:
            RUNTIME_SETTINGS["webhook_secret"] = clean_secret
            os.environ["WEBHOOK_SECRET"] = clean_secret
            persist_env_file("WEBHOOK_SECRET", clean_secret)

    RUNTIME_SETTINGS["max_log_tokens"] = settings.max_log_tokens
    RUNTIME_SETTINGS["rate_limit_per_min"] = settings.rate_limit_per_min
    RUNTIME_SETTINGS["debug_mode"] = settings.debug_mode

    return await get_settings()


@router.post("/test-groq-key")
@router.post("/test-groq")
async def test_groq_key(payload: Optional[dict] = None):
    """Actively verifies Groq API Key validity against https://api.groq.com/openai/v1/chat/completions."""
    key = None
    if payload and payload.get("apiKey"):
        provided = payload.get("apiKey", "").strip()
        if not is_secret_masked(provided):
            key = provided
    elif payload and payload.get("groq_api_key"):
        provided = payload.get("groq_api_key", "").strip()
        if not is_secret_masked(provided):
            key = provided

    if not key:
        key = get_effective_groq_key()

    if key:
        key = sanitize_key(key)

    if not key:
        return {
            "valid": False,
            "message": "Chưa có GROQ_API_KEY. Vui lòng dán khóa Groq API Key của bạn (bắt đầu bằng gsk_...)."
        }

    try:
        timeout_cfg = httpx.Timeout(
            connect=10.0, read=20.0, write=10.0, pool=10.0)
        async with httpx.AsyncClient(timeout=timeout_cfg, follow_redirects=True) as client:
            headers = {
                "Content-Type": "application/json",
                "Authorization": f"Bearer {key}",
            }
            url = "https://api.groq.com/openai/v1/chat/completions"

            resp = await client.post(
                url,
                headers=headers,
                json={
                    "model": "llama-3.3-70b-versatile",
                    "messages": [{"role": "user", "content": "Ping"}],
                    "max_tokens": 10
                }
            )

            if resp.status_code == 200:
                data = resp.json()
                model_used = data.get("model", "llama-3.3-70b-versatile")
                RUNTIME_SETTINGS["groq_api_key"] = key
                os.environ["GROQ_API_KEY"] = key
                persist_env_file("GROQ_API_KEY", key)
                return {
                    "valid": True,
                    "message": f"Kết nối Groq API ({model_used}) thành công! AI Engine sẵn sàng chẩn đoán lỗi CI/CD với tốc độ siêu nhanh.",
                    "model": model_used,
                    "status": "online"
                }
            elif resp.status_code == 401:
                return {
                    "valid": False,
                    "message": "Lỗi xác thực (HTTP 401): Khóa Groq API Key không hợp lệ hoặc đã bị thu hồi. Vui lòng lấy khóa miễn phí tại https://console.groq.com/keys."
                }
            elif resp.status_code == 429:
                return {
                    "valid": False,
                    "message": "Quá tải tần suất (HTTP 429 Rate Limit): Vượt quá số lượt gọi API trong một khoảng thời gian. Vui lòng thử lại sau vài giây."
                }
            else:
                return {
                    "valid": False,
                    "message": f"Groq API trả về mã lỗi HTTP {resp.status_code}: {resp.text}"
                }
    except httpx.TimeoutException:
        return {
            "valid": False,
            "message": "Hết thời gian chờ phản hồi (Timeout) khi kết nối tới máy chủ Groq API (api.groq.com)."
        }
    except Exception as e:
        err_msg = str(e) or repr(
            e) or "Không thể thiết lập kết nối đến máy chủ Groq."
        return {
            "valid": False,
            "message": f"Lỗi kết nối Groq: {err_msg}"
        }


@router.post("/test-claude-key")
@router.post("/test-claude")
async def test_claude_key(payload: Optional[dict] = None):
    """Actively verifies Anthropic Claude API key validity against the Anthropic Messages API."""
    key = None
    if payload and payload.get("apiKey"):
        provided = payload.get("apiKey", "").strip()
        if not is_secret_masked(provided):
            key = provided
    elif payload and payload.get("claude_api_key"):
        provided = payload.get("claude_api_key", "").strip()
        if not is_secret_masked(provided):
            key = provided

    if not key:
        key = get_effective_claude_key()

    if key:
        key = sanitize_key(key)

    if not key:
        return {
            "valid": False,
            "message": "Missing CLAUDE_API_KEY. Please provide a valid Anthropic API key (starts with sk-ant-...)."
        }

    try:
        from anthropic import AsyncAnthropic
        client = AsyncAnthropic(api_key=key)
        response = await client.messages.create(
            model="claude-3-5-haiku-20241022",
            max_tokens=10,
            messages=[{"role": "user", "content": "Ping"}]
        )
        if response and response.content:
            RUNTIME_SETTINGS["claude_api_key"] = key
            os.environ["CLAUDE_API_KEY"] = key
            persist_env_file("CLAUDE_API_KEY", key)
            return {
                "valid": True,
                "message": "Anthropic Claude API connected successfully! The API key is valid and the bot is ready to triage CI failures.",
                "model": response.model
            }
        return {"valid": True, "message": "Claude API connected successfully!"}
    except Exception as e:
        err_msg = str(e)
        if "401" in err_msg or "authentication_error" in err_msg or "invalid" in err_msg.lower():
            friendly = "Authentication Error (HTTP 401): The Anthropic API key is invalid, inactive, or revoked. Please verify your key at console.anthropic.com."
        elif "429" in err_msg or "rate_limit" in err_msg or "credit" in err_msg.lower():
            friendly = "Rate Limit / Credits Exceeded (HTTP 429): Your Anthropic account has run out of credits or reached its usage limit."
        else:
            friendly = f"Claude API connection error: {err_msg}"
        return {
            "valid": False,
            "message": friendly,
            "raw_error": err_msg
        }


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
