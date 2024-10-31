
import { unstable_cache } from 'next/cache';
import { buildQuery, fetchDataFromClickHouse } from '@/lib/clickhouse';

const ONE_DAY = 60 * 60 * 24;

export function getRelatedReposCached(repoName: string, offset: number) {
  return unstable_cache(
    async () => {
      const query = buildQuery(repoName, 100, 'stargazers', 0, 0, 0, offset);
      if (!query) {
        throw new Error('Invalid repository name');
      }
      return await fetchDataFromClickHouse(query);
    },
    ['related-repos', repoName, offset.toString()],
    { revalidate: ONE_DAY }
  )();
}

export const getRelatedReposUncached = async (repoName: string) => {
  const query = buildQuery(repoName, 100, 'stargazers', 0, 0, 0);
  if (!query) {
    throw new Error('Invalid repository name');
  }
  return await fetchDataFromClickHouse(query);
};
