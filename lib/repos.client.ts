import {
  getCachedData,
  ONE_DAY,
  readTimedCache,
  RELATED_CACHE_PREFIX,
  setCachedData,
  writeTimedCache,
} from "@/lib/cache";
import {
  buildQuery,
  fetchDataFromClickHouse,
  fetchDataWindow,
  fetchStarTotals,
} from "@/lib/clickhouse";
import type { DataWindow, RelatedRepo } from "@/types/github";

// Related repos are cached as rows, which keeps a full set of results small:
// [repoName, stargazers, forkers, ratio]
type RelatedRepoRow = [string, number, number, number | null];

// Every result the page can show comes from one query, so sorting and showing
// more of them need no further requests
export const RESULT_LIMIT = 1000;

// Star totals change slowly and the most popular repos turn up in almost every
// search, so they are kept longer and shared between searches
const STAR_TOTALS_CACHE_DURATION = 7 * ONE_DAY;
const STAR_TOTALS_CACHE_LIMIT = 5000;

const STAR_TOTALS_CACHE_KEY = "gitrelate_star_totals";
const DATA_WINDOW_CACHE_KEY = "gitrelate_data_window";
// Entries from when results were cached one page at a time
const LEGACY_CACHE_PREFIX = "gitrelate_repos_";

export async function getRelatedReposClient(
  repoName: string,
  signal?: AbortSignal
): Promise<RelatedRepo[]> {
  const cacheKey = RELATED_CACHE_PREFIX + repoName;

  // Try to get from cache first
  const cachedData = getCachedData<RelatedRepoRow[]>(cacheKey);
  if (cachedData) {
    console.log(`Cache hit for ${repoName}`);
    return cachedData.map(
      ([name, stargazers, forkers, ratio]) =>
        ({
          repoName: name,
          githubUrl: `https://github.com/${name}`,
          stargazers,
          forkers,
          ratio,
        }) as RelatedRepo
    );
  }

  // Cache miss - fetch from ClickHouse
  console.log(`Cache miss for ${repoName} - fetching from ClickHouse`);

  const query = buildQuery(repoName, RESULT_LIMIT, "stargazers", 0, 0, 0);
  if (!query) {
    throw new Error("Invalid repository name");
  }

  const data = await fetchDataFromClickHouse(query, signal);

  // Cache the result
  setCachedData<RelatedRepoRow[]>(
    cacheKey,
    data.map((repo) => [
      repo.repoName,
      repo.stargazers,
      repo.forkers,
      repo.ratio,
    ])
  );

  return data;
}

export async function getStarTotalsClient(
  repoNames: string[],
  signal?: AbortSignal
): Promise<Map<string, number>> {
  const cache = readTimedCache<number>(STAR_TOTALS_CACHE_KEY);
  const now = Date.now();
  const totals = new Map<string, number>();
  const missing: string[] = [];

  for (const repoName of repoNames) {
    const cached = cache.get(repoName);
    if (cached && now - cached[1] < STAR_TOTALS_CACHE_DURATION) {
      totals.set(repoName, cached[0]);
    } else {
      missing.push(repoName);
    }
  }

  // Only ask ClickHouse for the repos that are not cached
  if (missing.length > 0) {
    const fetched = await fetchStarTotals(missing, signal);

    for (const [repoName, stars] of fetched) {
      totals.set(repoName, stars);
      cache.set(repoName, [stars, now]);
    }
    writeTimedCache(
      STAR_TOTALS_CACHE_KEY,
      cache,
      STAR_TOTALS_CACHE_DURATION,
      STAR_TOTALS_CACHE_LIMIT
    );
  }

  return totals;
}

export async function getDataWindowClient(): Promise<DataWindow> {
  const cachedData = getCachedData<DataWindow>(DATA_WINDOW_CACHE_KEY);
  if (cachedData) {
    return cachedData;
  }

  const dataWindow = await fetchDataWindow();
  setCachedData(DATA_WINDOW_CACHE_KEY, dataWindow);

  return dataWindow;
}

// Optional: function to clear expired cache entries
export function clearExpiredCache(): void {
  if (typeof window === "undefined") return;

  try {
    const now = Date.now();
    const keysToRemove: string[] = [];

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;

      if (key.startsWith(LEGACY_CACHE_PREFIX)) {
        keysToRemove.push(key);
      } else if (key.startsWith(RELATED_CACHE_PREFIX)) {
        try {
          const cached = localStorage.getItem(key);
          if (cached) {
            const parsedCache: { expiresAt: number } = JSON.parse(cached);
            if (now > parsedCache.expiresAt) {
              keysToRemove.push(key);
            }
          }
        } catch {
          // Invalid cache entry, mark for removal
          keysToRemove.push(key);
        }
      }
    }

    keysToRemove.forEach((key) => localStorage.removeItem(key));

    if (keysToRemove.length > 0) {
      console.log(`Cleared ${keysToRemove.length} expired cache entries`);
    }
  } catch (error) {
    console.warn("Error clearing expired cache:", error);
  }
}
