import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { searchByImage, imageUrl } from '../shared/lib/api';
import type { SearchResponse } from '../shared/types';

export default function Search() {
  const [file, setFile] = useState<File | null>(null);

  const mutation = useMutation<SearchResponse, Error>({
    mutationFn: () => {
      if (!file) throw new Error('Select an image');
      return searchByImage(file);
    },
  });

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <Link to="/admin" className="text-blue-600 hover:underline text-sm">&larr; Back to Dashboard</Link>
      <h1 className="text-2xl font-bold">Search by Image</h1>

      <label className="flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-8 cursor-pointer hover:bg-gray-50">
        <span className="text-sm text-gray-500 mb-1">Upload Image</span>
        <span className="text-sm font-medium">{file ? file.name : 'Click to upload'}</span>
        <input type="file" accept="image/*" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
      </label>

      <button
        onClick={() => mutation.mutate()}
        disabled={!file || mutation.isPending}
        className="bg-blue-600 text-white px-4 py-2 rounded-lg disabled:opacity-50"
      >
        {mutation.isPending ? 'Searching...' : 'Search'}
      </button>

      {mutation.isError && (
        <p className="text-red-600">Error: {mutation.error.message}</p>
      )}

      {mutation.data && (
        <div className="bg-white border rounded-lg p-4 space-y-4">
          <p className="text-sm text-gray-500">
            Compared against <span className="font-semibold">{mutation.data.total_compared}</span> captures
          </p>
          {mutation.data.results.length === 0 && (
            <p className="text-gray-500">No results found.</p>
          )}
          <ul className="divide-y">
            {mutation.data.results.map((result) => (
              <li key={result.capture_id} className="py-3 flex items-center gap-4">
                {result.thumbnail_path && (
                  <img
                    src={imageUrl(result.thumbnail_path)}
                    alt={`Turtle ${result.turtle_id}`}
                    className="w-16 h-16 rounded object-cover border"
                  />
                )}
                <div className="flex-1">
                  <Link
                    to={`/admin/turtles/${result.turtle_id}`}
                    className="font-medium text-blue-600 hover:underline"
                  >
                    Turtle #{result.turtle_id}
                  </Link>
                  <p className="text-sm text-gray-500">Score: {result.score}</p>
                </div>
                <span className={`text-sm font-medium ${result.is_match ? 'text-green-600' : 'text-gray-400'}`}>
                  {result.is_match ? 'Match' : 'No match'}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
