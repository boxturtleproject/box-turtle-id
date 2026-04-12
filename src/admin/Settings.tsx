import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { fetchSettings, updateSettings } from '../shared/lib/api';
import type { SiftSettingsResponse } from '../shared/types';

export default function Settings() {
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ['settings'],
    queryFn: fetchSettings,
  });

  const [form, setForm] = useState<SiftSettingsResponse>({
    distance_coefficient: 0,
    acceptance_threshold: 0,
    resized_width: 0,
  });

  useEffect(() => {
    if (data) setForm(data);
  }, [data]);

  const mutation = useMutation({
    mutationFn: (settings: Partial<SiftSettingsResponse>) => updateSettings(settings),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate(form);
  };

  return (
    <div className="max-w-xl mx-auto p-6 space-y-6">
      <Link to="/admin" className="text-blue-600 hover:underline text-sm">&larr; Back to Dashboard</Link>
      <h1 className="text-2xl font-bold">SIFT Settings</h1>

      {error && <p className="text-red-600">Error: {(error as Error).message}</p>}
      {isLoading && <p className="text-gray-500">Loading...</p>}

      {data && (
        <form onSubmit={handleSubmit} className="bg-white border rounded-lg p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Distance Coefficient</label>
            <input
              type="number"
              step="any"
              value={form.distance_coefficient}
              onChange={(e) => setForm({ ...form, distance_coefficient: parseFloat(e.target.value) })}
              className="w-full border rounded-lg px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Acceptance Threshold</label>
            <input
              type="number"
              step="any"
              value={form.acceptance_threshold}
              onChange={(e) => setForm({ ...form, acceptance_threshold: parseFloat(e.target.value) })}
              className="w-full border rounded-lg px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Resized Width</label>
            <input
              type="number"
              step="1"
              value={form.resized_width}
              onChange={(e) => setForm({ ...form, resized_width: parseInt(e.target.value, 10) })}
              className="w-full border rounded-lg px-3 py-2"
            />
          </div>
          <button
            type="submit"
            disabled={mutation.isPending}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg disabled:opacity-50"
          >
            {mutation.isPending ? 'Saving...' : 'Save Settings'}
          </button>
          {mutation.isSuccess && <p className="text-green-600 text-sm">Settings saved.</p>}
          {mutation.isError && <p className="text-red-600 text-sm">Error: {mutation.error.message}</p>}
        </form>
      )}
    </div>
  );
}
