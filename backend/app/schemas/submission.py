from typing import Optional

from pydantic import BaseModel


class SubmissionCandidate(BaseModel):
    turtle_id: int
    turtle_nickname: Optional[str]
    score: float
    confidence: str
    visualization_url: Optional[str]
    thumbnail_url: Optional[str]
    # Fused matcher only (settings.matcher == "fused"); score is then the spot score.
    spot_score: Optional[float] = None
    fused_score: Optional[float] = None
    band: Optional[str] = None  # "match" | "check" | "possibly_new"


class IdentifyResponse(BaseModel):
    candidates: list[SubmissionCandidate]
    total_compared: int
    processing_time_ms: int
    submission_id: str
    matcher: str = "sift"
    band: Optional[str] = None  # band of the top candidate (fused matcher)


class EncounterFormData(BaseModel):
    date: str
    location: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
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
    # User-chosen turtle id like "T119". Optional — when omitted the server
    # auto-suggests the next sequential T-number. When provided it must be
    # non-empty and not already in use.
    external_id: Optional[str] = None


class NewTurtleResponse(BaseModel):
    success: bool
    turtle_id: int
