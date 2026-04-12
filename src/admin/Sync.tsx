import { useMutation } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { triggerSync } from '../shared/lib/api';

export default function Sync() {
  const mutation = useMutation({
    mutationFn: triggerSync,
  });

  return (
    <div className="max-w-xl mx-auto p-6 space-y-6">
      <Link to="/admin" className="text-blue-600 hover:underline text-sm">&larr; Back to Dashboard</Link>
      <h1 className="text-2xl font-bold">Airtable Sync</h1>

      <button
        onClick={() => mutation.mutate()}
        disabled={mutation.isPending}
        className="bg-blue-600 text-white px-4 py-2 rounded-lg disabled:opacity-50"
      >
        {mutation.isPending ? 'Syncing...' : 'Trigger Sync'}
      </button>

      {mutation.isError && (
        <p className="text-red-600">Error: {mutation.error.message}</p>
      )}

      {mutation.data && (
        <div className="bg-white border rounded-lg p-4 space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">Status:</span>
            <span className={`font-semibold ${mutation.data.status === 'success' ? 'text-green-600' : 'text-red-600'}`}>
              {mutation.data.status}
            </span>
          </div>

          {mutation.data.message && (
            <p className="text-sm text-gray-700">{mutation.data.message}</p>
          )}

          {mutation.data.result && (
            <div className="grid grid-cols-2 gap-4 text-center text-sm">
              <div className="border rounded-lg p-3">
                <p className="font-semibold mb-1">Turtles</p>
                <p>Created: <span className="font-medium">{mutation.data.result.turtles.created}</span></p>
                <p>Updated: <span className="font-medium">{mutation.data.result.turtles.updated}</span></p>
              </div>
              <div className="border rounded-lg p-3">
                <p className="font-semibold mb-1">Encounters</p>
                <p>Created: <span className="font-medium">{mutation.data.result.encounters.created}</span></p>
                <p>Updated: <span className="font-medium">{mutation.data.result.encounters.updated}</span></p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
