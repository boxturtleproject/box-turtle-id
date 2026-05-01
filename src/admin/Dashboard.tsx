import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { fetchTurtles, imageUrl } from '../shared/lib/api';
import type { TurtleResponse } from '../shared/types';

const SITE_COLOR: Record<string, string> = {
  patuxent: '#3a7d44',
  wallkill: '#c8622a',
};

const META_LABEL: React.CSSProperties = {
  fontFamily: 'var(--font-body)',
  color: 'var(--color-text-muted)',
  fontSize: '0.6rem',
  letterSpacing: '0.18em',
  textTransform: 'uppercase',
};

const META_VALUE: React.CSSProperties = {
  fontFamily: 'var(--font-body)',
  color: 'var(--color-text-primary)',
  fontSize: '0.8rem',
  fontWeight: 500,
};

function TurtleCard({ turtle }: { turtle: TurtleResponse }) {
  // Prefer left side photo, then top, then any capture
  const leftCapture = turtle.captures?.find((c) => c.image_type === 'carapace_left');
  const topCapture = turtle.captures?.find((c) => c.image_type === 'carapace_top');
  const heroCapture = leftCapture ?? topCapture ?? turtle.captures?.[0];
  const heroSrc = heroCapture
    ? imageUrl(
        heroCapture.thumbnail_url ??
          heroCapture.thumbnail_path ??
          heroCapture.display_url ??
          heroCapture.image_path,
      )
    : null;

  const siteColor = turtle.site ? SITE_COLOR[turtle.site] ?? '#888' : '#888';

  return (
    <Link
      to={`/admin/turtles/${turtle.id}`}
      className="group flex flex-col overflow-hidden transition-all hover:-translate-y-0.5"
      style={{
        backgroundColor: 'var(--color-bg)',
        border: '1px solid var(--color-border)',
        borderTop: `3px solid ${siteColor}`,
      }}
    >
      {/* Hero image */}
      <div
        className="aspect-[4/3] overflow-hidden"
        style={{ backgroundColor: 'var(--color-bg-card)' }}
      >
        {heroSrc ? (
          <img
            src={heroSrc}
            alt={turtle.name || turtle.external_id}
            loading="lazy"
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-300 text-4xl">🐢</div>
        )}
      </div>

      {/* Info */}
      <div className="px-4 py-3 flex flex-col gap-2.5 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <div
            style={{
              fontFamily: 'var(--font-heading)',
              fontWeight: 700,
              letterSpacing: '0.06em',
              fontSize: '0.95rem',
              color: 'var(--color-text-primary)',
            }}
          >
            {turtle.external_id}
          </div>
          {turtle.site && (
            <span
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: '0.55rem',
                letterSpacing: '0.2em',
                textTransform: 'uppercase',
                color: siteColor,
                fontWeight: 600,
              }}
            >
              {turtle.site}
            </span>
          )}
        </div>

        {turtle.name && (
          <div
            style={{
              fontFamily: 'var(--font-heading)',
              fontSize: '1.05rem',
              fontWeight: 500,
              color: 'var(--color-text-primary)',
              lineHeight: 1.2,
            }}
          >
            {turtle.name}
          </div>
        )}

        <div className="flex flex-col gap-1.5 mt-1">
          {turtle.pattern && (
            <div className="flex flex-col gap-0.5">
              <span style={META_LABEL}>Pattern</span>
              <span style={META_VALUE}>{turtle.pattern}</span>
            </div>
          )}
          {turtle.gender && (
            <div className="flex flex-col gap-0.5">
              <span style={META_LABEL}>Gender</span>
              <span style={META_VALUE}>{turtle.gender}</span>
            </div>
          )}
          {turtle.first_seen && (
            <div className="flex flex-col gap-0.5">
              <span style={META_LABEL}>First Identified</span>
              <span style={META_VALUE}>{turtle.first_seen}</span>
            </div>
          )}
        </div>

        <div
          className="mt-auto pt-2 flex items-center justify-between"
          style={{ borderTop: '1px solid var(--color-border)' }}
        >
          <span style={META_LABEL}>Encounters</span>
          <span
            style={{
              fontFamily: 'var(--font-heading)',
              fontWeight: 700,
              fontSize: '1rem',
              color: siteColor,
            }}
          >
            {turtle.encounter_count ?? 0}
          </span>
        </div>
      </div>
    </Link>
  );
}

export default function Dashboard() {
  const { data: turtles, isLoading, error } = useQuery({
    queryKey: ['turtles'],
    queryFn: fetchTurtles,
  });

  const total = turtles?.length ?? 0;
  const patuxentCount = turtles?.filter((t) => t.site === 'patuxent').length ?? 0;
  const wallkillCount = turtles?.filter((t) => t.site === 'wallkill').length ?? 0;

  return (
    <div
      className="min-h-dvh"
      style={{ backgroundColor: 'var(--color-bg-card)' }}
    >
      <div className="max-w-6xl mx-auto px-6 pt-10 pb-16 flex flex-col gap-10">
        {/* Header */}
        <div className="flex flex-col gap-2">
          <span
            style={{
              fontFamily: 'var(--font-body)',
              color: 'var(--color-text-muted)',
              fontSize: '0.65rem',
              letterSpacing: '0.28em',
              textTransform: 'uppercase',
            }}
          >
            Box Turtle ID
          </span>
          <h1
            className="text-3xl"
            style={{
              fontFamily: 'var(--font-heading)',
              fontWeight: 700,
              letterSpacing: '0.04em',
              color: 'var(--color-text-primary)',
            }}
          >
            Admin
          </h1>
        </div>

        {/* Stat tiles */}
        <div className="grid grid-cols-3 gap-px" style={{ backgroundColor: 'var(--color-border)' }}>
          <StatTile label="Total Turtles" value={isLoading ? '…' : total} accent="var(--color-text-primary)" />
          <StatTile label="Patuxent" value={isLoading ? '…' : patuxentCount} accent="#3a7d44" />
          <StatTile label="Wallkill" value={isLoading ? '…' : wallkillCount} accent="#c8622a" />
        </div>

        {/* Quick actions */}
        <div className="flex flex-col gap-3">
          <span
            style={{
              fontFamily: 'var(--font-body)',
              color: 'var(--color-text-muted)',
              fontSize: '0.6rem',
              letterSpacing: '0.22em',
              textTransform: 'uppercase',
            }}
          >
            Tools
          </span>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <ActionButton to="/admin/compare" label="Compare" />
            <ActionButton to="/admin/search" label="Search" />
            <ActionButton to="/admin/settings" label="Settings" />
            <ActionButton to="/admin/sync" label="Sync" />
          </div>
        </div>

        {/* Turtle grid */}
        <div className="flex flex-col gap-3">
          <span
            style={{
              fontFamily: 'var(--font-body)',
              color: 'var(--color-text-muted)',
              fontSize: '0.6rem',
              letterSpacing: '0.22em',
              textTransform: 'uppercase',
            }}
          >
            Turtles
          </span>
          {error && (
            <p style={{ color: 'var(--color-text-error)', fontSize: '0.85rem' }}>
              Error loading turtles: {(error as Error).message}
            </p>
          )}
          {isLoading && (
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>Loading…</p>
          )}
          {turtles && turtles.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {turtles.map((turtle) => (
                <TurtleCard key={turtle.id} turtle={turtle} />
              ))}
            </div>
          )}
          {turtles && turtles.length === 0 && (
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', textAlign: 'center', padding: '2rem 0' }}>
              No turtles yet. Submit some photos to get started.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function StatTile({ label, value, accent }: { label: string; value: number | string; accent: string }) {
  return (
    <div
      style={{
        backgroundColor: 'var(--color-bg)',
        padding: '1.25rem 1.5rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem',
      }}
    >
      <span
        style={{
          fontFamily: 'var(--font-body)',
          color: 'var(--color-text-muted)',
          fontSize: '0.6rem',
          letterSpacing: '0.22em',
          textTransform: 'uppercase',
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontFamily: 'var(--font-heading)',
          fontWeight: 700,
          fontSize: '2.25rem',
          letterSpacing: '0.02em',
          color: accent,
          lineHeight: 1,
        }}
      >
        {value}
      </span>
    </div>
  );
}

function ActionButton({ to, label }: { to: string; label: string }) {
  const [hovered, setHovered] = useState(false);
  return (
    <Link
      to={to}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'block',
        padding: '0.95rem 1rem',
        backgroundColor: hovered ? 'var(--color-btn-primary-bg-hover)' : 'var(--color-btn-primary-bg)',
        color: 'var(--color-btn-primary-text)',
        fontFamily: 'var(--font-body)',
        fontSize: '0.7rem',
        fontWeight: 600,
        letterSpacing: '0.22em',
        textTransform: 'uppercase',
        textAlign: 'center',
        boxShadow: hovered
          ? '0 4px 14px rgba(0,0,0,0.2)'
          : '0 2px 6px rgba(0,0,0,0.12)',
        transition: 'background-color 0.18s, box-shadow 0.18s',
      }}
    >
      {label}
    </Link>
  );
}
