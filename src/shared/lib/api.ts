import type {
  CompareResponse,
  ConfirmResponse,
  EncounterFormData,
  EncounterResponse,
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
  files: { top: File; left?: File | null; right?: File | null },
): Promise<IdentifyResponse> {
  const form = new FormData();
  form.append('site', site);
  form.append('top', files.top);
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
): Promise<NewTurtleResponse> {
  return apiFetch<NewTurtleResponse>(`/api/submissions/${submissionId}/new-turtle`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      nickname,
      site,
      encounter_data: {
        date: encounterData.date,
        location: encounterData.location,
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
  return `${API_BASE}${path.startsWith('/') ? '' : '/'}${path}`;
}
