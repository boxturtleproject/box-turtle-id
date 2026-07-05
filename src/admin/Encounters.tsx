import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import {
  fetchAllEncounters,
  fetchCaptureLocations,
  fetchEncounterFacets,
  imageUrl,
  type CaptureLocation,
} from '../shared/lib/api';
import { EncounterCard } from './EncounterCard';

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN ?? '';

const SITE_COLOR: Record<string, string> = {
  patuxent: '#3a7d44',
  wallkill: '#c8622a',
};

const SITE_LABEL: Record<string, string> = {
  patuxent: 'Patuxent',
  wallkill: 'Wallkill',
};

const siteLabel = (s: string | null): string =>
  s ? SITE_LABEL[s] ?? s.charAt(0).toUpperCase() + s.slice(1) : 'Unknown';

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
  const [siteFilter, setSiteFilter] = useState<string | 'all'>('all');
  const [yearFilter, setYearFilter] = useState<number | 'all'>('all');
  const [turtleFilter, setTurtleFilter] = useState<number | 'all'>('all');
  const [page, setPage] = useState(0);
  const [selectedEncounterId, setSelectedEncounterId] = useState<number | null>(null);

  // Reset to page 0 whenever any filter changes
  useEffect(() => { setPage(0); }, [siteFilter, yearFilter, turtleFilter]);
  // Clear selection when the filter or page changes
  useEffect(() => { setSelectedEncounterId(null); }, [siteFilter, yearFilter, turtleFilter, page]);

  const { data: paged, isLoading, error } = useQuery({
    queryKey: ['all-encounters', siteFilter, yearFilter, turtleFilter, page],
    queryFn: () => fetchAllEncounters({
      turtleId: turtleFilter === 'all' ? undefined : turtleFilter,
      site: siteFilter === 'all' ? undefined : siteFilter,
      year: yearFilter === 'all' ? undefined : yearFilter,
      skip: page * PAGE_SIZE,
      limit: PAGE_SIZE,
    }),
    placeholderData: (prev) => prev, // keep showing previous page while next loads
  });

  const { data: locations } = useQuery({
    queryKey: ['capture-locations'],
    queryFn: () => fetchCaptureLocations(),
  });

  // Facets drive the cascading Site/Year/Turtle dropdowns: one row per
  // encounter, so we can compute each dropdown's options (and counts) from the
  // other two active filters. Sourced from encounter_date, so year options
  // line up with the server-side year filter on the list.
  const { data: facets } = useQuery({
    queryKey: ['encounter-facets'],
    queryFn: () => fetchEncounterFacets(),
  });

  // A facet passes the active filters; pass 'all' for a dimension to ignore it
  // (used to build that dimension's own option list without self-filtering).
  const cascade = useMemo(() => {
    const rows = facets ?? [];
    const passes = (
      f: (typeof rows)[number],
      s: string | 'all',
      y: number | 'all',
      t: number | 'all',
    ) =>
      (s === 'all' || f.site === s) &&
      (y === 'all' || f.year === y) &&
      (t === 'all' || f.turtle_id === t);

    // Site options honor the current year + turtle selection.
    const siteCounts = new Map<string, number>();
    for (const f of rows) {
      if (f.site && passes(f, 'all', yearFilter, turtleFilter)) {
        siteCounts.set(f.site, (siteCounts.get(f.site) ?? 0) + 1);
      }
    }
    const siteOptions = [...siteCounts.entries()]
      .map(([value, count]) => ({ value, label: siteLabel(value), count }))
      .sort((a, b) => a.label.localeCompare(b.label));

    // Year options honor the current site + turtle selection.
    const yearCounts = new Map<number, number>();
    for (const f of rows) {
      if (f.year != null && passes(f, siteFilter, 'all', turtleFilter)) {
        yearCounts.set(f.year, (yearCounts.get(f.year) ?? 0) + 1);
      }
    }
    const yearOptions = [...yearCounts.entries()]
      .map(([value, count]) => ({ value, count }))
      .sort((a, b) => b.value - a.value); // newest first

    // Turtle options honor the current site + year selection.
    const turtleMap = new Map<number, { id: number; label: string; count: number }>();
    for (const f of rows) {
      if (!passes(f, siteFilter, yearFilter, 'all')) continue;
      const existing = turtleMap.get(f.turtle_id);
      if (existing) {
        existing.count += 1;
      } else {
        const label = f.turtle_name
          ? `${f.turtle_external_id} · ${f.turtle_name}`
          : f.turtle_external_id;
        turtleMap.set(f.turtle_id, { id: f.turtle_id, label, count: 1 });
      }
    }
    const turtleOptions = [...turtleMap.values()].sort((a, b) => a.label.localeCompare(b.label));

    return { siteOptions, yearOptions, turtleOptions };
  }, [facets, siteFilter, yearFilter, turtleFilter]);

  // Cascading resolution: the dropdown option lists already stop the user from
  // *picking* an invalid value, but changing one filter can strand a value
  // already selected in another (e.g. switching site away from the only site a
  // chosen year exists in). On every change we keep the just-changed
  // ('pinned') filter and reset any other filter whose value no longer has a
  // matching encounter. Resets only broaden the selection, so the loop settles.
  const applyCascade = (
    site: string | 'all',
    year: number | 'all',
    turtle: number | 'all',
    pinned: 'site' | 'year' | 'turtle',
  ) => {
    const rows = facets ?? [];
    const match = (s: string | 'all', y: number | 'all', t: number | 'all') =>
      rows.some(
        (f) =>
          (s === 'all' || f.site === s) &&
          (y === 'all' || f.year === y) &&
          (t === 'all' || f.turtle_id === t),
      );
    let changed = true;
    while (changed) {
      changed = false;
      if (pinned !== 'site' && site !== 'all' && !match(site, year, turtle)) { site = 'all'; changed = true; }
      if (pinned !== 'year' && year !== 'all' && !match(site, year, turtle)) { year = 'all'; changed = true; }
      if (pinned !== 'turtle' && turtle !== 'all' && !match(site, year, turtle)) { turtle = 'all'; changed = true; }
    }
    setSiteFilter(site);
    setYearFilter(year);
    setTurtleFilter(turtle);
  };

  const changeSite = (v: string | 'all') => applyCascade(v, yearFilter, turtleFilter, 'site');
  const changeYear = (v: number | 'all') => applyCascade(siteFilter, v, turtleFilter, 'year');
  const changeTurtle = (v: number | 'all') => applyCascade(siteFilter, yearFilter, v, 'turtle');

  const anyFilterActive = siteFilter !== 'all' || yearFilter !== 'all' || turtleFilter !== 'all';
  const clearAllFilters = () => {
    setSiteFilter('all');
    setYearFilter('all');
    setTurtleFilter('all');
  };

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
          <span style={META_LABEL}>{siteFilter === 'all' ? 'All sites' : siteLabel(siteFilter)}</span>
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
          siteFilter={siteFilter}
          yearFilter={yearFilter}
          turtleFilter={turtleFilter}
          encounterFilter={selectedEncounterId}
          sectionLabelStyle={SECTION_LABEL}
          onClearEncounterFilter={() => setSelectedEncounterId(null)}
          onPickEncounter={(id) => {
            setSelectedEncounterId(id);
            // Scroll to the card if it's on the current page
            requestAnimationFrame(() => {
              const el = document.getElementById(`encounter-card-${id}`);
              el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            });
          }}
        />

        {/* Site / Year / Turtle filters */}
        <FiltersBar
          siteOptions={cascade.siteOptions}
          yearOptions={cascade.yearOptions}
          turtleOptions={cascade.turtleOptions}
          site={siteFilter}
          year={yearFilter}
          turtle={turtleFilter}
          onSite={changeSite}
          onYear={changeYear}
          onTurtle={changeTurtle}
          anyActive={anyFilterActive}
          onClearAll={clearAllFilters}
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
                  selected={selectedEncounterId === enc.id}
                  onSelect={() =>
                    setSelectedEncounterId((prev) => (prev === enc.id ? null : enc.id))
                  }
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

function filterSelectStyle(active: boolean, minWidth: string): CSSProperties {
  return {
    padding: '0.55rem 2rem 0.55rem 0.875rem',
    fontFamily: 'var(--font-body)',
    fontSize: '0.85rem',
    color: 'var(--color-text-primary)',
    backgroundColor: active ? '#fffbe6' : 'var(--color-bg)',
    border: `1px solid ${active ? '#d4a017' : 'var(--color-border-input)'}`,
    outline: 'none',
    appearance: 'none',
    minWidth,
    backgroundImage:
      "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23888' stroke-width='2'><polyline points='6 9 12 15 18 9'/></svg>\")",
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'right 0.75rem center',
  };
}

function FiltersBar({
  siteOptions, yearOptions, turtleOptions,
  site, year, turtle,
  onSite, onYear, onTurtle,
  anyActive, onClearAll,
}: {
  siteOptions: Array<{ value: string; label: string; count: number }>;
  yearOptions: Array<{ value: number; count: number }>;
  turtleOptions: Array<{ id: number; label: string; count: number }>;
  site: string | 'all';
  year: number | 'all';
  turtle: number | 'all';
  onSite: (v: string | 'all') => void;
  onYear: (v: number | 'all') => void;
  onTurtle: (v: number | 'all') => void;
  anyActive: boolean;
  onClearAll: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 flex-wrap">
      <span style={SECTION_LABEL}>Filter</span>
      <div className="flex items-stretch gap-2 flex-wrap">
        {/* Site */}
        <select
          aria-label="Filter by site"
          value={site}
          onChange={(e) => onSite(e.target.value === 'all' ? 'all' : e.target.value)}
          disabled={siteOptions.length === 0}
          style={filterSelectStyle(site !== 'all', '9rem')}
        >
          <option value="all">All sites</option>
          {siteOptions.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label} ({s.count})
            </option>
          ))}
        </select>

        {/* Year */}
        <select
          aria-label="Filter by year"
          value={year === 'all' ? 'all' : String(year)}
          onChange={(e) => onYear(e.target.value === 'all' ? 'all' : Number(e.target.value))}
          disabled={yearOptions.length === 0}
          style={filterSelectStyle(year !== 'all', '8rem')}
        >
          <option value="all">All years</option>
          {yearOptions.map((y) => (
            <option key={y.value} value={String(y.value)}>
              {y.value} ({y.count})
            </option>
          ))}
        </select>

        {/* Turtle */}
        <select
          aria-label="Filter by turtle"
          value={turtle === 'all' ? 'all' : String(turtle)}
          onChange={(e) => onTurtle(e.target.value === 'all' ? 'all' : Number(e.target.value))}
          disabled={turtleOptions.length === 0}
          style={filterSelectStyle(turtle !== 'all', '16rem')}
        >
          <option value="all">All turtles ({turtleOptions.length})</option>
          {turtleOptions.map((t) => (
            <option key={t.id} value={String(t.id)}>
              {t.label} ({t.count})
            </option>
          ))}
        </select>

        {anyActive && (
          <button
            type="button"
            onClick={onClearAll}
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
            Clear filters
          </button>
        )}
      </div>
    </div>
  );
}

function EncountersMap({
  locations, siteFilter, yearFilter, turtleFilter, encounterFilter, sectionLabelStyle,
  onClearEncounterFilter, onPickEncounter,
}: {
  locations: CaptureLocation[] | undefined;
  siteFilter: string | 'all';
  yearFilter: number | 'all';
  turtleFilter: number | 'all';
  encounterFilter: number | null;
  sectionLabelStyle: CSSProperties;
  onClearEncounterFilter: () => void;
  onPickEncounter: (encounterId: number) => void;
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
    return locations.filter((l) => {
      if (turtleFilter !== 'all' && l.turtle_id !== turtleFilter) return false;
      if (siteFilter !== 'all' && l.site !== siteFilter) return false;
      // Year on the map keys off captured_date (the list uses encounter_date);
      // for a single encounter these fall on the same day, so results match.
      if (yearFilter !== 'all') {
        const capYear = l.captured_date ? Number(l.captured_date.slice(0, 4)) : null;
        if (capYear !== yearFilter) return false;
      }
      if (encounterFilter !== null && l.encounter_id !== encounterFilter) return false;
      return true;
    });
  }, [locations, siteFilter, yearFilter, turtleFilter, encounterFilter]);

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
        const encounterLine = loc.encounter_id !== null
          ? `<a href="#encounter-card-${loc.encounter_id}" data-encounter-id="${loc.encounter_id}"
                style="font-size:11px;color:${color};text-decoration:none;font-weight:600;letter-spacing:0.05em">
               ${loc.encounter_external_id ?? `Encounter #${loc.encounter_id}`} →
             </a>`
          : '';
        const popup = new mapboxgl.Popup({ closeButton: false, offset: 10 }).setHTML(`
          <div style="font-family:var(--font-body),system-ui;font-size:12px;min-width:180px">
            ${loc.thumbnail_url ? `<img src="${imageUrl(loc.thumbnail_url)}" style="width:100%;height:100px;object-fit:cover;display:block;margin-bottom:6px">` : ''}
            <div style="margin-bottom:3px">${titleLine}</div>
            <div style="font-size:10px;color:#666;letter-spacing:0.1em;text-transform:uppercase;margin-bottom:6px">
              ${loc.image_type.replace('_', ' ')} · ${loc.captured_date ?? '—'}
            </div>
            ${encounterLine}
          </div>
        `);
        popup.on('open', () => {
          const root = popup.getElement();
          const link = root?.querySelector<HTMLAnchorElement>('a[data-encounter-id]');
          link?.addEventListener('click', (ev) => {
            ev.preventDefault();
            const id = Number(link.dataset.encounterId);
            if (!isNaN(id)) onPickEncounter(id);
          });
        });
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
  }, [filtered, onPickEncounter]);

  const total = locations?.length ?? 0;
  const shown = filtered?.length ?? 0;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-3 flex-wrap">
        <span style={sectionLabelStyle}>
          Map ({shown}{shown !== total && total ? ` of ${total}` : ''})
        </span>
        {encounterFilter !== null && (
          <button
            type="button"
            onClick={onClearEncounterFilter}
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: '0.65rem',
              fontWeight: 700,
              letterSpacing: '0.22em',
              textTransform: 'uppercase',
              color: '#fff',
              backgroundColor: 'var(--color-btn-primary-bg)',
              border: 'none',
              padding: '0.45rem 0.875rem',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-btn-primary-bg-hover)')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-btn-primary-bg)')}
          >
            <span aria-hidden style={{ fontSize: '1rem', lineHeight: 1 }}>×</span>
            Clear encounter
          </button>
        )}
      </div>
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
