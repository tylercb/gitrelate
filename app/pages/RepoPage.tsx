import { useParams } from "react-router";
import RepoTable from "@/app/components/RepoTable";
import { useDocumentTitle } from "@/utils/useDocumentTitle";

export default function RepoPage() {
  const { org, repo } = useParams();
  const repoName = `${org}/${repo}`;

  useDocumentTitle(`${repoName} Related Repos - GitRelate(d)`);

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6 text-center">
        Related Repositories for {repoName}
      </h1>
      {/* Keyed so that navigating to another repo starts with a fresh table */}
      <RepoTable key={repoName} repoName={repoName} />
    </div>
  );
}
