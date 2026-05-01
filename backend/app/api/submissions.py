import json
import logging
import threading
import time
import uuid
from concurrent.futures import ThreadPoolExecutor
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
from app.services.derivatives import DerivativesService
from app.services.sift import SiftFeatures
from app.services.storage import S3Storage, get_storage

logger = logging.getLogger(__name__)

# Process-level cache of deserialized SiftFeatures, keyed by capture.id.
# Survives the lifetime of the worker process. Skips pickle.loads + numpy
# reconstruction on every identify request after the first.
_descriptor_cache: dict[int, SiftFeatures] = {}
_descriptor_cache_lock = threading.Lock()


def _get_features(capture: Capture) -> Optional[SiftFeatures]:
    """Return cached SiftFeatures for a capture, deserializing on first miss."""
    cached = _descriptor_cache.get(capture.id)
    if cached is not None:
        return cached
    if capture.keypoints_data is None or capture.descriptors_data is None:
        return None
    try:
        feats = SiftFeatures.deserialize(capture.keypoints_data, capture.descriptors_data)
    except Exception as e:
        logger.warning(f"failed to deserialize features for capture {capture.id}: {e}")
        return None
    # The dict assignment is atomic in CPython; a brief lock keeps us safe
    # from racy double-load on concurrent first hits.
    with _descriptor_cache_lock:
        _descriptor_cache[capture.id] = feats
    return feats


# Number of threads used to fan out FLANN comparisons. cv2's FLANN releases
# the GIL during knnMatch, so threads run in parallel. 4 is a safe default
# that scales well on most modern CPUs without thrashing.
_MATCH_WORKERS = 4


def _load_capture_image_for_viz(capture: Capture, image_svc: ImageService):
    """Load an image for SIFT visualization at the SIFT resolution.

    The keypoints stored on a capture were extracted from a resized version
    (settings.resized_width, default 250 px). For the visualization to overlay
    the matched keypoints correctly, the image we draw against must be at the
    same scale.

    Source preference: local original on the volume first, else fetch the
    display variant from the S3 bucket via a short-lived signed URL.
    """
    img = None
    if capture.image_path:
        img = image_svc.load(capture.image_path)
    if img is None:
        storage = get_storage()
        if isinstance(storage, S3Storage) and capture.display_path:
            try:
                import requests
                url = storage.signed_url(capture.display_path, expires_in=120)
                resp = requests.get(url, timeout=10)
                if resp.ok:
                    img = image_svc.load_from_bytes(resp.content)
            except Exception as e:
                logger.warning(f"viz fetch from bucket failed for capture {capture.id}: {e}")
    if img is None:
        return None
    return image_svc.resize(img)

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
    top: Optional[UploadFile] = File(None),
    left: Optional[UploadFile] = File(None),
    right: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
    sift: SiftService = Depends(get_sift_service),
    cropper: CropperService = Depends(get_cropper_service),
    image_svc: ImageService = Depends(get_image_service),
):
    if top is None and left is None and right is None:
        raise HTTPException(status_code=422, detail="At least one photo is required")

    start_time = time.time()
    submission_id = str(uuid.uuid4())

    # Create submission directory
    sub_dir = settings.submissions_dir / submission_id
    sub_dir.mkdir(parents=True, exist_ok=True)

    # Save all provided images and collect for SIFT matching, tagged with
    # the carapace orientation so we can match against DB photos of the same type.
    query_images: list[tuple["cv2.Mat", str]] = []  # (image, image_type)

    top_path = None
    if top is not None:
        top_data = await top.read()
        top_img = image_svc.load_from_bytes(top_data)
        if top_img is not None:
            top_path = str(sub_dir / "top.jpg")
            cv2.imwrite(top_path, top_img)
            query_images.append((top_img, "carapace_top"))

    left_path = None
    if left is not None:
        left_data = await left.read()
        left_img = image_svc.load_from_bytes(left_data)
        if left_img is not None:
            left_path = str(sub_dir / "left.jpg")
            cv2.imwrite(left_path, left_img)
            query_images.append((left_img, "carapace_left"))

    right_path = None
    if right is not None:
        right_data = await right.read()
        right_img = image_svc.load_from_bytes(right_data)
        if right_img is not None:
            right_path = str(sub_dir / "right.jpg")
            cv2.imwrite(right_path, right_img)
            query_images.append((right_img, "carapace_right"))

    if not query_images:
        raise HTTPException(status_code=400, detail="Failed to load any images")

    # Create submission record
    submission = Submission(
        id=submission_id,
        site=site,
        top_image_path=top_path or "",
        left_image_path=left_path,
        right_image_path=right_path,
    )
    db.add(submission)
    db.commit()

    # Extract SIFT features from each submitted image, tagging with its
    # image_type so the matcher can compare against the same DB type.
    # query_entries: list of (image_type, query_image_index, query_image, features)
    query_entries: list[tuple[str, int, "cv2.Mat", SiftFeatures]] = []
    for qi, (img, img_type) in enumerate(query_images):
        processed = image_svc.preprocess(img, crop=True, cropper=cropper)
        features = sift.extract_features(processed)
        if features is not None:
            query_entries.append((img_type, qi, img, features))

    if not query_entries:
        processing_time_ms = int((time.time() - start_time) * 1000)
        return IdentifyResponse(
            candidates=[],
            total_compared=0,
            processing_time_ms=processing_time_ms,
            submission_id=submission_id,
        )

    # Type-aware candidate set: for each query image, only fetch DB captures
    # of the matching image_type. This typically cuts the candidate set by ~5×
    # for a top/left/right submission (one type per query instead of all types).
    query_types = {entry[0] for entry in query_entries}
    captures_query = (
        db.query(Capture)
        .filter(Capture.descriptors_data.isnot(None))
        .filter(Capture.image_type.in_(query_types))
        .join(Turtle, Capture.turtle_id == Turtle.id)
        .filter(Turtle.site == site)
    )
    captures = captures_query.all()

    # Compare each query image only against DB captures of the same image_type.
    # Captures grouped by type so we don't repeatedly re-filter inside the loop.
    captures_by_type: dict[str, list[Capture]] = {}
    for cap in captures:
        captures_by_type.setdefault(cap.image_type, []).append(cap)

    # Shared best-score map updated under a lock by the worker threads.
    best_scores: dict[int, float] = {}
    best_viz_data: dict[int, tuple] = {}
    best_lock = threading.Lock()

    def _compare_one(capture: Capture, query_features: SiftFeatures, query_idx: int) -> None:
        db_features = _get_features(capture)
        if db_features is None:
            return
        try:
            result = sift.compare(query_features, db_features)
        except Exception:
            return
        if result.score < settings.acceptance_threshold:
            return
        tid = capture.turtle_id
        with best_lock:
            if tid not in best_scores or result.score > best_scores[tid]:
                best_scores[tid] = result.score
                best_viz_data[tid] = (query_features, db_features, capture, query_idx)

    # Fan out across threads. cv2 FLANN releases the GIL during knnMatch so
    # threads execute the C++ work in parallel.
    with ThreadPoolExecutor(max_workers=_MATCH_WORKERS) as pool:
        futures = []
        for img_type, qi, _img, qf in query_entries:
            for capture in captures_by_type.get(img_type, ()):
                futures.append(pool.submit(_compare_one, capture, qf, qi))
        for f in futures:
            f.result()

    # Build candidate list from best scores
    candidates: list[SubmissionCandidate] = []
    for tid, score in best_scores.items():
        qf, db_features, capture, qi = best_viz_data[tid]

        turtle = db.query(Turtle).filter(Turtle.id == tid).first()
        turtle_nickname = turtle.name or turtle.external_id if turtle else None

        # Generate visualization using the actual query image that scored best.
        # Falls back to fetching the display variant from the bucket when the
        # original isn't on this host's volume (typical on Railway).
        viz_filename = f"viz_{uuid.uuid4()}.jpg"
        viz_dir = settings.data_dir / "thumbnails"
        viz_dir.mkdir(parents=True, exist_ok=True)
        visualization_url = None
        db_img = _load_capture_image_for_viz(capture, image_svc)
        if db_img is not None:
            query_img_raw, _ = query_images[qi]
            query_img = image_svc.preprocess(query_img_raw, crop=True, cropper=cropper)
            viz_image = sift.generate_match_visualization(
                query_img, db_img, qf, db_features,
            )
            if cv2.imwrite(str(viz_dir / viz_filename), viz_image):
                visualization_url = f"/api/visualizations/{viz_filename}"

        candidates.append(
            SubmissionCandidate(
                turtle_id=tid,
                turtle_nickname=turtle_nickname,
                score=round(score, 1),
                confidence=_score_to_confidence(score),
                visualization_url=visualization_url,
                thumbnail_url=capture.thumbnail_url or capture.display_url
                              or f"/api/static/{capture.image_path}",
            )
        )

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
    """Move submission images to permanent storage and create Capture records.

    For each image: saves the original, extracts SIFT features (cropped+resized),
    creates a Capture row, then generates thumb+display derivatives via the
    storage backend (Railway bucket in prod, local /api/static in dev).
    """
    derivatives = DerivativesService(db)
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

        perm_path = image_svc.save(img)

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
            original_filename=default_name,
            keypoints_data=kp_bytes,
            descriptors_data=desc_bytes,
            keypoint_count=kp_count,
            source="app",
        )
        db.add(capture)
        db.flush()  # get capture.id for derivative naming
        derivatives.generate_for_capture(capture)

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
            capture = Capture(
                turtle_id=turtle_id,
                encounter_id=encounter_id,
                image_type="other",
                image_path=perm_path,
                original_filename=f"other_{i}.jpg",
                source="app",
            )
            db.add(capture)
            db.flush()
            derivatives.generate_for_capture(capture)
