import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { fetchCaptureLocations, imageUrl } from '../shared/lib/api';

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN ?? '';

const SITE_COLOR: Record<string, string> = {
  patuxent: '#3a7d44',
  wallkill: '#c8622a',
};

const META_LABEL: React.CSSProperties = {
  fontFamily: 'var(--font-body)',
  color: 'var(--color-text-muted)',
  fontSize: '0.6rem',
  letterSpacing: '0.22em',
  textTransform: 'uppercase',
};

export default function Map() {
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const [siteFilter, setSiteFilter] = useState<string>('all');
  const [turtleFilter, setTurtleFilter] = useState<string>('all');

  const { data: locations, isLoading, error } = useQuery({
    queryKey: ['capture-locations'],
    queryFn: () => fetchCaptureLocations(),
  });

  // Distinct turtles that have at least one location, sorted by external_id
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

  // Initialize map once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: 'mapbox://styles/mapbox/satellite-streets-v12',
      center: [-74.14, 41.71], // Wallkill area; will fit to data once loaded
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

  // Render markers + auto-fit when data or filter changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !locations) return;

    // Clear previous markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    const filtered = locations.filter((l) => {
      if (siteFilter !== 'all' && l.site !== siteFilter) return false;
      if (turtleFilter !== 'all' && String(l.turtle_id) !== turtleFilter) return false;
      return true;
    });

    if (filtered.length === 0) return;

    const addMarkers = () => {
      const bounds = new mapboxgl.LngLatBounds();
      filtered.forEach((loc) => {
        const accent = SITE_COLOR[loc.site ?? ''] ?? '#444';
        const el = document.createElement('div');
        el.style.cssText = `
          width:14px;height:14px;border-radius:50%;
          background:${accent};border:2px solid #fff;
          box-shadow:0 1px 4px rgba(0,0,0,0.4);
          cursor:pointer;
        `;

        const dateLabel = loc.captured_date ?? '—';
        const titleLine = loc.turtle_name
          ? `<strong>${loc.turtle_name}</strong> <span style="color:#888">${loc.turtle_external_id}</span>`
          : `<strong>${loc.turtle_external_id}</strong>`;
        const popupHtml = `
          <div style="font-family:var(--font-body),system-ui;font-size:13px;min-width:180px">
            ${loc.thumbnail_url ? `<img src="${imageUrl(loc.thumbnail_url)}" style="width:100%;height:120px;object-fit:cover;display:block;margin-bottom:8px">` : ''}
            <div style="margin-bottom:4px">${titleLine}</div>
            <div style="font-size:11px;color:#666;letter-spacing:0.1em;text-transform:uppercase">
              ${loc.image_type.replace('_', ' ')} · ${dateLabel}
            </div>
            <a href="/admin/turtles/${loc.turtle_id}" data-turtle-id="${loc.turtle_id}"
               style="display:inline-block;margin-top:8px;font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:${accent};text-decoration:none;font-weight:600">
              View Profile →
            </a>
          </div>
        `;

        const popup = new mapboxgl.Popup({ closeButton: true, offset: 12 })
          .setHTML(popupHtml);
        popup.on('open', () => {
          const el = popup.getElement();
          const link = el?.querySelector<HTMLAnchorElement>('a[data-turtle-id]');
          link?.addEventListener('click', (ev) => {
            ev.preventDefault();
            navigate(`/admin/turtles/${loc.turtle_id}`);
          });
        });

        const marker = new mapboxgl.Marker({ element: el, anchor: 'center' })
          .setLngLat([loc.longitude, loc.latitude])
          .setPopup(popup)
          .addTo(map);
        markersRef.current.push(marker);
        bounds.extend([loc.longitude, loc.latitude]);
      });

      if (!bounds.isEmpty()) {
        map.fitBounds(bounds, { padding: 60, maxZoom: 16, duration: 600 });
      }
    };

    if (map.loaded()) addMarkers();
    else map.once('load', addMarkers);
  }, [locations, siteFilter, turtleFilter, navigate]);

  const total = locations?.length ?? 0;
  const wallkill = locations?.filter((l) => l.site === 'wallkill').length ?? 0;
  const patuxent = locations?.filter((l) => l.site === 'patuxent').length ?? 0;

  return (
    <div className="min-h-dvh flex flex-col" style={{ backgroundColor: 'var(--color-bg-card)' }}>
      <div className="max-w-6xl mx-auto w-full px-6 pt-10 pb-6 flex flex-col gap-4">
        <Link
          to="/admin"
          style={{ ...META_LABEL, width: 'fit-content' }}
        >
          ← Back to Dashboard
        </Link>
        <div className="flex flex-col gap-1">
          <span style={META_LABEL}>Captures with GPS</span>
          <h1
            style={{
              fontFamily: 'var(--font-heading)',
              fontWeight: 700,
              letterSpacing: '0.04em',
              fontSize: '1.75rem',
              color: 'var(--color-text-primary)',
            }}
          >
            Map
          </h1>
        </div>
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex gap-px" style={{ backgroundColor: 'var(--color-border)' }}>
            <FilterChip label={`All (${total})`} active={siteFilter === 'all'} onClick={() => { setSiteFilter('all'); setTurtleFilter('all'); }} accent="#444" />
            <FilterChip label={`Patuxent (${patuxent})`} active={siteFilter === 'patuxent'} onClick={() => { setSiteFilter('patuxent'); setTurtleFilter('all'); }} accent={SITE_COLOR.patuxent} />
            <FilterChip label={`Wallkill (${wallkill})`} active={siteFilter === 'wallkill'} onClick={() => { setSiteFilter('wallkill'); setTurtleFilter('all'); }} accent={SITE_COLOR.wallkill} />
          </div>
          <select
            value={turtleFilter}
            onChange={(e) => setTurtleFilter(e.target.value)}
            disabled={turtleOptions.length === 0}
            style={{
              padding: '0.55rem 2rem 0.55rem 0.875rem',
              fontFamily: 'var(--font-body)',
              fontSize: '0.85rem',
              color: 'var(--color-text-primary)',
              backgroundColor: 'var(--color-bg)',
              border: '1px solid var(--color-border-input)',
              outline: 'none',
              appearance: 'none',
              minWidth: '14rem',
              backgroundImage:
                "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23888' stroke-width='2'><polyline points='6 9 12 15 18 9'/></svg>\")",
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'right 0.75rem center',
            }}
          >
            <option value="all">All turtles ({turtleOptions.length})</option>
            {turtleOptions
              .filter((t) => siteFilter === 'all' || t.site === siteFilter)
              .map((t) => (
                <option key={t.id} value={String(t.id)}>
                  {t.label} ({t.count})
                </option>
              ))}
          </select>
          {error && <span style={{ color: 'var(--color-text-error)', fontSize: '0.85rem' }}>Error: {(error as Error).message}</span>}
          {isLoading && <span style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>Loading…</span>}
        </div>
      </div>

      <div className="flex-1 max-w-6xl mx-auto w-full px-6 pb-10">
        <div
          ref={containerRef}
          style={{
            width: '100%',
            height: 'calc(100dvh - 240px)',
            minHeight: '500px',
            border: '1px solid var(--color-border)',
            backgroundColor: 'var(--color-bg-card)',
          }}
        />
      </div>
    </div>
  );
}

function FilterChip({
  label, active, onClick, accent,
}: { label: string; active: boolean; onClick: () => void; accent: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        fontFamily: 'var(--font-body)',
        fontSize: '0.65rem',
        letterSpacing: '0.18em',
        textTransform: 'uppercase',
        fontWeight: 600,
        padding: '0.55rem 0.875rem',
        backgroundColor: active ? accent : 'var(--color-bg)',
        color: active ? '#fff' : 'var(--color-text-secondary)',
        border: 'none',
        cursor: 'pointer',
        transition: 'all 0.15s',
      }}
    >
      {label}
    </button>
  );
}
