import { buildQuery, fetchDataFromClickHouse } from "@/lib/clickhouse";
import type { RelatedRepo } from "@/types/github";

interface CachedData {
  data: RelatedRepo[];
  timestamp: number;
  expiresAt: number;
}

const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

function getCacheKey(repoName: string, offset: number): string {
  return `gitrelate_repos_${repoName}_${offset}`;
}

function getCachedData(cacheKey: string): RelatedRepo[] | null {
  if (typeof window === "undefined") return null; // SSR safety

  try {
    const cached = localStorage.getItem(cacheKey);
    if (!cached) return null;

    const parsedCache: CachedData = JSON.parse(cached);
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

function setCachedData(cacheKey: string, data: RelatedRepo[]): void {
  if (typeof window === "undefined") return; // SSR safety

  try {
    const now = Date.now();
    const cacheData: CachedData = {
      data,
      timestamp: now,
      expiresAt: now + CACHE_DURATION,
    };

    localStorage.setItem(cacheKey, JSON.stringify(cacheData));
  } catch (error) {
    console.warn("Error writing to cache:", error);
  }
}

export async function getRelatedReposClient(
  repoName: string,
  offset: number
): Promise<RelatedRepo[]> {
  const cacheKey = getCacheKey(repoName, offset);

  // Try to get from cache first
  const cachedData = getCachedData(cacheKey);
  if (cachedData) {
    console.log(`Cache hit for ${repoName} (offset: ${offset})`);
    return cachedData;
  }

  // Cache miss - fetch from ClickHouse
  console.log(
    `Cache miss for ${repoName} (offset: ${offset}) - fetching from ClickHouse`
  );

  const query = buildQuery(repoName, 100, "stargazers", 0, 0, 0, offset);
  if (!query) {
    throw new Error("Invalid repository name");
  }

  const data = await fetchDataFromClickHouse(query);

  // Cache the result
  setCachedData(cacheKey, data);

  return data;
}

// Optional: function to clear expired cache entries
export function clearExpiredCache(): void {
  if (typeof window === "undefined") return;

  try {
    const now = Date.now();
    const keysToRemove: string[] = [];

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith("gitrelate_repos_")) {
        try {
          const cached = localStorage.getItem(key);
          if (cached) {
            const parsedCache: CachedData = JSON.parse(cached);
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
