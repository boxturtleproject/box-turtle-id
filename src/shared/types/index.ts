export type Site = 'patuxent' | 'wallkill';

export type Confidence = 'high' | 'medium' | 'low';

export interface SubmissionCandidate {
  turtle_id: number;
  turtle_nickname: string | null;
  score: number;
  confidence: Confidence;
  visualization_url: string | null;
  thumbnail_url: string | null;
}

export interface IdentifyResponse {
  candidates: SubmissionCandidate[];
  total_compared: number;
  processing_time_ms: number;
  submission_id: string;
}

export interface ConfirmResponse {
  success: boolean;
  encounter_id: number;
}

export interface NewTurtleResponse {
  success: boolean;
  turtle_id: number;
}

export interface EncounterFormData {
  date: string;
  location: string;
  latitude: number | null;
  longitude: number | null;
  setting: string[];
  conditions: string[];
  behaviors: string[];
  health: string;
  observationNotes: string;
  nickname: string;
  notifyMe: boolean;
  email: string;
}

export interface SubmittedPhotos {
  top: File;
  left: File | null;
  right: File | null;
  other: File[];
}

export interface TurtleResponse {
  id: number;
  external_id: string;
  name: string | null;
  nickname: string | null;
  site: string | null;
  first_seen: string;
  notes: string | null;
  cover_capture_id: number | null;
  // Extended fields from Airtable
  species: string | null;
  gender: string | null;
  pattern: string | null;
  carapace_flare: string | null;
  health_status: string | null;
  residence_status: string | null;
  identifying_marks: string | null;
  eye_color: string | null;
  plastron_depression: string | null;
  plots_text: string | null;
  // Aggregates / metadata
  capture_count: number;
  encounter_count: number;
  latest_capture: string | null;
  last_synced_at: string | null;
  captures: CaptureResponse[];
}

export interface CaptureResponse {
  id: number;
  turtle_id: number | null;
  image_type: string;
  image_path: string;
  thumbnail_path: string | null;
  display_path: string | null;
  thumbnail_url: string | null;
  display_url: string | null;
  original_filename: string;
  captured_date: string | null;
  keypoint_count: number;
}

export interface EncounterResponse {
  id: number;
  turtle_id: number;
  external_id: string | null;
  encounter_date: string | null;
  plot_name: string | null;
  survey_id: string | null;
  identified: string | null;
  health_status: string | null;
  behavior: string | null;
  setting: string | null;
  conditions: string | null;
  notes: string | null;
  observer_nickname: string | null;
  capture_count: number;
}

export interface CompareResponse {
  score: number;
  is_match: boolean;
  visualization_path: string | null;
  match_count: number;
  keypoints_1: number;
  keypoints_2: number;
}

export interface SearchResult {
  turtle_id: number;
  capture_id: number;
  score: number;
  is_match: boolean;
  thumbnail_path: string | null;
}

export interface SearchResponse {
  results: SearchResult[];
  total_compared: number;
}

export interface SiftSettingsResponse {
  distance_coefficient: number;
  acceptance_threshold: number;
  resized_width: number;
}

export interface SyncResponse {
  status: string;
  result?: {
    turtles: { created: number; updated: number };
    encounters: { created: number; updated: number };
  };
  message?: string;
}
