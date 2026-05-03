# ABOUTME: API endpoints for turtle and capture CRUD operations.
# ABOUTME: Manages the turtle database and their photo captures.

from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile
from sqlalchemy import and_, case, func, literal
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Capture, Encounter, Turtle
from app.schemas.turtle import (
    CaptureResponse,
    EncounterDetailResponse,
    EncounterResponse,
    TurtleCreate,
    TurtleDetailResponse,
    TurtleResponse,
    TurtleUpdate,
)
from app.services import CropperService, ImageService, SiftService

router = APIRouter()


def get_services():
    """Get service instances."""
    return SiftService(), CropperService(), ImageService()


@router.get("/encounters")
async def list_all_encounters(
    turtle_id: Optional[int] = Query(None, description="Restrict to one turtle"),
    skip: int = Query(0, ge=0),
    limit: int = Query(25, ge=1, le=200),
    db: Session = Depends(get_db),
):
    """Paginated list of encounters newest-first, with turtle context.

    Returns {items, total, skip, limit}. Each item carries enough information
    for the admin list view (date, plot, badges, capture count) plus the
    turtle's external_id/name/site so the row can render context without a
    second fetch. Uses a single join + correlated count subquery; no N+1.
    """
    from sqlalchemy import select

    capture_count_subq = (
        select(func.count(Capture.id))
        .where(Capture.encounter_id == Encounter.id)
        .correlate(Encounter)
        .scalar_subquery()
    )

    base_filter = db.query(Encounter)
    if turtle_id is not None:
        base_filter = base_filter.filter(Encounter.turtle_id == turtle_id)
    total = base_filter.count()

    q = (
        db.query(
            Encounter,
            Turtle.external_id,
            Turtle.name,
            Turtle.site,
            capture_count_subq.label("capture_count"),
        )
        .join(Turtle, Encounter.turtle_id == Turtle.id)
        .order_by(Encounter.encounter_date.desc().nullslast(), Encounter.id.desc())
    )
    if turtle_id is not None:
        q = q.filter(Encounter.turtle_id == turtle_id)

    rows = q.offset(skip).limit(limit).all()
    items = []
    for enc, ext_id, name, site, cap_count in rows:
        items.append({
            "id": enc.id,
            "turtle_id": enc.turtle_id,
            "turtle_external_id": ext_id,
            "turtle_name": name,
            "site": site,
            "external_id": enc.external_id,
            "encounter_date": enc.encounter_date.isoformat() if enc.encounter_date else None,
            "plot_name": enc.plot_name,
            "survey_id": enc.survey_id,
            "identified": enc.identified,
            "health_status": enc.health_status,
            "behavior": enc.behavior,
            "setting": enc.setting,
            "conditions": enc.conditions,
            "notes": enc.notes,
            "observer_nickname": enc.observer_nickname,
            "latitude": enc.latitude,
            "longitude": enc.longitude,
            "capture_count": cap_count or 0,
        })
    return {"items": items, "total": total, "skip": skip, "limit": limit}


@router.get("/turtles/next-id")
async def suggest_next_turtle_id(db: Session = Depends(get_db)):
    """Suggest the next unused TXXX-style turtle id (for prefilling forms)."""
    from app.api.submissions import _suggest_next_turtle_id
    return {"external_id": _suggest_next_turtle_id(db)}


@router.get("/turtles/check-id")
async def check_turtle_id(
    external_id: str = Query(..., min_length=1),
    exclude_turtle_id: Optional[int] = Query(None, description="Ignore this turtle when checking (for edits)"),
    db: Session = Depends(get_db),
):
    """Check whether a proposed external_id is available."""
    q = db.query(Turtle).filter(Turtle.external_id == external_id.strip())
    if exclude_turtle_id is not None:
        q = q.filter(Turtle.id != exclude_turtle_id)
    existing = q.first()
    return {
        "external_id": external_id.strip(),
        "available": existing is None,
        "claimed_by_turtle_id": existing.id if existing else None,
    }


@router.get("/captures/locations")
async def list_capture_locations(
    turtle_id: Optional[int] = Query(None, description="Restrict to one turtle"),
    db: Session = Depends(get_db),
):
    """Lightweight payload for the map view: every capture that has GPS coords.

    Per row: capture id + turtle id/external_id/name, image_type, captured_date,
    thumbnail_url, lat, lng. Excludes captures missing either coordinate.
    """
    q = (
        db.query(
            Capture.id,
            Capture.turtle_id,
            Capture.encounter_id,
            Capture.image_type,
            Capture.captured_date,
            Capture.latitude,
            Capture.longitude,
            Capture.thumbnail_url,
            Capture.thumbnail_path,
            Turtle.external_id,
            Turtle.name,
            Turtle.site,
        )
        .join(Turtle, Capture.turtle_id == Turtle.id)
        .filter(Capture.latitude.isnot(None))
        .filter(Capture.longitude.isnot(None))
    )
    if turtle_id is not None:
        q = q.filter(Capture.turtle_id == turtle_id)

    rows = []
    for r in q.all():
        rows.append({
            "id": r[0],
            "turtle_id": r[1],
            "encounter_id": r[2],
            "image_type": r[3],
            "captured_date": r[4].isoformat() if r[4] else None,
            "latitude": r[5],
            "longitude": r[6],
            "thumbnail_url": r[7] or (f"/api/static/{r[8]}" if r[8] else None),
            "turtle_external_id": r[9],
            "turtle_name": r[10],
            "site": r[11],
        })
    return rows


@router.get("/turtles", response_model=list[TurtleResponse])
async def list_turtles(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
):
    """List all known turtles with capture/encounter counts and a single hero capture.

    The dashboard only needs one capture per turtle for the card thumbnail. We
    skip returning the full capture list (often 30+ rows per turtle) and pick a
    deterministic hero in SQL: cover_capture_id if set, else the most recent
    carapace_left, else carapace_top, else any capture for the turtle.
    """
    turtles = db.query(Turtle).order_by(Turtle.id).offset(skip).limit(limit).all()
    if not turtles:
        return []

    turtle_ids = [t.id for t in turtles]

    # All capture/encounter counts in one query each
    capture_counts = dict(
        db.query(Capture.turtle_id, func.count(Capture.id))
        .filter(Capture.turtle_id.in_(turtle_ids))
        .group_by(Capture.turtle_id)
        .all()
    )
    encounter_counts = dict(
        db.query(Encounter.turtle_id, func.count(Encounter.id))
        .filter(Encounter.turtle_id.in_(turtle_ids))
        .group_by(Encounter.turtle_id)
        .all()
    )

    # Pick hero capture per turtle in one query.
    # Sort key: cover match first (0/1), then preferred image_type rank, then
    # most recent created_at. DISTINCT ON (turtle_id) keeps just the first row
    # per turtle after the ORDER BY.
    cover_ids = {t.id: t.cover_capture_id for t in turtles if t.cover_capture_id}
    type_rank = case(
        (Capture.image_type == "carapace_left", 0),
        (Capture.image_type == "carapace_top", 1),
        (Capture.image_type == "carapace_right", 2),
        else_=3,
    )
    cover_match = case(
        *[
            (and_(Capture.turtle_id == tid, Capture.id == cid), 0)
            for tid, cid in cover_ids.items()
        ],
        else_=1,
    ) if cover_ids else literal(1)

    hero_query = (
        db.query(Capture)
        .filter(Capture.turtle_id.in_(turtle_ids))
        .order_by(
            Capture.turtle_id,
            cover_match,
            type_rank,
            Capture.created_at.desc(),
        )
        .distinct(Capture.turtle_id)
    )
    heroes = {c.turtle_id: c for c in hero_query.all()}

    results = []
    for turtle in turtles:
        hero = heroes.get(turtle.id)
        response = TurtleResponse.model_validate(turtle)
        response.capture_count = capture_counts.get(turtle.id, 0)
        response.encounter_count = encounter_counts.get(turtle.id, 0)
        if hero is not None:
            response.captures = [CaptureResponse.model_validate(hero)]
            response.latest_capture = (
                hero.thumbnail_url
                or hero.thumbnail_path
                or hero.image_path
            )
        else:
            response.captures = []
            response.latest_capture = None
        results.append(response)

    return results


@router.get("/turtles/{turtle_id}", response_model=TurtleDetailResponse)
async def get_turtle(turtle_id: int, db: Session = Depends(get_db)):
    """Get a turtle with all its captures and encounters."""
    turtle = db.query(Turtle).filter(Turtle.id == turtle_id).first()
    if not turtle:
        raise HTTPException(status_code=404, detail="Turtle not found")

    captures = db.query(Capture).filter(Capture.turtle_id == turtle_id).all()
    encounters = db.query(Encounter).filter(Encounter.turtle_id == turtle_id).order_by(
        Encounter.encounter_date.desc()
    ).all()

    # Build encounter responses with capture counts
    encounter_responses = []
    for enc in encounters:
        enc_response = EncounterResponse.model_validate(enc)
        enc_response.capture_count = db.query(func.count(Capture.id)).filter(
            Capture.encounter_id == enc.id
        ).scalar() or 0
        encounter_responses.append(enc_response)

    response = TurtleDetailResponse.model_validate(turtle)
    response.captures = [CaptureResponse.model_validate(c) for c in captures]
    response.capture_count = len(captures)
    response.encounter_count = len(encounters)
    response.encounters = encounter_responses

    return response


@router.post("/turtles", response_model=TurtleResponse, status_code=201)
async def create_turtle(data: TurtleCreate, db: Session = Depends(get_db)):
    """Create a new turtle record."""
    # Check for duplicate external_id
    existing = db.query(Turtle).filter(Turtle.external_id == data.external_id).first()
    if existing:
        raise HTTPException(
            status_code=400,
            detail=f"Turtle with external_id '{data.external_id}' already exists",
        )

    turtle = Turtle(
        external_id=data.external_id,
        name=data.name,
        first_seen=data.first_seen,
        notes=data.notes,
    )
    db.add(turtle)
    db.commit()
    db.refresh(turtle)

    response = TurtleResponse.model_validate(turtle)
    response.capture_count = 0
    return response


@router.patch("/turtles/{turtle_id}", response_model=TurtleResponse)
async def update_turtle(
    turtle_id: int,
    data: TurtleUpdate,
    db: Session = Depends(get_db),
):
    """Update any subset of a turtle's editable fields.

    All fields on the update payload are optional — only provided fields are
    written. external_id is uniqueness-checked against the rest of the table.
    """
    turtle = db.query(Turtle).filter(Turtle.id == turtle_id).first()
    if not turtle:
        raise HTTPException(status_code=404, detail="Turtle not found")

    if data.external_id is not None:
        new_id = data.external_id.strip()
        if not new_id:
            raise HTTPException(status_code=400, detail="Turtle ID cannot be empty")
        if new_id != turtle.external_id:
            clash = db.query(Turtle).filter(
                Turtle.external_id == new_id,
                Turtle.id != turtle_id,
            ).first()
            if clash:
                raise HTTPException(
                    status_code=400,
                    detail=f"Turtle ID '{new_id}' is already in use",
                )
            turtle.external_id = new_id

    # Apply remaining editable fields verbatim
    for field in (
        "name", "nickname", "notes", "site", "species", "gender", "pattern",
        "carapace_flare", "health_status", "residence_status",
        "identifying_marks", "eye_color", "plastron_depression", "plots_text",
        "first_seen",
    ):
        value = getattr(data, field)
        if value is not None:
            setattr(turtle, field, value)

    db.commit()
    db.refresh(turtle)

    capture_count = db.query(func.count(Capture.id)).filter(
        Capture.turtle_id == turtle_id
    ).scalar()

    response = TurtleResponse.model_validate(turtle)
    response.capture_count = capture_count
    return response


@router.delete("/turtles/{turtle_id}", status_code=204)
async def delete_turtle(turtle_id: int, db: Session = Depends(get_db)):
    """Delete a turtle. Captures are unlinked but not deleted."""
    turtle = db.query(Turtle).filter(Turtle.id == turtle_id).first()
    if not turtle:
        raise HTTPException(status_code=404, detail="Turtle not found")

    # Unlink captures (SET NULL due to foreign key)
    db.query(Capture).filter(Capture.turtle_id == turtle_id).update(
        {Capture.turtle_id: None}
    )
    db.delete(turtle)
    db.commit()


@router.patch("/turtles/{turtle_id}/cover/{capture_id}", response_model=TurtleResponse)
async def set_cover_capture(
    turtle_id: int,
    capture_id: int,
    db: Session = Depends(get_db),
):
    """Set a capture as the cover photo for a turtle."""
    turtle = db.query(Turtle).filter(Turtle.id == turtle_id).first()
    if not turtle:
        raise HTTPException(status_code=404, detail="Turtle not found")

    capture = db.query(Capture).filter(
        Capture.id == capture_id,
        Capture.turtle_id == turtle_id,
    ).first()
    if not capture:
        raise HTTPException(status_code=404, detail="Capture not found or not linked to this turtle")

    turtle.cover_capture_id = capture_id
    db.commit()
    db.refresh(turtle)

    captures = db.query(Capture).filter(Capture.turtle_id == turtle_id).all()
    response = TurtleResponse.model_validate(turtle)
    response.capture_count = len(captures)
    response.latest_capture = capture.thumbnail_path or capture.image_path
    return response


@router.post("/turtles/{turtle_id}/captures", response_model=CaptureResponse, status_code=201)
async def add_capture(
    turtle_id: int,
    image: UploadFile = File(...),
    captured_date: Optional[date] = Query(None),
    use_cropping: bool = Query(True),
    db: Session = Depends(get_db),
):
    """Add a new capture to a turtle."""
    turtle = db.query(Turtle).filter(Turtle.id == turtle_id).first()
    if not turtle:
        raise HTTPException(status_code=404, detail="Turtle not found")

    sift, cropper, image_svc = get_services()

    # Load image
    data = await image.read()
    img = image_svc.load_from_bytes(data)
    if img is None:
        raise HTTPException(status_code=400, detail="Failed to load image")

    # Extract EXIF metadata
    exif = ImageService.extract_exif(data)

    # Save original
    image_path = image_svc.save(img, image.filename)

    # Generate thumbnail
    thumbnail_path = image_svc.generate_thumbnail(img)

    # Preprocess and extract features
    processed = image_svc.preprocess(img, crop=use_cropping, cropper=cropper)
    features = sift.extract_features(processed)

    # Determine capture date: explicit param > EXIF > filename parsing
    final_date = captured_date
    if final_date is None and exif.datetime:
        final_date = exif.datetime.date()
    if final_date is None:
        final_date = ImageService.parse_filename_date(image.filename or "")

    # Create capture
    capture = Capture(
        turtle_id=turtle_id,
        image_path=image_path,
        thumbnail_path=thumbnail_path,
        original_filename=image.filename or "unknown.jpg",
        captured_date=final_date,
        latitude=exif.latitude,
        longitude=exif.longitude,
        exif_datetime=exif.datetime,
        camera_make=exif.camera_make,
        camera_model=exif.camera_model,
    )

    if features:
        kp_bytes, desc_bytes = features.serialize()
        capture.keypoints_data = kp_bytes
        capture.descriptors_data = desc_bytes
        capture.keypoint_count = features.keypoint_count

    db.add(capture)
    db.commit()
    db.refresh(capture)

    return CaptureResponse.model_validate(capture)


@router.post("/captures", response_model=CaptureResponse, status_code=201)
async def create_unlinked_capture(
    image: UploadFile = File(...),
    captured_date: Optional[date] = Query(None),
    use_cropping: bool = Query(True),
    db: Session = Depends(get_db),
):
    """Create a capture not yet linked to a turtle."""
    sift, cropper, image_svc = get_services()

    # Load image
    data = await image.read()
    img = image_svc.load_from_bytes(data)
    if img is None:
        raise HTTPException(status_code=400, detail="Failed to load image")

    # Extract EXIF metadata
    exif = ImageService.extract_exif(data)

    # Save original
    image_path = image_svc.save(img, image.filename)

    # Generate thumbnail
    thumbnail_path = image_svc.generate_thumbnail(img)

    # Preprocess and extract features
    processed = image_svc.preprocess(img, crop=use_cropping, cropper=cropper)
    features = sift.extract_features(processed)

    # Determine capture date: explicit param > EXIF > filename parsing
    final_date = captured_date
    if final_date is None and exif.datetime:
        final_date = exif.datetime.date()
    if final_date is None:
        final_date = ImageService.parse_filename_date(image.filename or "")

    # Create capture
    capture = Capture(
        turtle_id=None,
        image_path=image_path,
        thumbnail_path=thumbnail_path,
        original_filename=image.filename or "unknown.jpg",
        captured_date=final_date,
        latitude=exif.latitude,
        longitude=exif.longitude,
        exif_datetime=exif.datetime,
        camera_make=exif.camera_make,
        camera_model=exif.camera_model,
    )

    if features:
        kp_bytes, desc_bytes = features.serialize()
        capture.keypoints_data = kp_bytes
        capture.descriptors_data = desc_bytes
        capture.keypoint_count = features.keypoint_count

    db.add(capture)
    db.commit()
    db.refresh(capture)

    return CaptureResponse.model_validate(capture)


@router.patch("/captures/{capture_id}/link/{turtle_id}", response_model=CaptureResponse)
async def link_capture_to_turtle(
    capture_id: int,
    turtle_id: int,
    db: Session = Depends(get_db),
):
    """Link an unlinked capture to a turtle."""
    capture = db.query(Capture).filter(Capture.id == capture_id).first()
    if not capture:
        raise HTTPException(status_code=404, detail="Capture not found")

    turtle = db.query(Turtle).filter(Turtle.id == turtle_id).first()
    if not turtle:
        raise HTTPException(status_code=404, detail="Turtle not found")

    capture.turtle_id = turtle_id
    db.commit()
    db.refresh(capture)

    return CaptureResponse.model_validate(capture)


@router.delete("/captures/{capture_id}", status_code=204)
async def delete_capture(capture_id: int, db: Session = Depends(get_db)):
    """Delete a capture."""
    capture = db.query(Capture).filter(Capture.id == capture_id).first()
    if not capture:
        raise HTTPException(status_code=404, detail="Capture not found")

    db.delete(capture)
    db.commit()


# Encounter endpoints


@router.get("/turtles/{turtle_id}/encounters", response_model=list[EncounterResponse])
async def list_turtle_encounters(turtle_id: int, db: Session = Depends(get_db)):
    """List all encounters for a turtle."""
    turtle = db.query(Turtle).filter(Turtle.id == turtle_id).first()
    if not turtle:
        raise HTTPException(status_code=404, detail="Turtle not found")

    encounters = db.query(Encounter).filter(Encounter.turtle_id == turtle_id).order_by(
        Encounter.encounter_date.desc()
    ).all()

    results = []
    for enc in encounters:
        response = EncounterResponse.model_validate(enc)
        response.capture_count = db.query(func.count(Capture.id)).filter(
            Capture.encounter_id == enc.id
        ).scalar() or 0
        results.append(response)

    return results


@router.get("/encounters/{encounter_id}", response_model=EncounterDetailResponse)
async def get_encounter(encounter_id: int, db: Session = Depends(get_db)):
    """Get an encounter with all its captures."""
    encounter = db.query(Encounter).filter(Encounter.id == encounter_id).first()
    if not encounter:
        raise HTTPException(status_code=404, detail="Encounter not found")

    captures = db.query(Capture).filter(Capture.encounter_id == encounter_id).all()

    response = EncounterDetailResponse.model_validate(encounter)
    response.captures = [CaptureResponse.model_validate(c) for c in captures]
    response.capture_count = len(captures)

    return response
