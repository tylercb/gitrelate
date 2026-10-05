import { useState, useEffect, useRef } from "react";
import { Navigate } from "react-router";
import type { RelatedRepo, RepoDetailsResult } from "@/types/github";
import { STARGAZER_SAMPLE_LIMIT } from "@/lib/clickhouse";
import { filterRepos } from "@/lib/filters";
import { compareByRelevance, overlapShare } from "@/lib/relevance";
import {
  getRelatedReposClient,
  getStarTotalsClient,
  clearExpiredCache,
} from "@/lib/repos.client";
import { formatDateRange } from "@/utils/format";
import { parseGitHubURL } from "@/utils/github";
import { useDataWindow } from "@/utils/useDataWindow";
import RepoFilters from "@/app/components/RepoFilters";
import RepoRow from "@/app/components/RepoRow";
import RepoTableLoading from "@/app/components/RepoTableLoading";
import SortableHeader from "@/app/components/SortableHeader";

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

const TEXT_BUTTON_CLASS =
  "underline text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200";
const ACTION_BUTTON_CLASS =
  "px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors";

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

export default function RepoTable({
  repoName = "",
  sourceDetails,
  resolvingSource = false,
}: {
  repoName?: string;
  // What GitHub says about the repo being viewed, once that is known
  sourceDetails?: RepoDetailsResult;
  resolvingSource?: boolean;
}) {
  const [relatedRepos, setRelatedRepos] = useState<RelatedRepo[]>([]);
  // How many of the viewed repo's stargazers the results are based on
  const [sourceStargazers, setSourceStargazers] = useState<number>(0);
  const dataWindow = useDataWindow();
  const [visibleCount, setVisibleCount] = useState<number>(PAGE_SIZE);
  // Tracked separately from the results, because a loaded repo can have none
  const [initialLoading, setInitialLoading] = useState<boolean>(
    Boolean(repoName)
  );
  const [cancelled, setCancelled] = useState<boolean>(false);
  // Relevance needs each result's star total, which is looked up separately
  const [relevanceStatus, setRelevanceStatus] = useState<
    "loading" | "ready" | "unavailable"
  >("loading");
  const [error, setError] = useState<string>("");
  // Incremented to run the initial fetch again after an error or a cancel
  const [attempt, setAttempt] = useState<number>(0);
  const abortController = useRef<AbortController | null>(null);

  const [sortColumn, setSortColumn] = useState<SortColumn>("stargazers");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  const [filterQuery, setFilterQuery] = useState<string>("");
  const [hideSameOwner, setHideSameOwner] = useState<boolean>(false);
  const [hideAwesome, setHideAwesome] = useState<boolean>(false);

  // The name the queries use, which drops extras such as a ".git" suffix
  const sourceName = parseGitHubURL(repoName) ?? repoName;
  const sourceOwner = sourceName.split("/")[0];

  useEffect(() => {
    // Clear expired cache entries on component mount
    clearExpiredCache();

    if (!repoName) return;

    // Aborted when the component unmounts, the fetch is retried, or the
    // visitor cancels, so that ClickHouse stops working on an unwanted query
    const controller = new AbortController();
    abortController.current = controller;
    const { signal } = controller;

    const loadRepos = async () => {
      const data = await getRelatedReposClient(repoName, signal);
      if (signal.aborted) return;

      // The viewed repo tops its own results. It is context, not a result.
      const source = data.find((repo) => repo.repoName === sourceName);
      const repos = data.filter((repo) => repo !== source);

      const withTotals = (totals: Map<string, number>) =>
        repos.map((repo) => ({
          ...repo,
          totalStars: totals.get(repo.repoName),
        }));

      const pendingTotals = getStarTotalsClient(
        repos.map((repo) => repo.repoName),
        signal
      ).catch((err) => {
        if (!signal.aborted) console.error("Error fetching star totals:", err);
        return "failed" as const;
      });

      const totals = await withinTime(pendingTotals, RELEVANCE_GRACE_MS);
      if (signal.aborted) return;

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
        if (signal.aborted) return;

        if (lateTotals instanceof Map) {
          setRelatedRepos(withTotals(lateTotals));
          setRelevanceStatus("ready");
        } else {
          setRelevanceStatus("unavailable");
        }
      }
    };

    loadRepos().catch((err) => {
      if (signal.aborted) return;

      console.error("Error fetching repos:", err);
      setError(err.message || "Failed to load related repositories");
      setInitialLoading(false);
    });

    return () => {
      controller.abort();
    };
  }, [repoName, sourceName, attempt]);

  const handleSort = (column: SortColumn) => {
    if (column === sortColumn) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortDirection("desc");
    }
  };

  const handleCancel = () => {
    abortController.current?.abort();
    setCancelled(true);
    setInitialLoading(false);
  };

  const handleTryAgain = () => {
    setError("");
    setCancelled(false);
    setInitialLoading(true);
    setAttempt((prev) => prev + 1);
  };

  const sortState = (column: SortColumn) => {
    if (column !== sortColumn) return "none";
    return sortDirection === "asc" ? "ascending" : "descending";
  };

  // Show loading state for initial client-side fetch
  if (initialLoading) {
    return <RepoTableLoading onCancel={handleCancel} />;
  }

  if (cancelled) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          Search cancelled.
        </p>
        <button onClick={handleTryAgain} className={ACTION_BUTTON_CLASS}>
          Try Again
        </button>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="text-center py-8">
        <h2 className="text-xl font-semibold mb-4 text-red-600 dark:text-red-400">
          Error Loading Data
        </h2>
        <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
        <button onClick={handleTryAgain} className={ACTION_BUTTON_CLASS}>
          Try Again
        </button>
      </div>
    );
  }

  const dateRange = dataWindow ? ` ${formatDateRange(dataWindow)}` : "";

  if (relatedRepos.length === 0) {
    // Nothing was found under the name as typed. GitHub may know the repo by
    // a different spelling, such as another letter case or a newer name.
    if (resolvingSource) {
      return <RepoTableLoading />;
    }
    if (
      sourceDetails?.status === "found" &&
      sourceDetails.details.fullName !== sourceName
    ) {
      return <Navigate to={`/${sourceDetails.details.fullName}`} replace />;
    }

    return (
      <div className="shadow-md rounded-lg max-w-screen-lg mx-auto mt-4 text-center py-4 px-4">
        <p>No related repositories found.</p>
        {sourceDetails?.status === "not-found" ? (
          <p className="text-sm mt-1">
            GitHub has no repository named {sourceName}.
          </p>
        ) : (
          dataWindow && (
            <p className="text-sm mt-1">
              The data only covers stars given{dateRange}.
            </p>
          )
        )}
      </div>
    );
  }

  const filteredRepos = filterRepos(relatedRepos, {
    query: filterQuery,
    hideOwner: hideSameOwner ? sourceOwner : null,
    hideAwesome,
  });

  const sortedData = [...filteredRepos].sort((a, b) => {
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

  return (
    <>
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
              className={TEXT_BUTTON_CLASS}
            >
              Sort by most shared stars
            </button>
          ) : relevanceStatus === "ready" ? (
            <button
              onClick={() => handleSort("relevance")}
              className={TEXT_BUTTON_CLASS}
            >
              Sort by relevance
            </button>
          ) : (
            relevanceStatus === "loading" && "Relevance ranking is loading…"
          )}
        </p>
      </div>
      <RepoFilters
        query={filterQuery}
        onQueryChange={setFilterQuery}
        owner={sourceOwner}
        hideSameOwner={hideSameOwner}
        onHideSameOwnerChange={setHideSameOwner}
        hideAwesome={hideAwesome}
        onHideAwesomeChange={setHideAwesome}
      />
      {filteredRepos.length < relatedRepos.length && (
        <p className="max-w-screen-lg mx-auto mt-2 text-sm text-gray-600 dark:text-gray-400">
          Showing {filteredRepos.length.toLocaleString()} of{" "}
          {relatedRepos.length.toLocaleString()} results.
        </p>
      )}
      <div className="overflow-x-auto shadow-md rounded-lg max-w-screen-lg mx-auto mt-4">
        {filteredRepos.length > 0 ? (
          <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
            <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
              <tr>
                <SortableHeader
                  sort={sortState("repoName")}
                  onSort={() => handleSort("repoName")}
                >
                  Repository
                </SortableHeader>
                <SortableHeader
                  sort={sortState("stargazers")}
                  onSort={() => handleSort("stargazers")}
                  title="People who starred both repositories"
                >
                  ⭐ Shared stars
                </SortableHeader>
                <SortableHeader
                  sort={sortState("overlap")}
                  onSort={() => handleSort("overlap")}
                  title={`Share of the repository's stargazers who also starred ${repoName}`}
                >
                  Overlap
                </SortableHeader>
                <SortableHeader
                  sort={sortState("forkers")}
                  onSort={() => handleSort("forkers")}
                  title={`People who starred ${repoName} and forked the repository`}
                  className="hidden sm:table-cell"
                >
                  🍴 Shared forks
                </SortableHeader>
                <SortableHeader
                  sort={sortState("ratio")}
                  onSort={() => handleSort("ratio")}
                  title="Shared stars per shared fork"
                  className="hidden sm:table-cell"
                >
                  Ratio
                </SortableHeader>
              </tr>
            </thead>
            <tbody>
              {visibleRepos.map((repo) => (
                <RepoRow key={repo.repoName} repo={repo} />
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-center py-4">No results match these filters.</p>
        )}
      </div>
      {hasMore && (
        <div className="text-center mt-4">
          <button
            onClick={() => setVisibleCount((prev) => prev + PAGE_SIZE)}
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
