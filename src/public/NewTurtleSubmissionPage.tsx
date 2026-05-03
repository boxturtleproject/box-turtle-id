// src/public/NewTurtleSubmissionPage.tsx
import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useSite } from '../shared/context/SiteContext';
import { submitNewTurtle, suggestNextTurtleId, checkTurtleId } from '../shared/lib/api';
import { SiteBand } from '../shared/components/SiteBand';
import { Footer } from '../shared/components/Footer';
import {
  EncounterForm,
  defaultEncounterFormData,
  type EncounterFormData,
} from '../shared/components/EncounterForm';

interface LocationState {
  submissionId: string;
  photos?: {
    top: File;
    left: File | null;
    right: File | null;
    other: File[];
  };
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

export function NewTurtleSubmissionPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { site } = useSite();
  const [encounterData, setEncounterData] = useState<EncounterFormData>(defaultEncounterFormData());
  const [submitHovered, setSubmitHovered] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [turtleId, setTurtleId] = useState('');
  const [turtleIdEdited, setTurtleIdEdited] = useState(false);

  const state = location.state as LocationState | null;

  // Suggest the next T-number on mount; prefill the input until the user
  // edits it themselves.
  const suggestedQuery = useQuery({
    queryKey: ['next-turtle-id'],
    queryFn: suggestNextTurtleId,
    staleTime: 60_000,
  });
  useEffect(() => {
    if (!turtleIdEdited && suggestedQuery.data) {
      setTurtleId(suggestedQuery.data.external_id);
    }
  }, [suggestedQuery.data, turtleIdEdited]);

  // Live availability check (only fires while the user has typed something
  // different from the prefill, debounced via React Query staleTime).
  const trimmedId = turtleId.trim();
  const checkQuery = useQuery({
    queryKey: ['check-turtle-id', trimmedId],
    queryFn: () => checkTurtleId(trimmedId),
    enabled: trimmedId.length > 0
      && (!suggestedQuery.data || trimmedId !== suggestedQuery.data.external_id),
    staleTime: 5_000,
  });

  const idAvailable = trimmedId.length === 0
    || (suggestedQuery.data && trimmedId === suggestedQuery.data.external_id)
    || (checkQuery.data?.available ?? true);
  const idChecking = checkQuery.isFetching && trimmedId.length > 0;

  const mutation = useMutation({
    mutationFn: () => {
      if (!state?.submissionId || !site) throw new Error('Missing submission data');
      return submitNewTurtle(state.submissionId, encounterData.nickname, encounterData, site, trimmedId || null);
    },
    onSuccess: () => {
      navigate('/thank-you');
    },
  });

  if (!site) {
    navigate('/');
    return null;
  }

  if (!state?.submissionId) {
    navigate('/instructions');
    return null;
  }

  const photos = state.photos;

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
          onClick={() => navigate(-1)}
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

      {/* Turtle ID picker */}
      <div className="flex flex-col gap-2">
        <span style={labelStyle}>Turtle ID</span>
        <input
          type="text"
          value={turtleId}
          onChange={(e) => { setTurtleId(e.target.value); setTurtleIdEdited(true); }}
          placeholder={suggestedQuery.data?.external_id ?? 'T###'}
          autoCapitalize="characters"
          spellCheck={false}
          style={{
            width: '100%',
            padding: '0.625rem 0.75rem',
            fontFamily: 'var(--font-body)',
            fontSize: '0.875rem',
            color: 'var(--color-text-primary)',
            backgroundColor: 'var(--color-bg)',
            border: `1px solid ${
              !idAvailable
                ? 'var(--color-text-error, #cc0000)'
                : 'var(--color-border-input)'
            }`,
            outline: 'none',
            boxSizing: 'border-box',
          }}
        />
        {trimmedId && !idAvailable && (
          <span style={{
            fontFamily: 'var(--font-body)',
            color: 'var(--color-text-error, #cc0000)',
            fontSize: '0.75rem',
            letterSpacing: '0.05em',
          }}>
            That ID is already taken. Pick a different one.
          </span>
        )}
        {trimmedId && idAvailable && !idChecking && (
          <span style={{
            fontFamily: 'var(--font-body)',
            color: 'var(--color-text-muted)',
            fontSize: '0.7rem',
            letterSpacing: '0.05em',
          }}>
            {suggestedQuery.data && trimmedId === suggestedQuery.data.external_id
              ? `Suggested next ID — edit if you'd like to use a different one.`
              : `Available.`}
          </span>
        )}
        {idChecking && (
          <span style={{
            fontFamily: 'var(--font-body)',
            color: 'var(--color-text-muted)',
            fontSize: '0.7rem',
          }}>
            Checking availability…
          </span>
        )}
      </div>

      {/* Encounter Form */}
      <EncounterForm
        includeNickname
        value={encounterData}
        onChange={setEncounterData}
      />

      {/* Error */}
      {mutation.isError && (
        <div
          style={{
            backgroundColor: 'var(--color-bg-card)',
            border: '1px solid var(--color-text-error, #ef4444)',
            padding: '1rem',
          }}
        >
          <p style={{ fontFamily: 'var(--font-body)', color: 'var(--color-text-error, #ef4444)', fontSize: '0.85rem', margin: 0 }}>
            {mutation.error instanceof Error ? mutation.error.message : 'An error occurred. Please try again.'}
          </p>
        </div>
      )}

      {/* Submit */}
      <button
        type="button"
        disabled={mutation.isPending || !idAvailable || !trimmedId}
        onClick={() => mutation.mutate()}
        onMouseEnter={() => setSubmitHovered(true)}
        onMouseLeave={() => setSubmitHovered(false)}
        className="w-full py-4 text-xs uppercase transition-all duration-300"
        style={{
          fontFamily: 'var(--font-body)',
          letterSpacing: '0.25em',
          backgroundColor: submitHovered ? 'var(--color-btn-primary-bg-hover)' : 'var(--color-btn-primary-bg)',
          color: 'var(--color-btn-primary-text)',
          border: 'none',
          cursor: (mutation.isPending || !idAvailable || !trimmedId) ? 'not-allowed' : 'pointer',
          opacity: (mutation.isPending || !idAvailable || !trimmedId) ? 0.5 : 1,
        }}
      >
        {mutation.isPending ? 'Submitting...' : 'Submit for Review'}
      </button>

      <Footer onAbout={() => navigate('/about')} />

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
                onClick={() => navigate('/')}
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
