import { Suspense } from 'react';
import { unstable_cache } from 'next/cache';
import { buildQuery, fetchDataFromClickHouse } from '@/lib/clickhouse';
import RepoTable from '@/app/components/RepoTable';
import type { RelatedRepo } from '@/types/github';

const ONE_DAY = 60 * 60 * 24;

const getRelatedRepos = unstable_cache(
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

function RepoTableWrapper({ repoName }: { repoName: string }) {
  const relatedReposPromise = getRelatedRepos(repoName);

  return (
    <Suspense fallback={<div>Loading...</div>}>
      <RepoTableAsync repoPromise={relatedReposPromise} />
    </Suspense>
  );
}

async function RepoTableAsync({ repoPromise }: { repoPromise: Promise<RelatedRepo[]> }) {
  const relatedRepos = await repoPromise;
  return <RepoTable relatedRepos={relatedRepos} />;
}

export default async function RepoPage({ params }: { params: Promise<{ org: string; repo: string }> }) {
  const { org, repo } = await params;
  const repoName = `${org}/${repo}`;

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6 text-center">Related Repositories for {repoName}</h1>
      <div className="overflow-x-auto shadow-md rounded-lg max-w-screen-lg mx-auto">
        <RepoTableWrapper repoName={repoName} />
      </div>
    </div>
  );
}
