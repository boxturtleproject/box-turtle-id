# ABOUTME: Per-capture data for the fused matcher (shell box, crop SIFT, embeddings)
# ABOUTME: and a shadow log comparing the SIFT and fused matchers on real submissions.

from datetime import datetime

from sqlalchemy import ForeignKey, LargeBinary, Text, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class CaptureMatchFeatures(Base):
    """Gemini shell box and SIFT descriptors of the shell crop for one capture.

    New table (not new columns on captures) so create_all() adds it on deploy
    without a migration.
    """

    __tablename__ = "capture_match_features"

    capture_id: Mapped[int] = mapped_column(
        ForeignKey("captures.id", ondelete="CASCADE"), primary_key=True
    )
    shell_found: Mapped[bool] = mapped_column(default=False)
    shell_box: Mapped[str | None] = mapped_column(
        default=None
    )  # JSON [ymin, xmin, ymax, xmax], 0..1000
    keypoint_count: Mapped[int] = mapped_column(default=0)
    descriptors: Mapped[bytes | None] = mapped_column(LargeBinary, default=None)  # uint8, n x 128
    crop_model: Mapped[str | None] = mapped_column(default=None)
    updated_at: Mapped[datetime] = mapped_column(insert_default=func.now(), onupdate=func.now())


class CaptureEmbedding(Base):
    """Image embedding of one crop variant ("crop" or "tight") of a capture."""

    __tablename__ = "capture_embeddings"
    __table_args__ = (UniqueConstraint("capture_id", "variant", "model"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    capture_id: Mapped[int] = mapped_column(
        ForeignKey("captures.id", ondelete="CASCADE"), index=True
    )
    variant: Mapped[str]
    model: Mapped[str]
    dim: Mapped[int]
    vector: Mapped[bytes] = mapped_column(LargeBinary)  # float32 little-endian
    created_at: Mapped[datetime] = mapped_column(insert_default=func.now())


class MatchShadowLog(Base):
    """Both matchers' answers for one submission, recorded in shadow mode."""

    __tablename__ = "match_shadow_log"

    id: Mapped[int] = mapped_column(primary_key=True)
    submission_id: Mapped[str] = mapped_column(index=True)
    site: Mapped[str | None] = mapped_column(default=None)
    n_photos: Mapped[int] = mapped_column(default=0)
    sift_top: Mapped[str | None] = mapped_column(
        Text, default=None
    )  # JSON [[turtle_id, score], ...]
    fused_top: Mapped[str | None] = mapped_column(
        Text, default=None
    )  # JSON [[turtle_id, fused, spot], ...]
    fused_band: Mapped[str | None] = mapped_column(default=None)
    fused_ms: Mapped[int | None] = mapped_column(default=None)
    error: Mapped[str | None] = mapped_column(Text, default=None)
    created_at: Mapped[datetime] = mapped_column(insert_default=func.now())
