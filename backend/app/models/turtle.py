from datetime import date, datetime
from typing import TYPE_CHECKING, Optional

from sqlalchemy import ForeignKey, LargeBinary, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

if TYPE_CHECKING:
    from app.models.encounter import Encounter


class Turtle(Base):
    __tablename__ = "turtles"

    id: Mapped[int] = mapped_column(primary_key=True)
    external_id: Mapped[str] = mapped_column(index=True)
    name: Mapped[Optional[str]] = mapped_column(default=None)
    site: Mapped[Optional[str]] = mapped_column(default=None, index=True)
    first_seen: Mapped[date]
    notes: Mapped[Optional[str]] = mapped_column(Text, default=None)
    cover_capture_id: Mapped[Optional[int]] = mapped_column(default=None)

    species: Mapped[Optional[str]] = mapped_column(default=None)
    gender: Mapped[Optional[str]] = mapped_column(default=None)
    pattern: Mapped[Optional[str]] = mapped_column(default=None)
    carapace_flare: Mapped[Optional[str]] = mapped_column(default=None)
    nickname: Mapped[Optional[str]] = mapped_column(default=None)
    health_status: Mapped[Optional[str]] = mapped_column(default=None)
    residence_status: Mapped[Optional[str]] = mapped_column(default=None)
    identifying_marks: Mapped[Optional[str]] = mapped_column(Text, default=None)
    eye_color: Mapped[Optional[str]] = mapped_column(default=None)
    plastron_depression: Mapped[Optional[str]] = mapped_column(default=None)
    plots_text: Mapped[Optional[str]] = mapped_column(default=None)

    airtable_record_id: Mapped[Optional[str]] = mapped_column(default=None)
    last_synced_at: Mapped[Optional[datetime]] = mapped_column(default=None)

    created_at: Mapped[datetime] = mapped_column(insert_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(insert_default=func.now(), onupdate=func.now())

    captures: Mapped[list["Capture"]] = relationship(back_populates="turtle")
    encounters: Mapped[list["Encounter"]] = relationship(back_populates="turtle")


class Capture(Base):
    __tablename__ = "captures"

    id: Mapped[int] = mapped_column(primary_key=True)
    turtle_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("turtles.id", ondelete="SET NULL"), default=None
    )
    encounter_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("encounters.id", ondelete="SET NULL"), default=None
    )
    image_type: Mapped[str] = mapped_column(default="carapace_top")
    image_path: Mapped[str]
    thumbnail_path: Mapped[Optional[str]] = mapped_column(default=None)
    display_path: Mapped[Optional[str]] = mapped_column(default=None)
    thumbnail_url: Mapped[Optional[str]] = mapped_column(default=None)
    display_url: Mapped[Optional[str]] = mapped_column(default=None)
    original_filename: Mapped[str]
    captured_date: Mapped[Optional[date]] = mapped_column(default=None)

    latitude: Mapped[Optional[float]] = mapped_column(default=None)
    longitude: Mapped[Optional[float]] = mapped_column(default=None)
    exif_datetime: Mapped[Optional[datetime]] = mapped_column(default=None)
    camera_make: Mapped[Optional[str]] = mapped_column(default=None)
    camera_model: Mapped[Optional[str]] = mapped_column(default=None)

    keypoints_data: Mapped[Optional[bytes]] = mapped_column(LargeBinary, default=None)
    descriptors_data: Mapped[Optional[bytes]] = mapped_column(LargeBinary, default=None)
    keypoint_count: Mapped[int] = mapped_column(default=0)
    airtable_attachment_id: Mapped[Optional[str]] = mapped_column(default=None, unique=True, index=True)
    airtable_field_name: Mapped[Optional[str]] = mapped_column(default=None)  # 'Carapace Top', 'Plastron', etc.
    source: Mapped[str] = mapped_column(default="app")  # 'app' | 'airtable'

    last_synced_at: Mapped[Optional[datetime]] = mapped_column(default=None)
    created_at: Mapped[datetime] = mapped_column(insert_default=func.now())

    turtle: Mapped[Optional["Turtle"]] = relationship(back_populates="captures")
    encounter: Mapped[Optional["Encounter"]] = relationship(back_populates="captures")


class MatchResult(Base):
    __tablename__ = "match_results"

    id: Mapped[int] = mapped_column(primary_key=True)
    capture_1_id: Mapped[int] = mapped_column(ForeignKey("captures.id", ondelete="CASCADE"))
    capture_2_id: Mapped[int] = mapped_column(ForeignKey("captures.id", ondelete="CASCADE"))
    score: Mapped[float]
    is_match: Mapped[bool]
    computed_at: Mapped[datetime] = mapped_column(insert_default=func.now())

    capture_1: Mapped["Capture"] = relationship(foreign_keys=[capture_1_id])
    capture_2: Mapped["Capture"] = relationship(foreign_keys=[capture_2_id])
