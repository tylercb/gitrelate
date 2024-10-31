
import { unstable_cache } from 'next/cache';
import { buildQuery, fetchDataFromClickHouse } from '@/lib/clickhouse';

const ONE_DAY = 60 * 60 * 24;

export const getRelatedReposCached = unstable_cache(
  async (repoName: string) => {
    const query = buildQuery(repoName, 100, 'stargazers', 0, 0, 0);
    if (!query) {
      throw new Error('Invalid repository name');
    }
    return await fetchDataFromClickHouse(query);
  },
  ['related-repos'],
  { revalidate: ONE_DAY }
);

export const getRelatedReposUncached = async (repoName: string) => {
  const query = buildQuery(repoName, 100, 'stargazers', 0, 0, 0);
  if (!query) {
    throw new Error('Invalid repository name');
  }
  return await fetchDataFromClickHouse(query);
};
