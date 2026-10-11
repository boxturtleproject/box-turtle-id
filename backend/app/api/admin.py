# ABOUTME: Temporary admin endpoints for data migration.
# ABOUTME: Provides bulk file upload capability for populating the volume.

import os
from pathlib import Path

from fastapi import APIRouter, File, HTTPException, UploadFile

from app.config import settings

router = APIRouter()


@router.post("/admin/upload-image")
async def upload_image(
    path: str,
    file: UploadFile = File(...),
):
    """Upload a file to the data directory. Path should be 'images/filename.jpg' or 'thumbnails/filename.jpg'."""
    # Validate path to prevent directory traversal
    if ".." in path or path.startswith("/"):
        raise HTTPException(status_code=400, detail="Invalid path")

    if not (path.startswith("images/") or path.startswith("thumbnails/")):
        raise HTTPException(status_code=400, detail="Path must start with 'images/' or 'thumbnails/'")

    target_path = settings.data_dir / path
    target_path.parent.mkdir(parents=True, exist_ok=True)

    content = await file.read()
    target_path.write_bytes(content)

    return {"status": "ok", "path": path, "size": len(content)}


@router.post("/admin/upload-yolo-weights")
async def upload_yolo_weights(file: UploadFile = File(...)):
    """Upload YOLO weights file to the data volume for persistence across deploys."""
    yolo_dir = settings.data_dir / "yolo"
    yolo_dir.mkdir(parents=True, exist_ok=True)
    target = yolo_dir / "yolov3_training_1000.weights"

    content = await file.read()
    target.write_bytes(content)

    return {"status": "ok", "path": str(target), "size": len(content)}


@router.get("/admin/list-files")
async def list_files():
    """List files in the data directory."""
    result = {"images": [], "thumbnails": []}

    images_dir = settings.data_dir / "images"
    if images_dir.exists():
        result["images"] = [f.name for f in images_dir.iterdir() if f.is_file()]

    thumbs_dir = settings.data_dir / "thumbnails"
    if thumbs_dir.exists():
        result["thumbnails"] = [f.name for f in thumbs_dir.iterdir() if f.is_file()]

    return result


# ---------------------------------------------------------------- fused matcher

@router.get("/admin/matching/status")
async def matching_status():
    """Readiness of the fused matcher: features computed, index size, mode."""
    from app.database import SessionLocal
    from app.models import Capture, CaptureMatchFeatures, Job, MatchShadowLog
    from app.services import gemini, match_features

    with SessionLocal() as db:
        refs = (db.query(Capture)
                .filter(Capture.turtle_id.isnot(None), Capture.image_type != "site_view")
                .count())
        pending = len(match_features.pending_capture_ids(db))
        no_shell = (db.query(CaptureMatchFeatures)
                    .filter(CaptureMatchFeatures.shell_found.is_(False))
                    .count())
        shadow = db.query(MatchShadowLog).count()
        job = (db.query(Job).filter(Job.job_type == "match_backfill")
               .order_by(Job.created_at.desc()).first())
        return {
            "matcher": settings.matcher,
            "gemini_configured": gemini.configured(),
            "reference_captures": refs,
            "with_features": refs - pending,
            "pending": pending,
            "no_shell_found": no_shell,
            "shadow_log_rows": shadow,
            "last_backfill": None if job is None else {
                "id": job.id, "status": job.status, "progress": job.progress,
                "result": job.result_data, "error": job.error_message},
        }


@router.post("/admin/matching/backfill")
async def matching_backfill():
    """Compute shell box, crop SIFT and embeddings for every reference capture missing them.

    Runs in a background thread; resumable (re-run to pick up anything that failed).
    Track it with GET /api/admin/matching/status or /api/jobs/{id}.
    """
    import json
    import threading
    from datetime import datetime

    from app.database import SessionLocal
    from app.models import Job
    from app.models.job import JobStatus
    from app.services import gemini, match_features

    if not gemini.configured():
        raise HTTPException(status_code=400,
                            detail="Gemini is not configured (see GOOGLE_* / GEMINI_API_KEY)")
    with SessionLocal() as db:
        running = (db.query(Job).filter(Job.job_type == "match_backfill",
                                        Job.status == JobStatus.RUNNING.value).first())
        if running:
            return {"job_id": running.id, "status": "already running"}
        job = Job(job_type="match_backfill", status=JobStatus.RUNNING.value)
        db.add(job)
        db.commit()
        job_id = job.id

    def progress(done, failed, total):
        with SessionLocal() as db:
            j = db.get(Job, job_id)
            j.progress = int(100 * (done + failed) / max(total, 1))
            db.commit()

    def run():
        with SessionLocal() as db:
            j = db.get(Job, job_id)
            try:
                result = match_features.run_backfill(SessionLocal, progress)
                j = db.get(Job, job_id)
                j.status, j.progress = JobStatus.COMPLETED.value, 100
                j.result_data = json.dumps(result)
            except Exception as e:
                j = db.get(Job, job_id)
                j.status, j.error_message = JobStatus.FAILED.value, str(e)[:2000]
            j.completed_at = datetime.now()
            db.commit()

    threading.Thread(target=run, daemon=True).start()
    return {"job_id": job_id, "status": "started"}
