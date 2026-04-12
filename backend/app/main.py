from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
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

if settings.data_dir.exists():
    app.mount("/api/static", StaticFiles(directory=str(settings.data_dir)), name="static")

app.include_router(api_router)


@app.get("/api/health")
async def health():
    return {"status": "healthy"}


if FRONTEND_DIR.exists() and (FRONTEND_DIR / "index.html").exists():
    app.mount("/assets", StaticFiles(directory=FRONTEND_DIR / "assets"), name="frontend_assets")

    @app.get("/")
    async def serve_index():
        return FileResponse(FRONTEND_DIR / "index.html")

    @app.get("/{path:path}")
    async def serve_frontend(path: str):
        file_path = FRONTEND_DIR / path
        if file_path.is_file():
            return FileResponse(file_path)
        return FileResponse(FRONTEND_DIR / "index.html")
else:
    @app.get("/")
    async def root():
        return {
            "name": "BoxTurtle ID API",
            "version": "0.1.0",
            "docs": "/docs",
        }
