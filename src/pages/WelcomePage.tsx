// src/pages/WelcomePage.tsx
import { useState } from 'react';
import type { Site } from '../App';

interface WelcomePageProps {
  onSelectSite: (site: Site) => void;
}

interface SiteCardProps {
  site: Site;
  name: string;
  location: string;
  onSelect: () => void;
}

function SiteCard({ name, location, onSelect }: SiteCardProps) {
  const [hovered, setHovered] = useState(false);

  return (
    <button
      type="button"
      className="w-full text-left"
      style={{
        background: 'none',
        border: 'none',
        padding: 0,
        cursor: 'pointer',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onSelect}
    >
      <div
        style={{
          backgroundColor: hovered ? '#142b19' : '#0f2414',
          border: '1px solid #1e3a24',
          overflow: 'hidden',
          transition: 'background-color 0.2s',
        }}
      >
        {/* Placeholder map image */}
        <div
          style={{
            width: '100%',
            aspectRatio: '16/9',
            backgroundColor: '#0a1a0e',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderBottom: '1px solid #1e3a24',
          }}
        >
          <span
            style={{
              fontFamily: "'DM Mono', monospace",
              color: '#2a4030',
              fontSize: '0.65rem',
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
            }}
          >
            Map coming soon
          </span>
        </div>

        {/* Card body */}
        <div style={{ padding: '1rem' }} className="flex flex-col gap-1">
          <span
            style={{
              fontFamily: "'Playfair Display', serif",
              color: '#f0ede6',
              fontSize: '1.25rem',
              fontWeight: 700,
              letterSpacing: '0.03em',
            }}
          >
            {name}
          </span>
          <span
            style={{
              fontFamily: "'DM Mono', monospace",
              color: '#a8c5ae',
              fontSize: '0.65rem',
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
            }}
          >
            {location}
          </span>
        </div>
      </div>
    </button>
  );
}

export function WelcomePage({ onSelectSite }: WelcomePageProps) {
  return (
    <div
      className="flex flex-col w-full px-8 py-16 gap-10"
      style={{ backgroundColor: '#0a1a0e', minHeight: '100dvh' }}
    >
      {/* Title */}
      <div className="flex flex-col items-center gap-4 text-center">
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
          Select your research site to get started
        </p>
      </div>

      {/* Site cards */}
      <div className="flex flex-col gap-4">
        <SiteCard
          site="patuxent"
          name="Patuxent Research Refuge"
          location="Maryland"
          onSelect={() => onSelectSite('patuxent')}
        />
        <SiteCard
          site="wallkill"
          name="Wallkill Valley Land Trust"
          location="New York"
          onSelect={() => onSelectSite('wallkill')}
        />
      </div>
    </div>
  );
}
