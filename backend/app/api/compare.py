# ABOUTME: API endpoints for image comparison operations.
# ABOUTME: Handles direct image comparison and database search.

import uuid
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models import Capture, Turtle
from app.schemas.match import CompareResponse, MatchCandidate, SearchResponse
from app.services import CropperService, ImageService, SiftService

router = APIRouter()

# Service instances (singleton-ish for now)
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


@router.post("/compare", response_model=CompareResponse)
async def compare_images(
    image1: UploadFile = File(...),
    image2: UploadFile = File(...),
    use_cropping: bool = Query(True, description="Apply auto-cropping to images"),
    threshold: Optional[float] = Query(None, description="Custom acceptance threshold"),
    sift: SiftService = Depends(get_sift_service),
    cropper: CropperService = Depends(get_cropper_service),
    image_svc: ImageService = Depends(get_image_service),
):
    """
    Compare two uploaded images and determine if they match.

    Returns the SIFT similarity score and match decision.
    """
    # Load images from uploads
    data1 = await image1.read()
    data2 = await image2.read()

    img1 = image_svc.load_from_bytes(data1)
    img2 = image_svc.load_from_bytes(data2)

    if img1 is None or img2 is None:
        raise HTTPException(status_code=400, detail="Failed to load one or both images")

    # Preprocess images
    processed1 = image_svc.preprocess(img1, crop=use_cropping, cropper=cropper)
    processed2 = image_svc.preprocess(img2, crop=use_cropping, cropper=cropper)

    # Extract features
    features1 = sift.extract_features(processed1)
    features2 = sift.extract_features(processed2)

    if features1 is None or features2 is None:
        raise HTTPException(
            status_code=400,
            detail="Failed to extract SIFT features from one or both images",
        )

    # Compare with optional custom threshold
    if threshold is not None:
        custom_sift = SiftService(acceptance_threshold=threshold)
        result = custom_sift.compare(features1, features2)
    else:
        result = sift.compare(features1, features2)

    # Generate visualization
    viz_filename = f"viz_{uuid.uuid4()}.jpg"
    viz_path = settings.data_dir / "thumbnails" / viz_filename
    viz_image = sift.generate_match_visualization(processed1, processed2, features1, features2)
    import cv2
    cv2.imwrite(str(viz_path), viz_image)

    return CompareResponse(
        score=result.score,
        is_match=result.is_match,
        keypoints_1_count=result.keypoints_1_count,
        keypoints_2_count=result.keypoints_2_count,
        good_points_count=result.good_points_count,
        visualization_url=f"/api/visualizations/{viz_filename}",
    )


@router.get("/visualizations/{filename}")
async def get_visualization(filename: str):
    """Serve a generated visualization image."""
    path = settings.data_dir / "thumbnails" / filename
    if not path.exists():
        raise HTTPException(status_code=404, detail="Visualization not found")
    return FileResponse(path, media_type="image/jpeg")


@router.post("/search", response_model=SearchResponse)
async def search_database(
    image: UploadFile = File(...),
    use_cropping: bool = Query(True, description="Apply auto-cropping to image"),
    threshold: Optional[float] = Query(None, description="Custom acceptance threshold"),
    limit: int = Query(10, ge=1, le=100, description="Maximum matches to return"),
    db: Session = Depends(get_db),
    sift: SiftService = Depends(get_sift_service),
    cropper: CropperService = Depends(get_cropper_service),
    image_svc: ImageService = Depends(get_image_service),
):
    """
    Search the database for matching turtles.

    Compares the uploaded image against all captures in the database
    and returns ranked matches.
    """
    import time

    start_time = time.time()

    # Load and preprocess query image
    data = await image.read()
    img = image_svc.load_from_bytes(data)

    if img is None:
        raise HTTPException(status_code=400, detail="Failed to load image")

    processed = image_svc.preprocess(img, crop=use_cropping, cropper=cropper)
    query_features = sift.extract_features(processed)

    if query_features is None:
        raise HTTPException(status_code=400, detail="Failed to extract SIFT features")

    # Get all captures with cached features
    captures = db.query(Capture).filter(Capture.descriptors_data.isnot(None)).all()

    # Compare against each capture
    matches: list[MatchCandidate] = []
    effective_threshold = threshold if threshold is not None else settings.acceptance_threshold

    for capture in captures:
        try:
            from app.services.sift import SiftFeatures

            db_features = SiftFeatures.deserialize(
                capture.keypoints_data, capture.descriptors_data
            )
            result = sift.compare(query_features, db_features)

            # Get turtle info if linked
            turtle_name = None
            turtle_external_id = None
            if capture.turtle_id:
                turtle = db.query(Turtle).filter(Turtle.id == capture.turtle_id).first()
                if turtle:
                    turtle_name = turtle.name
                    turtle_external_id = turtle.external_id

            matches.append(
                MatchCandidate(
                    capture_id=capture.id,
                    turtle_id=capture.turtle_id,
                    turtle_name=turtle_name,
                    turtle_external_id=turtle_external_id,
                    score=result.score,
                    is_match=result.score >= effective_threshold,
                    thumbnail_url=capture.thumbnail_path or capture.image_path,
                )
            )
        except Exception:
            # Skip captures with corrupted data
            continue

    # Sort by score descending, filter to matches, limit results
    matches.sort(key=lambda m: m.score, reverse=True)
    top_matches = [m for m in matches if m.is_match][:limit]

    processing_time_ms = int((time.time() - start_time) * 1000)

    return SearchResponse(
        total_compared=len(captures),
        processing_time_ms=processing_time_ms,
        matches=top_matches,
    )
