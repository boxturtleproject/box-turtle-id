// src/pages/WelcomePage.tsx
import { useState } from 'react';

interface WelcomePageProps {
  onGetStarted: () => void;
}

export function WelcomePage({ onGetStarted }: WelcomePageProps) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      className="flex flex-col items-center justify-between w-full px-8 py-16"
      style={{ backgroundColor: '#0a1a0e', minHeight: '100dvh' }}
    >
      {/* Top spacer */}
      <div />

      {/* Center content */}
      <div className="flex flex-col items-center gap-6 text-center">
        <h1
          className="text-5xl font-bold"
          style={{
            fontFamily: "'Playfair Display', serif",
            color: '#f0ede6',
            letterSpacing: '0.12em',
          }}
        >
          Box Turtle ID
        </h1>

        <p
          className="text-xs uppercase"
          style={{
            fontFamily: "'DM Mono', monospace",
            color: '#6b8f71',
            letterSpacing: '0.3em',
          }}
        >
          Submit a photo to identify your turtle
        </p>
      </div>

      {/* Bottom CTA */}
      <div className="w-full max-w-xs">
        <button
          type="button"
          className="w-full py-4 text-xs uppercase border transition-all duration-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
          style={{
            fontFamily: "'DM Mono', monospace",
            letterSpacing: '0.25em',
            color: hovered ? '#0a1a0e' : '#6b8f71',
            borderColor: '#6b8f71',
            backgroundColor: hovered ? '#6b8f71' : 'transparent',
            outlineColor: '#6b8f71',
          }}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          onClick={onGetStarted}
        >
          Get Started
        </button>
      </div>
    </div>
  );
}
