# ABOUTME: SIFT feature extraction and matching service.
# ABOUTME: Ported from original SiftMatcher.py with improved structure.

import pickle
from dataclasses import dataclass
from typing import Optional

import cv2
import numpy as np

from app.config import settings


@dataclass
class MatchResult:
    """Result of comparing two images."""

    score: float
    is_match: bool
    keypoints_1_count: int
    keypoints_2_count: int
    good_points_count: int


@dataclass
class SiftFeatures:
    """Extracted SIFT keypoints and descriptors."""

    keypoints: list
    descriptors: np.ndarray
    keypoint_count: int

    def serialize(self) -> tuple[bytes, bytes]:
        """Serialize keypoints and descriptors for database storage."""
        kp_data = [(kp.pt, kp.size, kp.angle, kp.response, kp.octave, kp.class_id)
                   for kp in self.keypoints]
        return pickle.dumps(kp_data), pickle.dumps(self.descriptors)

    @classmethod
    def deserialize(cls, kp_bytes: bytes, desc_bytes: bytes) -> "SiftFeatures":
        """Deserialize keypoints and descriptors from database."""
        kp_data = pickle.loads(kp_bytes)
        # Format: (pt, size, angle, response, octave, class_id) where pt=(x,y)
        keypoints = [cv2.KeyPoint(x=pt[0][0], y=pt[0][1], size=pt[1], angle=pt[2],
                                   response=pt[3], octave=pt[4], class_id=pt[5])
                     for pt in kp_data]
        descriptors = pickle.loads(desc_bytes)
        return cls(keypoints=keypoints, descriptors=descriptors, keypoint_count=len(keypoints))


class SiftService:
    """Service for SIFT feature extraction and image matching."""

    def __init__(
        self,
        resized_width: int = settings.resized_width,
        distance_coefficient: float = settings.distance_coefficient,
        acceptance_threshold: float = settings.acceptance_threshold,
    ):
        self.resized_width = resized_width
        self.distance_coefficient = distance_coefficient
        self.acceptance_threshold = acceptance_threshold
        self._sift = cv2.SIFT_create()

    def extract_features(self, image: np.ndarray) -> Optional[SiftFeatures]:
        """
        Extract SIFT keypoints and descriptors from an image.

        Args:
            image: BGR image as numpy array (already preprocessed/resized)

        Returns:
            SiftFeatures object or None if extraction fails
        """
        try:
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY) if len(image.shape) == 3 else image
            keypoints, descriptors = self._sift.detectAndCompute(gray, None)

            if descriptors is None or len(keypoints) == 0:
                return None

            return SiftFeatures(
                keypoints=list(keypoints),
                descriptors=descriptors,
                keypoint_count=len(keypoints),
            )
        except Exception:
            return None

    def compare(
        self,
        features_1: SiftFeatures,
        features_2: SiftFeatures,
    ) -> MatchResult:
        """
        Compare two sets of SIFT features and determine if they match.

        Uses FLANN matcher with Lowe's ratio test, matching in both directions
        and taking the best result.

        Args:
            features_1: SIFT features from first image
            features_2: SIFT features from second image

        Returns:
            MatchResult with score and match decision
        """
        index_params = dict(algorithm=0, trees=5)
        search_params = dict()
        flann = cv2.FlannBasedMatcher(index_params, search_params)

        # Match in both directions
        good_points_1 = self._get_good_points(
            flann, features_1.descriptors, features_2.descriptors
        )
        good_points_2 = self._get_good_points(
            flann, features_2.descriptors, features_1.descriptors
        )

        # Take the better match direction
        best_good_points = good_points_1 if len(good_points_1) >= len(good_points_2) else good_points_2

        # Compute score as percentage of matched keypoints
        min_keypoints = min(features_1.keypoint_count, features_2.keypoint_count)
        score = (len(best_good_points) / min_keypoints * 100) if min_keypoints > 0 else 0.0

        return MatchResult(
            score=score,
            is_match=score >= self.acceptance_threshold,
            keypoints_1_count=features_1.keypoint_count,
            keypoints_2_count=features_2.keypoint_count,
            good_points_count=len(best_good_points),
        )

    def compare_images(
        self,
        image_1: np.ndarray,
        image_2: np.ndarray,
    ) -> Optional[MatchResult]:
        """
        Extract features and compare two images.

        Convenience method that combines extraction and comparison.

        Args:
            image_1: First BGR image
            image_2: Second BGR image

        Returns:
            MatchResult or None if feature extraction fails
        """
        features_1 = self.extract_features(image_1)
        features_2 = self.extract_features(image_2)

        if features_1 is None or features_2 is None:
            return None

        return self.compare(features_1, features_2)

    def _get_good_points(
        self,
        flann: cv2.FlannBasedMatcher,
        desc_1: np.ndarray,
        desc_2: np.ndarray,
    ) -> list:
        """Apply Lowe's ratio test to find good matching points."""
        try:
            matches = flann.knnMatch(desc_1, desc_2, k=2)
            good_points = []
            for match_pair in matches:
                if len(match_pair) == 2:
                    m, n = match_pair
                    if m.distance < self.distance_coefficient * n.distance:
                        good_points.append(m)
            return good_points
        except Exception:
            return []

    def generate_match_visualization(
        self,
        image_1: np.ndarray,
        image_2: np.ndarray,
        features_1: SiftFeatures,
        features_2: SiftFeatures,
    ) -> np.ndarray:
        """
        Generate a visualization of matched keypoints between two images.

        Args:
            image_1: First BGR image
            image_2: Second BGR image
            features_1: SIFT features from first image
            features_2: SIFT features from second image

        Returns:
            BGR image showing matched keypoints
        """
        index_params = dict(algorithm=0, trees=5)
        search_params = dict()
        flann = cv2.FlannBasedMatcher(index_params, search_params)

        good_points = self._get_good_points(
            flann, features_1.descriptors, features_2.descriptors
        )

        result = cv2.drawMatches(
            image_1,
            features_1.keypoints,
            image_2,
            features_2.keypoints,
            good_points,
            None,
            flags=cv2.DrawMatchesFlags_NOT_DRAW_SINGLE_POINTS,
        )
        return result
