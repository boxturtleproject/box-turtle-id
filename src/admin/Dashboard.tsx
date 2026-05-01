import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { fetchTurtles, imageUrl } from '../shared/lib/api';
import type { TurtleResponse } from '../shared/types';

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

  const siteColor = turtle.site === 'patuxent' ? '#3a7d44' : turtle.site === 'wallkill' ? '#c8622a' : '#888';

  return (
    <Link
      to={`/admin/turtles/${turtle.id}`}
      className="bg-white rounded-lg border overflow-hidden hover:shadow-md transition-shadow flex flex-col"
    >
      {/* Hero image */}
      <div className="aspect-[4/3] bg-gray-100 overflow-hidden">
        {heroSrc ? (
          <img src={heroSrc} alt={turtle.name || turtle.external_id} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-300 text-4xl">🐢</div>
        )}
      </div>

      {/* Info */}
      <div className="p-3 flex flex-col gap-1.5 flex-1">
        <div className="font-bold text-sm">{turtle.external_id}</div>
        {turtle.name && (
          <div className="text-xs text-gray-500">
            <span className="text-gray-400">Nickname: </span>{turtle.name}
          </div>
        )}
        {turtle.pattern && (
          <div className="text-xs">
            <span className="text-gray-400">Pattern: </span>
            <span className="inline-block px-1.5 py-0.5 rounded text-xs" style={{ backgroundColor: '#fef9c3', color: '#854d0e' }}>
              {turtle.pattern}
            </span>
          </div>
        )}
        {turtle.gender && (
          <div className="text-xs">
            <span className="text-gray-400">Gender: </span>
            <span className="inline-block px-1.5 py-0.5 rounded text-xs" style={{
              backgroundColor: turtle.gender === 'Male' ? '#dbeafe' : turtle.gender === 'Female' ? '#fce7f3' : '#f3f4f6',
              color: turtle.gender === 'Male' ? '#1e40af' : turtle.gender === 'Female' ? '#9d174d' : '#6b7280',
            }}>
              {turtle.gender}
            </span>
          </div>
        )}
        {turtle.species && (
          <div className="text-xs text-gray-500">
            <span className="text-gray-400">Species: </span>{turtle.species}
          </div>
        )}
        <div className="text-xs text-gray-500">
          <span className="text-gray-400">Health Status: </span>
          <span className="inline-block px-1.5 py-0.5 rounded text-xs" style={{ backgroundColor: '#dcfce7', color: '#166534' }}>
            Healthy
          </span>
        </div>
        {turtle.carapace_flare && (
          <div className="text-xs text-gray-500">
            <span className="text-gray-400">Morphology Record: </span>{turtle.carapace_flare}
          </div>
        )}
        {turtle.first_seen && (
          <div className="text-xs text-gray-500">
            <span className="text-gray-400">Date First Identified: </span>{turtle.first_seen}
          </div>
        )}
        <div className="text-xs text-gray-500">
          <span className="text-gray-400">Count (Encounters): </span>
          <span className="font-medium">{turtle.encounter_count ?? 0}</span>
        </div>
        {turtle.site && (
          <div className="mt-auto pt-1">
            <span
              className="inline-block px-2 py-0.5 rounded-full text-xs text-white"
              style={{ backgroundColor: siteColor }}
            >
              {turtle.site}
            </span>
          </div>
        )}
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
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      <h1 className="text-2xl font-bold">Admin Dashboard</h1>

      {/* Stat cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-lg border p-4 text-center">
          <p className="text-sm text-gray-500">Total Turtles</p>
          <p className="text-3xl font-bold">{isLoading ? '...' : total}</p>
        </div>
        <div className="bg-white rounded-lg border p-4 text-center">
          <p className="text-sm text-gray-500">Patuxent</p>
          <p className="text-3xl font-bold" style={{ color: '#3a7d44' }}>{isLoading ? '...' : patuxentCount}</p>
        </div>
        <div className="bg-white rounded-lg border p-4 text-center">
          <p className="text-sm text-gray-500">Wallkill</p>
          <p className="text-3xl font-bold" style={{ color: '#c8622a' }}>{isLoading ? '...' : wallkillCount}</p>
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { to: '/admin/compare', label: 'Compare' },
          { to: '/admin/search', label: 'Search' },
          { to: '/admin/settings', label: 'Settings' },
          { to: '/admin/sync', label: 'Sync' },
        ].map((action) => (
          <Link
            key={action.to}
            to={action.to}
            className="bg-white border rounded-lg p-4 text-center font-medium hover:bg-gray-50 transition-colors"
          >
            {action.label}
          </Link>
        ))}
      </div>

      {/* Turtle grid */}
      {error && <p className="text-red-600">Error loading turtles: {(error as Error).message}</p>}
      {isLoading && <p className="text-gray-500">Loading...</p>}
      {turtles && turtles.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {turtles.map((turtle) => (
            <TurtleCard key={turtle.id} turtle={turtle} />
          ))}
        </div>
      )}
      {turtles && turtles.length === 0 && (
        <p className="text-gray-500 text-center py-8">No turtles yet. Submit some photos to get started.</p>
      )}
    </div>
  );
}
