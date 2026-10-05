import { useState } from "react";
import { ChevronDown, ChevronRight, Search } from "lucide-react";
import { Link } from "react-router";
import type { RelatedRepo, RepoDetailsResult } from "@/types/github";
import { getRepoDetailsClient } from "@/lib/github.client";
import { overlapShare } from "@/lib/relevance";
import { formatShare } from "@/utils/format";
import RepoDetails from "@/app/components/RepoDetails";

export default function RepoRow({ repo }: { repo: RelatedRepo }) {
  const [open, setOpen] = useState<boolean>(false);
  // Fetched the first time the row is opened
  const [result, setResult] = useState<RepoDetailsResult | null>(null);

  const [owner, name] = repo.repoName.split("/");

  const handleToggle = () => {
    setOpen(!open);
    if (!open && !result) {
      getRepoDetailsClient(repo.repoName).then(setResult);
    }
  };

  return (
    <>
      <tr className="bg-white border-b dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
        <th
          scope="row"
          className="w-full px-2 py-2 sm:px-6 sm:py-4 font-medium text-gray-900 dark:text-white"
        >
          <div className="flex items-center">
            <button
              type="button"
              onClick={handleToggle}
              aria-expanded={open}
              aria-label={`${open ? "Hide" : "Show"} details for ${repo.repoName}`}
              className="p-1 shrink-0 rounded text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            </button>
            <a
              href={repo.githubUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="min-w-0 hover:underline py-2 px-1 sm:p-2 sm:pr-1 break-words sm:whitespace-nowrap"
              title="View on GitHub"
            >
              {/* Lets a long name wrap after the owner rather than mid-word */}
              {owner}/<wbr />
              {name}
            </a>
            <Link
              to={`/${repo.repoName}`}
              className="shrink-0 p-1 sm:p-2 sm:pl-1"
              title="View related repos"
              aria-label={`View repos related to ${repo.repoName}`}
            >
              <Search
                size={16}
                className="text-blue-500 hover:text-blue-900 dark:hover:text-blue-100 cursor-pointer"
              />
            </Link>
          </div>
        </th>
        <td className="px-2 py-2 sm:px-6 sm:py-4 whitespace-nowrap">
          {repo.stargazers?.toLocaleString()}
        </td>
        <td
          className="px-2 py-2 sm:px-6 sm:py-4 whitespace-nowrap"
          title={
            repo.totalStars
              ? `${repo.stargazers.toLocaleString()} of its ${repo.totalStars.toLocaleString()} stargazers`
              : undefined
          }
        >
          {formatShare(overlapShare(repo))}
        </td>
        <td className="hidden sm:table-cell px-6 py-4">
          {repo.forkers?.toLocaleString()}
        </td>
        <td className="hidden sm:table-cell px-6 py-4">
          {repo.ratio?.toFixed(2)}
        </td>
      </tr>
      {open && (
        <tr className="bg-gray-50 border-b dark:bg-gray-900 dark:border-gray-700">
          <td colSpan={5} className="px-3 py-3 pl-9 sm:px-6 sm:pl-14">
            {result === null && <p>Loading details…</p>}
            {result?.status === "found" && (
              <RepoDetails details={result.details} />
            )}
            {result?.status === "not-found" && (
              <p>This repository is no longer on GitHub under this name.</p>
            )}
            {result?.status === "unavailable" && (
              <p>
                Details are not available right now. GitHub limits how many can
                be loaded each hour.
              </p>
            )}
          </td>
        </tr>
      )}
    </>
  );
}
