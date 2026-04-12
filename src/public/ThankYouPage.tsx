// src/public/ThankYouPage.tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSite } from '../shared/context/SiteContext';
import { SiteBand } from '../shared/components/SiteBand';
import { Footer } from '../shared/components/Footer';

export function ThankYouPage() {
  const navigate = useNavigate();
  const { site } = useSite();
  const [btnHovered, setBtnHovered] = useState(false);

  if (!site) {
    navigate('/');
    return null;
  }

  return (
    <div
      className="flex flex-col w-full px-8 pb-10 pt-20 gap-10"
      style={{ backgroundColor: 'var(--color-bg)', minHeight: '100dvh' }}
    >
      <SiteBand site={site} onWelcome={() => navigate('/')} />

      {/* Content */}
      <div className="flex flex-col gap-6 flex-1 justify-center">
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
          Thank You
        </h1>

        <p
          style={{
            fontFamily: 'var(--font-body)',
            color: 'var(--color-text-muted)',
            fontSize: '0.8rem',
            lineHeight: 1.7,
            letterSpacing: '0.05em',
          }}
        >
          Thank you for contributing to Box Turtle ID, an experimental project that uses pattern recognition technology to make it more fun and engaging for citizens to identify box turtles in their environment and share observations about their behavior to support local scientific and conservation efforts.{' '}
          <button
            type="button"
            onClick={() => navigate('/about')}
            style={{
              fontFamily: 'var(--font-body)',
              color: 'var(--color-text-secondary)',
              fontSize: '0.8rem',
              letterSpacing: '0.05em',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 0,
              textDecoration: 'underline',
            }}
          >
            Learn more here.
          </button>
        </p>

        <button
          type="button"
          className="w-full py-4 text-sm uppercase transition-all duration-300"
          style={{
            fontFamily: 'var(--font-body)',
            letterSpacing: '0.2em',
            color: 'var(--color-btn-primary-text)',
            backgroundColor: btnHovered ? 'var(--color-btn-primary-bg-hover)' : 'var(--color-btn-primary-bg)',
            border: 'none',
            cursor: 'pointer',
          }}
          onMouseEnter={() => setBtnHovered(true)}
          onMouseLeave={() => setBtnHovered(false)}
          onClick={() => navigate('/instructions')}
        >
          Identify Another Turtle
        </button>
      </div>

      <Footer onAbout={() => navigate('/about')} />
    </div>
  );
}
