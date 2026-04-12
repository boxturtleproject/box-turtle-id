// src/public/NoMatchPage.tsx
import { useNavigate, useLocation } from 'react-router-dom';
import { useSite } from '../shared/context/SiteContext';
import { SiteBand } from '../shared/components/SiteBand';
import { Footer } from '../shared/components/Footer';

interface LocationState {
  submissionId: string;
  photos?: {
    top: File;
    left: File | null;
    right: File | null;
    other: File[];
  };
}

export function NoMatchPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { site } = useSite();

  const state = location.state as LocationState | null;

  if (!site) {
    navigate('/');
    return null;
  }

  return (
    <div
      className="flex flex-col w-full px-8 pb-10 pt-20 gap-8"
      style={{ backgroundColor: 'var(--color-bg)', minHeight: '100dvh' }}
    >
      <SiteBand site={site} onWelcome={() => navigate('/')} />

      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => navigate('/instructions')}
          style={{ color: 'var(--color-text-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
          aria-label="Go back"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M13 4L7 10l6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Main content */}
      <div className="flex flex-col gap-6">
        <h1
          style={{
            fontFamily: 'var(--font-heading)',
            color: 'var(--color-text-primary)',
            fontSize: '2rem',
            fontWeight: 700,
            letterSpacing: '0.03em',
            margin: 0,
          }}
        >
          No Match Found
        </h1>
        <p
          style={{
            fontFamily: 'var(--font-body)',
            color: 'var(--color-text-secondary)',
            fontSize: '0.875rem',
            lineHeight: 1.6,
            margin: 0,
          }}
        >
          This turtle doesn't appear to be in our database. It may be a new individual that hasn't been documented yet.
        </p>
      </div>

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Actions */}
      <div className="flex flex-col gap-4">
        <button
          type="button"
          onClick={() =>
            navigate('/results/new-turtle', {
              state: {
                submissionId: state?.submissionId,
                photos: state?.photos,
              },
            })
          }
          className="w-full py-4 text-xs uppercase transition-all duration-300"
          style={{
            fontFamily: 'var(--font-body)',
            letterSpacing: '0.25em',
            backgroundColor: 'var(--color-btn-primary-bg)',
            color: 'var(--color-btn-primary-text)',
            border: 'none',
            cursor: 'pointer',
          }}
        >
          Submit as New Turtle
        </button>
        <button
          type="button"
          onClick={() => navigate('/instructions')}
          style={{
            fontFamily: 'var(--font-body)',
            color: 'var(--color-text-muted)',
            fontSize: '0.75rem',
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            textDecoration: 'underline',
            padding: '0.5rem 0',
          }}
        >
          Retake Photos
        </button>
      </div>

      <Footer onAbout={() => navigate('/about')} />
    </div>
  );
}
