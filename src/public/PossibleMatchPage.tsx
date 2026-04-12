// src/public/PossibleMatchPage.tsx
import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useSite } from '../shared/context/SiteContext';
import { imageUrl } from '../shared/lib/api';
import { SiteBand } from '../shared/components/SiteBand';
import { Footer } from '../shared/components/Footer';
import ConfidenceBadge from '../shared/components/ConfidenceBadge';
import type { SubmissionCandidate } from '../shared/types';

interface LocationState {
  submissionId: string;
  candidates: SubmissionCandidate[];
  processingTimeMs: number;
  totalCompared: number;
  photos: {
    top: File;
    left: File | null;
    right: File | null;
    other: File[];
  };
}

function CandidateCard({
  candidate,
  onViewProfile,
  onSelect,
}: {
  candidate: SubmissionCandidate;
  onViewProfile: () => void;
  onSelect: () => void;
}) {
  const [selectHovered, setSelectHovered] = useState(false);
  const thumbSrc = imageUrl(candidate.thumbnail_url);

  return (
    <div
      style={{
        backgroundColor: 'var(--color-bg-card)',
        border: '1px solid var(--color-border)',
        overflow: 'hidden',
      }}
    >
      {/* Thumbnail */}
      {thumbSrc ? (
        <div style={{ width: '100%', aspectRatio: '16/9', overflow: 'hidden' }}>
          <img
            src={thumbSrc}
            alt={`${candidate.turtle_nickname ?? 'Turtle'} carapace`}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        </div>
      ) : (
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

      {/* Card body */}
      <div className="flex flex-col gap-3" style={{ padding: '1rem' }}>
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
            {candidate.turtle_nickname ?? `Turtle #${candidate.turtle_id}`}
          </span>
          <ConfidenceBadge confidence={candidate.confidence} score={candidate.score} />
        </div>

        {/* View Profile link */}
        <button
          type="button"
          onClick={onViewProfile}
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
          View Full Profile
        </button>

        {/* This Is Mine button */}
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

export function PossibleMatchPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { site } = useSite();
  const [noMatchHovered, setNoMatchHovered] = useState(false);

  const state = location.state as LocationState | null;

  if (!site) {
    navigate('/');
    return null;
  }

  if (!state?.candidates) {
    navigate('/instructions');
    return null;
  }

  const { submissionId, candidates, photos } = state;

  return (
    <div
      className="flex flex-col w-full px-8 pb-10 pt-20 gap-6"
      style={{ backgroundColor: 'var(--color-bg)', minHeight: '100dvh' }}
    >
      <SiteBand site={site} onWelcome={() => navigate('/')} />

      {/* Header */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/instructions')}
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
        {candidates.map((candidate) => (
          <CandidateCard
            key={candidate.turtle_id}
            candidate={candidate}
            onViewProfile={() =>
              navigate(`/results/${candidate.turtle_id}`, {
                state: {
                  submissionId,
                  candidate,
                  candidates,
                  photos,
                },
              })
            }
            onSelect={() =>
              navigate('/encounter', {
                state: {
                  submissionId,
                  turtleId: candidate.turtle_id,
                  turtleNickname: candidate.turtle_nickname ?? `Turtle #${candidate.turtle_id}`,
                },
              })
            }
          />
        ))}
      </div>

      {/* None of these */}
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
          onClick={() =>
            navigate('/results/no-match', {
              state: { submissionId, photos },
            })
          }
        >
          None of these are my turtle
        </button>
      </div>

      <Footer onAbout={() => navigate('/about')} />
    </div>
  );
}
