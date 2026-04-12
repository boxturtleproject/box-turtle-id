import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { fetchTurtle, fetchEncounters, imageUrl } from '../shared/lib/api';

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

  if (turtleLoading) return <div className="p-6">Loading...</div>;
  if (turtleError) return <div className="p-6 text-red-600">Error: {(turtleError as Error).message}</div>;
  if (!turtle) return <div className="p-6">Turtle not found.</div>;

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <Link to="/admin" className="text-blue-600 hover:underline text-sm">&larr; Back to Dashboard</Link>
      <h1 className="text-2xl font-bold">
        Turtle #{turtle.id}
        {turtle.name && <span className="ml-2 font-normal text-gray-600">({turtle.name})</span>}
      </h1>

      {/* Metadata */}
      <div className="bg-white border rounded-lg p-4">
        <h2 className="font-semibold mb-3">Details</h2>
        <dl className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-2 text-sm">
          {([
            ['Site', turtle.site],
            ['Gender', turtle.gender],
            ['Species', turtle.species],
            ['Pattern', turtle.pattern],
            ['First Seen', turtle.first_seen],
            ['Carapace Flare', turtle.carapace_flare],
          ] as const).map(([label, value]) => (
            <div key={label}>
              <dt className="text-gray-500">{label}</dt>
              <dd className="font-medium">{value ?? '-'}</dd>
            </div>
          ))}
        </dl>
        {turtle.notes && (
          <div className="mt-3 text-sm">
            <p className="text-gray-500">Notes</p>
            <p>{turtle.notes}</p>
          </div>
        )}
      </div>

      {/* Captures grid */}
      {turtle.captures.length > 0 && (
        <div>
          <h2 className="font-semibold mb-3">Captures ({turtle.captures.length})</h2>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
            {turtle.captures.map((cap) => (
              <div key={cap.id} className="border rounded-lg overflow-hidden">
                <img
                  src={imageUrl(cap.thumbnail_path ?? cap.image_path)}
                  alt={cap.original_filename}
                  className="w-full aspect-square object-cover"
                />
                <div className="p-2 text-xs text-gray-500">
                  {cap.image_type} &middot; {cap.keypoint_count} kp
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Encounters timeline */}
      <div>
        <h2 className="font-semibold mb-3">Encounters</h2>
        {encountersLoading && <p className="text-gray-500 text-sm">Loading encounters...</p>}
        {encounters && encounters.length === 0 && (
          <p className="text-gray-500 text-sm">No encounters recorded.</p>
        )}
        {encounters && encounters.length > 0 && (
          <ul className="space-y-3">
            {encounters.map((enc) => (
              <li key={enc.id} className="bg-white border rounded-lg p-4 text-sm">
                <div className="flex items-baseline justify-between mb-1">
                  <span className="font-medium">{enc.encounter_date ?? 'Unknown date'}</span>
                  {enc.plot_name && <span className="text-gray-500">{enc.plot_name}</span>}
                </div>
                <div className="flex flex-wrap gap-2 text-xs text-gray-600">
                  {enc.health_status && <span>Health: {enc.health_status}</span>}
                  {enc.behavior && <span>Behavior: {enc.behavior}</span>}
                  {enc.setting && <span>Setting: {enc.setting}</span>}
                  {enc.conditions && <span>Conditions: {enc.conditions}</span>}
                </div>
                {enc.notes && <p className="mt-1 text-gray-700">{enc.notes}</p>}
                {enc.observer_nickname && (
                  <p className="mt-1 text-gray-400 text-xs">Observer: {enc.observer_nickname}</p>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
