import { getRelatedReposCached as getRelatedRepos } from '@/lib/repos';
import RepoTable from '@/app/components/RepoTable';

export default async function RepoPage({
  params,
}: {
  params: Promise<{ org: string; repo: string }>;
}) {
  const { org, repo } = await params;
  const repoName = `${org}/${repo}`;

  try {
    const relatedRepos = await getRelatedRepos(repoName, 0);

    if (!relatedRepos.length) {
      return (
        <div className="text-center py-8">
          <h1 className="text-2xl font-bold mb-4">No Related Repositories Found</h1>
          <p className="text-gray-600">
            We couldn&apos;t find any related repositories for {repoName}. This could be because:
          </p>
          <ul className="list-disc list-inside mt-4 text-gray-600">
            <li>The repository is too new</li>
            <li>It has very few stargazers</li>
            <li>The data is still being processed</li>
          </ul>
        </div>
      );
    }

    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6 text-center">
          Related Repositories for {repoName}
        </h1>
        <RepoTable initialRelatedRepos={relatedRepos} repoName={repoName} />
      </div>
    );
  } catch (error) {
    const err = error as Error;
    console.error('Error fetching related repos:', err);
    return (
      <div className="text-center py-8">
        <h1 className="text-2xl font-bold mb-4">Error Loading Data</h1>
        <p className="text-gray-600">
          {err.message === 'Request timed out. Please try again.'
            ? 'The request took too long to complete. Please try again or try a different repository.'
            : 'There was an error loading the related repositories. Please try again later.'}
        </p>
      </div>
    );
  }
}

export async function generateMetadata({ params }: { params: Promise<{ org: string; repo: string }> }) {
  const { org, repo } = await params;
  const repoName = `${org}/${repo}`;
  return {
    title: `${repoName} Related Repos - GitRelate(d)`,
  };
}
