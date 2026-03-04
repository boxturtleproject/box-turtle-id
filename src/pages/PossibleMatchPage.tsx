// src/pages/PossibleMatchPage.tsx
import { useEffect, useState } from 'react';
import { fetchTurtleByNickname, type TurtleRecord } from '../services/airtable';
import type { Site } from '../App';
import { SiteBand } from '../components/SiteBand';

export type Confidence = 'high' | 'medium' | 'low';

export interface CandidateTurtle {
  turtleNickname: string;
  confidence: Confidence;
}

interface PossibleMatchPageProps {
  candidates: CandidateTurtle[];
  onBack: () => void;
  onSelectCandidate: (turtleNickname: string) => void;
  onNoMatch: () => void;
  siteName: string;
  site: Site;
}

type CardState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'loaded'; turtle: TurtleRecord };

const CONFIDENCE_COLORS: Record<Confidence, string> = {
  high: 'var(--color-text-secondary)',
  medium: 'var(--color-text-dev)',
  low: 'var(--color-text-muted)',
};

function CandidateCard({
  candidate,
  onSelect,
}: {
  candidate: CandidateTurtle;
  onSelect: () => void;
}) {
  const [cardState, setCardState] = useState<CardState>({ status: 'loading' });
  const [selectHovered, setSelectHovered] = useState(false);

  useEffect(() => {
    fetchTurtleByNickname(candidate.turtleNickname)
      .then(turtle => {
        if (turtle) setCardState({ status: 'loaded', turtle });
        else setCardState({ status: 'error' });
      })
      .catch(() => setCardState({ status: 'error' }));
  }, [candidate.turtleNickname]);

  const badgeColor = CONFIDENCE_COLORS[candidate.confidence];
  const badgeLabel = candidate.confidence.charAt(0).toUpperCase() + candidate.confidence.slice(1);

  return (
    <div
      style={{
        backgroundColor: 'var(--color-bg-card)',
        border: '1px solid var(--color-border)',
        overflow: 'hidden',
      }}
    >
      {/* Photo */}
      {cardState.status === 'loading' && (
        <div
          style={{
            width: '100%',
            aspectRatio: '16/9',
            backgroundColor: 'var(--color-bg)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <span style={{ fontFamily: 'var(--font-body)', color: 'var(--color-text-secondary)', fontSize: '0.7rem', letterSpacing: '0.2em' }}>
            Loading...
          </span>
        </div>
      )}
      {cardState.status === 'error' && (
        <div
          style={{
            width: '100%',
            aspectRatio: '16/9',
            backgroundColor: 'var(--color-bg)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <span style={{ fontFamily: 'var(--font-body)', color: 'var(--color-text-muted)', fontSize: '0.7rem', letterSpacing: '0.1em' }}>
            Photo unavailable
          </span>
        </div>
      )}
      {cardState.status === 'loaded' && cardState.turtle.carapaceTop[0] && (
        <div style={{ width: '100%', aspectRatio: '16/9', overflow: 'hidden' }}>
          <img
            src={cardState.turtle.carapaceTop[0].url}
            alt={`${candidate.turtleNickname} carapace top`}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        </div>
      )}

      {/* Card body */}
      <div className="flex flex-col gap-3" style={{ padding: '1rem' }}>
        {/* Nickname + badge */}
        <div className="flex items-center justify-between">
          <span
            style={{
              fontFamily: 'var(--font-heading)',
              color: 'var(--color-text-primary)',
              fontSize: '1.4rem',
              fontWeight: 700,
              letterSpacing: '0.03em',
            }}
          >
            {candidate.turtleNickname}
          </span>
          <span
            style={{
              fontFamily: 'var(--font-body)',
              color: badgeColor,
              fontSize: '0.65rem',
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              border: `1px solid ${badgeColor}`,
              padding: '0.2rem 0.5rem',
            }}
          >
            {badgeLabel}
          </span>
        </div>

        {/* Actions */}
        <button
          type="button"
          onClick={onSelect}
          style={{
            background: 'none',
            border: 'none',
            padding: 0,
            cursor: 'pointer',
            textAlign: 'left',
            fontFamily: 'var(--font-body)',
            color: 'var(--color-text-secondary)',
            fontSize: '0.75rem',
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
          }}
        >
          View Full Profile →
        </button>

        <button
          type="button"
          className="w-full py-3 text-sm uppercase border transition-all duration-300"
          style={{
            fontFamily: 'var(--font-body)',
            letterSpacing: '0.2em',
            color: selectHovered ? 'var(--color-btn-primary-text)' : 'var(--color-text-secondary)',
            borderColor: 'var(--color-border-action)',
            backgroundColor: selectHovered ? 'var(--color-btn-primary-bg)' : 'transparent',
          }}
          onMouseEnter={() => setSelectHovered(true)}
          onMouseLeave={() => setSelectHovered(false)}
          onClick={onSelect}
        >
          This Is My Turtle
        </button>
      </div>
    </div>
  );
}

export function PossibleMatchPage({
  candidates,
  onBack,
  onSelectCandidate,
  onNoMatch,
  siteName: _siteName,
  site,
}: PossibleMatchPageProps) {
  const [noMatchHovered, setNoMatchHovered] = useState(false);

  return (
    <div
      className="flex flex-col w-full px-8 pb-10 pt-20 gap-6"
      style={{ backgroundColor: 'var(--color-bg)', minHeight: '100dvh' }}
    >
      <SiteBand site={site} />
      {/* Header */}
      <div className="flex flex-col gap-1">
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
            Possible matches
          </p>
        </div>
        <p
          style={{
            fontFamily: 'var(--font-body)',
            color: 'var(--color-text-muted)',
            fontSize: '0.8rem',
            letterSpacing: '0.05em',
          }}
        >
          We found some turtles that might be yours
        </p>
      </div>

      {/* Candidate cards */}
      <div className="flex flex-col gap-4">
        {candidates.map(candidate => (
          <CandidateCard
            key={candidate.turtleNickname}
            candidate={candidate}
            onSelect={() => onSelectCandidate(candidate.turtleNickname)}
          />
        ))}
      </div>

      {/* Footer */}
      <div className="mt-4 mb-8">
        <button
          type="button"
          className="w-full py-4 text-sm uppercase border transition-all duration-300"
          style={{
            fontFamily: 'var(--font-body)',
            letterSpacing: '0.2em',
            color: noMatchHovered ? 'var(--color-btn-primary-text)' : 'var(--color-text-secondary)',
            borderColor: 'var(--color-border-action)',
            backgroundColor: noMatchHovered ? 'var(--color-btn-primary-bg)' : 'transparent',
          }}
          onMouseEnter={() => setNoMatchHovered(true)}
          onMouseLeave={() => setNoMatchHovered(false)}
          onClick={onNoMatch}
        >
          None of these are my turtle
        </button>
      </div>
    </div>
  );
}
