// src/components/EncounterForm.tsx
import { useState, type CSSProperties, type ReactNode } from 'react';
import { LocationPickerModal } from './LocationPickerModal';

export const BEHAVIORS = [
  'Digging',
  'Nesting',
  'Mating',
  'Locomoting',
  'Stationary',
  'Basking',
  'Hiding',
  'Bathing',
] as const;

export const CONDITIONS = [
  'Sunny',
  'Damp',
  'Rainy',
  'Cloudy',
  'Foggy',
  'Dry',
  'Humid',
  'Hot',
] as const;

export const SETTING_OPTIONS = [
  'Road',
  'Field',
  'Woods',
  'Wetland',
] as const;

export const HEALTH_OPTIONS = [
  'Healthy',
  'Sick',
  'Injured',
  'Deceased',
] as const;

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

export function defaultEncounterFormData(): EncounterFormData {
  return {
    date: new Date().toISOString().split('T')[0],
    location: '',
    latitude: null,
    longitude: null,
    setting: [],
    conditions: [],
    behaviors: [],
    health: '',
    observationNotes: '',
    nickname: '',
    notifyMe: false,
    email: '',
  };
}

interface EncounterFormProps {
  includeNickname?: boolean;
  value: EncounterFormData;
  onChange: (data: EncounterFormData) => void;
}

const inputStyle: CSSProperties = {
  width: '100%',
  padding: '0.625rem 0.75rem',
  fontFamily: 'var(--font-body)',
  fontSize: '0.875rem',
  color: 'var(--color-text-primary)',
  backgroundColor: 'var(--color-bg)',
  border: '1px solid var(--color-border-input)',
  outline: 'none',
  boxSizing: 'border-box',
};

const labelStyle: CSSProperties = {
  fontFamily: 'var(--font-body)',
  color: 'var(--color-text-secondary)',
  fontSize: '0.65rem',
  letterSpacing: '0.2em',
  textTransform: 'uppercase' as const,
};

function FieldGroup({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <span style={labelStyle}>{label}</span>
      {children}
    </div>
  );
}

export function EncounterForm({ includeNickname = false, value, onChange }: EncounterFormProps) {
  const [mapOpen, setMapOpen] = useState(false);

  function set<K extends keyof EncounterFormData>(key: K, val: EncounterFormData[K]) {
    onChange({ ...value, [key]: val });
  }

  function setCoords(lat: number | null, lng: number | null) {
    onChange({ ...value, latitude: lat, longitude: lng });
  }

  const hasCoords = value.latitude !== null && value.longitude !== null;

  function toggleItem(key: 'behaviors' | 'conditions' | 'setting', item: string) {
    const current = value[key];
    const next = current.includes(item)
      ? current.filter(x => x !== item)
      : [...current, item];
    set(key, next);
  }

  return (
    <div className="flex flex-col gap-6">
      <FieldGroup label="Date">
        <input
          type="date"
          value={value.date}
          onChange={e => set('date', e.target.value)}
          style={inputStyle}
        />
      </FieldGroup>

      <FieldGroup label="Location">
        <input
          type="text"
          value={value.location}
          onChange={e => set('location', e.target.value)}
          placeholder="e.g. North meadow trail"
          style={inputStyle}
        />
      </FieldGroup>

      <FieldGroup label="GPS Coordinates (optional)">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setMapOpen(true)}
            style={{
              flex: 1,
              padding: '0.75rem 1rem',
              fontFamily: 'var(--font-body)',
              fontSize: '0.9rem',
              fontWeight: 600,
              letterSpacing: '0.05em',
              color: '#fff',
              backgroundColor: 'var(--color-btn-primary-bg)',
              border: 'none',
              textAlign: 'left',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.625rem',
              boxShadow: '0 2px 6px rgba(0,0,0,0.12)',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
              <path d="M12 22s7-7.5 7-13a7 7 0 1 0-14 0c0 5.5 7 13 7 13Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
              <circle cx="12" cy="9" r="2.5" stroke="currentColor" strokeWidth="1.5" />
            </svg>
            {hasCoords
              ? `${value.latitude!.toFixed(5)}, ${value.longitude!.toFixed(5)}`
              : 'Pin on Map'}
          </button>
          {hasCoords && (
            <button
              type="button"
              onClick={() => setCoords(null, null)}
              aria-label="Clear GPS coordinates"
              style={{
                padding: '0.625rem 0.75rem',
                fontFamily: 'var(--font-body)',
                fontSize: '0.75rem',
                letterSpacing: '0.15em',
                textTransform: 'uppercase',
                color: 'var(--color-text-muted)',
                background: 'transparent',
                border: '1px solid var(--color-border-input)',
                cursor: 'pointer',
              }}
            >
              Clear
            </button>
          )}
        </div>
      </FieldGroup>

      <FieldGroup label="Setting">
        <div className="flex flex-col gap-2">
          {SETTING_OPTIONS.map(s => (
            <label
              key={s}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontFamily: 'var(--font-body)',
                color: 'var(--color-text-primary)',
                fontSize: '0.875rem',
                cursor: 'pointer',
              }}
            >
              <input
                type="checkbox"
                checked={value.setting.includes(s)}
                onChange={() => toggleItem('setting', s)}
                style={{ accentColor: 'var(--color-btn-primary-bg)' }}
              />
              {s}
            </label>
          ))}
        </div>
      </FieldGroup>

      <FieldGroup label="Conditions">
        <div className="flex flex-col gap-2">
          {CONDITIONS.map(c => (
            <label
              key={c}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontFamily: 'var(--font-body)',
                color: 'var(--color-text-primary)',
                fontSize: '0.875rem',
                cursor: 'pointer',
              }}
            >
              <input
                type="checkbox"
                checked={value.conditions.includes(c)}
                onChange={() => toggleItem('conditions', c)}
                style={{ accentColor: 'var(--color-btn-primary-bg)' }}
              />
              {c}
            </label>
          ))}
        </div>
      </FieldGroup>

      <FieldGroup label="Observed Behavior">
        <div className="flex flex-col gap-2">
          {BEHAVIORS.map(b => (
            <label
              key={b}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontFamily: 'var(--font-body)',
                color: 'var(--color-text-primary)',
                fontSize: '0.875rem',
                cursor: 'pointer',
              }}
            >
              <input
                type="checkbox"
                checked={value.behaviors.includes(b)}
                onChange={() => toggleItem('behaviors', b)}
                style={{ accentColor: 'var(--color-btn-primary-bg)' }}
              />
              {b}
            </label>
          ))}
        </div>
      </FieldGroup>

      <FieldGroup label="Health">
        <select
          value={value.health}
          onChange={e => set('health', e.target.value)}
          style={inputStyle}
        >
          <option value="">Select...</option>
          {HEALTH_OPTIONS.map(h => (
            <option key={h} value={h}>{h}</option>
          ))}
        </select>
      </FieldGroup>

      <FieldGroup label="Observation Notes">
        <textarea
          value={value.observationNotes}
          onChange={e => set('observationNotes', e.target.value)}
          rows={4}
          placeholder="Any additional observations..."
          style={{ ...inputStyle, resize: 'vertical' }}
        />
      </FieldGroup>

      {includeNickname && (
        <FieldGroup label="Suggested Nickname">
          <input
            type="text"
            value={value.nickname}
            onChange={e => set('nickname', e.target.value)}
            placeholder="Optional"
            style={inputStyle}
          />
        </FieldGroup>
      )}

      {mapOpen && (
        <LocationPickerModal
          initial={hasCoords ? { lat: value.latitude!, lng: value.longitude! } : null}
          onCancel={() => setMapOpen(false)}
          onSave={(lat, lng) => {
            setCoords(lat, lng);
            setMapOpen(false);
          }}
        />
      )}

      <div className="flex flex-col gap-3">
        <label
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            fontFamily: 'var(--font-body)',
            color: 'var(--color-text-primary)',
            fontSize: '0.875rem',
            cursor: 'pointer',
          }}
        >
          <input
            type="checkbox"
            checked={value.notifyMe}
            onChange={e => set('notifyMe', e.target.checked)}
            style={{ accentColor: 'var(--color-btn-primary-bg)' }}
          />
          Notify me about this turtle
        </label>
        {value.notifyMe && (
          <input
            type="email"
            value={value.email}
            onChange={e => set('email', e.target.value)}
            placeholder="your@email.com"
            style={inputStyle}
          />
        )}
        {value.notifyMe && (
          <span
            style={{
              fontFamily: 'var(--font-body)',
              color: 'var(--color-text-muted)',
              fontSize: '0.75rem',
              lineHeight: 1.5,
            }}
          >
            We'll email you if this turtle is identified or added to the database.
          </span>
        )}
      </div>
    </div>
  );
}
