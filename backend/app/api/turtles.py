# ABOUTME: API endpoints for turtle and capture CRUD operations.
# ABOUTME: Manages the turtle database and their photo captures.

from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile
from sqlalchemy import func
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


@router.get("/turtles", response_model=list[TurtleResponse])
async def list_turtles(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
):
    """List all known turtles with capture and encounter counts."""
    turtles = db.query(Turtle).offset(skip).limit(limit).all()

    results = []
    for turtle in turtles:
        captures = db.query(Capture).filter(Capture.turtle_id == turtle.id).all()
        capture_count = len(captures)
        encounter_count = db.query(func.count(Encounter.id)).filter(
            Encounter.turtle_id == turtle.id
        ).scalar() or 0

        # Find cover image: use starred capture or most recent carapace_top
        latest_capture = None
        if captures:
            if turtle.cover_capture_id:
                cover = next((c for c in captures if c.id == turtle.cover_capture_id), None)
                if cover:
                    latest_capture = cover.thumbnail_path or cover.image_path
            if not latest_capture:
                # Fall back to most recent carapace_top capture
                carapace_tops = [c for c in captures if c.image_type == "carapace_top"]
                if carapace_tops:
                    most_recent = max(carapace_tops, key=lambda c: c.created_at)
                    latest_capture = most_recent.thumbnail_path or most_recent.image_path
                elif captures:
                    # Fall back to any capture
                    most_recent = max(captures, key=lambda c: c.created_at)
                    latest_capture = most_recent.thumbnail_path or most_recent.image_path

        response = TurtleResponse.model_validate(turtle)
        response.capture_count = capture_count
        response.encounter_count = encounter_count
        response.latest_capture = latest_capture
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
    """Update a turtle's name, notes, or external_id."""
    turtle = db.query(Turtle).filter(Turtle.id == turtle_id).first()
    if not turtle:
        raise HTTPException(status_code=404, detail="Turtle not found")

    if data.name is not None:
        turtle.name = data.name
    if data.notes is not None:
        turtle.notes = data.notes
    if data.external_id is not None:
        # Check for duplicate
        existing = db.query(Turtle).filter(
            Turtle.external_id == data.external_id,
            Turtle.id != turtle_id,
        ).first()
        if existing:
            raise HTTPException(
                status_code=400,
                detail=f"Turtle with external_id '{data.external_id}' already exists",
            )
        turtle.external_id = data.external_id

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
