import type {
  CompareResponse,
  ConfirmResponse,
  EncounterFormData,
  EncounterResponse,
  EncounterDetailResponse,
  IdentifyResponse,
  NewTurtleResponse,
  SearchResponse,
  SiftSettingsResponse,
  SyncResponse,
  TurtleResponse,
} from '../types';

const API_BASE = import.meta.env.VITE_API_URL ?? '';

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, init);
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`API ${res.status}: ${body}`);
  }
  return res.json();
}

// ── Public submission endpoints ──

export async function submitPhotos(
  site: string,
  files: { top?: File | null; left?: File | null; right?: File | null },
): Promise<IdentifyResponse> {
  const form = new FormData();
  form.append('site', site);
  if (files.top) form.append('top', files.top);
  if (files.left) form.append('left', files.left);
  if (files.right) form.append('right', files.right);
  return apiFetch<IdentifyResponse>('/api/submissions/identify', {
    method: 'POST',
    body: form,
  });
}

export async function confirmMatch(
  submissionId: string,
  turtleId: number,
  encounterData: EncounterFormData,
): Promise<ConfirmResponse> {
  return apiFetch<ConfirmResponse>(`/api/submissions/${submissionId}/confirm`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      turtle_id: turtleId,
      encounter_data: {
        date: encounterData.date,
        location: encounterData.location,
        latitude: encounterData.latitude,
        longitude: encounterData.longitude,
        setting: encounterData.setting,
        conditions: encounterData.conditions,
        behaviors: encounterData.behaviors,
        health: encounterData.health,
        observation_notes: encounterData.observationNotes,
        nickname: encounterData.nickname,
        notify_me: encounterData.notifyMe,
        email: encounterData.email,
      },
    }),
  });
}

export async function submitNewTurtle(
  submissionId: string,
  nickname: string,
  encounterData: EncounterFormData,
  site: string,
  externalId?: string | null,
): Promise<NewTurtleResponse> {
  return apiFetch<NewTurtleResponse>(`/api/submissions/${submissionId}/new-turtle`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      nickname,
      site,
      external_id: externalId ?? null,
      encounter_data: {
        date: encounterData.date,
        location: encounterData.location,
        latitude: encounterData.latitude,
        longitude: encounterData.longitude,
        setting: encounterData.setting,
        conditions: encounterData.conditions,
        behaviors: encounterData.behaviors,
        health: encounterData.health,
        observation_notes: encounterData.observationNotes,
        nickname: encounterData.nickname,
        notify_me: encounterData.notifyMe,
        email: encounterData.email,
      },
    }),
  });
}

// ── Read endpoints ──

export async function fetchTurtle(turtleId: number): Promise<TurtleResponse> {
  return apiFetch<TurtleResponse>(`/api/turtles/${turtleId}`);
}

export async function fetchTurtles(): Promise<TurtleResponse[]> {
  return apiFetch<TurtleResponse[]>('/api/turtles');
}

export async function fetchEncounters(turtleId: number): Promise<EncounterResponse[]> {
  return apiFetch<EncounterResponse[]>(`/api/turtles/${turtleId}/encounters`);
}

export async function fetchEncounterDetail(encounterId: number): Promise<EncounterDetailResponse> {
  return apiFetch<EncounterDetailResponse>(`/api/encounters/${encounterId}`);
}

export interface EncounterListItem extends EncounterResponse {
  turtle_external_id: string;
  turtle_name: string | null;
  site: string | null;
  latitude: number | null;
  longitude: number | null;
}

export interface PagedEncounters {
  items: EncounterListItem[];
  total: number;
  skip: number;
  limit: number;
}

export async function fetchAllEncounters(opts: {
  turtleId?: number;
  skip?: number;
  limit?: number;
} = {}): Promise<PagedEncounters> {
  const params = new URLSearchParams();
  if (opts.turtleId !== undefined) params.set('turtle_id', String(opts.turtleId));
  if (opts.skip !== undefined) params.set('skip', String(opts.skip));
  if (opts.limit !== undefined) params.set('limit', String(opts.limit));
  const qs = params.toString();
  return apiFetch<PagedEncounters>(`/api/encounters${qs ? `?${qs}` : ''}`);
}

export async function suggestNextTurtleId(): Promise<{ external_id: string }> {
  return apiFetch<{ external_id: string }>('/api/turtles/next-id');
}

export async function checkTurtleId(
  externalId: string,
  excludeTurtleId?: number,
): Promise<{ external_id: string; available: boolean; claimed_by_turtle_id: number | null }> {
  const params = new URLSearchParams({ external_id: externalId });
  if (excludeTurtleId !== undefined) params.set('exclude_turtle_id', String(excludeTurtleId));
  return apiFetch(`/api/turtles/check-id?${params}`);
}

export type TurtleUpdate = {
  external_id?: string;
  name?: string;
  nickname?: string;
  notes?: string;
  site?: string;
  species?: string;
  gender?: string;
  pattern?: string;
  carapace_flare?: string;
  health_status?: string;
  residence_status?: string;
  identifying_marks?: string;
  eye_color?: string;
  plastron_depression?: string;
  plots_text?: string;
  first_seen?: string;
};

export async function updateTurtle(turtleId: number, data: TurtleUpdate): Promise<TurtleResponse> {
  return apiFetch<TurtleResponse>(`/api/turtles/${turtleId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
}

export interface CaptureLocation {
  id: number;
  turtle_id: number;
  encounter_id: number | null;
  image_type: string;
  captured_date: string | null;
  latitude: number;
  longitude: number;
  thumbnail_url: string | null;
  turtle_external_id: string;
  turtle_name: string | null;
  site: string | null;
}

export async function fetchCaptureLocations(turtleId?: number): Promise<CaptureLocation[]> {
  const qs = turtleId !== undefined ? `?turtle_id=${turtleId}` : '';
  return apiFetch<CaptureLocation[]>(`/api/captures/locations${qs}`);
}

// ── Admin endpoints ──

export async function compareTwoImages(
  image1: File,
  image2: File,
): Promise<CompareResponse> {
  const form = new FormData();
  form.append('image1', image1);
  form.append('image2', image2);
  return apiFetch<CompareResponse>('/api/compare', {
    method: 'POST',
    body: form,
  });
}

export async function searchByImage(image: File): Promise<SearchResponse> {
  const form = new FormData();
  form.append('image', image);
  return apiFetch<SearchResponse>('/api/search', {
    method: 'POST',
    body: form,
  });
}

export async function fetchSettings(): Promise<SiftSettingsResponse> {
  return apiFetch<SiftSettingsResponse>('/api/settings');
}

export async function updateSettings(
  settings: Partial<SiftSettingsResponse>,
): Promise<SiftSettingsResponse> {
  return apiFetch<SiftSettingsResponse>('/api/settings', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(settings),
  });
}

export async function triggerSync(): Promise<SyncResponse> {
  return apiFetch<SyncResponse>('/api/sync/airtable', { method: 'POST' });
}

// ── Helpers ──

/** Build a full URL for an image path from the API */
export function imageUrl(path: string | null | undefined): string {
  if (!path) return '';
  if (path.startsWith('http')) return path;
  // Backend serves data/ directory at /api/static/
  if (path.startsWith('/api/')) return `${API_BASE}${path}`;
  // Strip a leading "data/" — the static mount already maps to data_dir
  const key = path.replace(/^data\//, '');
  return `${API_BASE}/api/static/${key}`;
}
