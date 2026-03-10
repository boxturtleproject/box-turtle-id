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
}

export function MatchEncounterPage({
  turtleNickname,
  onBack,
  onSubmitted,
  onAbout,
  siteName: _siteName = '',
  site,
}: MatchEncounterPageProps) {
  const [encounterData, setEncounterData] = useState<EncounterFormData>(defaultEncounterFormData());
  const [submitHovered, setSubmitHovered] = useState(false);

  function handleSubmit() {
    console.log('Encounter submitted:', turtleNickname, encounterData);
    onSubmitted();
  }

  return (
    <div
      className="flex flex-col w-full px-8 pb-10 pt-20 gap-8"
      style={{ backgroundColor: 'var(--color-bg)', minHeight: '100dvh' }}
    >
      <SiteBand site={site} />

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
    </div>
  );
}
