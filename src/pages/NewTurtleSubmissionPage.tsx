// src/pages/NewTurtleSubmissionPage.tsx
import { useState, useEffect } from 'react';
import type { SubmittedPhotos } from './InstructionPage';

const BEHAVIORS = [
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

const HEALTH_OPTIONS = [
  'Healthy',
  'Sick',
  'Injured',
  'Deceased',
] as const;

interface NewTurtleSubmissionPageProps {
  photos: SubmittedPhotos | null;
  onBack: () => void;
  onSubmitted: () => void;
  siteName: string;
}

function PhotoThumbnail({ file, label }: { file: File | null; label: string }) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!file) return;
    const objectUrl = URL.createObjectURL(file);
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);

  if (!url) return null;
  return (
    <div className="flex flex-col gap-1">
      <img
        src={url}
        alt={label}
        style={{
          width: '100%',
          aspectRatio: '4/3',
          objectFit: 'cover',
          border: '1px solid var(--color-border)',
        }}
      />
      <span
        style={{
          fontFamily: 'var(--font-body)',
          color: 'var(--color-text-muted)',
          fontSize: '0.6rem',
          letterSpacing: '0.15em',
          textTransform: 'uppercase',
        }}
      >
        {label}
      </span>
    </div>
  );
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
  textTransform: 'uppercase',
};

function FieldGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <span style={labelStyle}>{label}</span>
      {children}
    </div>
  );
}

export function NewTurtleSubmissionPage({ photos, onBack, onSubmitted, siteName }: NewTurtleSubmissionPageProps) {
  const today = new Date().toISOString().split('T')[0];
  const [date, setDate] = useState(today);
  const [location, setLocation] = useState('');
  const [behaviors, setBehaviors] = useState<string[]>([]);
  const [health, setHealth] = useState('');
  const [notes, setNotes] = useState('');
  const [nickname, setNickname] = useState('');
  const [notifyMe, setNotifyMe] = useState(false);
  const [email, setEmail] = useState('');
  const [submitHovered, setSubmitHovered] = useState(false);

  function toggleBehavior(b: string) {
    setBehaviors(prev =>
      prev.includes(b) ? prev.filter(x => x !== b) : [...prev, b]
    );
  }

  function handleSubmit() {
    const payload = {
      date,
      location,
      behaviors,
      health,
      notes,
      nickname,
      notifyMe,
      email: notifyMe ? email : null,
      photos: {
        top: photos?.top ?? null,
        left: photos?.left ?? null,
        right: photos?.right ?? null,
      },
    };
    console.log('New turtle submission:', payload);
    onSubmitted();
  }

  return (
    <div
      className="flex flex-col w-full px-8 py-10 gap-8"
      style={{ backgroundColor: 'var(--color-bg)', minHeight: '100dvh' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={onBack}
            style={{ color: 'var(--color-text-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
            aria-label="Go back"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M13 4L7 10l6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <h1
            style={{
              fontFamily: 'var(--font-heading)',
              color: 'var(--color-text-primary)',
              fontSize: '1.25rem',
              fontWeight: 700,
              letterSpacing: '0.03em',
              margin: 0,
            }}
          >
            Submit New Turtle
          </h1>
        </div>
        <span
          style={{
            fontFamily: 'var(--font-body)',
            color: 'var(--color-text-muted)',
            fontSize: '0.65rem',
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
          }}
        >
          {siteName}
        </span>
      </div>

      {/* Photos */}
      {photos && (
        <div className="flex flex-col gap-3">
          <span style={labelStyle}>Submitted Photos</span>
          <div className="grid grid-cols-3 gap-2">
            <PhotoThumbnail file={photos.top} label="Top" />
            <PhotoThumbnail file={photos.left} label="Left" />
            <PhotoThumbnail file={photos.right} label="Right" />
          </div>
        </div>
      )}

      {/* Form */}
      <div className="flex flex-col gap-6">

        <FieldGroup label="Date">
          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            style={inputStyle}
          />
        </FieldGroup>

        <FieldGroup label="Location">
          <input
            type="text"
            value={location}
            onChange={e => setLocation(e.target.value)}
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
                  checked={behaviors.includes(b)}
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
            value={health}
            onChange={e => setHealth(e.target.value)}
            style={inputStyle}
          >
            <option value="">Select...</option>
            {HEALTH_OPTIONS.map(h => (
              <option key={h} value={h}>{h}</option>
            ))}
          </select>
        </FieldGroup>

        <FieldGroup label="General Notes">
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={4}
            placeholder="Any additional observations..."
            style={{ ...inputStyle, resize: 'vertical' }}
          />
        </FieldGroup>

        <FieldGroup label="Suggested Nickname">
          <input
            type="text"
            value={nickname}
            onChange={e => setNickname(e.target.value)}
            placeholder="Optional"
            style={inputStyle}
          />
        </FieldGroup>

        {/* Notify me */}
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
              checked={notifyMe}
              onChange={e => setNotifyMe(e.target.checked)}
              style={{ accentColor: 'var(--color-btn-primary-bg)' }}
            />
            Notify me about this turtle
          </label>
          {notifyMe && (
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="your@email.com"
              style={inputStyle}
            />
          )}
          {notifyMe && (
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

      {/* Submit */}
      <button
        type="button"
        onClick={handleSubmit}
        onMouseEnter={() => setSubmitHovered(true)}
        onMouseLeave={() => setSubmitHovered(false)}
        className="w-full py-4 text-xs uppercase transition-all duration-300 mb-8"
        style={{
          fontFamily: 'var(--font-body)',
          letterSpacing: '0.25em',
          backgroundColor: submitHovered ? 'var(--color-btn-primary-bg-hover)' : 'var(--color-btn-primary-bg)',
          color: 'var(--color-btn-primary-text)',
          border: 'none',
          cursor: 'pointer',
        }}
      >
        Submit for Review
      </button>
    </div>
  );
}
