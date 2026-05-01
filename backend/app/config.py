from pathlib import Path
from typing import Optional

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # Database
    database_url: str = "sqlite:///data/turtlesift.db"

    # File storage paths
    data_dir: Path = Path("data")
    images_dir: Path = Path("data/images")
    thumbnails_dir: Path = Path("data/thumbnails")
    submissions_dir: Path = Path("data/submissions")

    # YOLO model paths
    yolo_cfg_path: Path = Path("yolo/yolov3_testing.cfg")
    yolo_weights_path: Path = Path("yolo/yolov3_training_1000.weights")

    # SIFT algorithm parameters
    resized_width: int = 250
    distance_coefficient: float = 0.67
    acceptance_threshold: float = 4.0

    # Image processing
    thumbnail_size: int = 200

    # Airtable sync
    airtable_token: Optional[str] = None
    airtable_base_id: Optional[str] = None
    airtable_turtles_table: str = "Turtles"
    airtable_encounters_table: str = "Encounters"
    airtable_surveys_table: str = "Surveys"
    airtable_plots_table: str = "Plots"

    # App
    environment: str = "development"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        extra = "ignore"


settings = Settings()
