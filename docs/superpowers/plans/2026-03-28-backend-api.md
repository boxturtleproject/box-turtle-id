# Backend Foundation & API Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up the FastAPI backend with PostgreSQL, SIFT matching engine, public submission endpoints, and Airtable two-way sync — all inside `backend/` in the box-turtle-id repo.

**Architecture:** Copy the working turtlesift codebase (`/Users/claudius/github/turtlesift/app/`) into `backend/app/`, extend models with site field and submission tracking, add three new public submission endpoints, and add an Airtable sync service. The backend is self-contained and testable with pytest against a SQLite test database before PostgreSQL is wired up.

**Tech Stack:** FastAPI, SQLAlchemy 2.0, PostgreSQL (SQLite for dev/test), OpenCV SIFT, Pillow, Pydantic v2, UV, pytest

**Spec:** `docs/superpowers/specs/2026-03-28-turtlesift-integration-design.md`

**Source code to copy from:** `/Users/claudius/github/turtlesift/`

---

## File Map

### Copied from turtlesift (no changes)
- `backend/app/services/sift.py` ← `turtlesift/app/services/sift.py`
- `backend/app/services/image.py` ← `turtlesift/app/services/image.py`
- `backend/app/services/cropper.py` ← `turtlesift/app/services/cropper.py`
- `backend/app/database.py` ← `turtlesift/app/database.py`
- `backend/app/models/job.py` ← `turtlesift/app/models/job.py`
- `backend/app/models/settings.py` ← `turtlesift/app/models/settings.py`
- `backend/app/schemas/match.py` ← `turtlesift/app/schemas/match.py`
- `backend/app/schemas/turtle.py` ← `turtlesift/app/schemas/turtle.py`
- `backend/app/schemas/settings.py` ← `turtlesift/app/schemas/settings.py`
- `backend/app/schemas/job.py` ← `turtlesift/app/schemas/job.py`
- `backend/app/api/compare.py` ← `turtlesift/app/api/compare.py`
- `backend/app/api/turtles.py` ← `turtlesift/app/api/turtles.py`
- `backend/app/api/settings.py` ← `turtlesift/app/api/settings.py`
- `backend/app/api/admin.py` ← `turtlesift/app/api/admin.py`
- `backend/app/api/jobs.py` ← `turtlesift/app/api/jobs.py`

### Copied with modifications
- `backend/app/config.py` — Add Airtable env vars, `submissions_dir`, `environment`
- `backend/app/models/turtle.py` — Add `site` field to `Turtle`, add `last_synced_at` to `Turtle` and `Capture`
- `backend/app/models/encounter.py` — Add citizen-science fields: `setting`, `conditions`, `observer_nickname`, `notify_email`
- `backend/app/models/__init__.py` — Add `Submission` export
- `backend/app/services/__init__.py` — Add `AirtableSyncService` export
- `backend/app/api/__init__.py` — Add `submissions` and `sync` routers
- `backend/app/schemas/__init__.py` — Add submission schema exports
- `backend/app/main.py` — Add submissions dir to startup, update frontend path

### New files
- `backend/pyproject.toml` — Project config with all dependencies
- `backend/app/models/submission.py` — Submission model for temporary photo storage
- `backend/app/schemas/submission.py` — Pydantic schemas for submission endpoints
- `backend/app/api/submissions.py` — `POST /identify`, `POST /confirm`, `POST /new-turtle`
- `backend/app/services/airtable.py` — Two-way Airtable sync service
- `backend/app/api/sync.py` — `POST /api/sync/airtable`
- `backend/tests/conftest.py` — pytest fixtures (test DB, test client)
- `backend/tests/test_submissions.py` — Tests for submission endpoints
- `backend/tests/test_sync.py` — Tests for Airtable sync service

---

## Task 1: Backend Scaffolding

**Files:**
- Create: `backend/pyproject.toml`
- Create: `backend/app/__init__.py`

- [ ] **Step 1: Create backend directory and pyproject.toml**

```bash
mkdir -p backend/app
```

Write `backend/pyproject.toml`:

```toml
[project]
name = "box-turtle-id-backend"
version = "0.1.0"
description = "Box Turtle ID backend — FastAPI + SIFT matching engine"
requires-python = ">=3.11"

dependencies = [
    "fastapi>=0.115.0",
    "uvicorn[standard]>=0.32.0",
    "sqlalchemy>=2.0.0",
    "psycopg2-binary>=2.9.0",
    "pydantic>=2.0.0",
    "pydantic-settings>=2.0.0",
    "python-multipart>=0.0.9",
    "opencv-python-headless>=4.9.0",
    "numpy>=1.26.0",
    "pillow>=10.0.0",
    "requests>=2.32.5",
    "python-dotenv>=1.2.1",
]

[project.optional-dependencies]
dev = [
    "pytest>=8.0.0",
    "pytest-asyncio>=0.24.0",
    "httpx>=0.27.0",
    "ruff>=0.8.0",
]

[build-system]
requires = ["hatchling"]
build-backend = "hatchling.build"

[tool.hatch.build.targets.wheel]
packages = ["app"]

[tool.ruff]
line-length = 100
target-version = "py311"

[tool.ruff.lint]
select = ["E", "F", "I", "UP"]

[tool.pytest.ini_options]
asyncio_mode = "auto"
testpaths = ["tests"]
```

- [ ] **Step 2: Create empty `__init__.py`**

Write `backend/app/__init__.py`:

```python
```

(Empty file.)

- [ ] **Step 3: Verify directory structure**

```bash
ls -la backend/ && ls -la backend/app/
```

Expected: `pyproject.toml` and `app/` with `__init__.py`.

- [ ] **Step 4: Commit**

```bash
cd backend && git add pyproject.toml app/__init__.py && git commit -m "feat(backend): scaffold backend directory with pyproject.toml"
```

---

## Task 2: Copy Core Services

**Files:**
- Create: `backend/app/services/__init__.py`
- Create: `backend/app/services/sift.py`
- Create: `backend/app/services/image.py`
- Create: `backend/app/services/cropper.py`

- [ ] **Step 1: Copy service files from turtlesift**

```bash
mkdir -p backend/app/services
cp /Users/claudius/github/turtlesift/app/services/sift.py backend/app/services/sift.py
cp /Users/claudius/github/turtlesift/app/services/image.py backend/app/services/image.py
cp /Users/claudius/github/turtlesift/app/services/cropper.py backend/app/services/cropper.py
cp /Users/claudius/github/turtlesift/app/services/__init__.py backend/app/services/__init__.py
```

- [ ] **Step 2: Verify files exist and imports reference `app.config`**

```bash
head -5 backend/app/services/sift.py backend/app/services/image.py backend/app/services/cropper.py
```

Expected: Each file starts with `# ABOUTME:` comments and imports from `app.config`.

- [ ] **Step 3: Commit**

```bash
cd backend && git add app/services/ && git commit -m "feat(backend): copy SIFT, image, and cropper services from turtlesift"
```

---

## Task 3: Copy Database + Config

**Files:**
- Create: `backend/app/database.py`
- Create: `backend/app/config.py` (modified from turtlesift)

- [ ] **Step 1: Copy database.py unchanged**

```bash
cp /Users/claudius/github/turtlesift/app/database.py backend/app/database.py
```

- [ ] **Step 2: Write extended config.py**

Write `backend/app/config.py`:

```python
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
    airtable_turtles_table: Optional[str] = None
    airtable_encounters_table: Optional[str] = None

    # App
    environment: str = "development"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        extra = "ignore"


settings = Settings()
```

- [ ] **Step 3: Commit**

```bash
cd backend && git add app/database.py app/config.py && git commit -m "feat(backend): add database and config with Airtable settings"
```

---

## Task 4: Copy + Extend Models

**Files:**
- Create: `backend/app/models/__init__.py`
- Create: `backend/app/models/turtle.py` (modified)
- Create: `backend/app/models/encounter.py` (modified)
- Create: `backend/app/models/job.py`
- Create: `backend/app/models/settings.py`
- Create: `backend/app/models/submission.py` (new)

- [ ] **Step 1: Create models directory and copy unchanged models**

```bash
mkdir -p backend/app/models
cp /Users/claudius/github/turtlesift/app/models/job.py backend/app/models/job.py
cp /Users/claudius/github/turtlesift/app/models/settings.py backend/app/models/settings.py
```

- [ ] **Step 2: Write turtle.py with site and sync fields**

Write `backend/app/models/turtle.py`:

```python
from datetime import date, datetime
from typing import TYPE_CHECKING, Optional

from sqlalchemy import ForeignKey, LargeBinary, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

if TYPE_CHECKING:
    from app.models.encounter import Encounter


class Turtle(Base):
    __tablename__ = "turtles"

    id: Mapped[int] = mapped_column(primary_key=True)
    external_id: Mapped[str] = mapped_column(index=True)
    name: Mapped[Optional[str]] = mapped_column(default=None)
    site: Mapped[Optional[str]] = mapped_column(default=None, index=True)
    first_seen: Mapped[date]
    notes: Mapped[Optional[str]] = mapped_column(Text, default=None)
    cover_capture_id: Mapped[Optional[int]] = mapped_column(default=None)

    species: Mapped[Optional[str]] = mapped_column(default=None)
    gender: Mapped[Optional[str]] = mapped_column(default=None)
    pattern: Mapped[Optional[str]] = mapped_column(default=None)
    carapace_flare: Mapped[Optional[str]] = mapped_column(default=None)

    airtable_record_id: Mapped[Optional[str]] = mapped_column(default=None)
    last_synced_at: Mapped[Optional[datetime]] = mapped_column(default=None)

    created_at: Mapped[datetime] = mapped_column(insert_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(insert_default=func.now(), onupdate=func.now())

    captures: Mapped[list["Capture"]] = relationship(back_populates="turtle")
    encounters: Mapped[list["Encounter"]] = relationship(back_populates="turtle")


class Capture(Base):
    __tablename__ = "captures"

    id: Mapped[int] = mapped_column(primary_key=True)
    turtle_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("turtles.id", ondelete="SET NULL"), default=None
    )
    encounter_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("encounters.id", ondelete="SET NULL"), default=None
    )
    image_type: Mapped[str] = mapped_column(default="carapace_top")
    image_path: Mapped[str]
    thumbnail_path: Mapped[Optional[str]] = mapped_column(default=None)
    original_filename: Mapped[str]
    captured_date: Mapped[Optional[date]] = mapped_column(default=None)

    latitude: Mapped[Optional[float]] = mapped_column(default=None)
    longitude: Mapped[Optional[float]] = mapped_column(default=None)
    exif_datetime: Mapped[Optional[datetime]] = mapped_column(default=None)
    camera_make: Mapped[Optional[str]] = mapped_column(default=None)
    camera_model: Mapped[Optional[str]] = mapped_column(default=None)

    keypoints_data: Mapped[Optional[bytes]] = mapped_column(LargeBinary, default=None)
    descriptors_data: Mapped[Optional[bytes]] = mapped_column(LargeBinary, default=None)
    keypoint_count: Mapped[int] = mapped_column(default=0)

    last_synced_at: Mapped[Optional[datetime]] = mapped_column(default=None)
    created_at: Mapped[datetime] = mapped_column(insert_default=func.now())

    turtle: Mapped[Optional["Turtle"]] = relationship(back_populates="captures")
    encounter: Mapped[Optional["Encounter"]] = relationship(back_populates="captures")


class MatchResult(Base):
    __tablename__ = "match_results"

    id: Mapped[int] = mapped_column(primary_key=True)
    capture_1_id: Mapped[int] = mapped_column(ForeignKey("captures.id", ondelete="CASCADE"))
    capture_2_id: Mapped[int] = mapped_column(ForeignKey("captures.id", ondelete="CASCADE"))
    score: Mapped[float]
    is_match: Mapped[bool]
    computed_at: Mapped[datetime] = mapped_column(insert_default=func.now())

    capture_1: Mapped["Capture"] = relationship(foreign_keys=[capture_1_id])
    capture_2: Mapped["Capture"] = relationship(foreign_keys=[capture_2_id])
```

- [ ] **Step 3: Write encounter.py with citizen-science fields**

Write `backend/app/models/encounter.py`:

```python
from datetime import datetime
from typing import TYPE_CHECKING, Optional

from sqlalchemy import ForeignKey, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

if TYPE_CHECKING:
    from app.models.turtle import Capture, Turtle


class Encounter(Base):
    __tablename__ = "encounters"

    id: Mapped[int] = mapped_column(primary_key=True)
    turtle_id: Mapped[int] = mapped_column(ForeignKey("turtles.id", ondelete="CASCADE"))
    external_id: Mapped[Optional[str]] = mapped_column(default=None)
    airtable_record_id: Mapped[Optional[str]] = mapped_column(default=None)

    encounter_date: Mapped[Optional[datetime]] = mapped_column(default=None)
    plot_name: Mapped[Optional[str]] = mapped_column(default=None)
    survey_id: Mapped[Optional[str]] = mapped_column(default=None)
    identified: Mapped[Optional[str]] = mapped_column(default=None)
    health_status: Mapped[Optional[str]] = mapped_column(default=None)
    behavior: Mapped[Optional[str]] = mapped_column(default=None)
    setting: Mapped[Optional[str]] = mapped_column(default=None)
    conditions: Mapped[Optional[str]] = mapped_column(default=None)
    notes: Mapped[Optional[str]] = mapped_column(Text, default=None)

    observer_nickname: Mapped[Optional[str]] = mapped_column(default=None)
    notify_email: Mapped[Optional[str]] = mapped_column(default=None)

    last_synced_at: Mapped[Optional[datetime]] = mapped_column(default=None)
    created_at: Mapped[datetime] = mapped_column(insert_default=func.now())

    turtle: Mapped["Turtle"] = relationship(back_populates="encounters")
    captures: Mapped[list["Capture"]] = relationship(back_populates="encounter")
```

- [ ] **Step 4: Write submission.py (new model)**

Write `backend/app/models/submission.py`:

```python
import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


def generate_uuid() -> str:
    return str(uuid.uuid4())


class Submission(Base):
    __tablename__ = "submissions"

    id: Mapped[str] = mapped_column(primary_key=True, default=generate_uuid)
    site: Mapped[str]
    top_image_path: Mapped[str]
    left_image_path: Mapped[Optional[str]] = mapped_column(default=None)
    right_image_path: Mapped[Optional[str]] = mapped_column(default=None)
    other_image_paths: Mapped[Optional[str]] = mapped_column(Text, default=None)
    status: Mapped[str] = mapped_column(default="pending")
    created_at: Mapped[datetime] = mapped_column(insert_default=func.now())
```

- [ ] **Step 5: Write models __init__.py**

Write `backend/app/models/__init__.py`:

```python
from app.models.turtle import Turtle, Capture, MatchResult
from app.models.encounter import Encounter
from app.models.job import Job
from app.models.settings import Setting
from app.models.submission import Submission

__all__ = ["Turtle", "Capture", "MatchResult", "Encounter", "Job", "Setting", "Submission"]
```

- [ ] **Step 6: Commit**

```bash
cd backend && git add app/models/ && git commit -m "feat(backend): add database models with site field and submission tracking"
```

---

## Task 5: Copy Schemas + Add Submission Schemas

**Files:**
- Create: `backend/app/schemas/match.py` (copy)
- Create: `backend/app/schemas/turtle.py` (copy)
- Create: `backend/app/schemas/settings.py` (copy)
- Create: `backend/app/schemas/job.py` (copy)
- Create: `backend/app/schemas/submission.py` (new)
- Create: `backend/app/schemas/__init__.py` (modified)

- [ ] **Step 1: Copy unchanged schema files**

```bash
mkdir -p backend/app/schemas
cp /Users/claudius/github/turtlesift/app/schemas/match.py backend/app/schemas/match.py
cp /Users/claudius/github/turtlesift/app/schemas/turtle.py backend/app/schemas/turtle.py
cp /Users/claudius/github/turtlesift/app/schemas/settings.py backend/app/schemas/settings.py
cp /Users/claudius/github/turtlesift/app/schemas/job.py backend/app/schemas/job.py
```

- [ ] **Step 2: Write submission.py schemas**

Write `backend/app/schemas/submission.py`:

```python
from typing import Optional

from pydantic import BaseModel


class SubmissionCandidate(BaseModel):
    turtle_id: int
    turtle_nickname: Optional[str]
    score: float
    confidence: str
    visualization_url: Optional[str]
    thumbnail_url: Optional[str]


class IdentifyResponse(BaseModel):
    candidates: list[SubmissionCandidate]
    total_compared: int
    processing_time_ms: int
    submission_id: str


class EncounterFormData(BaseModel):
    date: str
    location: str
    setting: list[str] = []
    conditions: list[str] = []
    behaviors: list[str] = []
    health: str = ""
    observation_notes: str = ""
    nickname: str = ""
    notify_me: bool = False
    email: str = ""


class ConfirmRequest(BaseModel):
    turtle_id: int
    encounter_data: EncounterFormData


class ConfirmResponse(BaseModel):
    success: bool
    encounter_id: int


class NewTurtleRequest(BaseModel):
    nickname: str
    encounter_data: EncounterFormData
    site: str


class NewTurtleResponse(BaseModel):
    success: bool
    turtle_id: int
```

- [ ] **Step 3: Write schemas __init__.py with submission exports**

Write `backend/app/schemas/__init__.py`:

```python
from app.schemas.turtle import (
    TurtleCreate,
    TurtleUpdate,
    TurtleResponse,
    CaptureCreate,
    CaptureResponse,
)
from app.schemas.match import CompareRequest, CompareResponse, SearchResponse
from app.schemas.job import JobResponse
from app.schemas.settings import SiftSettings, SiftSettingsUpdate, SiftSettingsResponse
from app.schemas.submission import (
    IdentifyResponse,
    SubmissionCandidate,
    EncounterFormData,
    ConfirmRequest,
    ConfirmResponse,
    NewTurtleRequest,
    NewTurtleResponse,
)

__all__ = [
    "TurtleCreate",
    "TurtleUpdate",
    "TurtleResponse",
    "CaptureCreate",
    "CaptureResponse",
    "CompareRequest",
    "CompareResponse",
    "SearchResponse",
    "JobResponse",
    "SiftSettings",
    "SiftSettingsUpdate",
    "SiftSettingsResponse",
    "IdentifyResponse",
    "SubmissionCandidate",
    "EncounterFormData",
    "ConfirmRequest",
    "ConfirmResponse",
    "NewTurtleRequest",
    "NewTurtleResponse",
]
```

- [ ] **Step 4: Commit**

```bash
cd backend && git add app/schemas/ && git commit -m "feat(backend): add schemas with submission request/response models"
```

---

## Task 6: Copy Existing API Endpoints

**Files:**
- Create: `backend/app/api/compare.py` (copy)
- Create: `backend/app/api/turtles.py` (copy)
- Create: `backend/app/api/settings.py` (copy)
- Create: `backend/app/api/admin.py` (copy)
- Create: `backend/app/api/jobs.py` (copy)

- [ ] **Step 1: Copy all existing API endpoint files**

```bash
mkdir -p backend/app/api
cp /Users/claudius/github/turtlesift/app/api/compare.py backend/app/api/compare.py
cp /Users/claudius/github/turtlesift/app/api/turtles.py backend/app/api/turtles.py
cp /Users/claudius/github/turtlesift/app/api/settings.py backend/app/api/settings.py
cp /Users/claudius/github/turtlesift/app/api/admin.py backend/app/api/admin.py
cp /Users/claudius/github/turtlesift/app/api/jobs.py backend/app/api/jobs.py
```

- [ ] **Step 2: Verify imports resolve correctly**

```bash
grep "^from app\." backend/app/api/*.py | head -20
```

Expected: All imports reference `app.` which matches the `backend/app/` package structure.

- [ ] **Step 3: Commit**

```bash
cd backend && git add app/api/ && git commit -m "feat(backend): copy existing API endpoints from turtlesift"
```

---

## Task 7: Submission Identify Endpoint

**Files:**
- Create: `backend/app/api/submissions.py`
- Create: `backend/tests/conftest.py`
- Create: `backend/tests/__init__.py`
- Create: `backend/tests/test_submissions.py`

- [ ] **Step 1: Write the failing test for identify endpoint**

Write `backend/tests/__init__.py`:

```python
```

Write `backend/tests/conftest.py`:

```python
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.database import Base, get_db
from app.main import app

TEST_DATABASE_URL = "sqlite:///test.db"

engine = create_engine(TEST_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(autouse=True)
def setup_db():
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture
def db():
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture
def client(db):
    def override_get_db():
        try:
            yield db
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


@pytest.fixture
def sample_image_bytes():
    """A minimal valid JPEG for testing (100x100 white pixel)."""
    import io
    from PIL import Image

    img = Image.new("RGB", (100, 100), color="white")
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    return buf.getvalue()
```

Write `backend/tests/test_submissions.py`:

```python
def test_identify_returns_submission_id(client, sample_image_bytes):
    response = client.post(
        "/api/submissions/identify",
        data={"site": "patuxent"},
        files={"top": ("top.jpg", sample_image_bytes, "image/jpeg")},
    )
    assert response.status_code == 200
    data = response.json()
    assert "submission_id" in data
    assert "candidates" in data
    assert "total_compared" in data
    assert "processing_time_ms" in data
    assert data["submission_id"] != ""


def test_identify_requires_top_image(client):
    response = client.post(
        "/api/submissions/identify",
        data={"site": "patuxent"},
    )
    assert response.status_code == 422


def test_identify_with_optional_images(client, sample_image_bytes):
    response = client.post(
        "/api/submissions/identify",
        data={"site": "wallkill"},
        files={
            "top": ("top.jpg", sample_image_bytes, "image/jpeg"),
            "left": ("left.jpg", sample_image_bytes, "image/jpeg"),
            "right": ("right.jpg", sample_image_bytes, "image/jpeg"),
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert data["submission_id"] != ""
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd backend && python -m pytest tests/test_submissions.py -v 2>&1 | head -30
```

Expected: FAIL — `app.main` doesn't exist yet (or submissions route not found).

- [ ] **Step 3: Write submissions.py endpoint**

Write `backend/app/api/submissions.py`:

```python
import json
import time
import uuid
from datetime import date, datetime
from pathlib import Path
from typing import Optional

import cv2
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models import Capture, Encounter, Submission, Turtle
from app.schemas.submission import (
    ConfirmRequest,
    ConfirmResponse,
    IdentifyResponse,
    NewTurtleRequest,
    NewTurtleResponse,
    SubmissionCandidate,
)
from app.services import CropperService, ImageService, SiftService
from app.services.sift import SiftFeatures

router = APIRouter()

_sift_service: Optional[SiftService] = None
_cropper_service: Optional[CropperService] = None
_image_service: Optional[ImageService] = None


def get_sift_service() -> SiftService:
    global _sift_service
    if _sift_service is None:
        _sift_service = SiftService()
    return _sift_service


def get_cropper_service() -> CropperService:
    global _cropper_service
    if _cropper_service is None:
        _cropper_service = CropperService()
    return _cropper_service


def get_image_service() -> ImageService:
    global _image_service
    if _image_service is None:
        _image_service = ImageService()
    return _image_service


def _score_to_confidence(score: float) -> str:
    if score >= 75:
        return "high"
    if score >= 40:
        return "medium"
    return "low"


@router.post("/submissions/identify", response_model=IdentifyResponse)
async def identify(
    site: str = Form(...),
    top: UploadFile = File(...),
    left: Optional[UploadFile] = File(None),
    right: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
    sift: SiftService = Depends(get_sift_service),
    cropper: CropperService = Depends(get_cropper_service),
    image_svc: ImageService = Depends(get_image_service),
):
    start_time = time.time()
    submission_id = str(uuid.uuid4())

    # Create submission directory
    sub_dir = settings.submissions_dir / submission_id
    sub_dir.mkdir(parents=True, exist_ok=True)

    # Save and load top image
    top_data = await top.read()
    top_img = image_svc.load_from_bytes(top_data)
    if top_img is None:
        raise HTTPException(status_code=400, detail="Failed to load top image")

    top_path = sub_dir / "top.jpg"
    cv2.imwrite(str(top_path), top_img)

    # Save optional images
    left_path = None
    if left is not None:
        left_data = await left.read()
        left_img = image_svc.load_from_bytes(left_data)
        if left_img is not None:
            left_path = str(sub_dir / "left.jpg")
            cv2.imwrite(left_path, left_img)

    right_path = None
    if right is not None:
        right_data = await right.read()
        right_img = image_svc.load_from_bytes(right_data)
        if right_img is not None:
            right_path = str(sub_dir / "right.jpg")
            cv2.imwrite(right_path, right_img)

    # Create submission record
    submission = Submission(
        id=submission_id,
        site=site,
        top_image_path=str(top_path),
        left_image_path=left_path,
        right_image_path=right_path,
    )
    db.add(submission)
    db.commit()

    # Preprocess top image for SIFT matching
    processed = image_svc.preprocess(top_img, crop=True, cropper=cropper)
    query_features = sift.extract_features(processed)

    if query_features is None:
        processing_time_ms = int((time.time() - start_time) * 1000)
        return IdentifyResponse(
            candidates=[],
            total_compared=0,
            processing_time_ms=processing_time_ms,
            submission_id=submission_id,
        )

    # Query all captures with cached SIFT descriptors, filtered by site
    captures_query = db.query(Capture).filter(Capture.descriptors_data.isnot(None))
    captures_query = captures_query.join(Turtle, Capture.turtle_id == Turtle.id).filter(
        Turtle.site == site
    )
    captures = captures_query.all()

    # Compare against each capture
    candidates: list[SubmissionCandidate] = []
    seen_turtle_ids: set[int] = set()

    for capture in captures:
        try:
            db_features = SiftFeatures.deserialize(
                capture.keypoints_data, capture.descriptors_data
            )
            result = sift.compare(query_features, db_features)

            if result.score < settings.acceptance_threshold:
                continue

            # Only keep the best match per turtle
            if capture.turtle_id in seen_turtle_ids:
                existing = next(
                    (c for c in candidates if c.turtle_id == capture.turtle_id), None
                )
                if existing and result.score <= existing.score:
                    continue
                candidates = [c for c in candidates if c.turtle_id != capture.turtle_id]

            seen_turtle_ids.add(capture.turtle_id)

            # Get turtle info
            turtle = db.query(Turtle).filter(Turtle.id == capture.turtle_id).first()
            turtle_nickname = turtle.name or turtle.external_id if turtle else None

            # Generate visualization
            viz_filename = f"viz_{uuid.uuid4()}.jpg"
            viz_dir = settings.data_dir / "thumbnails"
            viz_dir.mkdir(parents=True, exist_ok=True)
            db_img = image_svc.load(capture.image_path)
            if db_img is not None:
                viz_image = sift.generate_match_visualization(
                    processed, db_img, query_features, db_features,
                )
                cv2.imwrite(str(viz_dir / viz_filename), viz_image)

            candidates.append(
                SubmissionCandidate(
                    turtle_id=capture.turtle_id,
                    turtle_nickname=turtle_nickname,
                    score=round(result.score, 1),
                    confidence=_score_to_confidence(result.score),
                    visualization_url=f"/api/visualizations/{viz_filename}",
                    thumbnail_url=capture.thumbnail_path,
                )
            )
        except Exception:
            continue

    # Sort by score descending
    candidates.sort(key=lambda c: c.score, reverse=True)

    processing_time_ms = int((time.time() - start_time) * 1000)

    return IdentifyResponse(
        candidates=candidates,
        total_compared=len(captures),
        processing_time_ms=processing_time_ms,
        submission_id=submission_id,
    )


@router.post("/submissions/{submission_id}/confirm", response_model=ConfirmResponse)
async def confirm_submission(
    submission_id: str,
    request: ConfirmRequest,
    db: Session = Depends(get_db),
    sift: SiftService = Depends(get_sift_service),
    cropper: CropperService = Depends(get_cropper_service),
    image_svc: ImageService = Depends(get_image_service),
):
    submission = db.query(Submission).filter(Submission.id == submission_id).first()
    if not submission:
        raise HTTPException(status_code=404, detail="Submission not found")

    turtle = db.query(Turtle).filter(Turtle.id == request.turtle_id).first()
    if not turtle:
        raise HTTPException(status_code=404, detail="Turtle not found")

    # Parse encounter date
    enc_date = None
    if request.encounter_data.date:
        try:
            enc_date = datetime.strptime(request.encounter_data.date, "%Y-%m-%d")
        except ValueError:
            enc_date = None

    # Create encounter
    encounter = Encounter(
        turtle_id=turtle.id,
        encounter_date=enc_date,
        plot_name=request.encounter_data.location,
        setting=",".join(request.encounter_data.setting),
        conditions=",".join(request.encounter_data.conditions),
        behavior=",".join(request.encounter_data.behaviors),
        health_status=request.encounter_data.health,
        notes=request.encounter_data.observation_notes,
        observer_nickname=request.encounter_data.nickname,
        notify_email=request.encounter_data.email if request.encounter_data.notify_me else None,
        identified="Matched",
    )
    db.add(encounter)
    db.flush()

    # Move submission images to permanent storage and create captures
    _create_captures_from_submission(
        submission, turtle.id, encounter.id, db, sift, cropper, image_svc
    )

    submission.status = "confirmed"
    db.commit()

    return ConfirmResponse(success=True, encounter_id=encounter.id)


@router.post("/submissions/{submission_id}/new-turtle", response_model=NewTurtleResponse)
async def new_turtle_from_submission(
    submission_id: str,
    request: NewTurtleRequest,
    db: Session = Depends(get_db),
    sift: SiftService = Depends(get_sift_service),
    cropper: CropperService = Depends(get_cropper_service),
    image_svc: ImageService = Depends(get_image_service),
):
    submission = db.query(Submission).filter(Submission.id == submission_id).first()
    if not submission:
        raise HTTPException(status_code=404, detail="Submission not found")

    # Generate external_id: find max existing and increment
    last_turtle = db.query(Turtle).order_by(Turtle.id.desc()).first()
    next_num = (last_turtle.id + 1) if last_turtle else 1
    external_id = f"T{next_num:03d}"

    # Create turtle
    turtle = Turtle(
        external_id=external_id,
        name=request.nickname or None,
        site=request.site,
        first_seen=date.today(),
    )
    db.add(turtle)
    db.flush()

    # Parse encounter date
    enc_date = None
    if request.encounter_data.date:
        try:
            enc_date = datetime.strptime(request.encounter_data.date, "%Y-%m-%d")
        except ValueError:
            enc_date = None

    # Create encounter
    encounter = Encounter(
        turtle_id=turtle.id,
        encounter_date=enc_date,
        plot_name=request.encounter_data.location,
        setting=",".join(request.encounter_data.setting),
        conditions=",".join(request.encounter_data.conditions),
        behavior=",".join(request.encounter_data.behaviors),
        health_status=request.encounter_data.health,
        notes=request.encounter_data.observation_notes,
        observer_nickname=request.encounter_data.nickname,
        notify_email=request.encounter_data.email if request.encounter_data.notify_me else None,
        identified="New",
    )
    db.add(encounter)
    db.flush()

    # Move submission images to permanent storage and create captures
    _create_captures_from_submission(
        submission, turtle.id, encounter.id, db, sift, cropper, image_svc
    )

    submission.status = "confirmed"
    db.commit()

    return NewTurtleResponse(success=True, turtle_id=turtle.id)


def _create_captures_from_submission(
    submission: Submission,
    turtle_id: int,
    encounter_id: int,
    db: Session,
    sift: SiftService,
    cropper: CropperService,
    image_svc: ImageService,
):
    """Move submission images to permanent storage and create Capture records."""
    image_map = [
        (submission.top_image_path, "carapace_top", "top.jpg"),
        (submission.left_image_path, "carapace_left", "left.jpg"),
        (submission.right_image_path, "carapace_right", "right.jpg"),
    ]

    for img_path, image_type, default_name in image_map:
        if img_path is None:
            continue

        src = Path(img_path)
        if not src.exists():
            continue

        img = image_svc.load(src)
        if img is None:
            continue

        # Save to permanent images directory
        perm_path = image_svc.save(img)
        thumbnail_path = image_svc.generate_thumbnail(img)

        # Extract SIFT features for carapace_top
        kp_bytes = None
        desc_bytes = None
        kp_count = 0
        if image_type == "carapace_top":
            preprocessed = image_svc.preprocess(img, crop=True, cropper=cropper)
            features = sift.extract_features(preprocessed)
            if features:
                kp_bytes, desc_bytes = features.serialize()
                kp_count = features.keypoint_count

        capture = Capture(
            turtle_id=turtle_id,
            encounter_id=encounter_id,
            image_type=image_type,
            image_path=perm_path,
            thumbnail_path=thumbnail_path,
            original_filename=default_name,
            keypoints_data=kp_bytes,
            descriptors_data=desc_bytes,
            keypoint_count=kp_count,
        )
        db.add(capture)

    # Handle other images from submission
    if submission.other_image_paths:
        try:
            other_paths = json.loads(submission.other_image_paths)
        except (json.JSONDecodeError, TypeError):
            other_paths = []

        for i, other_path in enumerate(other_paths):
            src = Path(other_path)
            if not src.exists():
                continue
            img = image_svc.load(src)
            if img is None:
                continue

            perm_path = image_svc.save(img)
            thumbnail_path = image_svc.generate_thumbnail(img)

            capture = Capture(
                turtle_id=turtle_id,
                encounter_id=encounter_id,
                image_type="other",
                image_path=perm_path,
                thumbnail_path=thumbnail_path,
                original_filename=f"other_{i}.jpg",
            )
            db.add(capture)
```

- [ ] **Step 4: Write temporary main.py so tests can run**

Write `backend/app/main.py`:

```python
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import create_tables


@asynccontextmanager
async def lifespan(app: FastAPI):
    create_tables()
    settings.data_dir.mkdir(parents=True, exist_ok=True)
    settings.images_dir.mkdir(parents=True, exist_ok=True)
    settings.thumbnails_dir.mkdir(parents=True, exist_ok=True)
    settings.submissions_dir.mkdir(parents=True, exist_ok=True)
    yield


app = FastAPI(title="BoxTurtle ID", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from app.api.submissions import router as submissions_router
app.include_router(submissions_router, prefix="/api", tags=["submissions"])

@app.get("/api/health")
async def health():
    return {"status": "healthy"}
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
cd backend && python -m pytest tests/test_submissions.py -v
```

Expected: 3 tests pass.

- [ ] **Step 6: Commit**

```bash
cd backend && git add app/api/submissions.py app/main.py tests/ && git commit -m "feat(backend): add submission identify endpoint with tests"
```

---

## Task 8: Submission Confirm + New Turtle Tests

**Files:**
- Modify: `backend/tests/test_submissions.py`

- [ ] **Step 1: Add tests for confirm and new-turtle endpoints**

Append to `backend/tests/test_submissions.py`:

```python
from datetime import date

from app.models import Turtle


def _create_test_submission(client, sample_image_bytes):
    """Helper: create a submission via the identify endpoint."""
    response = client.post(
        "/api/submissions/identify",
        data={"site": "patuxent"},
        files={"top": ("top.jpg", sample_image_bytes, "image/jpeg")},
    )
    return response.json()["submission_id"]


def _create_test_turtle(db):
    """Helper: insert a turtle into the DB."""
    turtle = Turtle(
        external_id="T999",
        name="Test Turtle",
        site="patuxent",
        first_seen=date(2025, 1, 1),
    )
    db.add(turtle)
    db.commit()
    db.refresh(turtle)
    return turtle


def test_confirm_creates_encounter(client, db, sample_image_bytes):
    submission_id = _create_test_submission(client, sample_image_bytes)
    turtle = _create_test_turtle(db)

    response = client.post(
        f"/api/submissions/{submission_id}/confirm",
        json={
            "turtle_id": turtle.id,
            "encounter_data": {
                "date": "2026-03-28",
                "location": "Upper Meadow",
                "setting": ["Woods"],
                "conditions": ["Sunny"],
                "behaviors": ["Basking"],
                "health": "Healthy",
                "observation_notes": "Found near stream",
                "nickname": "Observer1",
                "notify_me": False,
                "email": "",
            },
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "encounter_id" in data


def test_confirm_invalid_submission_returns_404(client):
    response = client.post(
        "/api/submissions/nonexistent/confirm",
        json={
            "turtle_id": 1,
            "encounter_data": {
                "date": "2026-03-28",
                "location": "",
                "health": "",
                "observation_notes": "",
                "nickname": "",
                "email": "",
            },
        },
    )
    assert response.status_code == 404


def test_new_turtle_creates_turtle_and_encounter(client, db, sample_image_bytes):
    submission_id = _create_test_submission(client, sample_image_bytes)

    response = client.post(
        f"/api/submissions/{submission_id}/new-turtle",
        json={
            "nickname": "Shelly",
            "site": "patuxent",
            "encounter_data": {
                "date": "2026-03-28",
                "location": "Lower Field",
                "setting": ["Field"],
                "conditions": ["Cloudy"],
                "behaviors": ["Locomoting"],
                "health": "Healthy",
                "observation_notes": "New individual",
                "nickname": "Observer2",
                "notify_me": True,
                "email": "obs@example.com",
            },
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "turtle_id" in data
```

- [ ] **Step 2: Run all tests**

```bash
cd backend && python -m pytest tests/test_submissions.py -v
```

Expected: All 6 tests pass.

- [ ] **Step 3: Commit**

```bash
cd backend && git add tests/test_submissions.py && git commit -m "test(backend): add confirm and new-turtle endpoint tests"
```

---

## Task 9: Airtable Sync Service

**Files:**
- Create: `backend/app/services/airtable.py`
- Create: `backend/tests/test_sync.py`

- [ ] **Step 1: Write failing test for sync service**

Write `backend/tests/test_sync.py`:

```python
from unittest.mock import patch
from datetime import date

from app.models import Turtle
from app.services.airtable import AirtableSyncService


def test_sync_service_init_without_credentials(db):
    service = AirtableSyncService(db)
    assert service.enabled is False


@patch.dict("os.environ", {
    "AIRTABLE_TOKEN": "fake_token",
    "AIRTABLE_BASE_ID": "fake_base",
    "AIRTABLE_TURTLES_TABLE": "Turtles",
    "AIRTABLE_ENCOUNTERS_TABLE": "Encounters",
})
def test_sync_service_init_with_credentials(db):
    service = AirtableSyncService(db)
    assert service.enabled is True


def test_push_turtle_builds_correct_payload(db):
    turtle = Turtle(
        external_id="T001",
        name="Shelly",
        site="patuxent",
        gender="Female",
        first_seen=date(2025, 6, 15),
    )
    db.add(turtle)
    db.commit()
    db.refresh(turtle)

    service = AirtableSyncService(db)
    payload = service._build_turtle_payload(turtle)

    assert payload["Turtle ID"] == "T001"
    assert payload["Name"] == "Shelly"
    assert payload["Gender"] == "Female"
    assert payload["Date First Identified"] == "2025-06-15"
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd backend && python -m pytest tests/test_sync.py -v 2>&1 | tail -10
```

Expected: FAIL — `app.services.airtable` does not exist.

- [ ] **Step 3: Write AirtableSyncService**

Write `backend/app/services/airtable.py`:

```python
import logging
from datetime import datetime
from typing import Optional

import requests
from sqlalchemy.orm import Session

from app.config import settings
from app.models import Encounter, Turtle

logger = logging.getLogger(__name__)

AIRTABLE_API = "https://api.airtable.com/v0"


class AirtableSyncService:
    def __init__(self, db: Session):
        self.db = db
        self.token = settings.airtable_token
        self.base_id = settings.airtable_base_id
        self.turtles_table = settings.airtable_turtles_table
        self.encounters_table = settings.airtable_encounters_table
        self.enabled = all([self.token, self.base_id, self.turtles_table, self.encounters_table])

    @property
    def _headers(self) -> dict:
        return {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json",
        }

    def _table_url(self, table: str) -> str:
        return f"{AIRTABLE_API}/{self.base_id}/{table}"

    def _build_turtle_payload(self, turtle: Turtle) -> dict:
        fields = {
            "Turtle ID": turtle.external_id,
        }
        if turtle.name:
            fields["Name"] = turtle.name
        if turtle.gender:
            fields["Gender"] = turtle.gender
        if turtle.first_seen:
            fields["Date First Identified"] = turtle.first_seen.isoformat()
        return fields

    def _build_encounter_payload(self, encounter: Encounter) -> dict:
        fields = {}
        if encounter.encounter_date:
            fields["Date"] = encounter.encounter_date.strftime("%Y-%m-%d")
        if encounter.plot_name:
            fields["Plot Name"] = encounter.plot_name
        if encounter.health_status:
            fields["Health Status"] = encounter.health_status
        if encounter.behavior:
            fields["Behavior"] = encounter.behavior
        if encounter.notes:
            fields["Notes"] = encounter.notes
        if encounter.identified:
            fields["Identified"] = encounter.identified
        # Link to turtle via Airtable record ID
        turtle = self.db.query(Turtle).filter(Turtle.id == encounter.turtle_id).first()
        if turtle and turtle.airtable_record_id:
            fields["Turtle ID"] = [turtle.airtable_record_id]
        return fields

    async def push_turtle(self, turtle_id: int) -> Optional[str]:
        if not self.enabled:
            return None

        turtle = self.db.query(Turtle).filter(Turtle.id == turtle_id).first()
        if not turtle:
            return None

        fields = self._build_turtle_payload(turtle)

        try:
            if turtle.airtable_record_id:
                url = f"{self._table_url(self.turtles_table)}/{turtle.airtable_record_id}"
                resp = requests.patch(url, json={"fields": fields}, headers=self._headers)
                resp.raise_for_status()
            else:
                url = self._table_url(self.turtles_table)
                resp = requests.post(url, json={"fields": fields}, headers=self._headers)
                resp.raise_for_status()
                turtle.airtable_record_id = resp.json()["id"]

            turtle.last_synced_at = datetime.now()
            self.db.commit()
            return turtle.airtable_record_id

        except requests.RequestException as e:
            logger.error(f"Failed to push turtle {turtle_id} to Airtable: {e}")
            return None

    async def push_encounter(self, encounter_id: int) -> Optional[str]:
        if not self.enabled:
            return None

        encounter = self.db.query(Encounter).filter(Encounter.id == encounter_id).first()
        if not encounter:
            return None

        fields = self._build_encounter_payload(encounter)

        try:
            if encounter.airtable_record_id:
                url = f"{self._table_url(self.encounters_table)}/{encounter.airtable_record_id}"
                resp = requests.patch(url, json={"fields": fields}, headers=self._headers)
                resp.raise_for_status()
            else:
                url = self._table_url(self.encounters_table)
                resp = requests.post(url, json={"fields": fields}, headers=self._headers)
                resp.raise_for_status()
                encounter.airtable_record_id = resp.json()["id"]

            encounter.last_synced_at = datetime.now()
            self.db.commit()
            return encounter.airtable_record_id

        except requests.RequestException as e:
            logger.error(f"Failed to push encounter {encounter_id} to Airtable: {e}")
            return None

    async def pull_all_turtles(self) -> dict:
        if not self.enabled:
            return {"created": 0, "updated": 0}

        created = 0
        updated = 0
        offset = None

        while True:
            params = {}
            if offset:
                params["offset"] = offset

            try:
                resp = requests.get(
                    self._table_url(self.turtles_table),
                    headers=self._headers,
                    params=params,
                )
                resp.raise_for_status()
                data = resp.json()
            except requests.RequestException as e:
                logger.error(f"Failed to pull turtles from Airtable: {e}")
                break

            for record in data.get("records", []):
                fields = record["fields"]
                record_id = record["id"]

                existing = self.db.query(Turtle).filter(
                    Turtle.airtable_record_id == record_id
                ).first()

                if existing:
                    if fields.get("Turtle ID"):
                        existing.external_id = fields["Turtle ID"]
                    if fields.get("Name"):
                        existing.name = fields["Name"]
                    if fields.get("Gender"):
                        existing.gender = fields["Gender"]
                    if fields.get("Date First Identified"):
                        from datetime import date as date_type
                        try:
                            existing.first_seen = date_type.fromisoformat(
                                fields["Date First Identified"]
                            )
                        except ValueError:
                            pass
                    existing.last_synced_at = datetime.now()
                    updated += 1
                else:
                    from datetime import date as date_type
                    first_seen = date_type.today()
                    if fields.get("Date First Identified"):
                        try:
                            first_seen = date_type.fromisoformat(fields["Date First Identified"])
                        except ValueError:
                            pass

                    turtle = Turtle(
                        external_id=fields.get("Turtle ID", f"AT-{record_id[:8]}"),
                        name=fields.get("Name"),
                        gender=fields.get("Gender"),
                        first_seen=first_seen,
                        airtable_record_id=record_id,
                        last_synced_at=datetime.now(),
                    )
                    self.db.add(turtle)
                    created += 1

            self.db.commit()

            offset = data.get("offset")
            if not offset:
                break

        return {"created": created, "updated": updated}

    async def pull_all_encounters(self) -> dict:
        if not self.enabled:
            return {"created": 0, "updated": 0}

        created = 0
        updated = 0
        offset = None

        while True:
            params = {}
            if offset:
                params["offset"] = offset

            try:
                resp = requests.get(
                    self._table_url(self.encounters_table),
                    headers=self._headers,
                    params=params,
                )
                resp.raise_for_status()
                data = resp.json()
            except requests.RequestException as e:
                logger.error(f"Failed to pull encounters from Airtable: {e}")
                break

            for record in data.get("records", []):
                fields = record["fields"]
                record_id = record["id"]

                existing = self.db.query(Encounter).filter(
                    Encounter.airtable_record_id == record_id
                ).first()

                if existing:
                    existing.last_synced_at = datetime.now()
                    updated += 1
                else:
                    # Try to link to a turtle
                    turtle_id = None
                    linked_records = fields.get("Turtle ID", [])
                    if linked_records:
                        turtle = self.db.query(Turtle).filter(
                            Turtle.airtable_record_id == linked_records[0]
                        ).first()
                        if turtle:
                            turtle_id = turtle.id

                    if turtle_id is None:
                        continue

                    enc_date = None
                    if fields.get("Date"):
                        try:
                            enc_date = datetime.strptime(fields["Date"], "%Y-%m-%d")
                        except ValueError:
                            pass

                    encounter = Encounter(
                        turtle_id=turtle_id,
                        encounter_date=enc_date,
                        health_status=fields.get("Health Status"),
                        behavior=fields.get("Behavior"),
                        notes=fields.get("Notes"),
                        identified=fields.get("Identified"),
                        airtable_record_id=record_id,
                        last_synced_at=datetime.now(),
                    )
                    self.db.add(encounter)
                    created += 1

            self.db.commit()

            offset = data.get("offset")
            if not offset:
                break

        return {"created": created, "updated": updated}

    async def full_sync(self) -> dict:
        turtles_result = await self.pull_all_turtles()
        encounters_result = await self.pull_all_encounters()
        return {
            "turtles": turtles_result,
            "encounters": encounters_result,
        }
```

- [ ] **Step 4: Update services/__init__.py**

Write `backend/app/services/__init__.py`:

```python
from app.services.sift import SiftService
from app.services.cropper import CropperService
from app.services.image import ImageService, ExifData
from app.services.airtable import AirtableSyncService

__all__ = ["SiftService", "CropperService", "ImageService", "ExifData", "AirtableSyncService"]
```

- [ ] **Step 5: Run sync tests**

```bash
cd backend && python -m pytest tests/test_sync.py -v
```

Expected: All 3 tests pass.

- [ ] **Step 6: Commit**

```bash
cd backend && git add app/services/ tests/test_sync.py && git commit -m "feat(backend): add Airtable two-way sync service"
```

---

## Task 10: Sync API Endpoint

**Files:**
- Create: `backend/app/api/sync.py`

- [ ] **Step 1: Write sync.py**

Write `backend/app/api/sync.py`:

```python
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.services.airtable import AirtableSyncService

router = APIRouter()


@router.post("/sync/airtable")
async def trigger_airtable_sync(db: Session = Depends(get_db)):
    service = AirtableSyncService(db)
    if not service.enabled:
        return {
            "status": "skipped",
            "message": "Airtable credentials not configured",
        }

    result = await service.full_sync()
    return {
        "status": "completed",
        "result": result,
    }
```

- [ ] **Step 2: Commit**

```bash
cd backend && git add app/api/sync.py && git commit -m "feat(backend): add Airtable sync trigger endpoint"
```

---

## Task 11: Wire Up main.py + API Router

**Files:**
- Modify: `backend/app/main.py` (replace temporary version)
- Create: `backend/app/api/__init__.py`

- [ ] **Step 1: Write the API router**

Write `backend/app/api/__init__.py`:

```python
from fastapi import APIRouter

from app.api import admin, compare, jobs, settings, submissions, sync, turtles

api_router = APIRouter(prefix="/api")

api_router.include_router(admin.router, tags=["admin"])
api_router.include_router(compare.router, tags=["compare"])
api_router.include_router(turtles.router, tags=["turtles"])
api_router.include_router(jobs.router, tags=["jobs"])
api_router.include_router(settings.router, tags=["settings"])
api_router.include_router(submissions.router, tags=["submissions"])
api_router.include_router(sync.router, tags=["sync"])
```

- [ ] **Step 2: Write the final main.py**

Write `backend/app/main.py`:

```python
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from app.api import api_router
from app.config import settings
from app.database import create_tables

FRONTEND_DIR = Path(__file__).parent.parent.parent / "frontend" / "dist"


@asynccontextmanager
async def lifespan(app: FastAPI):
    create_tables()
    settings.data_dir.mkdir(parents=True, exist_ok=True)
    settings.images_dir.mkdir(parents=True, exist_ok=True)
    settings.thumbnails_dir.mkdir(parents=True, exist_ok=True)
    settings.submissions_dir.mkdir(parents=True, exist_ok=True)
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
```

- [ ] **Step 3: Run all tests to verify nothing broke**

```bash
cd backend && python -m pytest tests/ -v
```

Expected: All tests pass.

- [ ] **Step 4: Verify the server starts**

```bash
cd backend && timeout 5 python -m uvicorn app.main:app --port 8000 2>&1 || true
```

Expected: Server starts, shows "Uvicorn running on http://127.0.0.1:8000", then times out.

- [ ] **Step 5: Commit**

```bash
cd backend && git add app/api/__init__.py app/main.py && git commit -m "feat(backend): wire up all API routes and finalize main.py"
```

---

## Task 12: Copy YOLO Weights + Data Directories

**Files:**
- Create: `backend/yolo/.gitkeep`
- Create: `backend/data/.gitkeep`
- Create: `backend/.gitignore`

- [ ] **Step 1: Create placeholder directories**

```bash
mkdir -p backend/yolo backend/data
touch backend/yolo/.gitkeep backend/data/.gitkeep
```

- [ ] **Step 2: Copy YOLO config if available**

```bash
if [ -f /Users/claudius/github/turtlesift/yolo/yolov3_testing.cfg ]; then
    cp /Users/claudius/github/turtlesift/yolo/yolov3_testing.cfg backend/yolo/
fi
if [ -f /Users/claudius/github/turtlesift/yolo/yolov3_training_1000.weights ]; then
    cp /Users/claudius/github/turtlesift/yolo/yolov3_training_1000.weights backend/yolo/
fi
```

Note: YOLO weights are large (~250MB). Consider adding to `.gitignore` and downloading during build instead.

- [ ] **Step 3: Add .gitignore**

Write `backend/.gitignore`:

```
data/
!data/.gitkeep
*.db
test.db
__pycache__/
.env
```

- [ ] **Step 4: Commit**

```bash
cd backend && git add yolo/.gitkeep data/.gitkeep .gitignore && git commit -m "feat(backend): add YOLO and data directory placeholders"
```

---

## Task 13: Backend Smoke Test — Full API Walkthrough

**Files:**
- Create: `backend/tests/test_health.py`

- [ ] **Step 1: Write smoke test**

Write `backend/tests/test_health.py`:

```python
def test_health_endpoint(client):
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json() == {"status": "healthy"}


def test_root_returns_api_info(client):
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "BoxTurtle ID API"


def test_openapi_docs_available(client):
    response = client.get("/docs")
    assert response.status_code == 200
```

- [ ] **Step 2: Run full test suite**

```bash
cd backend && python -m pytest tests/ -v --tb=short
```

Expected: All tests pass (health + submissions + sync).

- [ ] **Step 3: Commit**

```bash
cd backend && git add tests/test_health.py && git commit -m "test(backend): add health and smoke tests"
```

---

## Self-Review Checklist

**Spec coverage:**
- [x] `POST /api/submissions/identify` — Task 7
- [x] `POST /api/submissions/{id}/confirm` — Task 7 (in submissions.py)
- [x] `POST /api/submissions/{id}/new-turtle` — Task 7 (in submissions.py)
- [x] Confidence mapping (high/medium/low) — Task 7 (`_score_to_confidence`)
- [x] Existing turtlesift endpoints (compare, search, CRUD, settings) — Task 6
- [x] Airtable two-way sync — Task 9
- [x] `POST /api/sync/airtable` — Task 10
- [x] Site field on Turtle — Task 4
- [x] Submission temporary storage — Task 4 (Submission model) + Task 7
- [x] Move images on confirmation — Task 7 (`_create_captures_from_submission`)
- [x] SIFT feature caching on new captures — Task 7
- [x] Health endpoint — Task 11
- [x] Frontend static serving — Task 11
- [x] PostgreSQL support — Task 3 (config.py DATABASE_URL)
- [x] YOLO model bundling — Task 12

**Placeholder scan:** No TBD/TODO/placeholder text found.

**Type consistency:** `SubmissionCandidate`, `IdentifyResponse`, `ConfirmRequest`, `ConfirmResponse`, `NewTurtleRequest`, `NewTurtleResponse`, `EncounterFormData` — all consistent between schemas and endpoint usage.
