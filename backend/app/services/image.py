# ABOUTME: Image loading, preprocessing, and storage utilities.
# ABOUTME: Handles file I/O, resizing, thumbnail generation, and EXIF extraction.

import io
import uuid
from dataclasses import dataclass
from datetime import date, datetime
from pathlib import Path
from typing import Optional

import cv2
import numpy as np
from PIL import Image
from PIL.ExifTags import TAGS, GPSTAGS

from app.config import settings


@dataclass
class ExifData:
    """Extracted EXIF metadata from an image."""

    datetime: Optional[datetime] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    camera_make: Optional[str] = None
    camera_model: Optional[str] = None


class ImageService:
    """Service for image loading, processing, and storage."""

    def __init__(
        self,
        images_dir: Optional[Path] = None,
        thumbnails_dir: Optional[Path] = None,
        resized_width: int = settings.resized_width,
        thumbnail_size: int = settings.thumbnail_size,
    ):
        self.images_dir = images_dir or settings.images_dir
        self.thumbnails_dir = thumbnails_dir or settings.thumbnails_dir
        self.resized_width = resized_width
        self.thumbnail_size = thumbnail_size

        # Ensure directories exist
        self.images_dir.mkdir(parents=True, exist_ok=True)
        self.thumbnails_dir.mkdir(parents=True, exist_ok=True)

    def load(self, path: Path | str) -> Optional[np.ndarray]:
        """
        Load an image from disk.

        Args:
            path: Path to the image file

        Returns:
            BGR image as numpy array, or None if loading fails
        """
        try:
            image = cv2.imread(str(path))
            return image
        except Exception:
            return None

    def load_from_bytes(self, data: bytes) -> Optional[np.ndarray]:
        """
        Load an image from bytes.

        Args:
            data: Image file bytes

        Returns:
            BGR image as numpy array, or None if loading fails
        """
        try:
            nparr = np.frombuffer(data, np.uint8)
            image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            return image
        except Exception:
            return None

    def save(self, image: np.ndarray, filename: Optional[str] = None) -> str:
        """
        Save an image to the images directory.

        Args:
            image: BGR image as numpy array
            filename: Optional filename (generates UUID if not provided)

        Returns:
            Relative path to saved image
        """
        if filename is None:
            filename = f"{uuid.uuid4()}.jpg"

        path = self.images_dir / filename
        cv2.imwrite(str(path), image)
        return str(path.relative_to(settings.data_dir))

    def resize(self, image: np.ndarray, width: Optional[int] = None) -> np.ndarray:
        """
        Resize image while maintaining aspect ratio.

        Args:
            image: BGR image
            width: Target width (uses configured default if not provided)

        Returns:
            Resized image
        """
        width = width or self.resized_width

        h, w = image.shape[:2]
        if w == 0:
            return image

        ratio = width / float(w)
        new_height = int(h * ratio)

        return cv2.resize(image, (width, new_height), interpolation=cv2.INTER_AREA)

    def generate_thumbnail(
        self,
        image: np.ndarray,
        filename: Optional[str] = None,
    ) -> str:
        """
        Generate and save a thumbnail.

        Args:
            image: BGR image
            filename: Optional filename for thumbnail

        Returns:
            Relative path to saved thumbnail
        """
        if filename is None:
            filename = f"{uuid.uuid4()}_thumb.jpg"

        # Use PIL for better thumbnail generation
        rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
        pil_image = Image.fromarray(rgb)
        pil_image.thumbnail((self.thumbnail_size, self.thumbnail_size), Image.Resampling.LANCZOS)

        path = self.thumbnails_dir / filename
        pil_image.save(str(path), "JPEG", quality=85)

        return str(path.relative_to(settings.data_dir))

    def preprocess(
        self,
        image: np.ndarray,
        crop: bool = False,
        cropper=None,
    ) -> np.ndarray:
        """
        Preprocess image for SIFT feature extraction.

        Args:
            image: BGR image
            crop: Whether to crop the image
            cropper: CropperService instance (required if crop=True)

        Returns:
            Preprocessed image ready for SIFT
        """
        result = image

        if crop and cropper is not None:
            result = cropper.crop(result)

        result = self.resize(result)
        return result

    @staticmethod
    def parse_filename_date(filename: str) -> Optional[date]:
        """
        Parse capture date from filename in format ID-YYYY-MM-DD.ext

        Args:
            filename: Original filename

        Returns:
            Parsed date or None if parsing fails
        """
        try:
            # Remove extension
            name = Path(filename).stem
            # Split by dash and try to parse date parts
            parts = name.split("-")
            if len(parts) >= 4:
                year = int(parts[1])
                month = int(parts[2])
                day = int(parts[3])
                return date(year, month, day)
        except (ValueError, IndexError):
            pass
        return None

    @staticmethod
    def parse_filename_id(filename: str) -> Optional[str]:
        """
        Parse turtle ID from filename in format ID-YYYY-MM-DD.ext

        Args:
            filename: Original filename

        Returns:
            Turtle ID string or None if parsing fails
        """
        try:
            name = Path(filename).stem
            parts = name.split("-")
            if parts:
                return parts[0]
        except Exception:
            pass
        return None

    @staticmethod
    def extract_exif(data: bytes) -> ExifData:
        """
        Extract EXIF metadata from image bytes.

        Args:
            data: Raw image file bytes

        Returns:
            ExifData with extracted metadata (fields may be None)
        """
        result = ExifData()

        try:
            img = Image.open(io.BytesIO(data))
            exif = img._getexif()

            if exif is None:
                return result

            # Build a dict of tag names to values
            exif_dict = {}
            for tag_id, value in exif.items():
                tag = TAGS.get(tag_id, tag_id)
                exif_dict[tag] = value

            # Extract camera info
            result.camera_make = exif_dict.get("Make")
            result.camera_model = exif_dict.get("Model")

            # Extract datetime
            date_str = exif_dict.get("DateTimeOriginal") or exif_dict.get("DateTime")
            if date_str:
                try:
                    result.datetime = datetime.strptime(date_str, "%Y:%m:%d %H:%M:%S")
                except ValueError:
                    pass

            # Extract GPS info
            gps_info = exif_dict.get("GPSInfo")
            if gps_info:
                result.latitude, result.longitude = ImageService._parse_gps(gps_info)

        except Exception:
            pass

        return result

    @staticmethod
    def _parse_gps(gps_info: dict) -> tuple[Optional[float], Optional[float]]:
        """
        Parse GPS coordinates from EXIF GPSInfo dict.

        Args:
            gps_info: EXIF GPSInfo dictionary

        Returns:
            Tuple of (latitude, longitude) in decimal degrees, or (None, None)
        """
        try:
            # Build a dict with GPS tag names
            gps_dict = {}
            for tag_id, value in gps_info.items():
                tag = GPSTAGS.get(tag_id, tag_id)
                gps_dict[tag] = value

            def to_decimal(coords, ref):
                """Convert GPS coordinates to decimal degrees."""
                degrees = float(coords[0])
                minutes = float(coords[1])
                seconds = float(coords[2])
                decimal = degrees + minutes / 60 + seconds / 3600
                if ref in ("S", "W"):
                    decimal = -decimal
                return decimal

            lat = None
            lon = None

            if "GPSLatitude" in gps_dict and "GPSLatitudeRef" in gps_dict:
                lat = to_decimal(gps_dict["GPSLatitude"], gps_dict["GPSLatitudeRef"])

            if "GPSLongitude" in gps_dict and "GPSLongitudeRef" in gps_dict:
                lon = to_decimal(gps_dict["GPSLongitude"], gps_dict["GPSLongitudeRef"])

            return lat, lon

        except Exception:
            return None, None
