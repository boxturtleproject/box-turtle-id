import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import {
  fetchAllEncounters,
  fetchCaptureLocations,
  imageUrl,
  type CaptureLocation,
} from '../shared/lib/api';
import { EncounterCard } from './EncounterCard';

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN ?? '';

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

const SECTION_LABEL: CSSProperties = {
  fontFamily: 'var(--font-body)',
  color: 'var(--color-text-muted)',
  fontSize: '0.6rem',
  letterSpacing: '0.22em',
  textTransform: 'uppercase',
};

const PAGE_SIZE = 25;

export default function Encounters() {
  const [turtleFilter, setTurtleFilter] = useState<number | 'all'>('all');
  const [page, setPage] = useState(0);

  // Reset to page 0 whenever the filter changes
  useEffect(() => { setPage(0); }, [turtleFilter]);

  const { data: paged, isLoading, error } = useQuery({
    queryKey: ['all-encounters', turtleFilter, page],
    queryFn: () => fetchAllEncounters({
      turtleId: turtleFilter === 'all' ? undefined : turtleFilter,
      skip: page * PAGE_SIZE,
      limit: PAGE_SIZE,
    }),
    placeholderData: (prev) => prev, // keep showing previous page while next loads
  });

  const { data: locations } = useQuery({
    queryKey: ['capture-locations'],
    queryFn: () => fetchCaptureLocations(),
  });

  // Turtle dropdown comes from the location endpoint so it shows every turtle
  // that exists in the system (one paginated encounter request would only see
  // the current page's turtles).
  const turtleOptions = useMemo(() => {
    if (!locations) return [];
    const byTurtle: Record<number, { id: number; label: string; site: string | null; count: number }> = {};
    for (const loc of locations) {
      const existing = byTurtle[loc.turtle_id];
      if (existing) {
        existing.count += 1;
      } else {
        const label = loc.turtle_name
          ? `${loc.turtle_external_id} · ${loc.turtle_name}`
          : loc.turtle_external_id;
        byTurtle[loc.turtle_id] = { id: loc.turtle_id, label, site: loc.site, count: 1 };
      }
    }
    return Object.values(byTurtle).sort((a, b) => a.label.localeCompare(b.label));
  }, [locations]);

  const items = paged?.items ?? [];
  const total = paged?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const fromIdx = total === 0 ? 0 : page * PAGE_SIZE + 1;
  const toIdx = Math.min(total, (page + 1) * PAGE_SIZE);

  return (
    <div className="min-h-dvh" style={{ backgroundColor: 'var(--color-bg-card)' }}>
      <div className="max-w-5xl mx-auto px-6 pt-10 pb-16 flex flex-col gap-8">
        <Link to="/admin" style={{ ...META_LABEL, width: 'fit-content' }}>
          ← Back to Dashboard
        </Link>

        <div className="flex flex-col gap-1">
          <span style={META_LABEL}>All sites</span>
          <h1
            style={{
              fontFamily: 'var(--font-heading)',
              fontWeight: 700,
              letterSpacing: '0.04em',
              fontSize: '1.75rem',
              color: 'var(--color-text-primary)',
            }}
          >
            Encounters
          </h1>
        </div>

        <EncountersMap
          locations={locations}
          turtleFilter={turtleFilter}
          sectionLabelStyle={SECTION_LABEL}
        />

        {/* Turtle filter */}
        <TurtleFilterBar
          options={turtleOptions}
          value={turtleFilter}
          onChange={setTurtleFilter}
        />

        {/* Encounter list */}
        <div className="flex flex-col gap-3">
          <div className="flex items-baseline justify-between gap-3 flex-wrap">
            <span style={SECTION_LABEL}>
              Encounters
              {paged && (
                <span style={{ marginLeft: '0.625rem', color: 'var(--color-text-secondary)' }}>
                  ({total === 0 ? '0' : `${fromIdx}–${toIdx} of ${total}`})
                </span>
              )}
            </span>
          </div>
          {error && (
            <p style={{ color: 'var(--color-text-error)', fontSize: '0.85rem' }}>
              Error: {(error as Error).message}
            </p>
          )}
          {isLoading && !paged && (
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>Loading…</p>
          )}
          {items.length > 0 && (
            <ul className="flex flex-col gap-3">
              {items.map((enc) => (
                <EncounterCard
                  key={enc.id}
                  encounter={enc}
                  siteColor={SITE_COLOR[enc.site ?? ''] ?? '#888'}
                  turtleContext={{
                    id: enc.turtle_id,
                    external_id: enc.turtle_external_id,
                    name: enc.turtle_name,
                  }}
                />
              ))}
            </ul>
          )}
          {paged && items.length === 0 && !isLoading && (
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', textAlign: 'center', padding: '2rem 0' }}>
              No encounters match those filters.
            </p>
          )}

          {/* Pagination */}
          {paged && total > PAGE_SIZE && (
            <Pagination
              page={page}
              totalPages={totalPages}
              onChange={(p) => {
                setPage(p);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              loading={isLoading}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function Pagination({
  page, totalPages, onChange, loading,
}: { page: number; totalPages: number; onChange: (p: number) => void; loading: boolean }) {
  const canPrev = page > 0;
  const canNext = page < totalPages - 1;
  const btnStyle = (enabled: boolean): CSSProperties => ({
    fontFamily: 'var(--font-body)',
    fontSize: '0.7rem',
    fontWeight: 600,
    letterSpacing: '0.18em',
    textTransform: 'uppercase',
    color: enabled ? 'var(--color-text-primary)' : 'var(--color-text-disabled)',
    backgroundColor: 'var(--color-bg)',
    border: '1px solid var(--color-border)',
    padding: '0.55rem 1rem',
    cursor: enabled ? 'pointer' : 'not-allowed',
  });
  return (
    <div className="flex items-center justify-between mt-2">
      <button
        type="button"
        disabled={!canPrev || loading}
        onClick={() => canPrev && onChange(page - 1)}
        style={btnStyle(canPrev && !loading)}
      >
        ← Previous
      </button>
      <span style={{
        fontFamily: 'var(--font-body)',
        fontSize: '0.7rem',
        letterSpacing: '0.2em',
        textTransform: 'uppercase',
        color: 'var(--color-text-muted)',
      }}>
        Page {page + 1} of {totalPages}
        {loading && <span style={{ marginLeft: '0.625rem' }}>· loading…</span>}
      </span>
      <button
        type="button"
        disabled={!canNext || loading}
        onClick={() => canNext && onChange(page + 1)}
        style={btnStyle(canNext && !loading)}
      >
        Next →
      </button>
    </div>
  );
}

function TurtleFilterBar({
  options, value, onChange,
}: {
  options: Array<{ id: number; label: string; count: number; site: string | null }>;
  value: number | 'all';
  onChange: (v: number | 'all') => void;
}) {
  const active = value !== 'all';

  return (
    <div className="flex items-center justify-between gap-3 flex-wrap">
      <span style={SECTION_LABEL}>Filter by turtle</span>
      <div className="flex items-stretch gap-2">
        <select
          value={value === 'all' ? 'all' : String(value)}
          onChange={(e) => onChange(e.target.value === 'all' ? 'all' : Number(e.target.value))}
          disabled={options.length === 0}
          style={{
            padding: '0.55rem 2rem 0.55rem 0.875rem',
            fontFamily: 'var(--font-body)',
            fontSize: '0.85rem',
            color: 'var(--color-text-primary)',
            backgroundColor: active ? '#fffbe6' : 'var(--color-bg)',
            border: `1px solid ${active ? '#d4a017' : 'var(--color-border-input)'}`,
            outline: 'none',
            appearance: 'none',
            minWidth: '18rem',
            backgroundImage:
              "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23888' stroke-width='2'><polyline points='6 9 12 15 18 9'/></svg>\")",
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'right 0.75rem center',
          }}
        >
          <option value="all">All turtles ({options.length})</option>
          {options.map((t) => (
            <option key={t.id} value={String(t.id)}>
              {t.label} ({t.count})
            </option>
          ))}
        </select>
        {active && (
          <button
            type="button"
            onClick={() => onChange('all')}
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: '0.7rem',
              fontWeight: 700,
              letterSpacing: '0.22em',
              textTransform: 'uppercase',
              color: '#fff',
              backgroundColor: 'var(--color-btn-primary-bg)',
              border: 'none',
              padding: '0 1rem',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-btn-primary-bg-hover)')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-btn-primary-bg)')}
          >
            <span aria-hidden style={{ fontSize: '1rem', lineHeight: 1 }}>×</span>
            Clear filter
          </button>
        )}
      </div>
    </div>
  );
}

function EncountersMap({
  locations, turtleFilter, sectionLabelStyle,
}: {
  locations: CaptureLocation[] | undefined;
  turtleFilter: number | 'all';
  sectionLabelStyle: CSSProperties;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: 'mapbox://styles/mapbox/satellite-streets-v12',
      center: [-74.14, 41.71],
      zoom: 11,
      attributionControl: false,
    });
    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'bottom-right');
    mapRef.current = map;
    return () => {
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
      map.remove();
      mapRef.current = null;
    };
  }, []);

  const filtered = useMemo(() => {
    if (!locations) return undefined;
    if (turtleFilter === 'all') return locations;
    return locations.filter((l) => l.turtle_id === turtleFilter);
  }, [locations, turtleFilter]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    if (!filtered || filtered.length === 0) return;

    const addMarkers = () => {
      const bounds = new mapboxgl.LngLatBounds();
      filtered.forEach((loc) => {
        const color = SITE_COLOR[loc.site ?? ''] ?? '#444';
        const el = document.createElement('div');
        el.style.cssText = `
          width:13px;height:13px;border-radius:50%;
          background:${color};border:2px solid #fff;
          box-shadow:0 1px 3px rgba(0,0,0,0.4);cursor:pointer;
        `;
        const titleLine = loc.turtle_name
          ? `<strong>${loc.turtle_name}</strong> <span style="color:#888">${loc.turtle_external_id}</span>`
          : `<strong>${loc.turtle_external_id}</strong>`;
        const popup = new mapboxgl.Popup({ closeButton: false, offset: 10 }).setHTML(`
          <div style="font-family:var(--font-body),system-ui;font-size:12px;min-width:160px">
            ${loc.thumbnail_url ? `<img src="${imageUrl(loc.thumbnail_url)}" style="width:100%;height:100px;object-fit:cover;display:block;margin-bottom:6px">` : ''}
            <div style="margin-bottom:3px">${titleLine}</div>
            <div style="font-size:10px;color:#666;letter-spacing:0.1em;text-transform:uppercase">
              ${loc.image_type.replace('_', ' ')} · ${loc.captured_date ?? '—'}
            </div>
          </div>
        `);
        const m = new mapboxgl.Marker({ element: el, anchor: 'center' })
          .setLngLat([loc.longitude, loc.latitude])
          .setPopup(popup)
          .addTo(map);
        markersRef.current.push(m);
        bounds.extend([loc.longitude, loc.latitude]);
      });
      if (!bounds.isEmpty()) {
        map.fitBounds(bounds, { padding: 50, maxZoom: 17, duration: 500 });
      }
    };

    if (map.loaded()) addMarkers();
    else map.once('load', addMarkers);
  }, [filtered]);

  const total = locations?.length ?? 0;
  const shown = filtered?.length ?? 0;

  return (
    <div className="flex flex-col gap-3">
      <span style={sectionLabelStyle}>
        Map ({shown}{shown !== total && total ? ` of ${total}` : ''})
      </span>
      <div
        ref={containerRef}
        style={{
          width: '100%',
          height: '620px',
          border: '1px solid var(--color-border)',
          backgroundColor: 'var(--color-bg-card)',
        }}
      />
    </div>
  );
}
