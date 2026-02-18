// src/services/airtable.ts

const TOKEN = import.meta.env.VITE_AIRTABLE_TOKEN;
const BASE_ID = import.meta.env.VITE_AIRTABLE_BASE_ID;
const TURTLES_TABLE = import.meta.env.VITE_AIRTABLE_TURTLES_TABLE;
const ENCOUNTERS_TABLE = import.meta.env.VITE_AIRTABLE_ENCOUNTERS_TABLE;

const BASE_URL = `https://api.airtable.com/v0/${BASE_ID}`;

const headers = {
  Authorization: `Bearer ${TOKEN}`,
  'Content-Type': 'application/json',
};

export interface AirtableAttachment {
  id: string;
  url: string;
  filename: string;
  width?: number;
  height?: number;
}

export interface TurtleRecord {
  airtableId: string;
  nickname: string;
  gender: string;
  dateFirstIdentified: string;
  carapaceTop: AirtableAttachment[];
  carapaceLeft: AirtableAttachment[];
  carapaceRight: AirtableAttachment[];
  notes: string;
}

export interface EncounterRecord {
  airtableId: string;
  date: string;
  turtleIds: string[];
}

function parseTurtle(record: any): TurtleRecord {
  const f = record.fields;
  return {
    airtableId: record.id,
    nickname: f['Nickname'] ?? '',
    gender: f['Gender'] ?? '',
    dateFirstIdentified: f['Date First Identified'] ?? '',
    carapaceTop: f['Carapace Top'] ?? [],
    carapaceLeft: f['Carapace Left'] ?? [],
    carapaceRight: f['Carapace Right'] ?? [],
    notes: f['Notes'] ?? '',
  };
}

function parseEncounter(record: any): EncounterRecord {
  const f = record.fields;
  return {
    airtableId: record.id,
    date: f['Date'] ?? '',
    turtleIds: f['Turtle ID'] ?? [],
  };
}

export async function fetchTurtleByNickname(nickname: string): Promise<TurtleRecord | null> {
  const formula = encodeURIComponent(`{Nickname} = "${nickname}"`);
  const url = `${BASE_URL}/${TURTLES_TABLE}?filterByFormula=${formula}&maxRecords=1`;
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`Airtable error: ${res.status}`);
  const data = await res.json();
  if (!data.records?.length) return null;
  return parseTurtle(data.records[0]);
}

export async function fetchEncountersForTurtle(turtleAirtableId: string): Promise<EncounterRecord[]> {
  const url = `${BASE_URL}/${ENCOUNTERS_TABLE}?fields[]=Date&fields[]=Turtle+ID`;
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`Airtable error: ${res.status}`);
  const data = await res.json();
  const all: EncounterRecord[] = (data.records ?? []).map(parseEncounter);
  return all.filter(e => e.turtleIds.includes(turtleAirtableId));
}
