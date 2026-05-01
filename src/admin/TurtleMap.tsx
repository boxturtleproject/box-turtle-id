import { useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { fetchCaptureLocations, imageUrl } from '../shared/lib/api';

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN ?? '';

const SITE_COLOR: Record<string, string> = {
  patuxent: '#3a7d44',
  wallkill: '#c8622a',
};

interface TurtleMapProps {
  turtleId: number;
  accent: string;
  height?: string;
  sectionLabelStyle?: React.CSSProperties;
}

export function TurtleMap({ turtleId, accent, height = '320px', sectionLabelStyle }: TurtleMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);

  const { data: locations } = useQuery({
    queryKey: ['capture-locations', turtleId],
    queryFn: () => fetchCaptureLocations(turtleId),
  });

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: 'mapbox://styles/mapbox/satellite-streets-v12',
      center: [-74.14, 41.71],
      zoom: 13,
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

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !locations || locations.length === 0) return;

    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    const addMarkers = () => {
      const bounds = new mapboxgl.LngLatBounds();
      locations.forEach((loc) => {
        const color = SITE_COLOR[loc.site ?? ''] ?? accent;
        const el = document.createElement('div');
        el.style.cssText = `
          width:13px;height:13px;border-radius:50%;
          background:${color};border:2px solid #fff;
          box-shadow:0 1px 3px rgba(0,0,0,0.4);cursor:pointer;
        `;
        const popup = new mapboxgl.Popup({ closeButton: false, offset: 10 }).setHTML(`
          <div style="font-family:var(--font-body),system-ui;font-size:12px;min-width:160px">
            ${loc.thumbnail_url ? `<img src="${imageUrl(loc.thumbnail_url)}" style="width:100%;height:100px;object-fit:cover;display:block;margin-bottom:6px">` : ''}
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
        map.fitBounds(bounds, { padding: 40, maxZoom: 17, duration: 500 });
      }
    };

    if (map.loaded()) addMarkers();
    else map.once('load', addMarkers);
  }, [locations, accent]);

  // Don't render anything if there are zero locations
  if (locations && locations.length === 0) return null;

  return (
    <div className="flex flex-col gap-3">
      {sectionLabelStyle && (
        <span style={sectionLabelStyle}>
          Map{locations ? ` (${locations.length})` : ''}
        </span>
      )}
      <div
        ref={containerRef}
        style={{
          width: '100%',
          height,
          border: '1px solid var(--color-border)',
          backgroundColor: 'var(--color-bg-card)',
        }}
      />
    </div>
  );
}
