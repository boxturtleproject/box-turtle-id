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


class NewTurtleResponse(BaseModel):
    success: bool
    turtle_id: int
