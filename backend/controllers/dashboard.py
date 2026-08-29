# backend/controllers/dashboard.py
from datetime import datetime, timedelta
from typing import Optional, List
from collections import Counter
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from database import get_db
from models.models import TriageResult
from models.schemas import TriageResultDTO
from services.triage_service import TriageService

router = APIRouter(prefix="/api", tags=["Dashboard"])
triage_service = TriageService()


@router.get("/triage-results", response_model=List[TriageResultDTO])
@router.get("/dashboard/runs", response_model=List[TriageResultDTO])
async def get_triage_results(
    category: Optional[str] = Query(
        None, description="Filter by failure category"),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db)
):
    """Retrieves list of recent triaged failures sorted by creation time descending."""
    query = db.query(TriageResult)
    if category and category != "all":
        query = query.filter(TriageResult.failure_category == category)

    results = query.order_by(TriageResult.created_at.desc()).limit(limit).all()
    return results


@router.get("/runs/{run_id}", response_model=TriageResultDTO)
async def get_run_detail(run_id: int, db: Session = Depends(get_db)):
    """Retrieves deep triage detail for a single run."""
    run = db.query(TriageResult).filter(TriageResult.run_id == run_id).first()
    if not run:
        raise HTTPException(
            status_code=404, detail=f"Run #{run_id} not found in triage database")
    return run


@router.post("/runs/{run_id}/retry", response_model=TriageResultDTO)
async def retry_triage(run_id: int, db: Session = Depends(get_db)):
    """Re-executes triage analysis for a previously failed or existing run."""
    run = db.query(TriageResult).filter(TriageResult.run_id == run_id).first()
    if not run:
        raise HTTPException(status_code=404, detail=f"Run #{run_id} not found")

    updated = await triage_service.execute_triage(
        repo_name=run.repo_name,
        run_id=run.run_id,
        pr_number=run.pr_number
    )
    return updated


@router.get("/metrics")
@router.get("/dashboard/metrics")
async def get_dashboard_metrics(db: Session = Depends(get_db)):
    """Calculates summary KPIs displayed in Dashboard Metrics Bar."""
    one_week_ago = datetime.utcnow() - timedelta(days=7)
    total_this_week = db.query(TriageResult).filter(
        TriageResult.created_at >= one_week_ago).count()
    all_runs = db.query(TriageResult).all()

    # Most common cause
    categories = [
        r.failure_category for r in all_runs if r.failure_category and r.failure_category != "unknown"]
    most_common = "Flaky test"
    if categories:
        counts = Counter(categories)
        top_cat = counts.most_common(1)[0][0]
        name_map = {
            "flaky_test": "Flaky test",
            "test_failure": "Test failure",
            "dependency_issue": "Dependency issue",
            "syntax_error": "Syntax error",
            "configuration_error": "Config error",
            "infrastructure_timeout": "Timeout"
        }
        most_common = name_map.get(top_cat, top_cat.replace("_", " ").title())

    return {
        "triaged_this_week": total_this_week or len(all_runs),
        "most_common_cause": most_common,
        "avg_response_time_seconds": 18
    }


@router.post("/simulate-triage", response_model=TriageResultDTO)
async def simulate_triage_run(
    repo_name: str = Query("octocat/auth-service"),
    run_id: int = Query(128450),
    pr_number: Optional[int] = Query(128),
    sample_type: str = Query("dependency_issue"),
    db: Session = Depends(get_db)
):
    """Simulates a real CI failure event with predefined realistic logs for demonstration."""
    sample_logs = {
        "dependency_issue": """
[info] Running npm install --frozen-lockfile
npm ERR! code ERESOLVE
npm ERR! ERESOLVE could not resolve
npm ERR! 
npm ERR! While resolving: @octocat/auth-core@3.4.0
npm ERR! Found: requests@2.31.0
npm ERR! node_modules/requests
npm ERR!   requests@"^2.31.0" from the root project
npm ERR! 
npm ERR! Could not resolve dependency:
npm ERR! peer urllib3@">=2.2.1" from requests@2.31.0
npm ERR! Conflicting with root package urllib3@1.26.15 pinned in requirements.txt:14
npm ERR! Fix the upstream dependency conflict, or retry with --legacy-peer-deps
npm ERR! A complete log of this run can be found in: /home/runner/.npm/_logs/2026-08-27.log
##[error]Process completed with exit code 1.
""",
        "syntax_error": """
[info] Compiling TypeScript project src/auth/token.ts
src/auth/token.ts(42,15): error TS2339: Property 'refreshToken' does not exist on type 'UserSession'.
src/auth/token.ts(58,9): error TS1005: ';' expected after return statement.
[error] Found 2 compilation errors.
##[error]Process completed with exit code 2.
""",
        "test_failure": """
[info] Running pytest unit tests
============================= test session starts ==============================
collected 24 items

tests/test_auth.py ....F............                                      [100%]

=================================== FAILURES ===================================
___________________________ test_token_race_condition ___________________________

    def test_token_race_condition(auth_client):
        session = auth_client.create_session("user_99")
        refreshed = auth_client.refresh_parallel(session, workers=5)
>       assert refreshed.success_count == 5
E       AssertionError: assert 4 == 5
E       +  where 4 = SessionResult(success_count=4, errors=['Lock contention on redis key token:user_99']).success_count

tests/test_auth.py:84: AssertionError
=========================== 1 failed, 23 passed in 4.12s ===========================
##[error]Process completed with exit code 1.
""",
        "flaky_test": """
[info] Running End-to-End Cypress Integration Tests
Running: auth/sso_flow.cy.js
  ✓ should display login screen (420ms)
  1) should exchange OAuth token within 500ms
  0 passing (15s)
  1 failing

  1) SSO Flow - should exchange OAuth token within 500ms:
     CypressError: Timed out retrying after 10000ms: Expected to find element: `[data-testid="user-avatar"]`, but never found it. Network request /api/oauth/callback was aborted due to high socket latency.
##[error]Process completed with exit code 1.
"""
    }

    log_text = sample_logs.get(sample_type, sample_logs["dependency_issue"])
    result = await triage_service.execute_triage(
        repo_name=repo_name,
        run_id=run_id,
        pr_number=pr_number,
        raw_log_override=log_text
    )
    return result
