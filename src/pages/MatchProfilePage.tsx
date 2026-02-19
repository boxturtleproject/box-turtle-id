// src/pages/MatchProfilePage.tsx
import { useEffect, useState } from 'react';
import {
  fetchTurtleByNickname,
  fetchEncountersForTurtle,
  type TurtleRecord,
} from '../services/airtable';

const DEFAULT_TURTLE_ID = 'T106';

interface MatchProfilePageProps {
  onBack: () => void;
  onNotMyTurtle: () => void;
  turtleNickname?: string;
  mode?: 'confirmed' | 'review';
  siteName?: string;
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
          fontFamily: "'DM Mono', monospace",
          color: '#6b8f71',
          fontSize: '0.6rem',
          letterSpacing: '0.2em',
          textTransform: 'uppercase',
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontFamily: "'DM Mono', monospace",
          color: '#f0ede6',
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
  onNotMyTurtle,
  turtleNickname = DEFAULT_TURTLE_ID,
  mode = 'confirmed',
  siteName = '',
}: MatchProfilePageProps) {
  const [state, setState] = useState<PageState>({ status: 'loading' });
  const [email, setEmail] = useState('');
  const [emailSubmitted, setEmailSubmitted] = useState(false);
  const [confirmHovered, setConfirmHovered] = useState(false);
  const [notMyTurtleHovered, setNotMyTurtleHovered] = useState(false);
  const [submitted, setSubmitted] = useState(false);

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
        setState({ status: 'error', message: err.message ?? 'Failed to load turtle data.' });
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
      <div className="flex items-center justify-center w-full" style={{ backgroundColor: '#0a1a0e', minHeight: '100dvh' }}>
        <span style={{ fontFamily: "'DM Mono', monospace", color: '#6b8f71', letterSpacing: '0.2em', fontSize: '0.75rem', textTransform: 'uppercase' }}>
          Identifying...
        </span>
      </div>
    );
  }

  if (state.status === 'error') {
    return (
      <div className="flex flex-col items-center justify-center gap-6 w-full px-8" style={{ backgroundColor: '#0a1a0e', minHeight: '100dvh' }}>
        <span style={{ fontFamily: "'DM Mono', monospace", color: '#ff6b6b', fontSize: '0.85rem', letterSpacing: '0.05em', textAlign: 'center' }}>
          Error: {state.message}
        </span>
        <button onClick={onBack} style={{ fontFamily: "'DM Mono', monospace", color: '#6b8f71', background: 'none', border: '1px solid #6b8f71', cursor: 'pointer', fontSize: '0.75rem', letterSpacing: '0.2em', textTransform: 'uppercase', padding: '0.75rem 1.5rem' }}>
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
      className="flex flex-col w-full px-8 py-10 gap-8"
      style={{ backgroundColor: '#0a1a0e', minHeight: '100dvh' }}
    >
      {/* Header */}
      <div className="flex flex-col gap-2">
        <button
          type="button"
          onClick={onBack}
          style={{ color: '#6b8f71', background: 'none', border: 'none', cursor: 'pointer', padding: 0, alignSelf: 'flex-start' }}
          aria-label="Go back"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M13 4L7 10l6 6" stroke="#6b8f71" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        {siteName && (
          <p
            style={{
              fontFamily: "'DM Mono', monospace",
              color: '#a8c5ae',
              fontSize: '0.6rem',
              letterSpacing: '0.25em',
              textTransform: 'uppercase',
            }}
          >
            {siteName}
          </p>
        )}
        <p
          style={{
            fontFamily: "'DM Mono', monospace",
            color: '#6b8f71',
            fontSize: '0.7rem',
            letterSpacing: '0.25em',
            textTransform: 'uppercase',
          }}
        >
          We found your turtle
        </p>
        <h1
          style={{
            fontFamily: "'Playfair Display', serif",
            color: '#f0ede6',
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
        style={{ borderTop: '1px solid #1e3a24', borderBottom: '1px solid #1e3a24', paddingTop: '1rem', paddingBottom: '1rem' }}
      >
        <StatChip label="Gender" value={turtle.gender || '—'} />
        <StatChip label="First Seen" value={formatDate(turtle.dateFirstIdentified)} />
        <StatChip label="Encounters" value={String(encounterCount)} />
      </div>
      {lastEncounter && (
        <p style={{ fontFamily: "'DM Mono', monospace", color: '#6b8f71', fontSize: '0.7rem', letterSpacing: '0.15em', textTransform: 'uppercase', marginTop: '-1.5rem' }}>
          Last seen {formatDate(lastEncounter)}
        </p>
      )}

      {/* Notes */}
      {turtle.notes && (
        <div
          style={{
            backgroundColor: '#0f2414',
            border: '1px solid #1e3a24',
            padding: '1rem',
          }}
        >
          <p style={{ fontFamily: "'DM Mono', monospace", color: '#a8c5ae', fontSize: '0.8rem', letterSpacing: '0.08em', lineHeight: 1.6 }}>
            {turtle.notes}
          </p>
        </div>
      )}

      {/* Email signup — confirmed mode only */}
      {mode === 'confirmed' && (
        <div className="flex flex-col gap-3">
          <p style={{ fontFamily: "'DM Mono', monospace", color: '#a8c5ae', fontSize: '0.75rem', letterSpacing: '0.1em' }}>
            We'll email you when this turtle is spotted again
          </p>
          {emailSubmitted ? (
            <p style={{ fontFamily: "'DM Mono', monospace", color: '#6b8f71', fontSize: '0.75rem', letterSpacing: '0.15em', textTransform: 'uppercase' }}>
              ✓ You're signed up for updates
            </p>
          ) : (
            <>
              <input
                type="email"
                placeholder="Your email address"
                value={email}
                onChange={e => setEmail(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem',
                  backgroundColor: '#0f2414',
                  border: '1px solid #3a5c40',
                  color: '#f0ede6',
                  fontFamily: "'DM Mono', monospace",
                  fontSize: '0.8rem',
                  letterSpacing: '0.05em',
                  outline: 'none',
                }}
              />
              <button
                type="button"
                className="w-full py-3 text-sm uppercase border transition-all duration-300"
                style={{
                  fontFamily: "'DM Mono', monospace",
                  letterSpacing: '0.2em',
                  color: '#6b8f71',
                  borderColor: '#6b8f71',
                  backgroundColor: 'transparent',
                }}
                onClick={() => {
                  if (email) setEmailSubmitted(true);
                }}
              >
                Notify Me of Future Sightings
              </button>
            </>
          )}
        </div>
      )}

      {/* Action buttons */}
      <div className="flex flex-col gap-3 mb-8">
        {mode === 'review' ? (
          submitted ? (
            /* Post-submission: confirmation + email signup */
            <div className="flex flex-col gap-3">
              <p style={{
                fontFamily: "'DM Mono', monospace",
                color: '#6b8f71',
                fontSize: '0.75rem',
                letterSpacing: '0.15em',
                textTransform: 'uppercase',
              }}>
                ✓ Submitted for review. We'll be in touch.
              </p>
              <p style={{
                fontFamily: "'DM Mono', monospace",
                color: '#a8c5ae',
                fontSize: '0.75rem',
                letterSpacing: '0.1em',
              }}>
                Sign up for updates when this turtle is confirmed
              </p>
              {emailSubmitted ? (
                <p style={{
                  fontFamily: "'DM Mono', monospace",
                  color: '#6b8f71',
                  fontSize: '0.75rem',
                  letterSpacing: '0.15em',
                  textTransform: 'uppercase',
                }}>
                  ✓ You're signed up for updates
                </p>
              ) : (
                <>
                  <input
                    type="email"
                    placeholder="Your email address"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.75rem 1rem',
                      backgroundColor: '#0f2414',
                      border: '1px solid #3a5c40',
                      color: '#f0ede6',
                      fontFamily: "'DM Mono', monospace",
                      fontSize: '0.8rem',
                      letterSpacing: '0.05em',
                      outline: 'none',
                    }}
                  />
                  <button
                    type="button"
                    className="w-full py-3 text-sm uppercase border transition-all duration-300"
                    style={{
                      fontFamily: "'DM Mono', monospace",
                      letterSpacing: '0.2em',
                      color: '#6b8f71',
                      borderColor: '#6b8f71',
                      backgroundColor: 'transparent',
                    }}
                    onClick={() => { if (email) setEmailSubmitted(true); }}
                  >
                    Notify Me of Future Sightings
                  </button>
                </>
              )}
            </div>
          ) : (
            /* Pre-submission: Submit for Review button */
            <button
              type="button"
              className="w-full py-4 text-sm uppercase transition-all duration-300"
              style={{
                fontFamily: "'DM Mono', monospace",
                letterSpacing: '0.2em',
                color: '#0a1a0e',
                backgroundColor: confirmHovered ? '#8aab90' : '#6b8f71',
                border: 'none',
              }}
              onMouseEnter={() => setConfirmHovered(true)}
              onMouseLeave={() => setConfirmHovered(false)}
              onClick={() => {
                // TODO: send submission to Airtable / site director
                setSubmitted(true);
              }}
            >
              Submit for Review
            </button>
          )
        ) : (
          /* Confirmed mode: original buttons */
          <>
            <button
              type="button"
              className="w-full py-4 text-sm uppercase transition-all duration-300"
              style={{
                fontFamily: "'DM Mono', monospace",
                letterSpacing: '0.2em',
                color: '#0a1a0e',
                backgroundColor: confirmHovered ? '#8aab90' : '#6b8f71',
                border: 'none',
              }}
              onMouseEnter={() => setConfirmHovered(true)}
              onMouseLeave={() => setConfirmHovered(false)}
              onClick={() => {
                console.log('Confirmed turtle:', turtle.nickname);
              }}
            >
              This Is My Turtle
            </button>
            <button
              type="button"
              className="w-full py-4 text-sm uppercase border transition-all duration-300"
              style={{
                fontFamily: "'DM Mono', monospace",
                letterSpacing: '0.2em',
                color: notMyTurtleHovered ? '#0a1a0e' : '#6b8f71',
                borderColor: '#6b8f71',
                backgroundColor: notMyTurtleHovered ? '#6b8f71' : 'transparent',
              }}
              onMouseEnter={() => setNotMyTurtleHovered(true)}
              onMouseLeave={() => setNotMyTurtleHovered(false)}
              onClick={onNotMyTurtle}
            >
              Not My Turtle
            </button>
          </>
        )}
      </div>
    </div>
  );
}
