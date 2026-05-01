"""Generate thumbnail + display variants of a capture image.

Variants:
- thumb: square ~400px JPEG, ~50 KB. For grid/cards.
- display: max-width 1280px JPEG, ~300-500 KB. For detail view.

Originals are not modified or uploaded — they stay where they are.
"""
import logging
from io import BytesIO
from pathlib import Path
from typing import Optional

from PIL import Image
from sqlalchemy.orm import Session

from app.config import settings
from app.models import Capture
from app.services.storage import get_storage

logger = logging.getLogger(__name__)

THUMB_SUBDIR = "thumb"
DISPLAY_SUBDIR = "display"


def _resize_max(img: Image.Image, max_w: int) -> Image.Image:
    if img.width <= max_w:
        return img
    new_h = int(img.height * max_w / img.width)
    return img.resize((max_w, new_h), Image.Resampling.LANCZOS)


def _square_thumb(img: Image.Image, size: int) -> Image.Image:
    out = img.copy()
    out.thumbnail((size, size), Image.Resampling.LANCZOS)
    return out


def _to_jpeg_bytes(img: Image.Image, quality: int) -> bytes:
    if img.mode != "RGB":
        img = img.convert("RGB")
    buf = BytesIO()
    img.save(buf, "JPEG", quality=quality, optimize=True)
    return buf.getvalue()


def _derivative_key(variant: str, capture: Capture) -> str:
    """Storage key for a derivative. Uses capture id + variant for uniqueness."""
    ext = "jpg"
    return f"captures/derivatives/{variant}/{capture.id}.{ext}"


class DerivativesService:
    def __init__(self, db: Session):
        self.db = db
        self.storage = get_storage()

    def generate_for_capture(self, capture: Capture, force: bool = False) -> dict:
        """Generate thumb + display for one capture. Idempotent unless force=True."""
        if not force and capture.thumbnail_path and capture.display_path:
            return {"status": "skip", "reason": "already_generated"}

        src = Path(capture.image_path)
        if not src.exists():
            return {"status": "error", "reason": "missing_source", "path": str(src)}

        try:
            img = Image.open(src)
            img.load()
        except Exception as e:
            return {"status": "error", "reason": "open_failed", "error": str(e)}

        # Apply EXIF orientation if present (Pillow doesn't auto-rotate)
        try:
            from PIL import ImageOps
            img = ImageOps.exif_transpose(img)
        except Exception:
            pass

        thumb_img = _square_thumb(img, settings.thumbnail_size)
        display_img = _resize_max(img, settings.display_width)

        thumb_bytes = _to_jpeg_bytes(thumb_img, settings.jpeg_quality)
        display_bytes = _to_jpeg_bytes(display_img, settings.jpeg_quality)

        thumb_key = _derivative_key(THUMB_SUBDIR, capture)
        display_key = _derivative_key(DISPLAY_SUBDIR, capture)

        thumb_path, thumb_url = self.storage.put(thumb_key, thumb_bytes)
        display_path, display_url = self.storage.put(display_key, display_bytes)

        capture.thumbnail_path = thumb_path
        capture.display_path = display_path
        capture.thumbnail_url = thumb_url
        capture.display_url = display_url
        return {
            "status": "ok",
            "thumb_bytes": len(thumb_bytes),
            "display_bytes": len(display_bytes),
            "backend": self.storage.name,
        }

    def generate_for_all(self, force: bool = False, limit: Optional[int] = None) -> dict:
        q = self.db.query(Capture).filter(Capture.image_path.isnot(None))
        if not force:
            q = q.filter((Capture.thumbnail_path.is_(None)) | (Capture.display_path.is_(None)))
        if limit:
            q = q.limit(limit)
        caps = q.all()
        ok = err = skipped = 0
        for cap in caps:
            res = self.generate_for_capture(cap, force=force)
            if res["status"] == "ok":
                ok += 1
                if ok % 50 == 0:
                    self.db.commit()
                    logger.info(f"derivatives generated for {ok} captures so far")
            elif res["status"] == "skip":
                skipped += 1
            else:
                err += 1
                logger.warning(f"capture {cap.id} derivative failed: {res}")
        self.db.commit()
        return {"generated": ok, "skipped": skipped, "errors": err,
                "backend": self.storage.name}
