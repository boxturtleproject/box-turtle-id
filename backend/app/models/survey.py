from datetime import datetime
from typing import Optional

from sqlalchemy import Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class Plot(Base):
    __tablename__ = "plots"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(index=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, default=None)
    airtable_record_id: Mapped[Optional[str]] = mapped_column(
        default=None, unique=True, index=True
    )
    last_synced_at: Mapped[Optional[datetime]] = mapped_column(default=None)
    created_at: Mapped[datetime] = mapped_column(insert_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(insert_default=func.now(), onupdate=func.now())


class Survey(Base):
    __tablename__ = "surveys"

    id: Mapped[int] = mapped_column(primary_key=True)
    external_id: Mapped[Optional[str]] = mapped_column(default=None, index=True)
    airtable_record_id: Mapped[Optional[str]] = mapped_column(
        default=None, unique=True, index=True
    )
    survey_datetime: Mapped[Optional[datetime]] = mapped_column(default=None)
    temperature: Mapped[Optional[float]] = mapped_column(default=None)
    surveyors: Mapped[Optional[str]] = mapped_column(default=None)  # comma-joined
    conditions: Mapped[Optional[str]] = mapped_column(default=None)  # comma-joined
    turtle_day: Mapped[Optional[str]] = mapped_column(default=None)
    notes: Mapped[Optional[str]] = mapped_column(Text, default=None)
    last_synced_at: Mapped[Optional[datetime]] = mapped_column(default=None)
    created_at: Mapped[datetime] = mapped_column(insert_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(insert_default=func.now(), onupdate=func.now())
