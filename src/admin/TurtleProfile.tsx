import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { fetchTurtle, fetchEncounters, imageUrl } from '../shared/lib/api';
import type { CaptureResponse, EncounterResponse, TurtleResponse } from '../shared/types';

const SITE_COLOR: Record<string, string> = {
  patuxent: '#3a7d44',
  wallkill: '#c8622a',
};

const META_LABEL: CSSProperties = {
  fontFamily: 'var(--font-body)',
  color: 'var(--color-text-muted)',
  fontSize: '0.6rem',
  letterSpacing: '0.22em',
  textTransform: 'uppercase',
};

const META_VALUE: CSSProperties = {
  fontFamily: 'var(--font-body)',
  color: 'var(--color-text-primary)',
  fontSize: '0.875rem',
  fontWeight: 500,
};

const SECTION_LABEL: CSSProperties = {
  fontFamily: 'var(--font-body)',
  color: 'var(--color-text-muted)',
  fontSize: '0.6rem',
  letterSpacing: '0.22em',
  textTransform: 'uppercase',
};

const TYPE_LABEL: Record<string, string> = {
  carapace_top: 'Top',
  carapace_left: 'Left',
  carapace_right: 'Right',
  plastron: 'Plastron',
  front: 'Front',
  rear: 'Rear',
  back: 'Back',
  site_view: 'Site',
  other: 'Other',
};

const TYPE_ORDER = [
  'carapace_top',
  'carapace_left',
  'carapace_right',
  'plastron',
  'front',
  'rear',
  'back',
  'site_view',
  'other',
];

function formatDate(value: string | null | undefined): string {
  if (!value) return '—';
  // Strip time portion if present
  return value.slice(0, 10);
}

export default function TurtleProfile() {
  const { id } = useParams<{ id: string }>();
  const turtleId = Number(id);

  const {
    data: turtle,
    isLoading: turtleLoading,
    error: turtleError,
  } = useQuery({
    queryKey: ['turtle', turtleId],
    queryFn: () => fetchTurtle(turtleId),
    enabled: !isNaN(turtleId),
  });

  const { data: encounters, isLoading: encountersLoading } = useQuery({
    queryKey: ['encounters', turtleId],
    queryFn: () => fetchEncounters(turtleId),
    enabled: !isNaN(turtleId),
  });

  if (turtleLoading) {
    return (
      <div className="min-h-dvh" style={{ backgroundColor: 'var(--color-bg-card)' }}>
        <div className="max-w-5xl mx-auto px-6 pt-10">
          <p style={{ color: 'var(--color-text-muted)' }}>Loading…</p>
        </div>
      </div>
    );
  }
  if (turtleError) {
    return (
      <div className="min-h-dvh" style={{ backgroundColor: 'var(--color-bg-card)' }}>
        <div className="max-w-5xl mx-auto px-6 pt-10">
          <p style={{ color: 'var(--color-text-error)' }}>
            Error: {(turtleError as Error).message}
          </p>
        </div>
      </div>
    );
  }
  if (!turtle) return null;

  const siteColor = turtle.site ? SITE_COLOR[turtle.site] ?? '#888' : '#888';

  return (
    <div className="min-h-dvh" style={{ backgroundColor: 'var(--color-bg-card)' }}>
      <div className="max-w-5xl mx-auto px-6 pt-10 pb-16 flex flex-col gap-8">
        <BackLink />

        <Header turtle={turtle} siteColor={siteColor} />

        <DetailsBlock turtle={turtle} siteColor={siteColor} />

        <CapturesBlock captures={turtle.captures} siteColor={siteColor} />

        <EncountersBlock
          encounters={encounters}
          loading={encountersLoading}
          siteColor={siteColor}
        />
      </div>
    </div>
  );
}

function BackLink() {
  const [hovered, setHovered] = useState(false);
  return (
    <Link
      to="/admin"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        ...META_LABEL,
        color: hovered ? 'var(--color-text-primary)' : 'var(--color-text-muted)',
        transition: 'color 0.15s',
        width: 'fit-content',
      }}
    >
      ← Back to Dashboard
    </Link>
  );
}

function Header({ turtle, siteColor }: { turtle: TurtleResponse; siteColor: string }) {
  return (
    <div
      style={{
        backgroundColor: 'var(--color-bg)',
        borderTop: `3px solid ${siteColor}`,
        border: '1px solid var(--color-border)',
        padding: '1.75rem 2rem',
      }}
    >
      <div className="flex items-baseline gap-3">
        <span
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: '0.65rem',
            letterSpacing: '0.28em',
            textTransform: 'uppercase',
            color: siteColor,
            fontWeight: 600,
          }}
        >
          {turtle.site ?? 'Unknown Site'}
        </span>
        <span style={META_LABEL}>·</span>
        <span style={META_LABEL}>{turtle.species ?? 'Unidentified species'}</span>
      </div>
      <h1
        className="mt-1"
        style={{
          fontFamily: 'var(--font-heading)',
          fontWeight: 700,
          letterSpacing: '0.05em',
          fontSize: '2rem',
          color: 'var(--color-text-primary)',
        }}
      >
        {turtle.external_id}
        {turtle.name && (
          <span
            style={{
              fontFamily: 'var(--font-heading)',
              fontWeight: 400,
              letterSpacing: '0.02em',
              fontSize: '1.5rem',
              color: 'var(--color-text-secondary)',
              marginLeft: '0.75rem',
            }}
          >
            {turtle.name}
          </span>
        )}
      </h1>
      <div className="mt-4 grid grid-cols-3 gap-px" style={{ backgroundColor: 'var(--color-border)' }}>
        <HeaderStat label="Captures" value={turtle.capture_count} />
        <HeaderStat label="Encounters" value={turtle.encounter_count} accent={siteColor} />
        <HeaderStat label="First Identified" value={formatDate(turtle.first_seen)} />
      </div>
    </div>
  );
}

function HeaderStat({ label, value, accent }: { label: string; value: string | number; accent?: string }) {
  return (
    <div
      style={{
        backgroundColor: 'var(--color-bg)',
        padding: '0.875rem 1rem',
      }}
    >
      <div style={META_LABEL}>{label}</div>
      <div
        className="mt-1"
        style={{
          fontFamily: 'var(--font-heading)',
          fontWeight: 700,
          fontSize: '1.5rem',
          color: accent ?? 'var(--color-text-primary)',
          lineHeight: 1.1,
        }}
      >
        {value}
      </div>
    </div>
  );
}

function DetailsBlock({ turtle, siteColor: _siteColor }: { turtle: TurtleResponse; siteColor: string }) {
  // Order matches the cognitive flow of the Airtable Turtles record
  const fields: Array<[string, string | null | undefined]> = [
    ['Gender', turtle.gender],
    ['Pattern', turtle.pattern],
    ['Identifying Marks', turtle.identifying_marks],
    ['Eye Color', turtle.eye_color],
    ['Carapace Flare', turtle.carapace_flare],
    ['Plastron Depression', turtle.plastron_depression],
    ['Health Status', turtle.health_status],
    ['Residence Status', turtle.residence_status],
    ['Plot(s)', turtle.plots_text],
  ];
  const visible = fields.filter(([, v]) => v != null && v !== '');

  return (
    <Section label="Details">
      <div
        style={{
          backgroundColor: 'var(--color-bg)',
          border: '1px solid var(--color-border)',
          padding: '1.5rem 1.75rem',
        }}
      >
        {visible.length === 0 ? (
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
            No additional metadata recorded.
          </p>
        ) : (
          <dl
            className="grid grid-cols-2 sm:grid-cols-3 gap-x-8"
            style={{ rowGap: '1.25rem' }}
          >
            {visible.map(([label, value]) => (
              <div key={label} className="flex flex-col gap-1">
                <dt style={META_LABEL}>{label}</dt>
                <dd style={META_VALUE}>{value}</dd>
              </div>
            ))}
          </dl>
        )}
        {turtle.notes && (
          <div
            className="mt-6 pt-4"
            style={{ borderTop: '1px solid var(--color-border)' }}
          >
            <div style={META_LABEL}>Notes</div>
            <p
              className="mt-2"
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: '0.95rem',
                lineHeight: 1.55,
                color: 'var(--color-text-primary)',
                whiteSpace: 'pre-wrap',
              }}
            >
              {turtle.notes}
            </p>
          </div>
        )}
      </div>
    </Section>
  );
}

function CapturesBlock({ captures, siteColor }: { captures: CaptureResponse[]; siteColor: string }) {
  const [filter, setFilter] = useState<string>('all');
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const sortedTypes = useMemo(() => {
    const present = new Set(captures.map((c) => c.image_type));
    return TYPE_ORDER.filter((t) => present.has(t));
  }, [captures]);

  const sortedCaptures = useMemo(() => {
    const order = new Map(TYPE_ORDER.map((t, i) => [t, i]));
    return [...captures].sort((a, b) => {
      // Primary: captured_date descending (newest first); rows without dates go last
      const ad = a.captured_date ?? '';
      const bd = b.captured_date ?? '';
      if (ad && bd && ad !== bd) return bd.localeCompare(ad);
      if (ad && !bd) return -1;
      if (!ad && bd) return 1;
      // Same-day or no-date: keep semantic image_type order so the carapace
      // top/left/right of one session stay together in the lightbox
      const ai = order.get(a.image_type) ?? 99;
      const bi = order.get(b.image_type) ?? 99;
      return ai - bi || a.id - b.id;
    });
  }, [captures]);

  const filteredCaptures = useMemo(() => {
    if (filter === 'all') return sortedCaptures;
    return sortedCaptures.filter((c) => c.image_type === filter);
  }, [sortedCaptures, filter]);

  if (captures.length === 0) {
    return (
      <Section label={`Captures (0)`}>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
          No photos imported for this turtle.
        </p>
      </Section>
    );
  }

  return (
    <Section label={`Captures (${captures.length})`}>
      {/* Type filter chips */}
      <div className="flex flex-wrap gap-2 mb-4">
        <FilterChip
          label={`All (${captures.length})`}
          active={filter === 'all'}
          onClick={() => setFilter('all')}
          accent={siteColor}
        />
        {sortedTypes.map((t) => {
          const n = captures.filter((c) => c.image_type === t).length;
          return (
            <FilterChip
              key={t}
              label={`${TYPE_LABEL[t] ?? t} (${n})`}
              active={filter === t}
              onClick={() => setFilter(t)}
              accent={siteColor}
            />
          );
        })}
      </div>

      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
        {filteredCaptures.map((cap, idx) => (
          <button
            key={cap.id}
            type="button"
            onClick={() => setLightboxIndex(idx)}
            className="group flex flex-col"
            style={{
              backgroundColor: 'var(--color-bg)',
              border: '1px solid var(--color-border)',
              cursor: 'pointer',
              textAlign: 'left',
              padding: 0,
              transition: 'transform 0.15s, box-shadow 0.15s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = '0 4px 14px rgba(0,0,0,0.12)';
              e.currentTarget.style.transform = 'translateY(-1px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = 'none';
              e.currentTarget.style.transform = 'none';
            }}
          >
            <div
              className="aspect-square overflow-hidden"
              style={{ backgroundColor: 'var(--color-bg-card)' }}
            >
              <img
                src={imageUrl(cap.thumbnail_url ?? cap.thumbnail_path ?? cap.image_path)}
                alt={cap.original_filename}
                loading="lazy"
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.04]"
              />
            </div>
            <div className="px-2 py-2 flex flex-col gap-0.5">
              <span style={{ ...META_LABEL, fontSize: '0.55rem' }}>
                {TYPE_LABEL[cap.image_type] ?? cap.image_type}
              </span>
              <span
                style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: '0.7rem',
                  color: 'var(--color-text-muted)',
                }}
              >
                {cap.keypoint_count > 0 ? `${cap.keypoint_count.toLocaleString()} kp` : '—'}
              </span>
            </div>
          </button>
        ))}
      </div>

      {lightboxIndex !== null && (
        <Lightbox
          captures={filteredCaptures}
          index={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onNavigate={(i) => setLightboxIndex(i)}
        />
      )}
    </Section>
  );
}

function FilterChip({
  label, active, onClick, accent,
}: { label: string; active: boolean; onClick: () => void; accent: string }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        fontFamily: 'var(--font-body)',
        fontSize: '0.65rem',
        letterSpacing: '0.18em',
        textTransform: 'uppercase',
        fontWeight: 600,
        padding: '0.5rem 0.875rem',
        backgroundColor: active
          ? accent
          : hovered
            ? 'var(--color-bg-card-hover)'
            : 'var(--color-bg)',
        color: active ? '#fff' : 'var(--color-text-secondary)',
        border: `1px solid ${active ? accent : 'var(--color-border)'}`,
        cursor: 'pointer',
        transition: 'all 0.15s',
      }}
    >
      {label}
    </button>
  );
}

function Lightbox({
  captures, index, onClose, onNavigate,
}: {
  captures: CaptureResponse[];
  index: number;
  onClose: () => void;
  onNavigate: (i: number) => void;
}) {
  const cap = captures[index];

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft' && index > 0) onNavigate(index - 1);
      if (e.key === 'ArrowRight' && index < captures.length - 1) onNavigate(index + 1);
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [index, captures.length, onClose, onNavigate]);

  if (!cap) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0,0,0,0.92)',
        zIndex: 100,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Top bar */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex items-center justify-between px-6 py-4"
        style={{ color: '#fff' }}
      >
        <div className="flex flex-col">
          <span
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: '0.6rem',
              letterSpacing: '0.22em',
              textTransform: 'uppercase',
              color: 'rgba(255,255,255,0.5)',
            }}
          >
            {TYPE_LABEL[cap.image_type] ?? cap.image_type} · {index + 1} / {captures.length}
          </span>
          <span
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: '0.85rem',
              color: 'rgba(255,255,255,0.85)',
            }}
          >
            {cap.original_filename}
          </span>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          style={{
            background: 'transparent',
            border: '1px solid rgba(255,255,255,0.3)',
            color: '#fff',
            padding: '0.5rem 0.875rem',
            fontSize: '0.65rem',
            letterSpacing: '0.22em',
            textTransform: 'uppercase',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Close (Esc)
        </button>
      </div>

      {/* Main image area */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex-1 flex items-center justify-center px-6 relative"
      >
        {index > 0 && (
          <NavArrow direction="prev" onClick={() => onNavigate(index - 1)} />
        )}
        <img
          src={imageUrl(cap.display_url ?? cap.display_path ?? cap.image_path)}
          alt={cap.original_filename}
          style={{
            maxWidth: '100%',
            maxHeight: '100%',
            objectFit: 'contain',
          }}
        />
        {index < captures.length - 1 && (
          <NavArrow direction="next" onClick={() => onNavigate(index + 1)} />
        )}
      </div>

      {/* Filmstrip */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="px-6 py-4 overflow-x-auto"
        style={{ borderTop: '1px solid rgba(255,255,255,0.1)' }}
      >
        <div className="flex gap-2">
          {captures.map((c, i) => (
            <button
              key={c.id}
              type="button"
              onClick={() => onNavigate(i)}
              aria-label={`View capture ${i + 1}`}
              style={{
                flex: '0 0 auto',
                width: 72,
                height: 72,
                padding: 0,
                cursor: 'pointer',
                background: 'transparent',
                border: i === index ? '2px solid #fff' : '2px solid transparent',
                opacity: i === index ? 1 : 0.55,
                transition: 'opacity 0.15s, border 0.15s',
              }}
            >
              <img
                src={imageUrl(c.thumbnail_url ?? c.thumbnail_path ?? c.image_path)}
                alt=""
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function NavArrow({ direction, onClick }: { direction: 'prev' | 'next'; onClick: () => void }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      aria-label={direction === 'prev' ? 'Previous' : 'Next'}
      style={{
        position: 'absolute',
        [direction === 'prev' ? 'left' : 'right']: '1.5rem',
        top: '50%',
        transform: 'translateY(-50%)',
        width: 48,
        height: 48,
        backgroundColor: hovered ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.08)',
        border: '1px solid rgba(255,255,255,0.2)',
        color: '#fff',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '1.5rem',
        transition: 'background-color 0.15s',
      }}
    >
      {direction === 'prev' ? '‹' : '›'}
    </button>
  );
}

function EncountersBlock({
  encounters, loading, siteColor,
}: { encounters: EncounterResponse[] | undefined; loading: boolean; siteColor: string }) {
  return (
    <Section label={`Encounters${encounters ? ` (${encounters.length})` : ''}`}>
      {loading && (
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>Loading…</p>
      )}
      {encounters && encounters.length === 0 && (
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
          No encounters recorded.
        </p>
      )}
      {encounters && encounters.length > 0 && (
        <ul className="flex flex-col gap-3">
          {encounters.map((enc) => (
            <EncounterCard key={enc.id} encounter={enc} siteColor={siteColor} />
          ))}
        </ul>
      )}
    </Section>
  );
}

function EncounterCard({ encounter, siteColor }: { encounter: EncounterResponse; siteColor: string }) {
  const date = formatDate(encounter.encounter_date);
  return (
    <li
      style={{
        backgroundColor: 'var(--color-bg)',
        border: '1px solid var(--color-border)',
        borderLeft: `3px solid ${siteColor}`,
        padding: '1rem 1.25rem',
      }}
    >
      <div className="flex items-baseline justify-between gap-3 flex-wrap">
        <div className="flex items-baseline gap-3">
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
          {encounter.identified && (
            <Badge label={encounter.identified} />
          )}
          {encounter.plot_name && (
            <span style={{ ...META_LABEL, color: siteColor, fontWeight: 600 }}>
              {encounter.plot_name}
            </span>
          )}
        </div>
      </div>

      {/* Tag row */}
      {(encounter.health_status || encounter.behavior || encounter.setting || encounter.conditions) && (
        <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1.5">
          {encounter.health_status && <TagPair label="Health" value={encounter.health_status} />}
          {encounter.behavior && <TagPair label="Behavior" value={encounter.behavior} />}
          {encounter.setting && <TagPair label="Setting" value={encounter.setting} />}
          {encounter.conditions && <TagPair label="Conditions" value={encounter.conditions} />}
        </div>
      )}

      {encounter.notes && (
        <p
          className="mt-2"
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

      <div className="mt-2 flex gap-3" style={META_LABEL}>
        {encounter.observer_nickname && <span>Observer: {encounter.observer_nickname}</span>}
        {encounter.survey_id && <span>Survey: {encounter.survey_id}</span>}
        {encounter.capture_count > 0 && <span>{encounter.capture_count} photo{encounter.capture_count !== 1 ? 's' : ''}</span>}
      </div>
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
  // Identified badge — Matched / Potential / Unmatched / New
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

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3">
      <span style={SECTION_LABEL}>{label}</span>
      {children}
    </div>
  );
}
