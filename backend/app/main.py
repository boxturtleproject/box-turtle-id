import base64
import re
import secrets
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from app.api import api_router
from app.config import settings
from app.database import create_tables

FRONTEND_DIR = Path(__file__).parent.parent.parent / "dist"


def _ensure_yolo_weights():
    """Ensure YOLO weights are available — check volume cache, then download from S3 bucket."""
    import logging
    import os

    logger = logging.getLogger(__name__)

    # First check the configured path
    weights_path = settings.yolo_weights_path
    if weights_path.exists() and weights_path.stat().st_size > 0:
        logger.info(f"YOLO weights found at {weights_path}")
        return

    # Check the persistent volume cache (survives redeploys)
    volume_cache = settings.data_dir / "yolo" / "yolov3_training_1000.weights"
    if volume_cache.exists() and volume_cache.stat().st_size > 0:
        logger.info(f"YOLO weights found in volume cache at {volume_cache}")
        # Update settings to point to the cached copy
        settings.yolo_weights_path = volume_cache
        return

    # Download from S3 bucket to the volume (one-time download)
    endpoint = os.environ.get("BUCKET_ENDPOINT")
    access_key = os.environ.get("BUCKET_ACCESS_KEY_ID")
    secret_key = os.environ.get("BUCKET_SECRET_ACCESS_KEY")
    bucket_name = os.environ.get("BUCKET_NAME")

    if not all([endpoint, access_key, secret_key, bucket_name]):
        logger.warning("YOLO weights not found and bucket credentials not configured — cropping disabled")
        return

    try:
        import boto3
        logger.info(f"Downloading YOLO weights from bucket {bucket_name} (one-time)...")
        s3 = boto3.client(
            "s3",
            endpoint_url=endpoint,
            aws_access_key_id=access_key,
            aws_secret_access_key=secret_key,
        )
        volume_cache.parent.mkdir(parents=True, exist_ok=True)
        s3.download_file(bucket_name, "yolov3_training_1000.weights", str(volume_cache))
        settings.yolo_weights_path = volume_cache
        logger.info(f"YOLO weights cached to volume at {volume_cache}")
    except Exception as e:
        logger.error(f"Failed to download YOLO weights: {e}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    create_tables()
    settings.data_dir.mkdir(parents=True, exist_ok=True)
    settings.images_dir.mkdir(parents=True, exist_ok=True)
    settings.thumbnails_dir.mkdir(parents=True, exist_ok=True)
    settings.submissions_dir.mkdir(parents=True, exist_ok=True)
    _ensure_yolo_weights()
    yield


app = FastAPI(
    title="BoxTurtle ID",
    description="Automated box turtle identification using SIFT algorithm",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Public API allowlist — anything else under /api/ requires admin auth.
# Patterns match against request.url.path (no query string).
_PUBLIC_API_ROUTES: list[tuple[str, re.Pattern[str]]] = [
    ("GET", re.compile(r"^/api/health$")),
    ("GET", re.compile(r"^/api/static/.+")),
    ("POST", re.compile(r"^/api/submissions/identify$")),
    ("POST", re.compile(r"^/api/submissions/[^/]+/confirm$")),
    ("POST", re.compile(r"^/api/submissions/[^/]+/new-turtle$")),
    ("GET", re.compile(r"^/api/turtles/next-id$")),
    ("GET", re.compile(r"^/api/turtles/check-id$")),
    ("GET", re.compile(r"^/api/turtles/[^/]+$")),
    ("GET", re.compile(r"^/api/turtles/[^/]+/encounters$")),
]

# FastAPI's auto-generated docs leak the full API schema, so gate them too.
_GATED_DOCS = {"/docs", "/redoc", "/openapi.json"}


def _needs_admin_auth(method: str, path: str) -> bool:
    # Let CORS preflights through; CORSMiddleware handles them.
    if method == "OPTIONS":
        return False
    if path.startswith("/admin"):
        return True
    if path in _GATED_DOCS:
        return True
    if path.startswith("/api/"):
        for allowed_method, pattern in _PUBLIC_API_ROUTES:
            if method == allowed_method and pattern.match(path):
                return False
        return True
    return False


@app.middleware("http")
async def admin_basic_auth(request: Request, call_next):
    if not _needs_admin_auth(request.method, request.url.path):
        return await call_next(request)

    # Unset password disables the gate (dev convenience).
    if not settings.admin_password:
        return await call_next(request)

    auth = request.headers.get("authorization", "")
    if auth.startswith("Basic "):
        try:
            decoded = base64.b64decode(auth[6:]).decode("utf-8")
            user, _, password = decoded.partition(":")
            if secrets.compare_digest(user, settings.admin_user) and \
                    secrets.compare_digest(password, settings.admin_password):
                return await call_next(request)
        except (ValueError, UnicodeDecodeError):
            pass

    return Response(
        status_code=401,
        headers={"WWW-Authenticate": 'Basic realm="BoxTurtle Admin"'},
    )

# Bucket-backed derivative redirect: when the storage backend is S3, serve
# /api/static/captures/derivatives/* by 302-ing to a signed bucket URL. Local
# files (everything else under /api/static) continue to be served by the
# StaticFiles mount below. Defined BEFORE the static mount so it takes
# precedence on this prefix.
@app.get("/api/static/captures/derivatives/{path:path}")
async def derivatives_passthrough(path: str):
    from fastapi.responses import RedirectResponse
    from app.services.storage import S3Storage, get_storage

    storage = get_storage()
    key = f"captures/derivatives/{path}"
    if isinstance(storage, S3Storage):
        url = storage.signed_url(key, expires_in=3600)
        return RedirectResponse(url, status_code=302)
    # Local backend: fall through to the static mount by reading the file directly
    file_path = settings.data_dir / key
    if file_path.is_file():
        return FileResponse(file_path)
    return Response(status_code=404)


if settings.data_dir.exists():
    app.mount("/api/static", StaticFiles(directory=str(settings.data_dir)), name="static")

app.include_router(api_router)


@app.get("/api/health")
async def health():
    return {"status": "healthy"}


if FRONTEND_DIR.exists() and (FRONTEND_DIR / "index.html").exists():
    app.mount("/assets", StaticFiles(directory=FRONTEND_DIR / "assets"), name="frontend_assets")

    # index.html references content-hashed asset URLs; serve it with no-cache
    # so browsers always re-validate and pick up the latest hashes after a deploy.
    # The hashed /assets/... files themselves remain cacheable indefinitely.
    INDEX_HEADERS = {"Cache-Control": "no-cache, no-store, must-revalidate"}

    @app.get("/")
    async def serve_index():
        return FileResponse(FRONTEND_DIR / "index.html", headers=INDEX_HEADERS)

    @app.get("/{path:path}")
    async def serve_frontend(path: str):
        file_path = FRONTEND_DIR / path
        if file_path.is_file():
            return FileResponse(file_path)
        return FileResponse(FRONTEND_DIR / "index.html", headers=INDEX_HEADERS)
else:
    @app.get("/")
    async def root():
        return {
            "name": "BoxTurtle ID API",
            "version": "0.1.0",
            "docs": "/docs",
        }
