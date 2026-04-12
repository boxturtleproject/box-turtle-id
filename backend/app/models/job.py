# ABOUTME: Database model for background job tracking.
# ABOUTME: Stores status and results of async operations like batch matching.

import uuid
from datetime import datetime
from enum import Enum
from typing import Optional

from sqlalchemy import Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class JobStatus(str, Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"


class JobType(str, Enum):
    COMPARE = "compare"
    SEARCH = "search"
    BATCH = "batch"


def generate_uuid() -> str:
    return str(uuid.uuid4())


class Job(Base):
    """Background job for async operations."""

    __tablename__ = "jobs"

    id: Mapped[str] = mapped_column(primary_key=True, default=generate_uuid)
    job_type: Mapped[str]
    status: Mapped[str] = mapped_column(default=JobStatus.PENDING.value)
    progress: Mapped[int] = mapped_column(default=0)
    result_data: Mapped[Optional[str]] = mapped_column(Text, default=None)  # JSON string
    error_message: Mapped[Optional[str]] = mapped_column(Text, default=None)
    created_at: Mapped[datetime] = mapped_column(insert_default=func.now())
    completed_at: Mapped[Optional[datetime]] = mapped_column(default=None)
