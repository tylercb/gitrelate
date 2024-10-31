'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { parseGitHubURL } from '@/utils/github';

export default function RepoInput() {
  const [repo, setRepo] = useState('');
  const router = useRouter();

  const handleSearch = () => {
    if (repo) router.push(`/${repo}`);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value;
    setRepo(parseGitHubURL(input) || input);
  };

  return (
    <div className="flex flex-col items-center">
      <div className="w-full max-w-md">
        <input
          type="text"
          value={repo}
          onChange={handleInputChange}
          placeholder="Enter repo or GitHub URL (e.g., vercel/next.js)"
          className="w-full px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
        />
      </div>
      <button
        onClick={handleSearch}
        className="mt-4 px-6 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
      >
        Search
      </button>
    </div>
  );
}