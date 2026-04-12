import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { compareTwoImages, imageUrl } from '../shared/lib/api';
import type { CompareResponse } from '../shared/types';

export default function Compare() {
  const [file1, setFile1] = useState<File | null>(null);
  const [file2, setFile2] = useState<File | null>(null);

  const mutation = useMutation<CompareResponse, Error>({
    mutationFn: () => {
      if (!file1 || !file2) throw new Error('Select two images');
      return compareTwoImages(file1, file2);
    },
  });

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <Link to="/admin" className="text-blue-600 hover:underline text-sm">&larr; Back to Dashboard</Link>
      <h1 className="text-2xl font-bold">Compare Two Images</h1>

      <div className="grid grid-cols-2 gap-4">
        <label className="flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-8 cursor-pointer hover:bg-gray-50">
          <span className="text-sm text-gray-500 mb-1">Image 1</span>
          <span className="text-sm font-medium">{file1 ? file1.name : 'Click to upload'}</span>
          <input type="file" accept="image/*" className="hidden" onChange={(e) => setFile1(e.target.files?.[0] ?? null)} />
        </label>
        <label className="flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-8 cursor-pointer hover:bg-gray-50">
          <span className="text-sm text-gray-500 mb-1">Image 2</span>
          <span className="text-sm font-medium">{file2 ? file2.name : 'Click to upload'}</span>
          <input type="file" accept="image/*" className="hidden" onChange={(e) => setFile2(e.target.files?.[0] ?? null)} />
        </label>
      </div>

      <button
        onClick={() => mutation.mutate()}
        disabled={!file1 || !file2 || mutation.isPending}
        className="bg-blue-600 text-white px-4 py-2 rounded-lg disabled:opacity-50"
      >
        {mutation.isPending ? 'Comparing...' : 'Compare'}
      </button>

      {mutation.isError && (
        <p className="text-red-600">Error: {mutation.error.message}</p>
      )}

      {mutation.data && (
        <div className="bg-white border rounded-lg p-4 space-y-3">
          <h2 className="font-semibold text-lg">Results</h2>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-sm text-gray-500">Score</p>
              <p className="text-xl font-bold">{mutation.data.score}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Match</p>
              <p className={`text-xl font-bold ${mutation.data.is_match ? 'text-green-600' : 'text-red-600'}`}>
                {mutation.data.is_match ? 'Yes' : 'No'}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Match Count</p>
              <p className="text-xl font-bold">{mutation.data.match_count}</p>
            </div>
          </div>
          {mutation.data.visualization_path && (
            <img
              src={imageUrl(mutation.data.visualization_path)}
              alt="Comparison visualization"
              className="rounded-lg border w-full"
            />
          )}
        </div>
      )}
    </div>
  );
}
