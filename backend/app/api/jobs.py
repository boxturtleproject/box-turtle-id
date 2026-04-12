# ABOUTME: API endpoints for background job status tracking.
# ABOUTME: Provides status and result retrieval for async operations.

import json
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Job
from app.schemas.job import JobResponse

router = APIRouter()


@router.get("/jobs", response_model=list[JobResponse])
async def list_jobs(
    status: Optional[str] = Query(None, description="Filter by status"),
    job_type: Optional[str] = Query(None, description="Filter by job type"),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    """List recent jobs with optional filtering."""
    query = db.query(Job).order_by(Job.created_at.desc())

    if status:
        query = query.filter(Job.status == status)
    if job_type:
        query = query.filter(Job.job_type == job_type)

    jobs = query.limit(limit).all()

    results = []
    for job in jobs:
        response = JobResponse(
            id=job.id,
            job_type=job.job_type,
            status=job.status,
            progress=job.progress,
            result_data=json.loads(job.result_data) if job.result_data else None,
            error_message=job.error_message,
            created_at=job.created_at,
            completed_at=job.completed_at,
        )
        results.append(response)

    return results


@router.get("/jobs/{job_id}", response_model=JobResponse)
async def get_job(job_id: str, db: Session = Depends(get_db)):
    """Get status and results of a specific job."""
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    return JobResponse(
        id=job.id,
        job_type=job.job_type,
        status=job.status,
        progress=job.progress,
        result_data=json.loads(job.result_data) if job.result_data else None,
        error_message=job.error_message,
        created_at=job.created_at,
        completed_at=job.completed_at,
    )


@router.delete("/jobs/{job_id}", status_code=204)
async def delete_job(job_id: str, db: Session = Depends(get_db)):
    """Delete a completed or failed job."""
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    if job.status in ("pending", "running"):
        raise HTTPException(
            status_code=400,
            detail="Cannot delete a running or pending job",
        )

    db.delete(job)
    db.commit()
