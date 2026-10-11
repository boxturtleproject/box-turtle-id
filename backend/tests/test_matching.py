# ABOUTME: Tests for the fused matcher (shell crops, SIFT scoring, bands, index ranking,
# ABOUTME: encounter combining, and the identify endpoint), with Gemini stubbed out.

import io
from datetime import date

import numpy as np
import pytest
from PIL import Image, ImageDraw, ImageEnhance

from app.config import settings
from app.models import Capture, Turtle
from app.services import gemini, match_features, matcher, shellcrop


def shell(seed: int, size=(640, 480), shift=(0, 0), brightness=1.0) -> Image.Image:
    """A synthetic 'shell': dark oval with a seed-specific pattern of yellow blotches."""
    rng = np.random.default_rng(seed)
    img = Image.new("RGB", size, (60, 90, 50))
    d = ImageDraw.Draw(img)
    d.ellipse([60, 40, 580, 440], fill=(35, 28, 20))
    for _ in range(60):
        x, y = rng.uniform(110, 530), rng.uniform(80, 400)
        w, h = rng.uniform(6, 26), rng.uniform(4, 18)
        d.ellipse(
            [x + shift[0], y + shift[1], x + w + shift[0], y + h + shift[1]], fill=(230, 180, 40)
        )
    return ImageEnhance.Brightness(img).enhance(brightness)


def fake_embed(img: Image.Image) -> np.ndarray:
    v = np.asarray(img.convert("L").resize((16, 16)), dtype=np.float32).flatten()
    v = v - v.mean()
    return v / (np.linalg.norm(v) + 1e-12)


@pytest.fixture
def stub_gemini(monkeypatch):
    monkeypatch.setattr(gemini, "detect_shell_box", lambda img: [83, 94, 917, 906])
    monkeypatch.setattr(gemini, "embed_image", fake_embed)
    matcher.invalidate()
    yield
    matcher.invalidate()


@pytest.fixture
def references(db, stub_gemini):
    """Three turtles at one site, four captures each (different shifts/brightness)."""
    ids = {}
    for t, seed in enumerate((1, 2, 3)):
        turtle = Turtle(
            external_id=f"T90{t}", name=f"Turtle{t}", site="wallkill", first_seen=date(2025, 5, 1)
        )
        db.add(turtle)
        db.commit()
        ids[seed] = turtle.id
        for k, (shift, bright) in enumerate(
            [((0, 0), 1.0), ((8, -5), 0.9), ((-6, 7), 1.1), ((4, 4), 0.95)]
        ):
            cap = Capture(
                turtle_id=turtle.id,
                image_type="carapace_top",
                image_path=f"/nonexistent/{seed}_{k}.jpg",
                original_filename=f"{seed}_{k}.jpg",
            )
            db.add(cap)
            db.commit()
            match_features.store_features(
                db, cap.id, matcher.analyse_photo(shell(seed, shift=shift, brightness=bright))
            )
    return ids


def test_crop_variants_match_turtle_vision():
    c = shellcrop.crops(Image.new("RGB", (1280, 960)), [230, 112, 836, 856])
    assert c["crop"].size == (1047, 640)
    assert c["tight"].size == (673, 411)
    assert shellcrop.crops(Image.new("RGB", (100, 80)), None)["tight"].size == (100, 80)


def test_bands():
    assert matcher.band_of(2.0) == "match"
    assert matcher.band_of(1.3) == "check"
    assert matcher.band_of(1.19) == "possibly_new"
    assert matcher.band_of(1.3, n_photos=3) == "possibly_new"  # stricter with several photos
    assert matcher.band_of(1.7, n_photos=3) == "check"
    assert matcher.band_of(2.5, n_photos=3) == "match"


def test_likelihood():
    assert matcher.likelihood_of(0.3) == 5
    assert matcher.likelihood_of(0.9) == 15
    assert matcher.likelihood_of(1.3) == 45
    assert matcher.likelihood_of(1.3, n_photos=2) == 30  # several photos: weaker evidence
    assert matcher.likelihood_of(1.7, n_photos=2) == 95
    assert matcher.likelihood_of(2.0) == 97
    assert matcher.likelihood_of(40) == 98  # capped
    # each row's lowest score maps to that row, and higher scores never look less likely
    rows = sorted(matcher.LIKELIHOOD)
    assert [matcher.likelihood_of(lo) for lo, _ in rows] == [p for _, p in rows]
    assert [p for _, p in rows] == sorted(p for _, p in rows)


def test_sift_scores_same_shell_above_different_shell():
    a = matcher.sift_features(shell(1))
    same = matcher.sift_features(shell(1, shift=(10, -6), brightness=0.9))
    others = [matcher.sift_features(shell(s)) for s in (2, 3, 4, 5)]
    # Synthetic shells share blob shapes and the oval outline, so different ones
    # score higher than real different turtles (< 2); the same shell is still far above.
    assert matcher.sift_score(a, same) > 4 * max(matcher.sift_score(a, o) for o in others)


def test_mutual_check_counts_each_pair_once():
    # a[0] and a[1] both have b[0] as nearest neighbour; only a[0] is b[0]'s nearest back
    b = np.eye(3, 128, dtype=np.float32)
    a = np.zeros((2, 128), np.float32)
    a[0, 0] = 1
    a[1, :2] = [0.9, 0.1]
    a[1] /= np.linalg.norm(a[1])
    assert matcher.mutual_score((2, a), (3, b)) == pytest.approx(1 / np.sqrt(6) * 100)


def test_root_sift_is_unit_length():
    n, d = matcher.root_sift(matcher.sift_features(shell(1)))
    assert np.allclose(np.linalg.norm(d, axis=1), 1, atol=1e-3)


def test_descriptor_round_trip():
    n, desc = matcher.sift_features(shell(1))
    assert n > 10
    assert np.array_equal(matcher.unpack_descriptors(matcher.pack_descriptors(desc)), desc)


def test_index_ranks_the_right_turtle(db, references):
    ranked, band, n_photos, _ = matcher.identify(
        db, [shell(2, shift=(5, 5), brightness=1.05)], "wallkill"
    )
    assert ranked[0].turtle_id == references[2]
    assert band == "match"
    assert n_photos == 1
    assert ranked[0].spot > ranked[1].spot


def test_several_photos_add_up(db, references):
    photos = [
        shell(3, shift=(3, -2)),
        shell(3, shift=(-4, 6), brightness=0.85),
        shell(3, brightness=1.1),
    ]
    ranked, band, n_photos, _ = matcher.identify(db, photos, "wallkill")
    assert ranked[0].turtle_id == references[3]
    assert n_photos == 3
    single = matcher.get_index(db).rank([matcher.analyse_photo(photos[0])], "wallkill")[0]
    assert ranked[0].fused > single.fused  # evidence accumulates across photos


def test_other_site_excluded(db, references):
    ranked, *_ = matcher.identify(db, [shell(1)], "patuxent")
    assert ranked == []


def test_identify_endpoint_fused(client, references, monkeypatch, sample_image_bytes):
    monkeypatch.setattr(settings, "matcher", "fused")
    buf = io.BytesIO()
    shell(1, shift=(6, 3)).save(buf, "JPEG", quality=95)
    resp = client.post(
        "/api/submissions/identify",
        data={"site": "wallkill"},
        files={"top": ("top.jpg", buf.getvalue(), "image/jpeg")},
    )
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["matcher"] == "fused"
    assert body["band"] == "match"
    top = body["candidates"][0]
    assert top["turtle_id"] == references[1]
    assert top["confidence"] == "high"
    assert top["spot_score"] >= 2
    assert top["likelihood"] >= 97 and body["likelihood"] == top["likelihood"]


def test_identify_falls_back_to_sift_when_index_empty(
    client, stub_gemini, monkeypatch, sample_image_bytes
):
    monkeypatch.setattr(settings, "matcher", "fused")
    resp = client.post(
        "/api/submissions/identify",
        data={"site": "wallkill"},
        files={"top": ("top.jpg", sample_image_bytes, "image/jpeg")},
    )
    assert resp.status_code == 200, resp.text
    assert resp.json()["matcher"] == "sift"


def test_pending_and_backfill(db, references, monkeypatch):
    extra = Capture(
        turtle_id=references[1],
        image_type="carapace_left",
        image_path="/nonexistent/x.jpg",
        original_filename="x.jpg",
    )
    db.add(extra)
    db.commit()
    assert match_features.pending_capture_ids(db) == [extra.id]
    monkeypatch.setattr(match_features, "load_capture_image", lambda cap: shell(1, shift=(2, 2)))
    from tests.conftest import TestingSessionLocal

    result = match_features.run_backfill(TestingSessionLocal)
    assert result == {"pending": 1, "done": 1, "failed": 0}
    assert match_features.pending_capture_ids(db) == []
