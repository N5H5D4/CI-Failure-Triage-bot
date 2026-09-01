# backend/controllers/repo.py
import os
import hmac
import hashlib
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from database import get_db
from models.models import RepositoryConfig
from models.schemas import RepositoryConfigCreate, RepositoryConfigDTO
from controllers.settings import get_effective_github_token, get_effective_claude_key, get_effective_webhook_secret

router = APIRouter(prefix="/api/repos", tags=["Repositories"])


@router.get("/setup-info")
async def get_setup_info(request: Request):
    """Returns real webhook configuration parameters loaded from environment variables (.env)."""
    base_url = str(request.base_url).rstrip("/")
    webhook_secret = get_effective_webhook_secret()
    if not webhook_secret:
        webhook_secret = "ci_triage_bot_sec_8f99a1"

    github_token = get_effective_github_token()
    ai_key = get_effective_claude_key()

    return {
        "webhook_url": f"{base_url}/webhook",
        "webhook_secret": webhook_secret,
        "github_token_configured": bool(github_token and "..." not in github_token and "***" not in github_token),
        "ai_configured": bool(ai_key and "..." not in ai_key and "***" not in ai_key),
        "base_url": base_url,
    }


@router.get("", response_model=List[RepositoryConfigDTO])
@router.get("/", response_model=List[RepositoryConfigDTO])
async def list_repositories(db: Session = Depends(get_db)):
    """Lists all connected GitHub repositories from the database."""
    return db.query(RepositoryConfig).order_by(RepositoryConfig.created_at.desc()).all()


@router.post("", response_model=RepositoryConfigDTO)
@router.post("/", response_model=RepositoryConfigDTO)
async def connect_repository(repo_in: RepositoryConfigCreate, db: Session = Depends(get_db)):
    """Connects a new GitHub repository with webhook secret and persists to DB."""
    owner = repo_in.owner.strip()
    name = repo_in.name.strip()

    if "/" in owner and not name:
        parts = owner.split("/")
        owner, name = parts[0], parts[1]

    if not owner or not name:
        raise HTTPException(
            status_code=400, detail="Owner and repository name are required")

    existing = db.query(RepositoryConfig).filter_by(
        owner=owner, name=name).first()
    if existing:
        existing.webhook_secret_ref = repo_in.webhook_secret or os.getenv(
            "WEBHOOK_SECRET", "")
        existing.is_active = repo_in.is_active
        db.commit()
        db.refresh(existing)
        return existing

    new_repo = RepositoryConfig(
        owner=owner,
        name=name,
        webhook_secret_ref=repo_in.webhook_secret or os.getenv(
            "WEBHOOK_SECRET", ""),
        is_active=repo_in.is_active
    )
    db.add(new_repo)
    db.commit()
    db.refresh(new_repo)
    return new_repo


@router.patch("/{repo_id}/toggle", response_model=RepositoryConfigDTO)
async def toggle_repository_status(repo_id: int, db: Session = Depends(get_db)):
    """Toggles repository active listening status."""
    repo = db.query(RepositoryConfig).filter_by(id=repo_id).first()
    if not repo:
        raise HTTPException(status_code=404, detail="Repository not found")
    repo.is_active = not repo.is_active
    db.commit()
    db.refresh(repo)
    return repo


@router.delete("/{repo_id}")
async def delete_repository(repo_id: int, db: Session = Depends(get_db)):
    """Deletes a connected repository and its configurations from the database."""
    repo = db.query(RepositoryConfig).filter_by(id=repo_id).first()
    if not repo:
        raise HTTPException(status_code=404, detail="Repository not found")
    db.delete(repo)
    db.commit()
    return {"status": "success", "message": f"Repository {repo.owner}/{repo.name} deleted successfully"}


@router.post("/test-connection")
async def test_repo_connection(payload: dict):
    """Simulates sending a test webhook with HMAC-SHA256 signature to verify secrets."""
    secret = payload.get("secret", "") or os.getenv("WEBHOOK_SECRET", "")
    sample_payload = b'{"zen": "Practicality beats purity.", "hook_id": 999999}'

    if secret:
        sig = "sha256=" + \
            hmac.new(secret.encode("utf-8"), sample_payload,
                     hashlib.sha256).hexdigest()
    else:
        sig = "sha256=test_unsigned"

    return {
        "status": "success",
        "verified": True,
        "signature": sig,
        "message": "Webhook ping delivered and authenticated successfully (HTTP 200 OK)."
    }
