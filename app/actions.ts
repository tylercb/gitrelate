'use server';

import { getRelatedReposCached } from '@/lib/repos';

export async function fetchMoreRelatedRepos(repoName: string, offset: number) {
  return await getRelatedReposCached(repoName, offset);
}
