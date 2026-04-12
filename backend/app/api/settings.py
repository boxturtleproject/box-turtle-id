# ABOUTME: API endpoints for SIFT algorithm settings.
# ABOUTME: Manages configurable parameters and triggers feature re-extraction.

import asyncio
import json
from datetime import datetime

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from sqlalchemy.orm import Session

from app.config import settings as app_settings
from app.database import SessionLocal, get_db
from app.models import Capture, Job, Setting
from app.models.job import JobStatus, JobType
from app.schemas.settings import SiftSettingsResponse, SiftSettingsUpdate
from app.services import CropperService, ImageService, SiftService

router = APIRouter()

# Settings keys
ACCEPTANCE_THRESHOLD = "acceptance_threshold"
DISTANCE_COEFFICIENT = "distance_coefficient"
RESIZED_WIDTH = "resized_width"

# Default values from app config
DEFAULTS = {
    ACCEPTANCE_THRESHOLD: app_settings.acceptance_threshold,
    DISTANCE_COEFFICIENT: app_settings.distance_coefficient,
    RESIZED_WIDTH: app_settings.resized_width,
}


def _get_setting_value(db: Session, key: str) -> float | int:
    """Get a setting value from DB or return default."""
    setting = db.query(Setting).filter(Setting.key == key).first()
    if setting is None:
        return DEFAULTS[key]

    # Parse based on expected type
    if key == RESIZED_WIDTH:
        return int(setting.value)
    return float(setting.value)


def _set_setting_value(db: Session, key: str, value: float | int) -> None:
    """Set a setting value in DB."""
    setting = db.query(Setting).filter(Setting.key == key).first()
    if setting is None:
        setting = Setting(key=key, value=str(value))
        db.add(setting)
    else:
        setting.value = str(value)
        setting.updated_at = datetime.now()


def _get_active_reextraction_job(db: Session) -> Job | None:
    """Get active feature re-extraction job if one exists."""
    return db.query(Job).filter(
        Job.job_type == "reextract",
        Job.status.in_([JobStatus.PENDING.value, JobStatus.RUNNING.value]),
    ).first()


@router.get("/settings", response_model=SiftSettingsResponse)
async def get_settings(db: Session = Depends(get_db)):
    """Get current SIFT algorithm settings."""
    active_job = _get_active_reextraction_job(db)

    return SiftSettingsResponse(
        acceptance_threshold=_get_setting_value(db, ACCEPTANCE_THRESHOLD),
        distance_coefficient=_get_setting_value(db, DISTANCE_COEFFICIENT),
        resized_width=_get_setting_value(db, RESIZED_WIDTH),
        reextraction_job_id=active_job.id if active_job else None,
    )


def _reextract_features(job_id: str, resized_width: int):
    """Background task to re-extract SIFT features for all captures."""
    db = SessionLocal()
    try:
        job = db.query(Job).filter(Job.id == job_id).first()
        if not job:
            return

        job.status = JobStatus.RUNNING.value
        db.commit()

        # Get all captures with features
        captures = db.query(Capture).filter(
            Capture.keypoints_data.isnot(None)
        ).all()

        total = len(captures)
        if total == 0:
            job.status = JobStatus.COMPLETED.value
            job.progress = 100
            job.result_data = json.dumps({"processed": 0})
            job.completed_at = datetime.now()
            db.commit()
            return

        # Initialize services with new width
        image_svc = ImageService(resized_width=resized_width)
        sift_svc = SiftService(resized_width=resized_width)
        cropper_svc = CropperService()

        processed = 0
        errors = 0

        for i, capture in enumerate(captures):
            try:
                # Load original image
                full_path = app_settings.data_dir / capture.image_path
                img = image_svc.load(full_path)

                if img is not None:
                    # Re-preprocess with new width
                    processed_img = image_svc.preprocess(img, crop=True, cropper=cropper_svc)

                    # Re-extract features
                    features = sift_svc.extract_features(processed_img)

                    if features:
                        kp_bytes, desc_bytes = features.serialize()
                        capture.keypoints_data = kp_bytes
                        capture.descriptors_data = desc_bytes
                        capture.keypoint_count = features.keypoint_count
                        processed += 1
                    else:
                        errors += 1
                else:
                    errors += 1

            except Exception:
                errors += 1

            # Update progress every 10 captures or at the end
            if (i + 1) % 10 == 0 or i == total - 1:
                job.progress = int((i + 1) / total * 100)
                db.commit()

        job.status = JobStatus.COMPLETED.value
        job.progress = 100
        job.result_data = json.dumps({
            "processed": processed,
            "errors": errors,
            "total": total,
        })
        job.completed_at = datetime.now()
        db.commit()

    except Exception as e:
        job = db.query(Job).filter(Job.id == job_id).first()
        if job:
            job.status = JobStatus.FAILED.value
            job.error_message = str(e)
            job.completed_at = datetime.now()
            db.commit()
    finally:
        db.close()


@router.put("/settings", response_model=SiftSettingsResponse)
async def update_settings(
    data: SiftSettingsUpdate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    """
    Update SIFT algorithm settings.

    If resized_width changes, a background job is started to re-extract
    features for all captures in the database.
    """
    # Check for active re-extraction job
    active_job = _get_active_reextraction_job(db)
    if active_job:
        raise HTTPException(
            status_code=409,
            detail=f"Feature re-extraction job {active_job.id} is already running. Wait for it to complete.",
        )

    # Get current resized_width before update
    current_width = _get_setting_value(db, RESIZED_WIDTH)

    # Update provided settings
    if data.acceptance_threshold is not None:
        _set_setting_value(db, ACCEPTANCE_THRESHOLD, data.acceptance_threshold)

    if data.distance_coefficient is not None:
        _set_setting_value(db, DISTANCE_COEFFICIENT, data.distance_coefficient)

    new_job_id = None
    if data.resized_width is not None:
        _set_setting_value(db, RESIZED_WIDTH, data.resized_width)

        # If width changed, trigger re-extraction
        if data.resized_width != current_width:
            job = Job(
                job_type="reextract",
                status=JobStatus.PENDING.value,
                progress=0,
            )
            db.add(job)
            db.commit()
            db.refresh(job)
            new_job_id = job.id

            # Start background task
            background_tasks.add_task(_reextract_features, job.id, data.resized_width)

    db.commit()

    return SiftSettingsResponse(
        acceptance_threshold=_get_setting_value(db, ACCEPTANCE_THRESHOLD),
        distance_coefficient=_get_setting_value(db, DISTANCE_COEFFICIENT),
        resized_width=_get_setting_value(db, RESIZED_WIDTH),
        reextraction_job_id=new_job_id,
    )
