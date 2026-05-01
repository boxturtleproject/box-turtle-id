from datetime import datetime
from typing import TYPE_CHECKING, Optional

from sqlalchemy import ForeignKey, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

if TYPE_CHECKING:
    from app.models.turtle import Capture, Turtle


class Encounter(Base):
    __tablename__ = "encounters"

    id: Mapped[int] = mapped_column(primary_key=True)
    turtle_id: Mapped[int] = mapped_column(ForeignKey("turtles.id", ondelete="CASCADE"), index=True)
    external_id: Mapped[Optional[str]] = mapped_column(default=None)
    airtable_record_id: Mapped[Optional[str]] = mapped_column(default=None)

    encounter_date: Mapped[Optional[datetime]] = mapped_column(default=None)
    plot_name: Mapped[Optional[str]] = mapped_column(default=None)
    survey_id: Mapped[Optional[str]] = mapped_column(default=None)
    identified: Mapped[Optional[str]] = mapped_column(default=None)
    health_status: Mapped[Optional[str]] = mapped_column(default=None)
    behavior: Mapped[Optional[str]] = mapped_column(default=None)
    setting: Mapped[Optional[str]] = mapped_column(default=None)
    conditions: Mapped[Optional[str]] = mapped_column(default=None)
    notes: Mapped[Optional[str]] = mapped_column(Text, default=None)
    survey_fk: Mapped[Optional[int]] = mapped_column(
        ForeignKey("surveys.id", ondelete="SET NULL"), default=None
    )
    plot_fk: Mapped[Optional[int]] = mapped_column(
        ForeignKey("plots.id", ondelete="SET NULL"), default=None
    )

    observer_nickname: Mapped[Optional[str]] = mapped_column(default=None)
    notify_email: Mapped[Optional[str]] = mapped_column(default=None)

    # Form-captured location (separate from per-photo EXIF coords on captures)
    latitude: Mapped[Optional[float]] = mapped_column(default=None)
    longitude: Mapped[Optional[float]] = mapped_column(default=None)

    last_synced_at: Mapped[Optional[datetime]] = mapped_column(default=None)
    created_at: Mapped[datetime] = mapped_column(insert_default=func.now())

    turtle: Mapped["Turtle"] = relationship(back_populates="encounters")
    captures: Mapped[list["Capture"]] = relationship(back_populates="encounter")
