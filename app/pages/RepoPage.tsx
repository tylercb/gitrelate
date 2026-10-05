import { useEffect, useState } from "react";
import { useParams } from "react-router";
import type { RepoDetailsResult } from "@/types/github";
import { getRepoDetailsClient } from "@/lib/github.client";
import RepoDetails from "@/app/components/RepoDetails";
import RepoTable from "@/app/components/RepoTable";
import { useDocumentTitle } from "@/utils/useDocumentTitle";

function RepoView({ repoName }: { repoName: string }) {
  // Undefined until GitHub has answered
  const [details, setDetails] = useState<RepoDetailsResult>();

  useEffect(() => {
    const controller = new AbortController();

    getRepoDetailsClient(repoName, controller.signal).then((result) => {
      if (!controller.signal.aborted) setDetails(result);
    });

    return () => {
      controller.abort();
    };
  }, [repoName]);

  return (
    <div className="container mx-auto sm:px-4 py-8">
      <h1 className="text-2xl sm:text-3xl font-bold mb-6 text-center break-words">
        Related Repositories for {repoName}
      </h1>
      {details?.status === "found" && (
        <div className="max-w-screen-md mx-auto mb-6">
          <RepoDetails
            details={details.details}
            githubUrl={`https://github.com/${details.details.fullName}`}
            centered
          />
        </div>
      )}
      <RepoTable
        repoName={repoName}
        sourceDetails={details}
        resolvingSource={details === undefined}
      />
    </div>
  );
}

export default function RepoPage() {
  const { org, repo } = useParams();
  const repoName = `${org}/${repo}`;

  useDocumentTitle(`${repoName} Related Repos - GitRelate(d)`);

  // Keyed so that navigating to another repo starts from scratch
  return <RepoView key={repoName} repoName={repoName} />;
}
