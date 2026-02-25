// src/pages/WelcomePage.tsx
import { useState } from 'react';
import type { Site } from '../App';
import patuxentMap from '../assets/patuxent-map.jpg';
import wallkillMap from '../assets/wallkill-map.jpg';

interface WelcomePageProps {
  onSelectSite: (site: Site) => void;
}

interface SiteCardProps {
  site: Site;
  name: string;
  location: string;
  mapImage: string;
  onSelect: () => void;
}

function SiteCard({ name, location, mapImage, onSelect }: SiteCardProps) {
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
          backgroundColor: hovered ? 'var(--color-bg-card-hover)' : 'var(--color-bg-card)',
          border: '1px solid var(--color-border)',
          overflow: 'hidden',
          transition: 'background-color 0.2s',
        }}
      >
        {/* Map image */}
        <img
          src={mapImage}
          alt={`${name} map`}
          style={{
            width: '100%',
            aspectRatio: '16/9',
            objectFit: 'cover',
            borderBottom: '1px solid var(--color-border)',
            display: 'block',
          }}
        />

        {/* Card body */}
        <div style={{ padding: '1rem' }} className="flex flex-col gap-1">
          <span
            style={{
              fontFamily: 'var(--font-heading)',
              color: 'var(--color-text-primary)',
              fontSize: '1.25rem',
              fontWeight: 700,
              letterSpacing: '0.03em',
            }}
          >
            {name}
          </span>
          <span
            style={{
              fontFamily: 'var(--font-body)',
              color: 'var(--color-text-muted)',
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
      style={{ backgroundColor: 'var(--color-bg)', minHeight: '100dvh' }}
    >
      {/* Title */}
      <div className="flex flex-col items-center gap-4 text-center">
        <h1
          className="text-5xl font-bold"
          style={{
            fontFamily: 'var(--font-heading)',
            color: 'var(--color-text-primary)',
            letterSpacing: '0.12em',
          }}
        >
          Box Turtle ID
        </h1>
        <p
          className="text-xs uppercase"
          style={{
            fontFamily: 'var(--font-body)',
            color: 'var(--color-text-secondary)',
            letterSpacing: '0.3em',
          }}
        >
          Select your research site to get started
        </p>
      </div>

      {/* Site cards — Wallkill first */}
      <div className="flex flex-col gap-4">
        <SiteCard
          site="wallkill"
          name="Wallkill Valley Land Trust"
          location="New York"
          mapImage={wallkillMap}
          onSelect={() => onSelectSite('wallkill')}
        />
        <SiteCard
          site="patuxent"
          name="Patuxent Research Refuge"
          location="Maryland"
          mapImage={patuxentMap}
          onSelect={() => onSelectSite('patuxent')}
        />
      </div>
    </div>
  );
}
