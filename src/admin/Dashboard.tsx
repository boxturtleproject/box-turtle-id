import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { fetchTurtles } from '../shared/lib/api';

export default function Dashboard() {
  const { data: turtles, isLoading, error } = useQuery({
    queryKey: ['turtles'],
    queryFn: fetchTurtles,
  });

  const total = turtles?.length ?? 0;
  const patuxentCount = turtles?.filter((t) => t.site === 'patuxent').length ?? 0;
  const wallkillCount = turtles?.filter((t) => t.site === 'wallkill').length ?? 0;

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-8">
      <h1 className="text-2xl font-bold">Admin Dashboard</h1>

      {/* Stat cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-lg border p-4 text-center">
          <p className="text-sm text-gray-500">Total Turtles</p>
          <p className="text-3xl font-bold">{isLoading ? '...' : total}</p>
        </div>
        <div className="bg-white rounded-lg border p-4 text-center">
          <p className="text-sm text-gray-500">Patuxent</p>
          <p className="text-3xl font-bold text-green-700">{isLoading ? '...' : patuxentCount}</p>
        </div>
        <div className="bg-white rounded-lg border p-4 text-center">
          <p className="text-sm text-gray-500">Wallkill</p>
          <p className="text-3xl font-bold text-orange-700">{isLoading ? '...' : wallkillCount}</p>
        </div>
      </div>

      {/* Quick actions */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Quick Actions</h2>
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
      </div>

      {/* Turtle list */}
      <div>
        <h2 className="text-lg font-semibold mb-3">All Turtles</h2>
        {error && <p className="text-red-600">Error loading turtles: {(error as Error).message}</p>}
        {isLoading && <p className="text-gray-500">Loading...</p>}
        {turtles && (
          <ul className="bg-white border rounded-lg divide-y">
            {turtles.map((turtle) => (
              <li key={turtle.id}>
                <Link
                  to={`/admin/turtles/${turtle.id}`}
                  className="block px-4 py-3 hover:bg-gray-50 transition-colors"
                >
                  <span className="font-medium">#{turtle.id}</span>
                  {turtle.name && <span className="ml-2 text-gray-700">{turtle.name}</span>}
                  {turtle.site && (
                    <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                      {turtle.site}
                    </span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
