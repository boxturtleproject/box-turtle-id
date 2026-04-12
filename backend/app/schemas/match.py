# ABOUTME: Pydantic schemas for image comparison endpoints.
# ABOUTME: Defines request/response models for SIFT matching operations.

from typing import Optional

from pydantic import BaseModel


class CompareRequest(BaseModel):
    """Request parameters for compare endpoint (non-file params)."""

    use_cropping: bool = True
    threshold: Optional[float] = None


class CompareResponse(BaseModel):
    """Response schema for image comparison."""

    score: float
    is_match: bool
    keypoints_1_count: int
    keypoints_2_count: int
    good_points_count: int
    visualization_url: Optional[str] = None


class MatchCandidate(BaseModel):
    """A potential match from database search."""

    capture_id: int
    turtle_id: Optional[int]
    turtle_name: Optional[str]
    turtle_external_id: Optional[str]
    score: float
    is_match: bool
    thumbnail_url: str


class SearchResponse(BaseModel):
    """Response schema for database search."""

    total_compared: int
    processing_time_ms: int
    matches: list[MatchCandidate]
