interface CachedData<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

// A value and the time it was fetched
export type TimedEntry<T> = [T, number];

export const ONE_DAY = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

// Results for each repo are the largest entries by far, so they are the ones
// dropped when storage fills up
export const RELATED_CACHE_PREFIX = "gitrelate_related_";

export function getCachedData<T>(cacheKey: string): T | null {
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

export function setCachedData<T>(cacheKey: string, data: T): void {
  if (typeof window === "undefined") return; // SSR safety

  const now = Date.now();
  const cacheData: CachedData<T> = {
    data,
    timestamp: now,
    expiresAt: now + ONE_DAY,
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

/**
 * Reads a cache that holds many small values under one key, each with the time it was fetched.
 * @param {string} cacheKey - The storage key.
 * @returns {Map<string, TimedEntry<T>>} The cached entries, or an empty map.
 */
export function readTimedCache<T>(cacheKey: string): Map<string, TimedEntry<T>> {
  if (typeof window === "undefined") return new Map(); // SSR safety

  try {
    const cached = localStorage.getItem(cacheKey);
    return new Map(cached ? Object.entries(JSON.parse(cached)) : []);
  } catch (error) {
    console.warn("Error reading from cache:", error);
    return new Map();
  }
}

/**
 * Writes a cache read with readTimedCache, leaving out entries that are too old.
 * @param {string} cacheKey - The storage key.
 * @param {Map<string, TimedEntry<T>>} cache - The entries to store.
 * @param {number} duration - How long an entry stays valid, in milliseconds.
 * @param {number} limit - The most entries to keep. The most recently fetched win.
 */
export function writeTimedCache<T>(
  cacheKey: string,
  cache: Map<string, TimedEntry<T>>,
  duration: number,
  limit: number
): void {
  if (typeof window === "undefined") return; // SSR safety

  const now = Date.now();
  let entries = [...cache].filter(([, entry]) => now - entry?.[1] < duration);

  if (entries.length > limit) {
    entries = entries.sort((a, b) => b[1][1] - a[1][1]).slice(0, limit);
  }

  writeToStorage(cacheKey, JSON.stringify(Object.fromEntries(entries)));
}
