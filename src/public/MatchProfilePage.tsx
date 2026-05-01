// src/public/MatchProfilePage.tsx
import { useEffect, useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import type { Site } from '../shared/types';
import { useQuery } from '@tanstack/react-query';
import { useSite } from '../shared/context/SiteContext';
import { fetchTurtle, fetchEncounters, imageUrl } from '../shared/lib/api';
import { SiteBand } from '../shared/components/SiteBand';
import { Footer } from '../shared/components/Footer';
import type { SubmissionCandidate, CaptureResponse } from '../shared/types';

interface LocationState {
  submissionId: string;
  candidate: SubmissionCandidate;
  candidates: SubmissionCandidate[];
  photos: {
    top: File;
    left: File | null;
    right: File | null;
    other: File[];
  };
}

function StatChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <span
        style={{
          fontFamily: 'var(--font-body)',
          color: 'var(--color-text-secondary)',
          fontSize: '0.6rem',
          letterSpacing: '0.2em',
          textTransform: 'uppercase',
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontFamily: 'var(--font-body)',
          color: 'var(--color-text-primary)',
          fontSize: '0.85rem',
          letterSpacing: '0.05em',
        }}
      >
        {value}
      </span>
    </div>
  );
}

function formatDate(d: string | null | undefined): string {
  if (!d) return '\u2014';
  try {
    return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  } catch {
    return d;
  }
}

function capturesByType(captures: CaptureResponse[]): Record<string, CaptureResponse[]> {
  const grouped: Record<string, CaptureResponse[]> = {};
  for (const c of captures) {
    const key = c.image_type;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(c);
  }
  return grouped;
}

export function MatchProfilePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { turtleId } = useParams<{ turtleId: string }>();
  const { site, setSite } = useSite();
  const [confirmHovered, setConfirmHovered] = useState(false);
  const [notMyTurtleHovered, setNotMyTurtleHovered] = useState(false);

  const state = location.state as LocationState | null;
  const id = Number(turtleId);

  const turtleQuery = useQuery({
    queryKey: ['turtle', id],
    queryFn: () => fetchTurtle(id),
    enabled: !isNaN(id),
  });

  const encountersQuery = useQuery({
    queryKey: ['encounters', id],
    queryFn: () => fetchEncounters(id),
    enabled: !isNaN(id),
  });

  // Make /results/:turtleId deep-linkable: when the user lands here without a
  // selected site (refresh, fresh tab, shared link), derive it from the turtle
  // record once it loads.
  const turtleSite = turtleQuery.data?.site;
  useEffect(() => {
    if (!site && (turtleSite === 'patuxent' || turtleSite === 'wallkill')) {
      setSite(turtleSite as Site);
    }
  }, [site, turtleSite, setSite]);

  if (turtleQuery.isLoading || (!site && !turtleQuery.isError)) {
    return (
      <div className="flex items-center justify-center w-full" style={{ backgroundColor: 'var(--color-bg)', minHeight: '100dvh', paddingTop: '2.5rem' }}>
        {site && <SiteBand site={site} onWelcome={() => navigate('/')} />}
        <span style={{ fontFamily: 'var(--font-body)', color: 'var(--color-text-secondary)', letterSpacing: '0.2em', fontSize: '0.75rem', textTransform: 'uppercase' }}>
          Loading...
        </span>
      </div>
    );
  }

  if (turtleQuery.isError || !turtleQuery.data) {
    return (
      <div className="flex flex-col items-center justify-center gap-6 w-full px-8" style={{ backgroundColor: 'var(--color-bg)', minHeight: '100dvh', paddingTop: '2.5rem' }}>
        {site && <SiteBand site={site} onWelcome={() => navigate('/')} />}
        <span style={{ fontFamily: 'var(--font-body)', color: 'var(--color-text-error)', fontSize: '0.85rem', letterSpacing: '0.05em', textAlign: 'center' }}>
          Error: {turtleQuery.error instanceof Error ? turtleQuery.error.message : 'Failed to load turtle data.'}
        </span>
        <button
          onClick={() => navigate(-1)}
          style={{ fontFamily: 'var(--font-body)', color: 'var(--color-text-secondary)', background: 'none', border: '1px solid var(--color-border-action)', cursor: 'pointer', fontSize: '0.75rem', letterSpacing: '0.2em', textTransform: 'uppercase', padding: '0.75rem 1.5rem' }}
        >
          Go Back
        </button>
      </div>
    );
  }

  const turtle = turtleQuery.data;
  const encounters = encountersQuery.data ?? [];
  const encounterCount = encounters.length;
  const grouped = capturesByType(turtle.captures);
  const topCapture = grouped['carapace_top']?.[0];
  const leftCapture = grouped['carapace_left']?.[0];
  const rightCapture = grouped['carapace_right']?.[0];

  const candidate = state?.candidate ?? null;
  const visualizationSrc = candidate?.visualization_url ? imageUrl(candidate.visualization_url) : null;

  return (
    <div
      className="flex flex-col w-full px-8 pb-10 pt-20 gap-8"
      style={{ backgroundColor: 'var(--color-bg)', minHeight: '100dvh' }}
    >
      {site && <SiteBand site={site} onWelcome={() => navigate('/')} />}

      {/* Header */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
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
            Turtle profile
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
          {turtle.name ?? turtle.external_id}
        </h1>
      </div>

      {/* Photo gallery */}
      <div className="flex flex-col gap-2">
        {topCapture && (
          <div style={{ width: '100%', aspectRatio: '4/3', overflow: 'hidden' }}>
            <img
              src={imageUrl(topCapture.display_url ?? topCapture.thumbnail_url ?? topCapture.image_path)}
              alt="Carapace top"
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          </div>
        )}
        <div className="flex gap-2">
          {leftCapture && (
            <div style={{ flex: 1, aspectRatio: '1/1', overflow: 'hidden' }}>
              <img
                src={imageUrl(leftCapture.display_url ?? leftCapture.thumbnail_url ?? leftCapture.image_path)}
                alt="Carapace left"
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </div>
          )}
          {rightCapture && (
            <div style={{ flex: 1, aspectRatio: '1/1', overflow: 'hidden' }}>
              <img
                src={imageUrl(rightCapture.display_url ?? rightCapture.thumbnail_url ?? rightCapture.image_path)}
                alt="Carapace right"
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </div>
          )}
        </div>
      </div>

      {/* SIFT visualization */}
      {visualizationSrc && (
        <div className="flex flex-col gap-2">
          <span
            style={{
              fontFamily: 'var(--font-body)',
              color: 'var(--color-text-secondary)',
              fontSize: '0.65rem',
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
            }}
          >
            Match Visualization
          </span>
          <div style={{ width: '100%', overflow: 'hidden', border: '1px solid var(--color-border)' }}>
            <img src={visualizationSrc} alt="SIFT match visualization" style={{ width: '100%', display: 'block' }} />
          </div>
        </div>
      )}

      {/* Stats */}
      <div
        className="flex justify-between"
        style={{ borderTop: '1px solid var(--color-border)', borderBottom: '1px solid var(--color-border)', paddingTop: '1rem', paddingBottom: '1rem' }}
      >
        <StatChip label="Gender" value={turtle.gender ?? '\u2014'} />
        <StatChip label="First Seen" value={formatDate(turtle.first_seen)} />
        <StatChip label="Encounters" value={String(encounterCount)} />
      </div>

      {/* Notes */}
      {turtle.notes && (
        <div
          style={{
            backgroundColor: 'var(--color-bg-card)',
            border: '1px solid var(--color-border)',
            padding: '1rem',
          }}
        >
          <p style={{ fontFamily: 'var(--font-body)', color: 'var(--color-text-muted)', fontSize: '0.8rem', letterSpacing: '0.08em', lineHeight: 1.6 }}>
            {turtle.notes}
          </p>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-col gap-3 mb-8">
        <button
          type="button"
          className="w-full py-4 text-sm uppercase transition-all duration-300"
          style={{
            fontFamily: 'var(--font-body)',
            letterSpacing: '0.2em',
            color: 'var(--color-btn-primary-text)',
            backgroundColor: confirmHovered ? 'var(--color-btn-primary-bg-hover)' : 'var(--color-btn-primary-bg)',
            border: 'none',
            cursor: 'pointer',
          }}
          onMouseEnter={() => setConfirmHovered(true)}
          onMouseLeave={() => setConfirmHovered(false)}
          onClick={() =>
            navigate('/encounter', {
              state: {
                submissionId: state?.submissionId,
                turtleId: turtle.id,
                turtleNickname: turtle.name ?? turtle.external_id,
              },
            })
          }
        >
          This Is My Turtle
        </button>
        <button
          type="button"
          className="w-full py-4 text-sm uppercase border transition-all duration-300"
          style={{
            fontFamily: 'var(--font-body)',
            letterSpacing: '0.2em',
            color: notMyTurtleHovered ? 'var(--color-btn-primary-text)' : 'var(--color-text-secondary)',
            borderColor: 'var(--color-border-action)',
            backgroundColor: notMyTurtleHovered ? 'var(--color-btn-primary-bg)' : 'transparent',
            cursor: 'pointer',
          }}
          onMouseEnter={() => setNotMyTurtleHovered(true)}
          onMouseLeave={() => setNotMyTurtleHovered(false)}
          onClick={() => navigate(-1)}
        >
          Not My Turtle
        </button>
      </div>

      <Footer onAbout={() => navigate('/about')} />
    </div>
  );
}
