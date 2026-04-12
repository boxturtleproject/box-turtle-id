import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


def generate_uuid() -> str:
    return str(uuid.uuid4())


class Submission(Base):
    __tablename__ = "submissions"

    id: Mapped[str] = mapped_column(primary_key=True, default=generate_uuid)
    site: Mapped[str]
    top_image_path: Mapped[str]
    left_image_path: Mapped[Optional[str]] = mapped_column(default=None)
    right_image_path: Mapped[Optional[str]] = mapped_column(default=None)
    other_image_paths: Mapped[Optional[str]] = mapped_column(Text, default=None)
    status: Mapped[str] = mapped_column(default="pending")
    created_at: Mapped[datetime] = mapped_column(insert_default=func.now())
