import { useState, useEffect } from "react";
import { ArrowUpDown, Search } from "lucide-react";
import { Link } from "react-router";
import type { DataWindow, RelatedRepo } from "@/types/github";
import { STARGAZER_SAMPLE_LIMIT } from "@/lib/clickhouse";
import { compareByRelevance, overlapShare } from "@/lib/relevance";
import {
  getRelatedReposClient,
  getStarTotalsClient,
  getDataWindowClient,
  clearExpiredCache,
} from "@/lib/repos.client";
import { parseGitHubURL } from "@/utils/github";
import { Skeleton } from "@/app/components/Skeleton";
// import RepoFilter from './RepoFilter';

type SortColumn =
  | "relevance"
  | "repoName"
  | "stargazers"
  | "overlap"
  | "forkers"
  | "ratio";

const SORT_LABELS: Record<SortColumn, string> = {
  relevance: "relevance",
  repoName: "name",
  stargazers: "shared stars",
  overlap: "overlap",
  forkers: "shared forks",
  ratio: "ratio",
};

// Rows shown at first, and added by each "Show More"
const PAGE_SIZE = 100;

// How long the first render waits for star totals, so that results can open in
// relevance order rather than being reordered once they are on screen
const RELEVANCE_GRACE_MS = 1000;

// Resolves with the promise's value, or null if it takes longer than the given time
function withinTime<T>(promise: Promise<T>, ms: number): Promise<T | null> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(null), ms);
    promise.then((value) => {
      clearTimeout(timer);
      resolve(value);
    });
  });
}

function formatMonth(date: string): string {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

function formatShare(share: number | null): string {
  if (share === null) return "";

  const percent = share * 100;
  return percent < 0.1 ? "<0.1%" : `${percent.toFixed(1)}%`;
}

// Loading skeleton component for the repo table
function RepoTableSkeleton() {
  return (
    // <div className="container mx-auto px-4 py-8">
    <div className="overflow-x-auto shadow-md rounded-lg max-w-screen-lg mx-auto">
      <div className="w-full">
        <div className="bg-gray-50 dark:bg-gray-700 px-6 py-3">
          <div className="grid grid-cols-5 gap-4">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-6 w-full" />
            ))}
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800">
          {[...Array(10)].map((_, i) => (
            <div
              key={i}
              className="border-b border-gray-200 dark:border-gray-700 px-6 py-4"
            >
              <div className="grid grid-cols-5 gap-4">
                {[...Array(5)].map((_, j) => (
                  <Skeleton key={j} className="h-6 w-full" />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
    // </div>
  );
}

export default function RepoTable({ repoName = "" }: { repoName?: string }) {
  const [relatedRepos, setRelatedRepos] = useState<RelatedRepo[]>([]);
  // const [filteredRepos, setFilteredRepos] = useState<RelatedRepo[]>([]);
  // How many of the viewed repo's stargazers the results are based on
  const [sourceStargazers, setSourceStargazers] = useState<number>(0);
  const [dataWindow, setDataWindow] = useState<DataWindow | null>(null);
  const [visibleCount, setVisibleCount] = useState<number>(PAGE_SIZE);
  // Tracked separately from the results, because a loaded repo can have none
  const [initialLoading, setInitialLoading] = useState<boolean>(
    Boolean(repoName)
  );
  // Relevance needs each result's star total, which is looked up separately
  const [relevanceStatus, setRelevanceStatus] = useState<
    "loading" | "ready" | "unavailable"
  >("loading");
  const [error, setError] = useState<string>("");
  // Incremented to run the initial fetch again after an error
  const [attempt, setAttempt] = useState<number>(0);

  const [sortColumn, setSortColumn] = useState<SortColumn>("stargazers");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  useEffect(() => {
    // Clear expired cache entries on component mount
    clearExpiredCache();

    if (!repoName) return;

    // Set when the component unmounts or the fetch is retried
    let ignore = false;

    const loadRepos = async () => {
      const data = await getRelatedReposClient(repoName);
      if (ignore) return;

      // The viewed repo tops its own results. It is context, not a result.
      const sourceName = parseGitHubURL(repoName) ?? repoName;
      const source = data.find((repo) => repo.repoName === sourceName);
      const repos = data.filter((repo) => repo !== source);

      const withTotals = (totals: Map<string, number>) =>
        repos.map((repo) => ({
          ...repo,
          totalStars: totals.get(repo.repoName),
        }));

      const pendingTotals = getStarTotalsClient(
        repos.map((repo) => repo.repoName)
      ).catch((err) => {
        console.error("Error fetching star totals:", err);
        return "failed" as const;
      });

      const totals = await withinTime(pendingTotals, RELEVANCE_GRACE_MS);
      if (ignore) return;

      setSourceStargazers(source?.stargazers ?? 0);
      if (totals instanceof Map) {
        setRelatedRepos(withTotals(totals));
        setRelevanceStatus("ready");
        setSortColumn("relevance");
      } else {
        setRelatedRepos(repos);
        setRelevanceStatus(totals === "failed" ? "unavailable" : "loading");
      }
      setInitialLoading(false);

      if (totals === null) {
        // Too slow for the first render. Offer relevance as a sort once it is
        // ready, instead of reordering what is already on screen.
        const lateTotals = await pendingTotals;
        if (ignore) return;

        if (lateTotals instanceof Map) {
          setRelatedRepos(withTotals(lateTotals));
          setRelevanceStatus("ready");
        } else {
          setRelevanceStatus("unavailable");
        }
      }
    };

    loadRepos().catch((err) => {
      if (ignore) return;

      console.error("Error fetching repos:", err);
      setError(err.message || "Failed to load related repositories");
      setInitialLoading(false);
    });

    return () => {
      ignore = true;
    };
  }, [repoName, attempt]);

  useEffect(() => {
    let ignore = false;

    // The page works without the date range, so a failure here is not shown
    getDataWindowClient()
      .then((window) => {
        if (!ignore) setDataWindow(window);
      })
      .catch((err) => {
        console.error("Error fetching data window:", err);
      });

    return () => {
      ignore = true;
    };
  }, []);
  // const [filters, setFilters] = useState<FilterOptions>({
  //   hideAwesome: false,
  //   excludeKeywords: [],
  //   includeKeywords: [],
  //   minStars: 0,
  //   minForks: 0,
  //   minRatio: 0,
  // });

  const handleSort = (column: SortColumn) => {
    if (column === sortColumn) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortDirection("desc");
    }
  };

  // const applyFilters = useCallback((repos: RelatedRepo[], filters: FilterOptions) => {
  //   return repos.filter((repo) => {
  //     if (filters.hideAwesome && repo.repoName.toLowerCase().includes('awesome')) {
  //       return false;
  //     }
  //     if (filters.excludeKeywords.some((keyword) => repo.repoName.toLowerCase().includes(keyword.toLowerCase()))) {
  //       return false;
  //     }
  //     if (filters.includeKeywords.length > 0 && !filters.includeKeywords.some((keyword) => repo.repoName.toLowerCase().includes(keyword.toLowerCase()))) {
  //       return false;
  //     }
  //     if (repo.stargazers < filters.minStars) {
  //       return false;
  //     }
  //     if (repo.forkers < filters.minForks) {
  //       return false;
  //     }
  //     if (repo.ratio < filters.minRatio) {
  //       return false;
  //     }
  //     return true;
  //   });
  // }, []);

  // const handleFilterChange = (newFilters: FilterOptions) => {
  //   setFilters(newFilters);
  //   setFilteredRepos(applyFilters(relatedRepos, newFilters));
  // };

  const sortedData = [...relatedRepos].sort((a, b) => {
    if (sortColumn === "relevance") return compareByRelevance(a, b);

    // Repos whose star total is not known yet sort as the lowest overlap
    const valueA =
      sortColumn === "overlap" ? (overlapShare(a) ?? -1) : a[sortColumn];
    const valueB =
      sortColumn === "overlap" ? (overlapShare(b) ?? -1) : b[sortColumn];

    if (valueA < valueB) return sortDirection === "asc" ? -1 : 1;
    if (valueA > valueB) return sortDirection === "asc" ? 1 : -1;
    return 0;
  });

  // Every result is already loaded, so showing more is only a matter of display
  const visibleRepos = sortedData.slice(0, visibleCount);
  const hasMore = visibleCount < sortedData.length;

  const handleShowMore = () => {
    setVisibleCount((prev) => prev + PAGE_SIZE);
  };

  // Show loading state for initial client-side fetch
  if (initialLoading) {
    return <RepoTableSkeleton />;
  }

  // Show error state
  if (error) {
    return (
      <div className="text-center py-8">
        <h2 className="text-xl font-semibold mb-4 text-red-600 dark:text-red-400">
          Error Loading Data
        </h2>
        <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
        <button
          onClick={() => {
            setError("");
            setInitialLoading(true);
            setAttempt((prev) => prev + 1);
          }}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  const dateRange = dataWindow
    ? ` between ${formatMonth(dataWindow.start)} and ${formatMonth(dataWindow.end)}`
    : "";
  const sortButtonClass =
    "underline text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200";

  return (
    <>
      {/* <RepoFilter onFilterChange={handleFilterChange} /> */}
      {relatedRepos.length > 0 && (
        <div className="max-w-screen-lg mx-auto text-center text-sm text-gray-600 dark:text-gray-400 space-y-1">
          {sourceStargazers > 0 && (
            <p>
              Based on{" "}
              {sourceStargazers >= STARGAZER_SAMPLE_LIMIT
                ? "a sample of "
                : "the "}
              {sourceStargazers.toLocaleString()}{" "}
              {sourceStargazers === 1 ? "person" : "people"} who starred{" "}
              {repoName}
              {dateRange}.
            </p>
          )}
          <p>
            {sortColumn === "relevance"
              ? "Sorted by relevance, which weighs the stargazers a repository shares against how many it has overall."
              : `Sorted by ${SORT_LABELS[sortColumn]}.`}{" "}
            {sortColumn === "relevance" ? (
              <button
                onClick={() => handleSort("stargazers")}
                className={sortButtonClass}
              >
                Sort by most shared stars
              </button>
            ) : relevanceStatus === "ready" ? (
              <button
                onClick={() => handleSort("relevance")}
                className={sortButtonClass}
              >
                Sort by relevance
              </button>
            ) : (
              relevanceStatus === "loading" && "Relevance ranking is loading…"
            )}
          </p>
        </div>
      )}
      <div className="overflow-x-auto shadow-md rounded-lg max-w-screen-lg mx-auto mt-4">
        {relatedRepos && relatedRepos.length > 0 ? (
          <div className="overflow-x-auto shadow-md rounded-lg">
            <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
              <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                <tr>
                  <th
                    scope="col"
                    className="px-6 py-3 cursor-pointer"
                    onClick={() => handleSort("repoName")}
                  >
                    Repository
                    <ArrowUpDown className="inline ml-1" size={14} />
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 cursor-pointer"
                    onClick={() => handleSort("stargazers")}
                    title="People who starred both repositories"
                  >
                    ⭐ Shared stars
                    <ArrowUpDown className="inline ml-1" size={14} />
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 cursor-pointer"
                    onClick={() => handleSort("overlap")}
                    title={`Share of the repository's stargazers who also starred ${repoName}`}
                  >
                    Overlap
                    <ArrowUpDown className="inline ml-1" size={14} />
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 cursor-pointer"
                    onClick={() => handleSort("forkers")}
                    title={`People who starred ${repoName} and forked the repository`}
                  >
                    🍴 Shared forks
                    <ArrowUpDown className="inline ml-1" size={14} />
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 cursor-pointer"
                    onClick={() => handleSort("ratio")}
                    title="Shared stars per shared fork"
                  >
                    Ratio
                    <ArrowUpDown className="inline ml-1" size={14} />
                  </th>
                </tr>
              </thead>
              <tbody>
                {visibleRepos.map((repo) => (
                  <tr
                    key={repo.repoName}
                    className="bg-white border-b dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
                  >
                    <th
                      scope="row"
                      className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white"
                    >
                      <div className="flex items-center">
                        <a
                          href={repo.githubUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:underline p-2 pr-1"
                          title="View on GitHub"
                        >
                          {repo.repoName}
                        </a>
                        <Link
                          to={`/${repo.repoName}`}
                          className="p-2 pl-1"
                          title="View related repos"
                        >
                          <Search
                            size={16}
                            className="text-blue-500 hover:text-blue-900 dark:hover:text-blue-100 cursor-pointer"
                          />
                        </Link>
                      </div>
                    </th>
                    <td className="px-6 py-4">
                      {repo.stargazers?.toLocaleString()}
                    </td>
                    <td
                      className="px-6 py-4"
                      title={
                        repo.totalStars
                          ? `${repo.stargazers.toLocaleString()} of its ${repo.totalStars.toLocaleString()} stargazers`
                          : undefined
                      }
                    >
                      {formatShare(overlapShare(repo))}
                    </td>
                    <td className="px-6 py-4">
                      {repo.forkers?.toLocaleString()}
                    </td>
                    <td className="px-6 py-4">{repo.ratio?.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-4">
            <p>No related repositories found.</p>
            {dataWindow && (
              <p className="text-sm mt-1">
                The data only covers stars given{dateRange}.
              </p>
            )}
          </div>
        )}
      </div>
      {hasMore && (
        <div className="text-center mt-4">
          <button
            onClick={handleShowMore}
            className="px-8 py-3 font-medium bg-blue-600 hover:bg-blue-700
              dark:bg-gray-700 dark:hover:bg-gray-600
              text-white rounded-lg transition-colors duration-200
              focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900"
          >
            Show More
          </button>
        </div>
      )}
    </>
  );
}
