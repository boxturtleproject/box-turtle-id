# ABOUTME: Fused matcher: SIFT on the Gemini shell crop + image embeddings (PCA->LDA),
# ABOUTME: combined per turtle, added up across an encounter's photos, with spot-score bands.
"""
Ported from turtle-vision (matching.py, sift_match.py, app.py). On the 176
hand-verified known turtles of the October field test: right turtle first 96%
of the time (98% in the top 5); encounters with 2+ photos 31/31. See
turtle-vision analysis/SIFT_STUDY.md for the SIFT scoring.

Per photo:
  1. Gemini shell box -> "crop" (box + 5%) and "tight" (central 1/sqrt(2)) crops
  2. SIFT on the crop at 250px, scored against every reference crop: RootSIFT
     descriptors, mutual nearest neighbours passing the ratio test at 0.8,
     score = mutual matches / sqrt(keypoints in both) * 100
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
SIFT_RATIO = 0.8
VARIANTS = ("crop", "tight")
PCA_DIM = 128

# Spot-score bands, from the field test (spot score of the top turtle; 176 known,
# 142 new turtles):
#   >= 2.0 "match"         127 known, all named right; no new turtles
#   1.2-2  "check"         22 known (all right) and 5 new; confirm against the top 5
#   < 1.2  "possibly_new"  catches 96.5% of new turtles
# With 2+ photos the best photo is used and "check" starts at 1.5, since more
# photos give a new turtle more chances to reach 1.2 by luck (7% for the best
# of two vs 3.5% for one; none reached 1.5).
BAND_MATCH = 2.0
BAND_CHECK = 1.2
BAND_CHECK_MULTI = 1.5
CONFIDENCE = {"match": "high", "check": "medium", "possibly_new": "low"}

_pool = ThreadPoolExecutor(8)


def band_of(spot: float, n_photos: int = 1) -> str:
    if spot >= BAND_MATCH:
        return "match"
    if spot >= (BAND_CHECK if n_photos == 1 else BAND_CHECK_MULTI):
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


def root_sift(f):
    """(keypoint count, RootSIFT float32 descriptors) from sift_features() output."""
    n, desc = f
    if desc is None:
        return n, None
    d = desc.astype(np.float32)
    return n, np.sqrt(d / (d.sum(1, keepdims=True) + 1e-7))


def _nearest(bf, a, b) -> np.ndarray:
    """Per row of a: (index of nearest row of b, distance ratio to the second nearest)."""
    out = np.full((len(a), 2), [-1, 1.0])
    for m in bf.knnMatch(a, b, k=2):
        if len(m) == 2:
            out[m[0].queryIdx] = m[0].trainIdx, m[0].distance / max(m[1].distance, 1e-9)
    return out


def mutual_score(pa, pb) -> float:
    """Spot score of two root_sift() features: mutual ratio-test matches / sqrt(n_a * n_b) * 100.

    A pair counts only when each descriptor is the other's nearest neighbour and
    both pass the ratio test; the mutual check is what makes the looser ratio safe.
    """
    a, b = pa[1], pb[1]
    if a is None or b is None or len(a) < 2 or len(b) < 2:
        return 0.0
    bf = cv2.BFMatcher(cv2.NORM_L2)  # one per call: matchers aren't shared across threads
    ab, ba = _nearest(bf, a, b), _nearest(bf, b, a)
    j = ab[:, 0].astype(int)
    back = ba[j]
    good = (
        (j >= 0)
        & (back[:, 0] == np.arange(len(a)))
        & (np.maximum(ab[:, 1], back[:, 1]) < SIFT_RATIO)
    )
    return float(good.sum() / np.sqrt(pa[0] * pb[0]) * 100)


def sift_score(fa, fb) -> float:
    """Spot score of two sift_features() results."""
    return mutual_score(root_sift(fa), root_sift(fb))


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
        self.sift = [  # RootSIFT, prepared once
            root_sift((feats[c].keypoint_count, unpack_descriptors(feats[c].descriptors)))
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
        q = root_sift(ev.sift)
        parts = _pool.map(lambda ch: [mutual_score(q, self.sift[j]) for j in ch], chunks)
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
