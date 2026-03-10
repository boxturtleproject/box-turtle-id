// src/pages/MatchEncounterPage.tsx
import { useState } from 'react';
import type { Site } from '../App';
import { SiteBand } from '../components/SiteBand';
import { Footer } from '../components/Footer';
import { EncounterForm, defaultEncounterFormData } from '../components/EncounterForm';
import type { EncounterFormData } from '../components/EncounterForm';

interface MatchEncounterPageProps {
  turtleNickname: string;
  onBack: () => void;
  onSubmitted: () => void;
  onAbout: () => void;
  siteName?: string;
  site: Site;
  onWelcome: () => void;
}

export function MatchEncounterPage({
  turtleNickname,
  onBack,
  onSubmitted,
  onAbout,
  siteName: _siteName = '',
  site,
  onWelcome,
}: MatchEncounterPageProps) {
  const [encounterData, setEncounterData] = useState<EncounterFormData>(defaultEncounterFormData());
  const [submitHovered, setSubmitHovered] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);

  function handleSubmit() {
    console.log('Encounter submitted:', turtleNickname, encounterData);
    onSubmitted();
  }

  return (
    <div
      className="flex flex-col w-full px-8 pb-10 pt-20 gap-8"
      style={{ backgroundColor: 'var(--color-bg)', minHeight: '100dvh' }}
    >
      <SiteBand site={site} onWelcome={() => setShowLeaveConfirm(true)} />

      {/* Header */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            style={{ color: 'var(--color-text-secondary)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, flexShrink: 0 }}
            aria-label="Go back"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M13 4L7 10l6 6" stroke="var(--color-text-secondary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <p
            style={{
              fontFamily: 'var(--font-body)',
              color: 'var(--color-text-secondary)',
              fontSize: '0.7rem',
              letterSpacing: '0.25em',
              textTransform: 'uppercase',
            }}
          >
            {turtleNickname}
          </p>
        </div>
        <h1
          style={{
            fontFamily: 'var(--font-heading)',
            color: 'var(--color-text-primary)',
            fontSize: '2.5rem',
            fontWeight: 700,
            letterSpacing: '0.05em',
            lineHeight: 1.1,
          }}
        >
          Record Observation
        </h1>
      </div>

      {/* Encounter form */}
      <EncounterForm value={encounterData} onChange={setEncounterData} />

      {/* Submit button */}
      <button
        type="button"
        className="w-full py-4 text-sm uppercase transition-all duration-300"
        style={{
          fontFamily: 'var(--font-body)',
          letterSpacing: '0.2em',
          color: 'var(--color-btn-primary-text)',
          backgroundColor: submitHovered ? 'var(--color-btn-primary-bg-hover)' : 'var(--color-btn-primary-bg)',
          border: 'none',
          cursor: 'pointer',
        }}
        onMouseEnter={() => setSubmitHovered(true)}
        onMouseLeave={() => setSubmitHovered(false)}
        onClick={handleSubmit}
      >
        Submit Observation
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
