import { Navigate, useLocation } from "react-router";
import { parseGitHubURL } from "@/utils/github";
import { useDocumentTitle } from "@/utils/useDocumentTitle";

export default function GitHubPathPage() {
  const { pathname } = useLocation();
  const repoName = parseGitHubURL(`https://github.com${pathname}`);

  useDocumentTitle("GitRelate(d) - Find Related Repositories");

  if (repoName) {
    // Drop any extra path segments (e.g. /tree/main) and go to the repo page
    return <Navigate to={`/${repoName}`} replace />;
  }

  return <div>Invalid GitHub URL. Please enter a valid GitHub repository.</div>;
}
