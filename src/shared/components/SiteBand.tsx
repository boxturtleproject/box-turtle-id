// src/components/SiteBand.tsx
import { useState } from 'react';
import type { CSSProperties } from 'react';
import type { Site } from '../types';

const SITE_COLORS: Record<Site, string> = {
  patuxent: '#3a7d44',
  wallkill: '#c8622a',
};

const SITE_NAMES: Record<Site, string> = {
  patuxent: 'Patuxent Research Refuge',
  wallkill: 'Wallkill Valley Land Trust',
};

interface SiteBandProps {
  site: Site;
  onWelcome?: () => void;
}

export function SiteBand({ site, onWelcome }: SiteBandProps) {
  const [hovered, setHovered] = useState(false);

  const textStyle: CSSProperties = {
    fontFamily: 'var(--font-body)',
    color: 'white',
    fontSize: '0.6rem',
    letterSpacing: '0.25em',
    textTransform: 'uppercase',
    fontVariant: 'small-caps',
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: '2.5rem',
        backgroundColor: SITE_COLORS[site],
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 50,
      }}
    >
      {onWelcome ? (
        <button
          type="button"
          onClick={onWelcome}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          style={{
            ...textStyle,
            background: 'none',
            border: 'none',
            padding: 0,
            cursor: 'pointer',
            opacity: hovered ? 0.75 : 1,
            transition: 'opacity 0.15s ease',
          }}
        >
          {SITE_NAMES[site]}
        </button>
      ) : (
        <span style={textStyle}>{SITE_NAMES[site]}</span>
      )}
    </div>
  );
}
