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

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === 'NumpadEnter') {
      handleSearch();
    }
  };

  return (
    <div className="flex flex-col items-center gap-3 w-full max-w-xl mx-auto">
      <div className="w-full">
        <input
          type="text"
          value={repo}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder="Enter repo (e.g., ClickHouse/ClickHouse) or GitHub URL"
          className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg
            text-foreground placeholder:text-gray-500 dark:placeholder:text-gray-400
            transition-colors duration-200
            focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:focus:border-blue-400"
        />
      </div>
      <button
        onClick={handleSearch}
        className="px-8 py-3 font-medium bg-blue-600 hover:bg-blue-700
          dark:bg-gray-700 dark:hover:bg-gray-600
          text-white rounded-lg transition-colors duration-200
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900"
      >
        Find Repos
      </button>
    </div>
  );
}
