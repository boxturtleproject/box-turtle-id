import { createContext, useContext, useState, type ReactNode } from 'react';
import type { Site } from '../types';

interface SiteContextValue {
  site: Site | null;
  setSite: (site: Site) => void;
  siteName: string;
  siteColor: string;
}

const SITE_NAMES: Record<Site, string> = {
  patuxent: 'Patuxent',
  wallkill: 'Wallkill',
};

const SITE_COLORS: Record<Site, string> = {
  patuxent: '#3a7d44',
  wallkill: '#c8622a',
};

const SiteContext = createContext<SiteContextValue | null>(null);

export function SiteProvider({ children }: { children: ReactNode }) {
  const [site, setSite] = useState<Site | null>(null);

  const value: SiteContextValue = {
    site,
    setSite,
    siteName: site ? SITE_NAMES[site] : '',
    siteColor: site ? SITE_COLORS[site] : '#666',
  };

  return <SiteContext.Provider value={value}>{children}</SiteContext.Provider>;
}

export function useSite(): SiteContextValue {
  const ctx = useContext(SiteContext);
  if (!ctx) throw new Error('useSite must be used within SiteProvider');
  return ctx;
}
