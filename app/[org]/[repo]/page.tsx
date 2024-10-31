import { Suspense } from 'react';
import { getRelatedReposCached as getRelatedRepos } from '@/lib/repos';
import RepoTable from '@/app/components/RepoTable';
import Loading from '@/app/components/Loading';
import type { RelatedRepo } from '@/types/github';

export default async function RepoPage({ params }: { params: { org: string; repo: string } }) {
  const { org, repo } = await params;
  const repoName = `${org}/${repo}`;

  let relatedRepos: RelatedRepo[];
  try {
    relatedRepos = await getRelatedRepos(repoName);
  } catch (error) {
    console.error('Error fetching related repos:', error);
    return (
      <div className="text-center py-8">
        <h1 className="text-2xl font-bold mb-4">Invalid Repository Name</h1>
        <p className="text-gray-600">Please check the repository name and try again.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6 text-center">Related Repositories for {repoName}</h1>
      <div className="overflow-x-auto shadow-md rounded-lg max-w-screen-lg mx-auto">
        <Suspense fallback={<Loading />}>
          <RepoTable relatedRepos={relatedRepos} />
        </Suspense>
      </div>
    </div>
  );
}
