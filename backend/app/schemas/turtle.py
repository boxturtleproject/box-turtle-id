# ABOUTME: Pydantic schemas for turtle and capture endpoints.
# ABOUTME: Defines request/response models for CRUD operations.

from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class CaptureCreate(BaseModel):
    """Request schema for creating a capture."""

    captured_date: Optional[date] = None


class CaptureResponse(BaseModel):
    """Response schema for a capture."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    turtle_id: Optional[int]
    encounter_id: Optional[int] = None
    image_type: str = "carapace_top"
    image_path: str
    thumbnail_path: Optional[str]
    display_path: Optional[str] = None
    thumbnail_url: Optional[str] = None
    display_url: Optional[str] = None
    original_filename: str
    captured_date: Optional[date]
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    exif_datetime: Optional[datetime] = None
    camera_make: Optional[str] = None
    camera_model: Optional[str] = None
    keypoint_count: int
    created_at: datetime


class TurtleCreate(BaseModel):
    """Request schema for creating a turtle."""

    external_id: str
    name: Optional[str] = None
    first_seen: date = Field(default_factory=date.today)
    notes: Optional[str] = None


class TurtleUpdate(BaseModel):
    """Request schema for updating a turtle."""

    name: Optional[str] = None
    notes: Optional[str] = None
    external_id: Optional[str] = None


class TurtleResponse(BaseModel):
    """Response schema for a turtle."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    external_id: str
    name: Optional[str]
    site: Optional[str] = None
    first_seen: date
    notes: Optional[str]
    cover_capture_id: Optional[int] = None

    # Extended fields from Airtable
    species: Optional[str] = None
    gender: Optional[str] = None
    pattern: Optional[str] = None
    carapace_flare: Optional[str] = None

    created_at: datetime
    updated_at: datetime
    capture_count: int = 0
    encounter_count: int = 0
    latest_capture: Optional[str] = None
    captures: list[CaptureResponse] = []


class EncounterResponse(BaseModel):
    """Response schema for an encounter."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    turtle_id: int
    external_id: Optional[str] = None
    encounter_date: Optional[datetime] = None
    plot_name: Optional[str] = None
    survey_id: Optional[str] = None
    identified: Optional[str] = None
    health_status: Optional[str] = None
    behavior: Optional[str] = None
    notes: Optional[str] = None
    created_at: datetime
    capture_count: int = 0


class EncounterDetailResponse(EncounterResponse):
    """Response schema for an encounter with captures."""

    captures: list[CaptureResponse] = []


class TurtleDetailResponse(TurtleResponse):
    """Response schema for a turtle with captures and encounters."""

    captures: list[CaptureResponse] = []
    encounters: list[EncounterResponse] = []
