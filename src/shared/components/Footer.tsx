// src/components/Footer.tsx

interface FooterProps {
  onAbout: () => void;
}

export function Footer({ onAbout }: FooterProps) {
  return (
    <div
      style={{
        borderTop: '1px solid var(--color-border)',
        paddingTop: '1.5rem',
        paddingBottom: '1.5rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}
    >
      <button
        type="button"
        onClick={onAbout}
        style={{
          fontFamily: 'var(--font-body)',
          color: 'var(--color-text-muted)',
          fontSize: '0.65rem',
          letterSpacing: '0.2em',
          textTransform: 'uppercase',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: 0,
        }}
      >
        About
      </button>
      <span
        style={{
          fontFamily: 'var(--font-body)',
          color: 'var(--color-text-muted)',
          fontSize: '0.65rem',
          letterSpacing: '0.2em',
          textTransform: 'uppercase',
        }}
      >
        Contact
      </span>
    </div>
  );
}
