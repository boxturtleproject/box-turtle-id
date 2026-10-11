# ABOUTME: Gemini clients and calls for the fused matcher: shell bounding box and
# ABOUTME: image embeddings. Vertex AI (ADC credentials) or a Gemini API key.

import io
import json
import threading

import numpy as np
from PIL import Image

from app.config import settings

DETECT_SIDE = 640  # downscale before asking for the box; box coords are relative
_PROMPT = (
    "Find the box turtle's carapace (the top shell) in this photo. Return a "
    "tight bounding box around the shell only, excluding the head, legs, hands, "
    "and background. If there is no turtle shell visible, set found to false. "
    'Respond as JSON: {"found": bool, "box_2d": [ymin, xmin, ymax, xmax]} '
    "normalized to 0-1000."
)
_lock = threading.Lock()


def configured() -> bool:
    if settings.google_genai_use_vertexai:
        return bool(settings.google_cloud_project)
    return bool(settings.gemini_api_key)


_clients: dict = {}


def _client(location: str | None):
    """One long-lived client per location. Created under a lock: with lru_cache,
    threads racing on first use each built a client, and the extras were garbage
    collected (which closes them) mid-request."""
    with _lock:
        if location not in _clients:
            from google import genai

            if settings.google_genai_use_vertexai:
                _clients[location] = genai.Client(
                    vertexai=True,
                    project=settings.google_cloud_project,
                    location=location or settings.google_cloud_location,
                )
            else:
                _clients[location] = genai.Client(api_key=settings.gemini_api_key)
        return _clients[location]


def jpeg_bytes(img: Image.Image, quality: int = 85) -> bytes:
    buf = io.BytesIO()
    img.convert("RGB").save(buf, "JPEG", quality=quality)
    return buf.getvalue()


def _ask_box(img: Image.Image, side: int, thinking_level: str):
    from google.genai import types

    small = img.copy()
    small.thumbnail((side, side))
    thinking = (
        types.ThinkingConfig(thinking_budget=0)
        if settings.crop_model.startswith("gemini-2")
        else types.ThinkingConfig(thinking_level=thinking_level)
    )
    resp = _client(settings.crop_location).models.generate_content(
        model=settings.crop_model,
        contents=[types.Part.from_bytes(data=jpeg_bytes(small), mime_type="image/jpeg"), _PROMPT],
        config=types.GenerateContentConfig(
            response_mime_type="application/json", temperature=0, thinking_config=thinking
        ),
    )
    out = json.loads(resp.text)
    if isinstance(out, list):
        out = out[0] if out else {}
    box = out.get("box_2d") or []
    if not out.get("found") or len(box) != 4:
        return None
    y0, x0, y1, x1 = (max(0, min(1000, int(v))) for v in box)
    return [y0, x0, y1, x1] if y1 > y0 and x1 > x0 else None


def detect_shell_box(img: Image.Image) -> list[int] | None:
    """[ymin, xmin, ymax, xmax] on a 0..1000 scale, or None if no shell.

    Fast pass (640px, minimal thinking); a miss is retried at full size with a
    little more thinking (the fast pass missed 17/633 clear shells in testing).
    """
    return _ask_box(img, DETECT_SIDE, "minimal") or _ask_box(img, max(img.size), "low")


def embed_image(img: Image.Image) -> np.ndarray:
    """Unit-length float32 embedding of an image."""
    from google.genai import types

    resp = _client(None).models.embed_content(
        model=settings.embed_model,
        contents=[types.Part.from_bytes(data=jpeg_bytes(img, 90), mime_type="image/jpeg")],
        config=types.EmbedContentConfig(output_dimensionality=settings.embed_dim),
    )
    v = np.asarray(resp.embeddings[0].values, dtype=np.float32)
    return v / (np.linalg.norm(v) + 1e-12)
