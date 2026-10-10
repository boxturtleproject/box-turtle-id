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
from app.database import SessionLocal, get_db
from app.models import Capture, Encounter, MatchShadowLog, Submission, Turtle
from app.schemas.submission import (
    ConfirmRequest,
    ConfirmResponse,
    IdentifyResponse,
    NewTurtleRequest,
    NewTurtleResponse,
    SubmissionCandidate,
)
from app.services import CropperService, ImageService, SiftService, match_features, matcher
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


def _suggest_next_turtle_id(db: Session) -> str:
    """Return the next unused TXXX-style external id.

    Walks the existing T### ids, picks the highest numeric suffix, and bumps
    it. Falls back to T001 when none exist. Always re-checks the proposed id
    isn't claimed before returning.
    """
    import re
    pattern = re.compile(r"^T(\d+)$")
    max_num = 0
    for (eid,) in db.query(Turtle.external_id).filter(Turtle.external_id.isnot(None)).all():
        m = pattern.match(eid or "")
        if m:
            try:
                max_num = max(max_num, int(m.group(1)))
            except ValueError:
                continue
    candidate_num = max_num + 1
    # Defensive loop in case of a non-T-pattern id collision
    while True:
        candidate = f"T{candidate_num:03d}"
        if not db.query(Turtle).filter(Turtle.external_id == candidate).first():
            return candidate
        candidate_num += 1


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

    # Persist the *original* bytes so EXIF (incl. GPS) survives for later
    # extraction in _create_captures_from_submission. cv2.imwrite re-encodes
    # without metadata, which drops the iPhone's GPS tags.
    top_path = None
    if top is not None:
        top_data = await top.read()
        top_img = image_svc.load_from_bytes(top_data)
        if top_img is not None:
            top_path = str(sub_dir / "top.jpg")
            Path(top_path).write_bytes(top_data)
            query_images.append((top_img, "carapace_top"))

    left_path = None
    if left is not None:
        left_data = await left.read()
        left_img = image_svc.load_from_bytes(left_data)
        if left_img is not None:
            left_path = str(sub_dir / "left.jpg")
            Path(left_path).write_bytes(left_data)
            query_images.append((left_img, "carapace_left"))

    right_path = None
    if right is not None:
        right_data = await right.read()
        right_img = image_svc.load_from_bytes(right_data)
        if right_img is not None:
            right_path = str(sub_dir / "right.jpg")
            Path(right_path).write_bytes(right_data)
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

    photo_paths = [p for p in (top_path, left_path, right_path) if p]
    if settings.matcher == "fused":
        try:
            return _identify_fused(db, submission_id, site, photo_paths, start_time)
        except Exception as e:  # never strand a field user: fall back to the SIFT matcher
            logger.warning(f"fused identify failed, falling back to SIFT: {e}")

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

    if settings.matcher == "shadow" and photo_paths:
        sift_top = [[c.turtle_id, c.score] for c in candidates[:5]]
        threading.Thread(target=_shadow_fused, args=(submission_id, site, photo_paths, sift_top),
                         daemon=True).start()

    return IdentifyResponse(
        candidates=candidates,
        total_compared=len(captures),
        processing_time_ms=processing_time_ms,
        submission_id=submission_id,
    )


def _open_photos(paths: list[str]):
    from PIL import Image, ImageOps
    from pillow_heif import register_heif_opener
    register_heif_opener()
    return [ImageOps.exif_transpose(Image.open(p)).convert("RGB") for p in paths]


def _identify_fused(
    db: Session, submission_id: str, site: str, paths: list[str], start_time: float
):
    """SIFT on the shell crop + embeddings, added up across the submitted photos."""
    ranked, band, n_photos, _ = matcher.identify(db, _open_photos(paths), site)
    index = matcher.get_index(db)
    candidates = []
    for r in ranked[:10]:
        turtle = db.query(Turtle).filter(Turtle.id == r.turtle_id).first()
        b = matcher.band_of(r.spot, n_photos)
        candidates.append(SubmissionCandidate(
            turtle_id=r.turtle_id,
            turtle_nickname=(turtle.name or turtle.external_id) if turtle else None,
            score=round(r.spot, 1),
            confidence=matcher.CONFIDENCE[b],
            visualization_url=None,
            thumbnail_url=index.thumbs.get(r.best_capture_id),
            spot_score=round(r.spot, 2),
            fused_score=round(r.fused, 3),
            band=b,
        ))
    return IdentifyResponse(
        candidates=candidates,
        total_compared=len(index),
        processing_time_ms=int((time.time() - start_time) * 1000),
        submission_id=submission_id,
        matcher="fused",
        band=band,
    )


def _shadow_fused(submission_id: str, site: str, paths: list[str], sift_top: list):
    """Shadow mode: run the fused matcher after answering with SIFT, and log both."""
    with SessionLocal() as db:
        row = MatchShadowLog(submission_id=submission_id, site=site, n_photos=len(paths),
                             sift_top=json.dumps(sift_top))
        try:
            ranked, band, _, ms = matcher.identify(db, _open_photos(paths), site)
            row.fused_top, row.fused_band, row.fused_ms = matcher.summary_json(ranked), band, ms
        except Exception as e:
            row.error = str(e)[:1000]
        db.add(row)
        db.commit()


def _refresh_match_features(encounter_id: int):
    """Compute fused-matcher features for an encounter's new captures, then refit the index."""
    if settings.matcher == "sift":
        return
    with SessionLocal() as db:
        ids = [c for (c,) in db.query(Capture.id).filter(Capture.encounter_id == encounter_id,
                                                         Capture.image_type != "site_view").all()]
        for cid in ids:
            try:
                match_features.compute_for_capture(db, db.get(Capture, cid))
            except Exception as e:
                logger.warning(f"match features failed for capture {cid}: {e}")
    matcher.invalidate()


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
        latitude=request.encounter_data.latitude,
        longitude=request.encounter_data.longitude,
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
    threading.Thread(target=_refresh_match_features, args=(encounter.id,), daemon=True).start()

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

    # Resolve the user-facing turtle id. If the user provided one on the form,
    # validate uniqueness; otherwise auto-suggest the next T-number.
    requested_id = (request.external_id or "").strip()
    if requested_id:
        clash = db.query(Turtle).filter(Turtle.external_id == requested_id).first()
        if clash:
            raise HTTPException(
                status_code=400,
                detail=f"Turtle ID '{requested_id}' is already in use",
            )
        external_id = requested_id
    else:
        external_id = _suggest_next_turtle_id(db)

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
        latitude=request.encounter_data.latitude,
        longitude=request.encounter_data.longitude,
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
    threading.Thread(target=_refresh_match_features, args=(encounter.id,), daemon=True).start()

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

    Capture-level latitude/longitude prefer the photo's EXIF GPS (extracted by
    ImageService.extract_exif when added through /turtles/{id}/captures or the
    /captures endpoint), and fall back to the form-set encounter coordinates so
    submissions where the user pinned a location still show up on the map.
    """
    derivatives = DerivativesService(db)

    # Inherit form-pinned location from the encounter as a fallback for any
    # capture that doesn't carry its own EXIF GPS.
    encounter = db.query(Encounter).filter(Encounter.id == encounter_id).first()
    enc_lat = encounter.latitude if encounter else None
    enc_lng = encounter.longitude if encounter else None

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

        # Read bytes once: needed for EXIF + decode for SIFT.
        try:
            raw_bytes = src.read_bytes()
        except OSError:
            continue
        img = image_svc.load_from_bytes(raw_bytes)
        if img is None:
            continue

        exif = ImageService.extract_exif(raw_bytes)
        cap_lat = exif.latitude if exif.latitude is not None else enc_lat
        cap_lng = exif.longitude if exif.longitude is not None else enc_lng

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
            latitude=cap_lat,
            longitude=cap_lng,
            exif_datetime=exif.datetime,
            camera_make=exif.camera_make,
            camera_model=exif.camera_model,
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
            try:
                raw_bytes = src.read_bytes()
            except OSError:
                continue
            img = image_svc.load_from_bytes(raw_bytes)
            if img is None:
                continue

            exif = ImageService.extract_exif(raw_bytes)
            cap_lat = exif.latitude if exif.latitude is not None else enc_lat
            cap_lng = exif.longitude if exif.longitude is not None else enc_lng

            perm_path = image_svc.save(img)
            capture = Capture(
                turtle_id=turtle_id,
                encounter_id=encounter_id,
                image_type="other",
                image_path=perm_path,
                original_filename=f"other_{i}.jpg",
                latitude=cap_lat,
                longitude=cap_lng,
                exif_datetime=exif.datetime,
                camera_make=exif.camera_make,
                camera_model=exif.camera_model,
                source="app",
            )
            db.add(capture)
            db.flush()
            derivatives.generate_for_capture(capture)
