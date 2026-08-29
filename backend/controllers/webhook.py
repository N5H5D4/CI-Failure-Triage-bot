# backend/controllers/webhook.py
import os
import hmac
import hashlib
from typing import Optional
from fastapi import APIRouter, Request, Header, HTTPException, BackgroundTasks
from services.triage_service import TriageService

router = APIRouter(prefix="/webhook", tags=["Webhook"])
triage_service = TriageService()

async def verify_signature(payload: bytes, signature: Optional[str]):
    """HMAC-SHA256 verification against WEBHOOK_SECRET."""
    secret_str = os.getenv("WEBHOOK_SECRET", "")
    if not secret_str:
        # If no secret configured in dev mode, skip verification
        return

    if not signature:
        raise HTTPException(status_code=401, detail="X-Hub-Signature-256 header is missing!")

    secret_bytes = secret_str.encode("utf-8")
    expected_sig = "sha256=" + hmac.new(secret_bytes, payload, hashlib.sha256).hexdigest()

    if not hmac.compare_digest(expected_sig, signature):
        raise HTTPException(status_code=401, detail="Invalid HMAC-SHA256 webhook signature!")

async def background_triage_handler(repo_name: str, run_id: int, pr_number: Optional[int], commit_sha: Optional[str]):
    try:
        await triage_service.execute_triage(
            repo_name=repo_name,
            run_id=run_id,
            pr_number=pr_number,
            commit_sha=commit_sha
        )
    except Exception as err:
        print(f"[Background Triage Failed]: {err}")

@router.post("")
@router.post("/")
@router.post("/github")
async def receive_github_webhook(
    request: Request,
    background_tasks: BackgroundTasks,
    x_hub_signature_256: Optional[str] = Header(None),
    x_github_event: Optional[str] = Header(None)
):
    """
    GitHub Webhook receiver endpoint.
    Only processes `workflow_run` events that are completed with a 'failure' conclusion.
    """
    payload_bytes = await request.body()
    await verify_signature(payload_bytes, x_hub_signature_256)

    try:
        data = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON payload")

    event_type = x_github_event or "workflow_run"
    action = data.get("action")
    workflow_run = data.get("workflow_run", {})
    conclusion = workflow_run.get("conclusion")

    # Filter condition: workflow_run completed with failure conclusion
    if action == "completed" and conclusion == "failure":
        repo_data = data.get("repository", {})
        repo_name = repo_data.get("full_name")
        run_id = workflow_run.get("id")
        commit_sha = workflow_run.get("head_sha")

        if not repo_name or not run_id:
            raise HTTPException(status_code=422, detail="Missing repository full_name or run_id in payload")

        # Extract PR Number if triggered by a pull request event
        pr_number = None
        pull_requests = workflow_run.get("pull_requests", [])
        if pull_requests and len(pull_requests) > 0:
            pr_number = pull_requests[0].get("number")

        # Queue background processing so HTTP response returns immediately (<100ms)
        background_tasks.add_task(
            background_triage_handler,
            repo_name=repo_name,
            run_id=run_id,
            pr_number=pr_number,
            commit_sha=commit_sha
        )

        return {
            "status": "accepted",
            "message": f"CI Failure triage queued for {repo_name} (Run #{run_id})",
            "run_id": run_id,
            "pr_number": pr_number
        }

    # If ping or push event or non-failure
    if x_github_event == "ping":
        return {"status": "pong", "zen": data.get("zen", "Keep it logically awesome.")}

    return {"status": "ignored", "message": f"Event '{event_type}' with action '{action}' & conclusion '{conclusion}' is not a failed workflow run."}
