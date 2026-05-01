"""Object storage abstraction.

Two backends:
- LocalStorage: writes to settings.data_dir, returns relative path. URL is
  constructed by the API layer (e.g. http://host/static/<key>).
- S3Storage: uploads to a Railway/S3-compatible bucket, returns the bucket key
  and a public URL.

Pick the backend automatically: if all four BUCKET_* env vars are set, use S3;
otherwise fall back to local.
"""
import logging
from pathlib import Path
from typing import Optional, Protocol

from app.config import settings

logger = logging.getLogger(__name__)


class StorageBackend(Protocol):
    name: str

    def put(self, key: str, body: bytes, content_type: str = "image/jpeg") -> tuple[str, Optional[str]]:
        """Persist body. Returns (stored_path_or_key, optional_public_url)."""
        ...


class LocalStorage:
    name = "local"

    def __init__(self, root: Optional[Path] = None):
        self.root = root or settings.data_dir

    def put(self, key: str, body: bytes, content_type: str = "image/jpeg") -> tuple[str, Optional[str]]:
        path = self.root / key
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(body)
        # Return a relative URL that resolves against the API host. The static
        # mount in main.py serves data_dir at /api/static/...
        return key, f"/api/static/{key}"


class S3Storage:
    name = "s3"

    def __init__(self):
        import boto3
        self._client = boto3.client(
            "s3",
            endpoint_url=settings.bucket_endpoint,
            aws_access_key_id=settings.bucket_access_key_id,
            aws_secret_access_key=settings.bucket_secret_access_key,
        )
        self.bucket = settings.bucket_name
        self.public_url = (settings.bucket_public_url or "").rstrip("/")

    def put(self, key: str, body: bytes, content_type: str = "image/jpeg") -> tuple[str, Optional[str]]:
        self._client.put_object(
            Bucket=self.bucket, Key=key, Body=body, ContentType=content_type,
        )
        url = f"{self.public_url}/{key}" if self.public_url else None
        return key, url


_singleton: Optional[StorageBackend] = None


def get_storage() -> StorageBackend:
    global _singleton
    if _singleton is not None:
        return _singleton
    if all([settings.bucket_endpoint, settings.bucket_access_key_id,
            settings.bucket_secret_access_key, settings.bucket_name]):
        try:
            _singleton = S3Storage()
            logger.info(f"Storage backend: S3 ({settings.bucket_name})")
            return _singleton
        except Exception as e:
            logger.warning(f"S3 backend init failed, falling back to local: {e}")
    _singleton = LocalStorage()
    logger.info(f"Storage backend: local ({_singleton.root})")
    return _singleton
