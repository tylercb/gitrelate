'use client';

import { useState } from 'react';
import { ArrowUpDown } from 'lucide-react';
import type { RelatedRepo } from '@/types/github';
import { fetchMoreRelatedRepos } from '@/app/actions';

export default function RepoTable({
  initialRelatedRepos,
  repoName,
}: {
  initialRelatedRepos: RelatedRepo[];
  repoName: string;
}) {
  const [relatedRepos, setRelatedRepos] = useState<RelatedRepo[]>(initialRelatedRepos);
  const [offset, setOffset] = useState<number>(initialRelatedRepos.length);
  const [loadingMore, setLoadingMore] = useState<boolean>(false);
  const [hasMore, setHasMore] = useState<boolean>(true);

  const [sortColumn, setSortColumn] = useState<keyof RelatedRepo>('stargazers');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const handleSort = (column: keyof RelatedRepo) => {
    if (column === sortColumn) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('desc');
    }
  };

  const sortedData = [...relatedRepos].sort((a, b) => {
    if (a[sortColumn] < b[sortColumn]) return sortDirection === 'asc' ? -1 : 1;
    if (a[sortColumn] > b[sortColumn]) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  const handleShowMore = async () => {
    setLoadingMore(true);
    try {
      const moreRepos = await fetchMoreRelatedRepos(repoName, offset);
      if (moreRepos.length === 0 || moreRepos.length < 100) {
        setHasMore(false);
      }
      setRelatedRepos((prev) => [...prev, ...moreRepos]);
      setOffset((prev) => prev + moreRepos.length);
    } catch (error) {
      console.error('Error fetching more repos:', error);
    } finally {
      setLoadingMore(false);
    }
  };

  return (
    <>
      <div className="overflow-x-auto shadow-md rounded-lg max-w-screen-lg mx-auto">
        <div className="overflow-x-auto shadow-md rounded-lg">
          <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
            <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
              <tr>
                <th scope="col" className="px-6 py-3 cursor-pointer" onClick={() => handleSort('repoName')}>
                  Repository
                  <ArrowUpDown className="inline ml-1" size={14} />
                </th>
                <th scope="col" className="px-6 py-3 cursor-pointer" onClick={() => handleSort('stargazers')}>
                  ⭐ Stars
                  <ArrowUpDown className="inline ml-1" size={14} />
                </th>
                <th scope="col" className="px-6 py-3 cursor-pointer" onClick={() => handleSort('forkers')}>
                  🍴 Forks
                  <ArrowUpDown className="inline ml-1" size={14} />
                </th>
                <th scope="col" className="px-6 py-3 cursor-pointer" onClick={() => handleSort('ratio')}>
                  Ratio
                  <ArrowUpDown className="inline ml-1" size={14} />
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedData.map((repo) => (
                <tr key={repo.repoName} className="bg-white border-b dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                  <th scope="row" className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white">
                    <a href={repo.githubUrl} target="_blank" rel="noopener noreferrer" className="hover:underline">
                      {repo.repoName}
                    </a>
                  </th>
                  <td className="px-6 py-4">{repo.stargazers?.toLocaleString()}</td>
                  <td className="px-6 py-4">{repo.forkers?.toLocaleString()}</td>
                  <td className="px-6 py-4">{repo.ratio?.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {hasMore && (
        <div className="text-center mt-4">
          <button
            onClick={handleShowMore}
            disabled={loadingMore}
            className="px-8 py-3 font-medium bg-blue-600 hover:bg-blue-700
              dark:bg-gray-700 dark:hover:bg-gray-600
              text-white rounded-lg transition-colors duration-200
              focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900"
          >
            {loadingMore ? 'Loading...' : 'Show More'}
          </button>
        </div>
      )}
    </>
  );
}
