# ABOUTME: Pydantic schemas for background job endpoints.
# ABOUTME: Defines request/response models for async job tracking.

from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel


class JobResponse(BaseModel):
    """Response schema for a background job."""

    id: str
    job_type: str
    status: str
    progress: int
    result_data: Optional[Any] = None
    error_message: Optional[str] = None
    created_at: datetime
    completed_at: Optional[datetime] = None
