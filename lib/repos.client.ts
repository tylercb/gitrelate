import {
  buildQuery,
  fetchDataFromClickHouse,
  fetchDataWindow,
  fetchStarTotals,
} from "@/lib/clickhouse";
import type { DataWindow, RelatedRepo } from "@/types/github";

interface CachedData<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

// Related repos are cached as rows, which keeps a full set of results small:
// [repoName, stargazers, forkers, ratio]
type RelatedRepoRow = [string, number, number, number | null];

// [stars, time fetched]
type StarTotal = [number, number];

// Every result the page can show comes from one query, so sorting and showing
// more of them need no further requests
export const RESULT_LIMIT = 1000;

const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
// Star totals change slowly and the most popular repos turn up in almost every
// search, so they are kept longer and shared between searches
const STAR_TOTALS_CACHE_DURATION = 7 * CACHE_DURATION;
const STAR_TOTALS_CACHE_LIMIT = 5000;

const RELATED_CACHE_PREFIX = "gitrelate_related_";
const STAR_TOTALS_CACHE_KEY = "gitrelate_star_totals";
const DATA_WINDOW_CACHE_KEY = "gitrelate_data_window";
// Entries from when results were cached one page at a time
const LEGACY_CACHE_PREFIX = "gitrelate_repos_";

function getCachedData<T>(cacheKey: string): T | null {
  if (typeof window === "undefined") return null; // SSR safety

  try {
    const cached = localStorage.getItem(cacheKey);
    if (!cached) return null;

    const parsedCache: CachedData<T> = JSON.parse(cached);
    const now = Date.now();

    // Check if cache is expired
    if (now > parsedCache.expiresAt) {
      localStorage.removeItem(cacheKey);
      return null;
    }

    return parsedCache.data;
  } catch (error) {
    console.warn("Error reading from cache:", error);
    return null;
  }
}

function setCachedData<T>(cacheKey: string, data: T): void {
  if (typeof window === "undefined") return; // SSR safety

  const now = Date.now();
  const cacheData: CachedData<T> = {
    data,
    timestamp: now,
    expiresAt: now + CACHE_DURATION,
  };

  writeToStorage(cacheKey, JSON.stringify(cacheData));
}

function isQuotaError(error: unknown): boolean {
  return (
    error instanceof DOMException &&
    (error.name === "QuotaExceededError" ||
      error.name === "NS_ERROR_DOM_QUOTA_REACHED")
  );
}

// Removes the related repos that were cached longest ago, other than the entry being written
function removeOldestRelatedEntry(keyToKeep: string): boolean {
  let oldestKey: string | null = null;
  let oldestTimestamp = Infinity;

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key || key === keyToKeep || !key.startsWith(RELATED_CACHE_PREFIX)) {
      continue;
    }

    let timestamp = 0;
    try {
      timestamp = JSON.parse(localStorage.getItem(key) ?? "").timestamp ?? 0;
    } catch {
      // Invalid cache entry, remove it first
    }

    if (timestamp < oldestTimestamp) {
      oldestKey = key;
      oldestTimestamp = timestamp;
    }
  }

  if (oldestKey === null) return false;
  localStorage.removeItem(oldestKey);
  return true;
}

// Writes to storage, making room when it is full by dropping the oldest related repos
function writeToStorage(key: string, value: string): void {
  for (;;) {
    try {
      localStorage.setItem(key, value);
      return;
    } catch (error) {
      if (!isQuotaError(error) || !removeOldestRelatedEntry(key)) {
        console.warn("Error writing to cache:", error);
        return;
      }
    }
  }
}

export async function getRelatedReposClient(
  repoName: string
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

  const data = await fetchDataFromClickHouse(query);

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

function readStarTotalsCache(): Map<string, StarTotal> {
  if (typeof window === "undefined") return new Map(); // SSR safety

  try {
    const cached = localStorage.getItem(STAR_TOTALS_CACHE_KEY);
    return new Map(cached ? Object.entries(JSON.parse(cached)) : []);
  } catch (error) {
    console.warn("Error reading from cache:", error);
    return new Map();
  }
}

function writeStarTotalsCache(cache: Map<string, StarTotal>): void {
  if (typeof window === "undefined") return; // SSR safety

  const now = Date.now();
  let entries = [...cache].filter(
    ([, total]) => now - total?.[1] < STAR_TOTALS_CACHE_DURATION
  );

  // Keep the most recently fetched totals if there are too many
  if (entries.length > STAR_TOTALS_CACHE_LIMIT) {
    entries = entries
      .sort((a, b) => b[1][1] - a[1][1])
      .slice(0, STAR_TOTALS_CACHE_LIMIT);
  }

  writeToStorage(
    STAR_TOTALS_CACHE_KEY,
    JSON.stringify(Object.fromEntries(entries))
  );
}

export async function getStarTotalsClient(
  repoNames: string[]
): Promise<Map<string, number>> {
  const cache = readStarTotalsCache();
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
    const fetched = await fetchStarTotals(missing);

    for (const [repoName, stars] of fetched) {
      totals.set(repoName, stars);
      cache.set(repoName, [stars, now]);
    }
    writeStarTotalsCache(cache);
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
            const parsedCache: CachedData<unknown> = JSON.parse(cached);
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
