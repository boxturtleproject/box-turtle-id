// src/public/AboutPage.tsx
import { useNavigate } from 'react-router-dom';

const paraStyle: React.CSSProperties = {
  fontFamily: 'var(--font-body)',
  color: 'var(--color-text-muted)',
  fontSize: '0.875rem',
  lineHeight: 1.7,
  letterSpacing: '0.03em',
  margin: 0,
};

export function AboutPage() {
  const navigate = useNavigate();

  return (
    <div
      className="flex flex-col w-full px-8 pb-10 pt-16 gap-8"
      style={{ backgroundColor: 'var(--color-bg)', minHeight: '100dvh' }}
    >
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => navigate(-1)}
          style={{
            color: 'var(--color-text-secondary)',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: 0,
            flexShrink: 0,
          }}
          aria-label="Go back"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path
              d="M13 4L7 10l6 6"
              stroke="var(--color-text-secondary)"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
        <h1
          style={{
            fontFamily: 'var(--font-heading)',
            color: 'var(--color-text-primary)',
            fontSize: '1.25rem',
            fontWeight: 700,
            letterSpacing: '0.05em',
            margin: 0,
          }}
        >
          About
        </h1>
      </div>

      {/* Copy */}
      <div className="flex flex-col gap-6">
        <p style={paraStyle}>
          Box Turtle ID is an experimental project to build local awareness and strengthen citizen
          engagement with box turtle conservation within their community. The platform takes advantage
          of the unusually wide array of shell patterns, limited range and extended life expectancy
          that characterize this species, making them ideal candidates for identification and tracking
          via image recognition technology.
        </p>
        <p style={paraStyle}>
          The underlying software was developed by Andy Royle, Ph.D., from the Patuxent Research
          Refuge as part of his statical research into local reptile populations. It is now in use
          across a growing number of sites by scientists, conservation organizations and communities
          to better support the study of isolated and threatened populations in increasingly
          fragmented natural environments. In the future, we hope that it will offer a more seamless
          platform for integrating citizen science with academic research to provide a more complete
          and timely picture of population health throughout the distributed range of these amazing
          and resilient creatures across the USA.
        </p>
        <p style={paraStyle}>
          Box turtles are a trafficked species, so care has been taken to ensure that any data
          collected through this platform is stored securely. The project sponsors request that you
          keep any data you collect on these unique creatures strictly confidential. Thank you.
        </p>
      </div>
    </div>
  );
}
