# ABOUTME: Pydantic schemas for SIFT settings endpoints.
# ABOUTME: Defines request/response models for algorithm configuration.

from typing import Optional

from pydantic import BaseModel, Field


class SiftSettings(BaseModel):
    """SIFT algorithm settings."""

    acceptance_threshold: float = Field(
        default=4.0,
        ge=1.0,
        le=20.0,
        description="Match score threshold (1-20). Higher = stricter matching.",
    )
    distance_coefficient: float = Field(
        default=0.67,
        ge=0.5,
        le=0.9,
        description="Lowe's ratio test coefficient (0.5-0.9). Lower = stricter.",
    )
    resized_width: int = Field(
        default=250,
        ge=150,
        le=500,
        description="Image resize width for feature extraction (150-500). Larger = more features but slower.",
    )


class SiftSettingsUpdate(BaseModel):
    """Request to update SIFT settings. All fields optional."""

    acceptance_threshold: Optional[float] = Field(
        default=None,
        ge=1.0,
        le=20.0,
    )
    distance_coefficient: Optional[float] = Field(
        default=None,
        ge=0.5,
        le=0.9,
    )
    resized_width: Optional[int] = Field(
        default=None,
        ge=150,
        le=500,
    )


class SiftSettingsResponse(SiftSettings):
    """Response containing current SIFT settings and re-extraction status."""

    reextraction_job_id: Optional[str] = Field(
        default=None,
        description="Job ID if feature re-extraction is in progress.",
    )
