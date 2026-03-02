// src/components/EncounterForm.tsx
import React from 'react';

export const BEHAVIORS = [
  'Nesting',
  'Mating',
  'Scouting',
  'Active',
  'Basking',
  'Basking in Rain',
  'Locomoting',
  'Hidden',
  'Stationary',
  'Emerging',
  'Bathing',
  'Digging',
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

const inputStyle: React.CSSProperties = {
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

const labelStyle: React.CSSProperties = {
  fontFamily: 'var(--font-body)',
  color: 'var(--color-text-secondary)',
  fontSize: '0.65rem',
  letterSpacing: '0.2em',
  textTransform: 'uppercase' as const,
};

function FieldGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <span style={labelStyle}>{label}</span>
      {children}
    </div>
  );
}

export function EncounterForm({ includeNickname = false, value, onChange }: EncounterFormProps) {
  function set<K extends keyof EncounterFormData>(key: K, val: EncounterFormData[K]) {
    onChange({ ...value, [key]: val });
  }

  function toggleBehavior(b: string) {
    const next = value.behaviors.includes(b)
      ? value.behaviors.filter(x => x !== b)
      : [...value.behaviors, b];
    set('behaviors', next);
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
                onChange={() => toggleBehavior(b)}
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
