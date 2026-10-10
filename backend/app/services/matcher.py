# ABOUTME: Fused matcher: SIFT on the Gemini shell crop + image embeddings (PCA->LDA),
# ABOUTME: combined per turtle, added up across an encounter's photos, with spot-score bands.
"""
Ported from turtle-vision (matching.py, sift_match.py, app.py). Field test on
364 hand-verified photos: right turtle first 90% of the time (97% in the top
5) vs 80% for SIFT alone; encounters with 2+ photos 31/31.

Per photo:
  1. Gemini shell box -> "crop" (box + 5%) and "tight" (central 1/sqrt(2)) crops
  2. SIFT on the crop at 250px, scored against every reference crop
     (score = good matches / fewest keypoints * 100, ratio test 0.67)
  3. Embeddings of both crops, projected with PCA(128) -> LDA (fit on the
     reference captures' turtle ids); cosine similarity averaged over crops
  4. Per turtle: log(1 + best SIFT score) + best embedding similarity
Several photos: per-turtle scores are added up; the spot score is the
turtle's best SIFT score across the photos.
"""

import json
import logging
import threading
import time
from concurrent.futures import ThreadPoolExecutor
from dataclasses import dataclass, field

import cv2
import numpy as np
from PIL import Image

from app.config import settings
from app.services import gemini, shellcrop

logger = logging.getLogger(__name__)

SIFT_WIDTH = 250
SIFT_RATIO = 0.67
VARIANTS = ("crop", "tight")
PCA_DIM = 128

# Spot-score bands, from the field test (spot score of the top turtle):
#   >= 2.0 "match"         about 95% right
#   1.5-2  "check"         probably this turtle; confirm against the top 5
#   < 1.5  "possibly_new"  catches 92% of new turtles
# With 2+ photos the best photo is used and the "check" zone is dropped
# (new-turtle cut-off 2.0), since more photos give a new turtle more chances
# to match a known one by luck.
BAND_MATCH = 2.0
BAND_CHECK = 1.5
CONFIDENCE = {"match": "high", "check": "medium", "possibly_new": "low"}

_pool = ThreadPoolExecutor(8)


def band_of(spot: float, n_photos: int = 1) -> str:
    if spot >= BAND_MATCH:
        return "match"
    if spot >= BAND_CHECK and n_photos == 1:
        return "check"
    return "possibly_new"


# ---------------------------------------------------------------- SIFT

_sift = cv2.SIFT_create()


def sift_features(img: Image.Image) -> tuple[int, np.ndarray | None]:
    """(keypoint count, uint8 descriptors) of an image resized to SIFT_WIDTH wide."""
    gray = np.asarray(img.convert("L"))
    h, w = gray.shape
    gray = cv2.resize(
        gray, (SIFT_WIDTH, max(1, round(h * SIFT_WIDTH / w))), interpolation=cv2.INTER_AREA
    )
    kp, desc = _sift.detectAndCompute(gray, None)
    return (len(kp), desc.astype(np.uint8)) if desc is not None else (0, None)


def _good(bf, a, b) -> int:
    if a is None or b is None or len(a) < 2 or len(b) < 2:
        return 0
    return sum(
        1
        for m in bf.knnMatch(a, b, k=2)
        if len(m) == 2 and m[0].distance < SIFT_RATIO * m[1].distance
    )


def sift_score(fa, fb) -> float:
    a = fa[1].astype(np.float32) if fa[1] is not None else None
    b = fb[1].astype(np.float32) if fb[1] is not None else None
    bf = cv2.BFMatcher(cv2.NORM_L2)  # one per call: matchers aren't shared across threads
    fewest = min(fa[0], fb[0])
    return max(_good(bf, a, b), _good(bf, b, a)) / fewest * 100 if fewest else 0.0


def pack_descriptors(desc: np.ndarray | None) -> bytes | None:
    return None if desc is None else desc.astype(np.uint8).tobytes()


def unpack_descriptors(blob: bytes | None) -> np.ndarray | None:
    return None if not blob else np.frombuffer(blob, dtype=np.uint8).reshape(-1, 128)


# ---------------------------------------------------------------- per-photo evidence


@dataclass
class PhotoEvidence:
    box: list[int] | None
    sift: tuple[int, np.ndarray | None]
    embeddings: dict[str, np.ndarray] = field(default_factory=dict)


def analyse_photo(img: Image.Image) -> PhotoEvidence:
    """Gemini box -> crops -> SIFT features and both embeddings (in parallel)."""
    img = img.convert("RGB")
    box = gemini.detect_shell_box(img)
    crops = shellcrop.crops(img, box)
    sift_job = _pool.submit(sift_features, crops["crop"])
    emb_jobs = {v: _pool.submit(gemini.embed_image, crops[v]) for v in VARIANTS}
    return PhotoEvidence(
        box=box, sift=sift_job.result(), embeddings={v: j.result() for v, j in emb_jobs.items()}
    )


# ---------------------------------------------------------------- reference index


def _unit(P):
    return P / (np.linalg.norm(P, axis=1, keepdims=True) + 1e-12)


def _fit_projection(X: np.ndarray, labels: np.ndarray):
    """PCA -> LDA (shrinkage) fitted on reference embeddings; returns f(Z) -> unit vectors."""
    from sklearn.decomposition import PCA
    from sklearn.discriminant_analysis import LinearDiscriminantAnalysis

    pca = PCA(
        n_components=min(PCA_DIM, X.shape[0] - 1, X.shape[1]), svd_solver="full", random_state=0
    ).fit(X)
    if len(set(labels)) < 2:
        return lambda Z: _unit(pca.transform(Z))
    lda = LinearDiscriminantAnalysis(solver="eigen", shrinkage="auto").fit(pca.transform(X), labels)
    return lambda Z: _unit(lda.transform(pca.transform(Z)))


@dataclass
class Ranked:
    turtle_id: int
    fused: float
    spot: float
    best_capture_id: int


class MatchIndex:
    """Every reference capture with crop SIFT features and both embeddings."""

    def __init__(self, db):
        from app.models import Capture, CaptureEmbedding, CaptureMatchFeatures, Turtle

        t0 = time.time()
        feats = {f.capture_id: f for f in db.query(CaptureMatchFeatures).all()}
        embs: dict[tuple[int, str], np.ndarray] = {}
        for e in (
            db.query(CaptureEmbedding).filter(CaptureEmbedding.model == settings.embed_model).all()
        ):
            embs[(e.capture_id, e.variant)] = np.frombuffer(e.vector, dtype=np.float32)
        rows = (
            db.query(
                Capture.id,
                Capture.turtle_id,
                Turtle.site,
                Capture.thumbnail_url,
                Capture.display_url,
            )
            .join(Turtle, Capture.turtle_id == Turtle.id)
            .filter(Capture.image_type != "site_view")
            .all()
        )
        keep = [r for r in rows if r.id in feats and all((r.id, v) in embs for v in VARIANTS)]
        self.capture_ids = [r.id for r in keep]
        self.turtle_ids = np.array([r.turtle_id for r in keep])
        self.sites = np.array([r.site or "" for r in keep])
        self.thumbs = {r.id: r.thumbnail_url or r.display_url for r in keep}
        self.sift = [
            (feats[c].keypoint_count, unpack_descriptors(feats[c].descriptors))
            for c in self.capture_ids
        ]
        self.classes = sorted(set(self.turtle_ids.tolist()))
        self.cidx = (
            np.array([self.classes.index(t) for t in self.turtle_ids])
            if keep
            else np.array([], int)
        )
        self.project, self.P = {}, {}
        if len(keep) >= 3:
            for v in VARIANTS:
                X = np.stack([embs[(c, v)] for c in self.capture_ids])
                self.project[v] = _fit_projection(X, self.turtle_ids)
                self.P[v] = self.project[v](X)
        logger.info(
            f"match index: {len(keep)} captures, {len(self.classes)} turtles "
            f"({len(rows) - len(keep)} without features) in {time.time() - t0:.1f}s"
        )

    def __len__(self):
        return len(self.capture_ids)

    def photo_scores(self, ev: PhotoEvidence):
        """Per reference capture: SIFT scores and embedding similarity (average over crops)."""
        n = len(self.capture_ids)
        chunks = [range(i, min(n, i + 64)) for i in range(0, n, 64)]
        parts = _pool.map(lambda ch: [sift_score(ev.sift, self.sift[j]) for j in ch], chunks)
        s_sift = np.array([x for part in parts for x in part])
        s_emb = np.mean(
            [self.P[v] @ self.project[v](ev.embeddings[v][None, :])[0] for v in VARIANTS], axis=0
        )
        return s_sift, s_emb

    def rank(
        self, photos: list[PhotoEvidence], site: str | None = None, top: int = 10
    ) -> list[Ranked]:
        """Turtles ranked by fused score added up across photos."""
        k = len(self.classes)
        total = np.zeros(k)
        best_spot = np.zeros(k)
        best_cap = np.full(k, -1)
        best_cap_score = np.full(k, -np.inf)
        for ev in photos:
            s_sift, s_emb = self.photo_scores(ev)
            spot = np.zeros(k)
            np.maximum.at(spot, self.cidx, s_sift)
            emb = np.full(k, -np.inf)
            np.maximum.at(emb, self.cidx, s_emb)
            total += np.log1p(spot) + np.where(np.isfinite(emb), emb, -1.0)
            best_spot = np.maximum(best_spot, spot)
            for j in np.argsort(-(s_sift + s_emb)):  # representative capture per turtle
                c = self.cidx[j]
                val = s_sift[j] + s_emb[j]
                if val > best_cap_score[c]:
                    best_cap_score[c], best_cap[c] = val, self.capture_ids[j]
        if site:
            at_site = np.array([any(self.sites[self.cidx == c] == site) for c in range(k)])
            total = np.where(at_site, total, -np.inf)
        order = [c for c in np.argsort(-total) if np.isfinite(total[c])][:top]
        return [
            Ranked(int(self.classes[c]), float(total[c]), float(best_spot[c]), int(best_cap[c]))
            for c in order
        ]


_index: MatchIndex | None = None
_index_lock = threading.Lock()


def get_index(db) -> MatchIndex:
    """Build the reference index on first use; rebuilt after invalidate()."""
    global _index
    with _index_lock:
        if _index is None:
            _index = MatchIndex(db)
        return _index


def invalidate():
    """Call after captures or their match features change."""
    global _index
    with _index_lock:
        _index = None


def identify(db, images: list[Image.Image], site: str | None = None):
    """Rank turtles for one encounter's photos. Returns (ranked, band, n_photos, ms)."""
    t0 = time.time()
    index = get_index(db)
    if len(index) < 3 or not index.P:
        raise RuntimeError("match index is empty: run the matching backfill first")
    photos = list(_pool.map(analyse_photo, images))
    ranked = index.rank(photos, site)
    band = band_of(ranked[0].spot, len(photos)) if ranked else "possibly_new"
    return ranked, band, len(photos), int((time.time() - t0) * 1000)


def summary_json(ranked: list[Ranked], n: int = 5) -> str:
    return json.dumps([[r.turtle_id, round(r.fused, 3), round(r.spot, 2)] for r in ranked[:n]])
