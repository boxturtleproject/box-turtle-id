import json
import time
import uuid
from datetime import date, datetime
from pathlib import Path
from typing import Optional

import cv2
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models import Capture, Encounter, Submission, Turtle
from app.schemas.submission import (
    ConfirmRequest,
    ConfirmResponse,
    IdentifyResponse,
    NewTurtleRequest,
    NewTurtleResponse,
    SubmissionCandidate,
)
from app.services import CropperService, ImageService, SiftService
from app.services.sift import SiftFeatures

router = APIRouter()

_sift_service: Optional[SiftService] = None
_cropper_service: Optional[CropperService] = None
_image_service: Optional[ImageService] = None


def get_sift_service() -> SiftService:
    global _sift_service
    if _sift_service is None:
        _sift_service = SiftService()
    return _sift_service


def get_cropper_service() -> CropperService:
    global _cropper_service
    if _cropper_service is None:
        _cropper_service = CropperService()
    return _cropper_service


def get_image_service() -> ImageService:
    global _image_service
    if _image_service is None:
        _image_service = ImageService()
    return _image_service


def _score_to_confidence(score: float) -> str:
    if score >= 75:
        return "high"
    if score >= 40:
        return "medium"
    return "low"


@router.post("/submissions/identify", response_model=IdentifyResponse)
async def identify(
    site: str = Form(...),
    top: UploadFile = File(...),
    left: Optional[UploadFile] = File(None),
    right: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
    sift: SiftService = Depends(get_sift_service),
    cropper: CropperService = Depends(get_cropper_service),
    image_svc: ImageService = Depends(get_image_service),
):
    start_time = time.time()
    submission_id = str(uuid.uuid4())

    # Create submission directory
    sub_dir = settings.submissions_dir / submission_id
    sub_dir.mkdir(parents=True, exist_ok=True)

    # Save and load top image
    top_data = await top.read()
    top_img = image_svc.load_from_bytes(top_data)
    if top_img is None:
        raise HTTPException(status_code=400, detail="Failed to load top image")

    top_path = sub_dir / "top.jpg"
    cv2.imwrite(str(top_path), top_img)

    # Save optional images
    left_path = None
    if left is not None:
        left_data = await left.read()
        left_img = image_svc.load_from_bytes(left_data)
        if left_img is not None:
            left_path = str(sub_dir / "left.jpg")
            cv2.imwrite(left_path, left_img)

    right_path = None
    if right is not None:
        right_data = await right.read()
        right_img = image_svc.load_from_bytes(right_data)
        if right_img is not None:
            right_path = str(sub_dir / "right.jpg")
            cv2.imwrite(right_path, right_img)

    # Create submission record
    submission = Submission(
        id=submission_id,
        site=site,
        top_image_path=str(top_path),
        left_image_path=left_path,
        right_image_path=right_path,
    )
    db.add(submission)
    db.commit()

    # Preprocess top image for SIFT matching
    processed = image_svc.preprocess(top_img, crop=True, cropper=cropper)
    query_features = sift.extract_features(processed)

    if query_features is None:
        processing_time_ms = int((time.time() - start_time) * 1000)
        return IdentifyResponse(
            candidates=[],
            total_compared=0,
            processing_time_ms=processing_time_ms,
            submission_id=submission_id,
        )

    # Query all captures with cached SIFT descriptors, filtered by site
    captures_query = db.query(Capture).filter(Capture.descriptors_data.isnot(None))
    captures_query = captures_query.join(Turtle, Capture.turtle_id == Turtle.id).filter(
        Turtle.site == site
    )
    captures = captures_query.all()

    # Compare against each capture
    candidates: list[SubmissionCandidate] = []
    seen_turtle_ids: set[int] = set()

    for capture in captures:
        try:
            db_features = SiftFeatures.deserialize(
                capture.keypoints_data, capture.descriptors_data
            )
            result = sift.compare(query_features, db_features)

            if result.score < settings.acceptance_threshold:
                continue

            # Only keep the best match per turtle
            if capture.turtle_id in seen_turtle_ids:
                existing = next(
                    (c for c in candidates if c.turtle_id == capture.turtle_id), None
                )
                if existing and result.score <= existing.score:
                    continue
                candidates = [c for c in candidates if c.turtle_id != capture.turtle_id]

            seen_turtle_ids.add(capture.turtle_id)

            # Get turtle info
            turtle = db.query(Turtle).filter(Turtle.id == capture.turtle_id).first()
            turtle_nickname = turtle.name or turtle.external_id if turtle else None

            # Generate visualization
            viz_filename = f"viz_{uuid.uuid4()}.jpg"
            viz_dir = settings.data_dir / "thumbnails"
            viz_dir.mkdir(parents=True, exist_ok=True)
            db_img = image_svc.load(capture.image_path)
            if db_img is not None:
                viz_image = sift.generate_match_visualization(
                    processed, db_img, query_features, db_features,
                )
                cv2.imwrite(str(viz_dir / viz_filename), viz_image)

            candidates.append(
                SubmissionCandidate(
                    turtle_id=capture.turtle_id,
                    turtle_nickname=turtle_nickname,
                    score=round(result.score, 1),
                    confidence=_score_to_confidence(result.score),
                    visualization_url=f"/api/visualizations/{viz_filename}",
                    thumbnail_url=capture.thumbnail_path,
                )
            )
        except Exception:
            continue

    # Sort by score descending
    candidates.sort(key=lambda c: c.score, reverse=True)

    processing_time_ms = int((time.time() - start_time) * 1000)

    return IdentifyResponse(
        candidates=candidates,
        total_compared=len(captures),
        processing_time_ms=processing_time_ms,
        submission_id=submission_id,
    )


@router.post("/submissions/{submission_id}/confirm", response_model=ConfirmResponse)
async def confirm_submission(
    submission_id: str,
    request: ConfirmRequest,
    db: Session = Depends(get_db),
    sift: SiftService = Depends(get_sift_service),
    cropper: CropperService = Depends(get_cropper_service),
    image_svc: ImageService = Depends(get_image_service),
):
    submission = db.query(Submission).filter(Submission.id == submission_id).first()
    if not submission:
        raise HTTPException(status_code=404, detail="Submission not found")

    turtle = db.query(Turtle).filter(Turtle.id == request.turtle_id).first()
    if not turtle:
        raise HTTPException(status_code=404, detail="Turtle not found")

    # Parse encounter date
    enc_date = None
    if request.encounter_data.date:
        try:
            enc_date = datetime.strptime(request.encounter_data.date, "%Y-%m-%d")
        except ValueError:
            enc_date = None

    # Create encounter
    encounter = Encounter(
        turtle_id=turtle.id,
        encounter_date=enc_date,
        plot_name=request.encounter_data.location,
        setting=",".join(request.encounter_data.setting),
        conditions=",".join(request.encounter_data.conditions),
        behavior=",".join(request.encounter_data.behaviors),
        health_status=request.encounter_data.health,
        notes=request.encounter_data.observation_notes,
        observer_nickname=request.encounter_data.nickname,
        notify_email=request.encounter_data.email if request.encounter_data.notify_me else None,
        identified="Matched",
    )
    db.add(encounter)
    db.flush()

    # Move submission images to permanent storage and create captures
    _create_captures_from_submission(
        submission, turtle.id, encounter.id, db, sift, cropper, image_svc
    )

    submission.status = "confirmed"
    db.commit()

    return ConfirmResponse(success=True, encounter_id=encounter.id)


@router.post("/submissions/{submission_id}/new-turtle", response_model=NewTurtleResponse)
async def new_turtle_from_submission(
    submission_id: str,
    request: NewTurtleRequest,
    db: Session = Depends(get_db),
    sift: SiftService = Depends(get_sift_service),
    cropper: CropperService = Depends(get_cropper_service),
    image_svc: ImageService = Depends(get_image_service),
):
    submission = db.query(Submission).filter(Submission.id == submission_id).first()
    if not submission:
        raise HTTPException(status_code=404, detail="Submission not found")

    # Generate external_id: find max existing and increment
    last_turtle = db.query(Turtle).order_by(Turtle.id.desc()).first()
    next_num = (last_turtle.id + 1) if last_turtle else 1
    external_id = f"T{next_num:03d}"

    # Create turtle
    turtle = Turtle(
        external_id=external_id,
        name=request.nickname or None,
        site=request.site,
        first_seen=date.today(),
    )
    db.add(turtle)
    db.flush()

    # Parse encounter date
    enc_date = None
    if request.encounter_data.date:
        try:
            enc_date = datetime.strptime(request.encounter_data.date, "%Y-%m-%d")
        except ValueError:
            enc_date = None

    # Create encounter
    encounter = Encounter(
        turtle_id=turtle.id,
        encounter_date=enc_date,
        plot_name=request.encounter_data.location,
        setting=",".join(request.encounter_data.setting),
        conditions=",".join(request.encounter_data.conditions),
        behavior=",".join(request.encounter_data.behaviors),
        health_status=request.encounter_data.health,
        notes=request.encounter_data.observation_notes,
        observer_nickname=request.encounter_data.nickname,
        notify_email=request.encounter_data.email if request.encounter_data.notify_me else None,
        identified="New",
    )
    db.add(encounter)
    db.flush()

    # Move submission images to permanent storage and create captures
    _create_captures_from_submission(
        submission, turtle.id, encounter.id, db, sift, cropper, image_svc
    )

    submission.status = "confirmed"
    db.commit()

    return NewTurtleResponse(success=True, turtle_id=turtle.id)


def _create_captures_from_submission(
    submission: Submission,
    turtle_id: int,
    encounter_id: int,
    db: Session,
    sift: SiftService,
    cropper: CropperService,
    image_svc: ImageService,
):
    """Move submission images to permanent storage and create Capture records."""
    image_map = [
        (submission.top_image_path, "carapace_top", "top.jpg"),
        (submission.left_image_path, "carapace_left", "left.jpg"),
        (submission.right_image_path, "carapace_right", "right.jpg"),
    ]

    for img_path, image_type, default_name in image_map:
        if img_path is None:
            continue

        src = Path(img_path)
        if not src.exists():
            continue

        img = image_svc.load(src)
        if img is None:
            continue

        # Save to permanent images directory
        perm_path = image_svc.save(img)
        thumbnail_path = image_svc.generate_thumbnail(img)

        # Extract SIFT features for matching
        kp_bytes = None
        desc_bytes = None
        kp_count = 0
        preprocessed = image_svc.preprocess(img, crop=True, cropper=cropper)
        features = sift.extract_features(preprocessed)
        if features:
            kp_bytes, desc_bytes = features.serialize()
            kp_count = features.keypoint_count

        capture = Capture(
            turtle_id=turtle_id,
            encounter_id=encounter_id,
            image_type=image_type,
            image_path=perm_path,
            thumbnail_path=thumbnail_path,
            original_filename=default_name,
            keypoints_data=kp_bytes,
            descriptors_data=desc_bytes,
            keypoint_count=kp_count,
        )
        db.add(capture)

    # Handle other images from submission
    if submission.other_image_paths:
        try:
            other_paths = json.loads(submission.other_image_paths)
        except (json.JSONDecodeError, TypeError):
            other_paths = []

        for i, other_path in enumerate(other_paths):
            src = Path(other_path)
            if not src.exists():
                continue
            img = image_svc.load(src)
            if img is None:
                continue

            perm_path = image_svc.save(img)
            thumbnail_path = image_svc.generate_thumbnail(img)

            capture = Capture(
                turtle_id=turtle_id,
                encounter_id=encounter_id,
                image_type="other",
                image_path=perm_path,
                thumbnail_path=thumbnail_path,
                original_filename=f"other_{i}.jpg",
            )
            db.add(capture)
