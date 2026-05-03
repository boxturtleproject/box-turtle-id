import { useState, type CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { fetchEncounterDetail, imageUrl } from '../shared/lib/api';
import type { EncounterResponse } from '../shared/types';

const META_LABEL: CSSProperties = {
  fontFamily: 'var(--font-body)',
  color: 'var(--color-text-muted)',
  fontSize: '0.6rem',
  letterSpacing: '0.22em',
  textTransform: 'uppercase',
};

export function formatDate(value: string | null | undefined): string {
  if (!value) return '—';
  return value.slice(0, 10);
}

interface EncounterCardProps {
  encounter: EncounterResponse;
  siteColor: string;
  /** When set, renders a small turtle context line (id + nickname) and links to the turtle profile. */
  turtleContext?: { id: number; external_id: string; name: string | null };
  /** When true, the card is highlighted (used by /admin/encounters to mark the current map filter). */
  selected?: boolean;
  /** Called on header click. When provided, the card no longer manages its own
   * expanded state — the parent decides via `selected`. */
  onSelect?: () => void;
}

export function EncounterCard({
  encounter, siteColor, turtleContext, selected, onSelect,
}: EncounterCardProps) {
  const [internalExpanded, setInternalExpanded] = useState(false);
  // When the parent owns selection (onSelect provided), drive expansion off
  // selected so the card opens when its pins are showing on the map.
  const expanded = onSelect ? !!selected : internalExpanded;
  const setExpanded = (v: boolean) => {
    if (onSelect) return; // parent owns it
    setInternalExpanded(v);
  };
  const date = formatDate(encounter.encounter_date);
  const hasTags = !!(encounter.health_status || encounter.behavior || encounter.setting || encounter.conditions);
  const hasNotes = !!encounter.notes;
  const hasFooter = !!(encounter.observer_nickname || encounter.survey_id || encounter.capture_count > 0);
  const hasPhotos = encounter.capture_count > 0;
  const hasMore = hasTags || hasNotes || hasFooter || hasPhotos;

  const { data: detail, isLoading: detailLoading } = useQuery({
    queryKey: ['encounter', encounter.id],
    queryFn: () => fetchEncounterDetail(encounter.id),
    enabled: expanded && hasPhotos,
  });

  return (
    <li
      id={`encounter-card-${encounter.id}`}
      style={{
        backgroundColor: selected ? '#fffbe6' : 'var(--color-bg)',
        border: `1px solid ${selected ? '#d4a017' : 'var(--color-border)'}`,
        borderLeft: `3px solid ${siteColor}`,
        scrollMarginTop: '1rem',
        transition: 'background-color 0.15s, border-color 0.15s',
      }}
    >
      <button
        type="button"
        onClick={() => {
          if (onSelect) onSelect();
          else if (hasMore) setExpanded(!expanded);
        }}
        className="w-full text-left"
        style={{
          background: 'transparent',
          border: 'none',
          padding: '1rem 1.25rem',
          cursor: (onSelect || hasMore) ? 'pointer' : 'default',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.35rem',
        }}
      >
        <div className="flex items-baseline justify-between gap-3 flex-wrap">
          <div className="flex items-baseline gap-3 flex-wrap">
            <span
              style={{
                fontFamily: 'var(--font-heading)',
                fontWeight: 700,
                fontSize: '1rem',
                letterSpacing: '0.04em',
                color: 'var(--color-text-primary)',
              }}
            >
              {date}
            </span>
            {encounter.external_id && (
              <span
                style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: '0.65rem',
                  letterSpacing: '0.18em',
                  textTransform: 'uppercase',
                  color: 'var(--color-text-muted)',
                }}
              >
                {encounter.external_id}
              </span>
            )}
          </div>
          <div className="flex gap-3 items-baseline">
            {encounter.identified && <Badge label={encounter.identified} />}
            {encounter.plot_name && (
              <span style={{ ...META_LABEL, color: siteColor, fontWeight: 600 }}>
                {encounter.plot_name}
              </span>
            )}
            {hasMore && (
              <span
                aria-hidden
                style={{
                  ...META_LABEL,
                  color: 'var(--color-text-muted)',
                  transition: 'transform 0.15s',
                  transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
                  display: 'inline-block',
                }}
              >
                ▾
              </span>
            )}
          </div>
        </div>
        {turtleContext && (
          <div className="flex items-baseline gap-2 mt-0.5">
            <span style={META_LABEL}>Turtle</span>
            <Link
              to={`/admin/turtles/${turtleContext.id}`}
              onClick={(e) => e.stopPropagation()}
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: '0.85rem',
                color: 'var(--color-text-primary)',
                fontWeight: 600,
              }}
            >
              {turtleContext.external_id}
              {turtleContext.name && (
                <span style={{ color: 'var(--color-text-secondary)', fontWeight: 400, marginLeft: '0.4rem' }}>
                  {turtleContext.name}
                </span>
              )}
            </Link>
          </div>
        )}
      </button>

      {expanded && hasMore && (
        <div
          className="px-5 pb-4 flex flex-col gap-3"
          style={{ borderTop: '1px solid var(--color-border)', paddingTop: '0.875rem' }}
        >
          {hasTags && (
            <div className="flex flex-wrap gap-x-5 gap-y-1.5">
              {encounter.health_status && <TagPair label="Health" value={encounter.health_status} />}
              {encounter.behavior && <TagPair label="Behavior" value={encounter.behavior} />}
              {encounter.setting && <TagPair label="Setting" value={encounter.setting} />}
              {encounter.conditions && <TagPair label="Conditions" value={encounter.conditions} />}
            </div>
          )}
          {hasNotes && (
            <p
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: '0.85rem',
                lineHeight: 1.5,
                color: 'var(--color-text-primary)',
                whiteSpace: 'pre-wrap',
              }}
            >
              {encounter.notes}
            </p>
          )}
          {hasPhotos && (
            <div className="flex flex-col gap-1.5">
              <span style={META_LABEL}>
                Photos ({encounter.capture_count})
              </span>
              {detailLoading && (
                <p style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>Loading…</p>
              )}
              {detail && detail.captures && detail.captures.length > 0 && (
                <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-6 gap-2">
                  {detail.captures.map((cap) => (
                    <a
                      key={cap.id}
                      href={imageUrl(cap.display_url ?? cap.display_path ?? cap.image_path)}
                      target="_blank"
                      rel="noreferrer"
                      title={`${cap.image_type.replace('_', ' ')} · ${cap.original_filename}`}
                      style={{
                        display: 'block',
                        aspectRatio: '1/1',
                        overflow: 'hidden',
                        backgroundColor: 'var(--color-bg-card)',
                        border: '1px solid var(--color-border)',
                      }}
                    >
                      <img
                        src={imageUrl(cap.thumbnail_url ?? cap.thumbnail_path ?? cap.image_path)}
                        alt={cap.original_filename}
                        loading="lazy"
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                          display: 'block',
                        }}
                      />
                    </a>
                  ))}
                </div>
              )}
            </div>
          )}
          {hasFooter && (
            <div className="flex gap-3 flex-wrap pt-1" style={META_LABEL}>
              {encounter.observer_nickname && <span>Observer: {encounter.observer_nickname}</span>}
              {encounter.survey_id && <span>Survey: {encounter.survey_id}</span>}
            </div>
          )}
        </div>
      )}
    </li>
  );
}

function TagPair({ label, value }: { label: string; value: string }) {
  return (
    <span className="inline-flex items-baseline gap-1.5">
      <span style={META_LABEL}>{label}</span>
      <span
        style={{
          fontFamily: 'var(--font-body)',
          fontSize: '0.8rem',
          color: 'var(--color-text-primary)',
        }}
      >
        {value}
      </span>
    </span>
  );
}

function Badge({ label }: { label: string }) {
  const palette: Record<string, { bg: string; fg: string }> = {
    Matched: { bg: '#dcfce7', fg: '#166534' },
    'Potential Match': { bg: '#fef9c3', fg: '#854d0e' },
    Unmatched: { bg: '#fee2e2', fg: '#991b1b' },
    New: { bg: '#dbeafe', fg: '#1e40af' },
  };
  const colors = palette[label] ?? { bg: 'var(--color-bg-card)', fg: 'var(--color-text-secondary)' };
  return (
    <span
      style={{
        backgroundColor: colors.bg,
        color: colors.fg,
        fontFamily: 'var(--font-body)',
        fontSize: '0.6rem',
        letterSpacing: '0.18em',
        textTransform: 'uppercase',
        fontWeight: 700,
        padding: '0.25rem 0.625rem',
      }}
    >
      {label}
    </span>
  );
}
