# ABOUTME: Temporary admin endpoints for data migration.
# ABOUTME: Provides bulk file upload capability for populating the volume.

import os
from pathlib import Path

from fastapi import APIRouter, File, HTTPException, UploadFile

from app.config import settings

router = APIRouter()


@router.post("/admin/upload-image")
async def upload_image(
    path: str,
    file: UploadFile = File(...),
):
    """Upload a file to the data directory. Path should be 'images/filename.jpg' or 'thumbnails/filename.jpg'."""
    # Validate path to prevent directory traversal
    if ".." in path or path.startswith("/"):
        raise HTTPException(status_code=400, detail="Invalid path")

    if not (path.startswith("images/") or path.startswith("thumbnails/")):
        raise HTTPException(status_code=400, detail="Path must start with 'images/' or 'thumbnails/'")

    target_path = settings.data_dir / path
    target_path.parent.mkdir(parents=True, exist_ok=True)

    content = await file.read()
    target_path.write_bytes(content)

    return {"status": "ok", "path": path, "size": len(content)}


@router.get("/admin/list-files")
async def list_files():
    """List files in the data directory."""
    result = {"images": [], "thumbnails": []}

    images_dir = settings.data_dir / "images"
    if images_dir.exists():
        result["images"] = [f.name for f in images_dir.iterdir() if f.is_file()]

    thumbs_dir = settings.data_dir / "thumbnails"
    if thumbs_dir.exists():
        result["thumbnails"] = [f.name for f in thumbs_dir.iterdir() if f.is_file()]

    return result
