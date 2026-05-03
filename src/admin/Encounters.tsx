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

export default function Encounters() {
  const [turtleFilter, setTurtleFilter] = useState<number | 'all'>('all');

  const { data: encounters, isLoading, error } = useQuery({
    queryKey: ['all-encounters'],
    queryFn: () => fetchAllEncounters(),
  });

  const { data: locations } = useQuery({
    queryKey: ['capture-locations'],
    queryFn: () => fetchCaptureLocations(),
  });

  // Distinct turtles that have at least one encounter, sorted by external_id
  const turtleOptions = useMemo(() => {
    if (!encounters) return [];
    const byTurtle: Record<number, { id: number; label: string; site: string | null; count: number }> = {};
    for (const enc of encounters) {
      const existing = byTurtle[enc.turtle_id];
      if (existing) {
        existing.count += 1;
      } else {
        const label = enc.turtle_name
          ? `${enc.turtle_external_id} · ${enc.turtle_name}`
          : enc.turtle_external_id;
        byTurtle[enc.turtle_id] = { id: enc.turtle_id, label, site: enc.site, count: 1 };
      }
    }
    return Object.values(byTurtle).sort((a, b) => a.label.localeCompare(b.label));
  }, [encounters]);

  const filteredEncounters = useMemo(() => {
    if (!encounters) return [];
    if (turtleFilter === 'all') return encounters;
    return encounters.filter((e) => e.turtle_id === turtleFilter);
  }, [encounters, turtleFilter]);

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
          <span style={SECTION_LABEL}>
            Encounters
            {filteredEncounters && (
              <span style={{ marginLeft: '0.625rem', color: 'var(--color-text-secondary)' }}>
                ({filteredEncounters.length}
                {turtleFilter !== 'all' && encounters && filteredEncounters.length !== encounters.length
                  ? ` of ${encounters.length}`
                  : ''})
              </span>
            )}
          </span>
          {error && (
            <p style={{ color: 'var(--color-text-error)', fontSize: '0.85rem' }}>
              Error: {(error as Error).message}
            </p>
          )}
          {isLoading && (
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>Loading…</p>
          )}
          {filteredEncounters && filteredEncounters.length > 0 && (
            <ul className="flex flex-col gap-3">
              {filteredEncounters.map((enc) => (
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
          {filteredEncounters && filteredEncounters.length === 0 && !isLoading && (
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', textAlign: 'center', padding: '2rem 0' }}>
              No encounters match those filters.
            </p>
          )}
        </div>
      </div>
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
          height: '480px',
          border: '1px solid var(--color-border)',
          backgroundColor: 'var(--color-bg-card)',
        }}
      />
    </div>
  );
}
