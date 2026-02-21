// src/components/DevRoutingModal.tsx

interface DevRoutingModalProps {
  onConfirmedMatch: () => void;
  onPossibleMatch: () => void;
  onNoMatch: () => void;
  onDismiss: () => void;
}

export function DevRoutingModal({
  onConfirmedMatch,
  onPossibleMatch,
  onNoMatch,
  onDismiss,
}: DevRoutingModalProps) {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'var(--color-overlay)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '2rem',
      }}
    >
      <div
        style={{
          backgroundColor: 'var(--color-bg-card)',
          border: '1px solid var(--color-border)',
          padding: '2rem',
          width: '100%',
          maxWidth: '360px',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.5rem',
        }}
      >
        {/* DEV badge */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span
            style={{
              fontFamily: 'var(--font-body)',
              color: 'var(--color-text-dev)',
              fontSize: '0.6rem',
              letterSpacing: '0.3em',
              textTransform: 'uppercase',
              border: '1px solid var(--color-text-dev)',
              padding: '0.15rem 0.4rem',
            }}
          >
            Dev
          </span>
          <button
            type="button"
            onClick={onDismiss}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--color-text-muted)',
              fontFamily: 'var(--font-body)',
              fontSize: '0.7rem',
              letterSpacing: '0.1em',
            }}
          >
            ✕ Cancel
          </button>
        </div>

        {/* Title */}
        <p
          style={{
            fontFamily: 'var(--font-heading)',
            color: 'var(--color-text-primary)',
            fontSize: '1.4rem',
            fontWeight: 700,
            letterSpacing: '0.03em',
            margin: 0,
          }}
        >
          Select Test Flow
        </p>

        {/* Flow buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <button
            type="button"
            onClick={onConfirmedMatch}
            style={{
              width: '100%',
              padding: '0.875rem 1rem',
              backgroundColor: 'var(--color-btn-primary-bg)',
              border: 'none',
              cursor: 'pointer',
              fontFamily: 'var(--font-body)',
              color: 'var(--color-btn-primary-text)',
              fontSize: '0.75rem',
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              textAlign: 'left',
            }}
          >
            Confirmed Match →
          </button>
          <button
            type="button"
            onClick={onPossibleMatch}
            style={{
              width: '100%',
              padding: '0.875rem 1rem',
              backgroundColor: 'transparent',
              border: '1px solid var(--color-border-action)',
              cursor: 'pointer',
              fontFamily: 'var(--font-body)',
              color: 'var(--color-text-secondary)',
              fontSize: '0.75rem',
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              textAlign: 'left',
            }}
          >
            Possible Match →
          </button>
          <button
            type="button"
            onClick={onNoMatch}
            style={{
              width: '100%',
              padding: '0.875rem 1rem',
              backgroundColor: 'transparent',
              border: '1px solid var(--color-border-action)',
              cursor: 'pointer',
              fontFamily: 'var(--font-body)',
              color: 'var(--color-text-secondary)',
              fontSize: '0.75rem',
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              textAlign: 'left',
            }}
          >
            No Match →
          </button>
        </div>
      </div>
    </div>
  );
}
