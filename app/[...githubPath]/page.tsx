import { redirect } from "next/navigation";
import { parseGitHubURL } from "@/utils/github";

export default async function GitHubPathPage({
  params,
}: {
  params: Promise<{ githubPath: string[] }>;
}) {
  const githubPath = (await params).githubPath;
  const fullPath = githubPath.join("/");
  const repoName = parseGitHubURL(`https://github.com/${fullPath}`);

  if (repoName) {
    // Split the repo name into org and repo components and redirect to the correct route
    const [org, repo] = repoName.split("/");
    return redirect(`/${org}/${repo}`);
  }

  return <div>Invalid GitHub URL. Please enter a valid GitHub repository.</div>;
}
