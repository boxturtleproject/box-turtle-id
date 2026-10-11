# ABOUTME: Computes and stores fused-matcher features for captures (shell box, crop
# ABOUTME: SIFT, embeddings), one at a time or as a resumable backfill job.

import json
import logging
import threading
from collections.abc import Callable
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime

import numpy as np
from PIL import Image, ImageOps

from app.config import settings
from app.services import matcher

logger = logging.getLogger(__name__)


def load_capture_image(capture) -> Image.Image | None:
    """Original from the data volume if present, else the display derivative from the bucket."""
    from app.services.storage import S3Storage, get_storage

    if capture.image_path:
        try:
            return ImageOps.exif_transpose(Image.open(capture.image_path)).convert("RGB")
        except (FileNotFoundError, OSError):
            pass
    storage = get_storage()
    if isinstance(storage, S3Storage) and capture.display_path:
        import io

        import requests

        try:
            resp = requests.get(
                storage.signed_url(capture.display_path, expires_in=120), timeout=20
            )
            if resp.ok:
                return Image.open(io.BytesIO(resp.content)).convert("RGB")
        except Exception as e:
            logger.warning(f"display fetch failed for capture {capture.id}: {e}")
    return None


def store_features(db, capture_id: int, ev: "matcher.PhotoEvidence"):
    from app.models import CaptureEmbedding, CaptureMatchFeatures

    f = db.get(CaptureMatchFeatures, capture_id) or CaptureMatchFeatures(capture_id=capture_id)
    f.shell_found = ev.box is not None
    f.shell_box = json.dumps(ev.box) if ev.box else None
    f.keypoint_count = ev.sift[0]
    f.descriptors = matcher.pack_descriptors(ev.sift[1])
    f.crop_model = settings.crop_model
    f.updated_at = datetime.now()
    db.merge(f)
    for variant, vec in ev.embeddings.items():
        e = (
            db.query(CaptureEmbedding)
            .filter_by(capture_id=capture_id, variant=variant, model=settings.embed_model)
            .first()
        )
        if e is None:
            e = CaptureEmbedding(capture_id=capture_id, variant=variant, model=settings.embed_model)
            db.add(e)
        e.dim = int(vec.shape[0])
        e.vector = np.asarray(vec, dtype=np.float32).tobytes()
    db.commit()


def compute_for_capture(db, capture) -> bool:
    """Analyse one capture's image and store its features. False if the image is unavailable."""
    img = load_capture_image(capture)
    if img is None:
        return False
    store_features(db, capture.id, matcher.analyse_photo(img))
    return True


def pending_capture_ids(db) -> list[int]:
    """Reference captures missing crop SIFT or either embedding for the current model."""
    from app.models import Capture, CaptureEmbedding, CaptureMatchFeatures

    have_feats = {c for (c,) in db.query(CaptureMatchFeatures.capture_id).all()}
    have_emb: dict[int, set] = {}
    for c, v in (
        db.query(CaptureEmbedding.capture_id, CaptureEmbedding.variant)
        .filter(CaptureEmbedding.model == settings.embed_model)
        .all()
    ):
        have_emb.setdefault(c, set()).add(v)
    ids = [
        c
        for (c,) in db.query(Capture.id)
        .filter(Capture.turtle_id.isnot(None), Capture.image_type != "site_view")
        .all()
    ]
    return [
        c for c in ids if c not in have_feats or have_emb.get(c, set()) != set(matcher.VARIANTS)
    ]


def run_backfill(
    session_factory, on_progress: Callable[[int, int, int], None] | None = None, workers: int = 4
) -> dict:
    """Compute features for every pending reference capture. Resumable; returns counts."""
    from app.models import Capture

    with session_factory() as db:
        todo = pending_capture_ids(db)
    done = failed = 0
    lock = threading.Lock()

    def one(cid):
        nonlocal done, failed
        with session_factory() as db:
            cap = db.get(Capture, cid)
            try:
                ok = compute_for_capture(db, cap)
            except Exception as e:
                logger.warning(f"match features failed for capture {cid}: {e}")
                ok = False
        with lock:
            done += ok
            failed += not ok
            if on_progress:
                on_progress(done, failed, len(todo))

    with ThreadPoolExecutor(workers) as pool:
        list(pool.map(one, todo))
    matcher.invalidate()
    return {"pending": len(todo), "done": done, "failed": failed}
