// src/pages/MatchProfilePage.tsx
import { useEffect, useState } from 'react';
import type { Site } from '../App';
import { SiteBand } from '../components/SiteBand';
import { Footer } from '../components/Footer';
import {
  fetchTurtleByNickname,
  fetchEncountersForTurtle,
  type TurtleRecord,
} from '../services/airtable';
import turtleTop from '../assets/turtle-top-view.jpg';
import turtleLeft from '../assets/turtle-left-side.jpg';
import turtleRight from '../assets/turtle-right-side.jpg';

const DEFAULT_TURTLE_ID = 'T106';

const DEV_MOCK_TURTLE: TurtleRecord = {
  airtableId: 'mock',
  nickname: 'T106',
  gender: 'Female',
  dateFirstIdentified: '2021-06-15',
  carapaceTop: [{ id: 'mock-top', url: turtleTop, filename: 'turtle-top-view.jpg' }],
  carapaceLeft: [{ id: 'mock-left', url: turtleLeft, filename: 'turtle-left-side.jpg' }],
  carapaceRight: [{ id: 'mock-right', url: turtleRight, filename: 'turtle-right-side.jpg' }],
  notes: 'Mock turtle for dev — Airtable unavailable.',
};

interface MatchProfilePageProps {
  onBack: () => void;
  onConfirm: () => void;
  onNotMyTurtle: () => void;
  onAbout: () => void;
  turtleNickname?: string;
  siteName?: string;
  site: Site;
  onWelcome: () => void;
}

type PageState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'loaded'; turtle: TurtleRecord; encounterCount: number; lastEncounter: string | null };

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

export function MatchProfilePage({
  onBack,
  onConfirm,
  onNotMyTurtle,
  onAbout,
  turtleNickname = DEFAULT_TURTLE_ID,
  siteName: _siteName = '',
  site,
  onWelcome,
}: MatchProfilePageProps) {
  const [state, setState] = useState<PageState>({ status: 'loading' });
  const [confirmHovered, setConfirmHovered] = useState(false);
  const [notMyTurtleHovered, setNotMyTurtleHovered] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const turtle = await fetchTurtleByNickname(turtleNickname);
        if (!turtle) {
          setState({ status: 'error', message: `Turtle "${turtleNickname}" not found.` });
          return;
        }
        const encounters = await fetchEncountersForTurtle(turtle.airtableId);
        const encounterCount = encounters.length;
        const dates = encounters.map(e => e.date).filter(Boolean).sort();
        const lastEncounter = dates.length ? dates[dates.length - 1] : null;
        setState({ status: 'loaded', turtle, encounterCount, lastEncounter });
      } catch (err: any) {
        if (import.meta.env.DEV) {
          setState({ status: 'loaded', turtle: DEV_MOCK_TURTLE, encounterCount: 3, lastEncounter: '2024-08-10' });
        } else {
          setState({ status: 'error', message: err.message ?? 'Failed to load turtle data.' });
        }
      }
    }
    load();
  }, [turtleNickname]);

  const formatDate = (d: string) => {
    if (!d) return '—';
    try {
      return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    } catch {
      return d;
    }
  };

  if (state.status === 'loading') {
    return (
      <div className="flex items-center justify-center w-full" style={{ backgroundColor: 'var(--color-bg)', minHeight: '100dvh', paddingTop: '2.5rem' }}>
        <SiteBand site={site} onWelcome={onWelcome} />
        <span style={{ fontFamily: 'var(--font-body)', color: 'var(--color-text-secondary)', letterSpacing: '0.2em', fontSize: '0.75rem', textTransform: 'uppercase' }}>
          Identifying...
        </span>
      </div>
    );
  }

  if (state.status === 'error') {
    return (
      <div className="flex flex-col items-center justify-center gap-6 w-full px-8" style={{ backgroundColor: 'var(--color-bg)', minHeight: '100dvh', paddingTop: '2.5rem' }}>
        <SiteBand site={site} onWelcome={onWelcome} />
        <span style={{ fontFamily: 'var(--font-body)', color: 'var(--color-text-error)', fontSize: '0.85rem', letterSpacing: '0.05em', textAlign: 'center' }}>
          Error: {state.message}
        </span>
        <button onClick={onBack} style={{ fontFamily: 'var(--font-body)', color: 'var(--color-text-secondary)', background: 'none', border: '1px solid var(--color-border-action)', cursor: 'pointer', fontSize: '0.75rem', letterSpacing: '0.2em', textTransform: 'uppercase', padding: '0.75rem 1.5rem' }}>
          ← Go Back
        </button>
      </div>
    );
  }

  const { turtle, encounterCount, lastEncounter } = state;
  const topPhoto = turtle.carapaceTop[0]?.url;
  const leftPhoto = turtle.carapaceLeft[0]?.url;
  const rightPhoto = turtle.carapaceRight[0]?.url;

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
            We found your turtle
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
          {turtle.nickname}
        </h1>
      </div>

      {/* Photo gallery */}
      <div className="flex flex-col gap-2">
        {topPhoto && (
          <div style={{ width: '100%', aspectRatio: '4/3', overflow: 'hidden' }}>
            <img src={topPhoto} alt="Carapace top" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
        )}
        <div className="flex gap-2">
          {leftPhoto && (
            <div style={{ flex: 1, aspectRatio: '1/1', overflow: 'hidden' }}>
              <img src={leftPhoto} alt="Carapace left" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
          )}
          {rightPhoto && (
            <div style={{ flex: 1, aspectRatio: '1/1', overflow: 'hidden' }}>
              <img src={rightPhoto} alt="Carapace right" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
          )}
        </div>
      </div>

      {/* Stats */}
      <div
        className="flex justify-between"
        style={{ borderTop: '1px solid var(--color-border)', borderBottom: '1px solid var(--color-border)', paddingTop: '1rem', paddingBottom: '1rem' }}
      >
        <StatChip label="Gender" value={turtle.gender || '—'} />
        <StatChip label="First Seen" value={formatDate(turtle.dateFirstIdentified)} />
        <StatChip label="Encounters" value={String(encounterCount)} />
      </div>
      {lastEncounter && (
        <p style={{ fontFamily: 'var(--font-body)', color: 'var(--color-text-secondary)', fontSize: '0.7rem', letterSpacing: '0.15em', textTransform: 'uppercase', marginTop: '-1.5rem' }}>
          Last seen {formatDate(lastEncounter)}
        </p>
      )}

      {/* Turtle notes */}
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
          onClick={onConfirm}
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
          onClick={onNotMyTurtle}
        >
          Not My Turtle
        </button>
      </div>

      <Footer onAbout={onAbout} />
    </div>
  );
}
