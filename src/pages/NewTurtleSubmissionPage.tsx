// src/pages/NewTurtleSubmissionPage.tsx
import { useState, useEffect } from 'react';
import type { SubmittedPhotos } from './InstructionPage';
import type { Site } from '../App';
import { SiteBand } from '../components/SiteBand';
import { Footer } from '../components/Footer';
import {
  EncounterForm,
  defaultEncounterFormData,
  type EncounterFormData,
} from '../components/EncounterForm';

interface NewTurtleSubmissionPageProps {
  photos: SubmittedPhotos | null;
  onBack: () => void;
  onSubmitted: () => void;
  onAbout: () => void;
  siteName: string;
  site: Site;
  onWelcome: () => void;
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

const labelStyle: React.CSSProperties = {
  fontFamily: 'var(--font-body)',
  color: 'var(--color-text-secondary)',
  fontSize: '0.65rem',
  letterSpacing: '0.2em',
  textTransform: 'uppercase',
};

export function NewTurtleSubmissionPage({ photos, onBack, onSubmitted, onAbout, siteName: _siteName, site, onWelcome }: NewTurtleSubmissionPageProps) {
  const [encounterData, setEncounterData] = useState<EncounterFormData>(defaultEncounterFormData());
  const [submitHovered, setSubmitHovered] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);

  function handleSubmit() {
    const payload = {
      ...encounterData,
      email: encounterData.notifyMe ? encounterData.email : null,
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
      className="flex flex-col w-full px-8 pb-10 pt-20 gap-8"
      style={{ backgroundColor: 'var(--color-bg)', minHeight: '100dvh' }}
    >
      <SiteBand site={site} onWelcome={() => setShowLeaveConfirm(true)} />
      {/* Header */}
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

      {/* Encounter Form */}
      <EncounterForm
        includeNickname
        value={encounterData}
        onChange={setEncounterData}
      />

      {/* Submit */}
      <button
        type="button"
        onClick={handleSubmit}
        onMouseEnter={() => setSubmitHovered(true)}
        onMouseLeave={() => setSubmitHovered(false)}
        className="w-full py-4 text-xs uppercase transition-all duration-300"
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
      <Footer onAbout={onAbout} />
      {/* Leave confirmation modal */}
      {showLeaveConfirm && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: '2rem',
          }}
        >
          <div
            style={{
              backgroundColor: 'var(--color-card-bg)',
              border: '1px solid var(--color-border)',
              padding: '2rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1.5rem',
              width: '100%',
              maxWidth: '20rem',
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <h2
                style={{
                  fontFamily: 'var(--font-heading)',
                  color: 'var(--color-text-primary)',
                  fontSize: '1.25rem',
                  fontWeight: 700,
                  margin: 0,
                }}
              >
                Switch sites?
              </h2>
              <p
                style={{
                  fontFamily: 'var(--font-body)',
                  color: 'var(--color-text-muted)',
                  fontSize: '0.8rem',
                  letterSpacing: '0.03em',
                  lineHeight: 1.6,
                  margin: 0,
                }}
              >
                Your progress will be lost.
              </p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={onWelcome}
                style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: '0.75rem',
                  letterSpacing: '0.2em',
                  textTransform: 'uppercase',
                  backgroundColor: 'var(--color-btn-primary-bg)',
                  color: 'var(--color-btn-primary-text)',
                  border: 'none',
                  padding: '1rem',
                  cursor: 'pointer',
                  width: '100%',
                }}
              >
                Switch Sites
              </button>
              <button
                type="button"
                onClick={() => setShowLeaveConfirm(false)}
                style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: '0.75rem',
                  letterSpacing: '0.2em',
                  textTransform: 'uppercase',
                  backgroundColor: 'transparent',
                  color: 'var(--color-text-secondary)',
                  border: '1px solid var(--color-border)',
                  padding: '1rem',
                  cursor: 'pointer',
                  width: '100%',
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
