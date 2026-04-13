import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN ?? '';

interface LocationPickerModalProps {
  initial: { lat: number; lng: number } | null;
  onSave: (lat: number, lng: number) => void;
  onCancel: () => void;
}

const DEFAULT_CENTER: [number, number] = [-76.7701, 38.8123]; // Patuxent-ish fallback

export function LocationPickerModal({ initial, onSave, onCancel }: LocationPickerModalProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markerRef = useRef<mapboxgl.Marker | null>(null);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(initial);
  const [locating, setLocating] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);

  function setMarker(lat: number, lng: number) {
    const m = mapRef.current;
    if (!m) return;
    if (markerRef.current) {
      markerRef.current.setLngLat([lng, lat]);
    } else {
      const el = document.createElement('div');
      el.innerHTML = `
        <svg width="34" height="44" viewBox="0 0 34 44" fill="none" style="filter:drop-shadow(0 2px 4px rgba(0,0,0,0.5))">
          <path d="M17 2a13 13 0 0 1 13 13c0 9.5-13 27-13 27S4 24.5 4 15A13 13 0 0 1 17 2Z" fill="#e74c3c" stroke="#fff" stroke-width="2"/>
          <circle cx="17" cy="15" r="4.5" fill="#fff"/>
        </svg>
      `;
      el.style.cursor = 'pointer';
      markerRef.current = new mapboxgl.Marker({ element: el, anchor: 'bottom' })
        .setLngLat([lng, lat])
        .addTo(m);
    }
  }

  useEffect(() => {
    if (!containerRef.current) return;

    const startCenter: [number, number] = initial
      ? [initial.lng, initial.lat]
      : DEFAULT_CENTER;

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: 'mapbox://styles/mapbox/satellite-streets-v12',
      center: startCenter,
      zoom: initial ? 17 : 13,
      attributionControl: false,
    });
    mapRef.current = map;

    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'bottom-right');

    map.on('load', () => {
      if (initial) setMarker(initial.lat, initial.lng);
    });

    map.on('click', (e) => {
      const lat = e.lngLat.lat;
      const lng = e.lngLat.lng;
      setCoords({ lat, lng });
      setMarker(lat, lng);
    });

    if (!initial) {
      locateUser(map);
    }

    return () => {
      markerRef.current?.remove();
      markerRef.current = null;
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function locateUser(map?: mapboxgl.Map) {
    const m = map ?? mapRef.current;
    if (!m || !navigator.geolocation) {
      setGeoError('Geolocation not available');
      return;
    }
    setLocating(true);
    setGeoError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setCoords({ lat, lng });
        const place = () => setMarker(lat, lng);
        if (m.isStyleLoaded()) place();
        else m.once('load', place);
        m.flyTo({ center: [lng, lat], zoom: 18, duration: 800 });
        setLocating(false);
      },
      (err) => {
        setGeoError(err.message || 'Could not get location');
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: '#000',
        zIndex: 2000,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Header */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 10,
          padding: 'calc(env(safe-area-inset-top, 0px) + 0.75rem) 1rem 0.75rem',
          background: 'linear-gradient(to bottom, rgba(0,0,0,0.6), rgba(0,0,0,0))',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '0.5rem',
        }}
      >
        <button
          type="button"
          onClick={onCancel}
          style={{
            padding: '0.5rem 0.75rem',
            background: 'rgba(0,0,0,0.45)',
            border: 'none',
            color: '#fff',
            fontFamily: 'var(--font-body)',
            fontSize: '0.75rem',
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
            borderRadius: 6,
            cursor: 'pointer',
          }}
        >
          Cancel
        </button>
        <div
          style={{
            flex: 1,
            textAlign: 'center',
            color: '#fff',
            fontFamily: 'var(--font-heading)',
            fontSize: '0.95rem',
            fontWeight: 600,
            textShadow: '0 1px 4px rgba(0,0,0,0.6)',
          }}
        >
          Pin Turtle Location
        </div>
        <button
          type="button"
          onClick={() => locateUser()}
          disabled={locating}
          aria-label="Use my location"
          style={{
            padding: '0.5rem 0.75rem',
            background: 'rgba(0,0,0,0.45)',
            border: 'none',
            color: '#fff',
            fontFamily: 'var(--font-body)',
            fontSize: '0.75rem',
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            borderRadius: 6,
            cursor: locating ? 'wait' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.5" />
            <path d="M12 2v3M12 19v3M2 12h3M19 12h3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          {locating ? 'Locating…' : 'My Location'}
        </button>
      </div>

      {/* Map */}
      <div ref={containerRef} style={{ flex: 1, width: '100%' }} />

      {/* Coord readout + footer */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 10,
          padding: '1rem 1rem calc(env(safe-area-inset-bottom, 0px) + 1rem)',
          background: 'linear-gradient(to top, rgba(0,0,0,0.7), rgba(0,0,0,0))',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.75rem',
        }}
      >
        <div
          style={{
            color: '#fff',
            fontFamily: 'var(--font-body)',
            fontSize: '0.8rem',
            letterSpacing: '0.08em',
            textAlign: 'center',
            textShadow: '0 1px 3px rgba(0,0,0,0.7)',
            minHeight: '1.2em',
          }}
        >
          {coords
            ? `${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}`
            : geoError
              ? geoError
              : 'Tap the map or use your location'}
        </div>
        <button
          type="button"
          disabled={!coords}
          onClick={() => coords && onSave(coords.lat, coords.lng)}
          style={{
            width: '100%',
            padding: '1rem',
            fontFamily: 'var(--font-body)',
            fontSize: '0.85rem',
            letterSpacing: '0.22em',
            textTransform: 'uppercase',
            background: coords ? 'var(--color-btn-primary-bg)' : 'rgba(255,255,255,0.2)',
            color: coords ? 'var(--color-btn-primary-text)' : 'rgba(255,255,255,0.6)',
            border: 'none',
            borderRadius: 10,
            cursor: coords ? 'pointer' : 'not-allowed',
          }}
        >
          Save Location
        </button>
      </div>
    </div>
  );
}

