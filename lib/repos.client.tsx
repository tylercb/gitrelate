'use client';

import { buildQuery, fetchDataFromClickHouse } from '@/lib/clickhouse';
import type { RelatedRepo } from '@/types/github';

export async function getRelatedReposClient(repoName: string, offset: number): Promise<RelatedRepo[]> {
  const query = buildQuery(repoName, 100, 'stargazers', 0, 0, 0, offset);
  if (!query) {
    throw new Error('Invalid repository name');
  }
  return await fetchDataFromClickHouse(query);
}
