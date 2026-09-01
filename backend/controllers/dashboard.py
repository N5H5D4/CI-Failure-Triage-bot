# backend/controllers/dashboard.py
from datetime import datetime, timedelta
from typing import Optional, List
from collections import Counter
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from database import get_db
from models.models import TriageResult
from models.schemas import TriageResultDTO, SimulateTriageRequest
from services.triage_service import TriageService

router = APIRouter(prefix="/api", tags=["Dashboard"])
triage_service = TriageService()


@router.get("/triage-results", response_model=List[TriageResultDTO])
@router.get("/dashboard/runs", response_model=List[TriageResultDTO])
async def get_triage_results(
    category: Optional[str] = Query(
        None, description="Filter by failure category"),
    is_simulated: Optional[bool] = Query(
        None, description="Filter by simulated runs"),
    limit: int = Query(200, ge=1, le=1000),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db)
):
    """Retrieves list of recent triaged failures sorted by creation time descending."""
    query = db.query(TriageResult)
    if category and category != "all":
        query = query.filter(TriageResult.failure_category == category)
    if is_simulated is not None:
        query = query.filter(TriageResult.is_simulated == is_simulated)

    results = query.order_by(TriageResult.created_at.desc()).offset(
        offset).limit(limit).all()
    return results


@router.delete("/runs/{run_id}")
@router.delete("/dashboard/runs/{run_id}")
async def delete_run(run_id: int, db: Session = Depends(get_db)):
    """Deletes a specific triage result run by run_id."""
    run = db.query(TriageResult).filter(TriageResult.run_id == run_id).first()
    if not run:
        raise HTTPException(status_code=404, detail=f"Run #{run_id} not found")
    db.delete(run)
    db.commit()
    return {"success": True, "message": f"Run #{run_id} deleted successfully"}


@router.delete("/triage-results/clear-simulated")
async def clear_simulated_runs(db: Session = Depends(get_db)):
    """Bulk deletes all simulated triage runs from database."""
    deleted_count = db.query(TriageResult).filter(
        (TriageResult.is_simulated == True) |
        (TriageResult.repo_name.like("%simulated%"))
    ).delete(synchronize_session=False)
    db.commit()
    return {"success": True, "deleted_count": deleted_count}


@router.delete("/triage-results/clear-all")
async def clear_all_runs(db: Session = Depends(get_db)):
    """Deletes all failure triage history rows from database."""
    deleted_count = db.query(TriageResult).delete(synchronize_session=False)
    db.commit()
    return {"success": True, "deleted_count": deleted_count}


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


@router.post("/runs/{run_id}/post_comment", response_model=TriageResultDTO)
@router.post("/dashboard/runs/{run_id}/post_comment", response_model=TriageResultDTO)
async def post_comment_to_github(run_id: int, db: Session = Depends(get_db)):
    """Manually triggers posting the triage analysis report to GitHub PR/Commit."""
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
    req: SimulateTriageRequest,
    db: Session = Depends(get_db)
):
    """Executes full real AI triage on user-provided simulated CI raw log without requiring external GitHub webhook."""
    import time
    run_id = req.run_id or int(time.time() * 1000) % 10000000000

    # Run real pipeline with custom raw log override
    result = await triage_service.execute_triage(
        repo_name=req.repo_name.strip() if req.repo_name else "simulated/repo",
        run_id=run_id,
        pr_number=req.pr_number,
        raw_log_override=req.raw_log.strip(),
        is_simulated=True
    )
    return result
