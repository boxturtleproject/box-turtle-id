# ABOUTME: Database model for application settings.
# ABOUTME: Stores key-value pairs for configurable SIFT parameters.

from datetime import datetime

from sqlalchemy import Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class Setting(Base):
    """Application setting stored as key-value pair."""

    __tablename__ = "settings"

    key: Mapped[str] = mapped_column(primary_key=True)
    value: Mapped[str] = mapped_column(Text)
    updated_at: Mapped[datetime] = mapped_column(insert_default=func.now(), onupdate=func.now())
