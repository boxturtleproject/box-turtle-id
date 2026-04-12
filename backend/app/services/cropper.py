# ABOUTME: Image cropping service using YOLO and fallback threshold detection.
# ABOUTME: Ported from original CustomDetector.py and autocropalt.py.

from pathlib import Path
from typing import Optional

import cv2
import numpy as np

from app.config import settings


class CropperService:
    """Service for cropping turtle images using YOLO or threshold-based detection."""

    def __init__(
        self,
        cfg_path: Optional[Path] = None,
        weights_path: Optional[Path] = None,
    ):
        self.cfg_path = cfg_path or settings.yolo_cfg_path
        self.weights_path = weights_path or settings.yolo_weights_path
        self._net: Optional[cv2.dnn.Net] = None
        self._yolo_available = False

        self._init_yolo()

    def _init_yolo(self) -> None:
        """Initialize YOLO network if config and weights are available."""
        try:
            if self.cfg_path.exists() and self.weights_path.exists():
                self._net = cv2.dnn.readNet(str(self.weights_path), str(self.cfg_path))
                self._yolo_available = True
        except Exception:
            self._yolo_available = False

    def crop(self, image: np.ndarray, use_yolo: bool = True) -> np.ndarray:
        """
        Crop turtle from image.

        Tries YOLO detection first, falls back to threshold-based cropping.

        Args:
            image: BGR image as numpy array
            use_yolo: Whether to try YOLO detection first

        Returns:
            Cropped image containing the turtle
        """
        if use_yolo and self._yolo_available:
            result = self._crop_with_yolo(image)
            if result is not None:
                return result

        # Fallback to threshold-based cropping
        return self._crop_with_threshold(image)

    def _crop_with_yolo(self, image: np.ndarray) -> Optional[np.ndarray]:
        """
        Crop using YOLO object detection.

        Args:
            image: BGR image

        Returns:
            Cropped image or None if detection fails
        """
        try:
            # Resize for YOLO processing
            img = cv2.resize(image, None, fx=0.4, fy=0.4)
            height, width = img.shape[:2]

            # Get output layer names
            layer_names = self._net.getLayerNames()
            output_layers = [layer_names[i - 1] for i in self._net.getUnconnectedOutLayers()]

            # Create blob and run detection
            blob = cv2.dnn.blobFromImage(img, 0.00392, (416, 416), (0, 0, 0), True, crop=False)
            self._net.setInput(blob)
            outs = self._net.forward(output_layers)

            # Find best detection
            best_box = None
            best_confidence = 0.3  # Minimum confidence threshold

            for out in outs:
                for detection in out:
                    scores = detection[5:]
                    class_id = np.argmax(scores)
                    confidence = scores[class_id]

                    if confidence > best_confidence:
                        center_x = int(detection[0] * width)
                        center_y = int(detection[1] * height)
                        w = int(detection[2] * width)
                        h = int(detection[3] * height)

                        x = int(center_x - w / 2)
                        y = int(center_y - h / 2)

                        if x >= 0 and y >= 0 and w > 0 and h > 0:
                            best_box = (x, y, w, h)
                            best_confidence = confidence

            if best_box is not None:
                x, y, w, h = best_box
                # Scale back to original image size
                scale = 1.0 / 0.4
                x = int(x * scale)
                y = int(y * scale)
                w = int(w * scale)
                h = int(h * scale)

                # Clamp to image bounds
                orig_h, orig_w = image.shape[:2]
                x = max(0, x)
                y = max(0, y)
                w = min(w, orig_w - x)
                h = min(h, orig_h - y)

                return image[y : y + h, x : x + w]

            return None

        except Exception:
            return None

    def _crop_with_threshold(self, image: np.ndarray) -> np.ndarray:
        """
        Crop using threshold-based detection for white-background images.

        Finds the largest contour in the inverted binary image.

        Args:
            image: BGR image

        Returns:
            Cropped image (returns original if detection fails)
        """
        try:
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)

            # Binary threshold, inverted (assumes white/light background)
            _, thresh = cv2.threshold(gray, 100, 255, cv2.THRESH_BINARY_INV)

            # Find contours
            contours, _ = cv2.findContours(thresh, cv2.RETR_LIST, cv2.CHAIN_APPROX_SIMPLE)

            if not contours:
                return image

            # Find largest bounding box
            max_area = 0
            best_box = None

            for contour in contours:
                x, y, w, h = cv2.boundingRect(contour)
                area = w * h
                if area > max_area:
                    max_area = area
                    best_box = (x, y, w, h)

            if best_box is not None:
                x, y, w, h = best_box
                # Ensure we have a valid crop
                if w > 10 and h > 10:
                    return image[y : y + h, x : x + w]

            return image

        except Exception:
            return image
