// src/components/SiteBand.tsx
import type { Site } from '../App';

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
}

export function SiteBand({ site }: SiteBandProps) {
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
      <span
        style={{
          fontFamily: 'var(--font-body)',
          color: 'white',
          fontSize: '0.6rem',
          letterSpacing: '0.25em',
          textTransform: 'uppercase',
          fontVariant: 'small-caps',
        }}
      >
        {SITE_NAMES[site]}
      </span>
    </div>
  );
}
