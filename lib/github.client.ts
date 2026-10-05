import { ONE_DAY, readTimedCache, writeTimedCache } from "@/lib/cache";
import type { RepoDetails, RepoDetailsResult } from "@/types/github";
import { createRequestSignal } from "@/utils/abort";

const GITHUB_API = "https://api.github.com";
const REQUEST_TIMEOUT = 8000;

const DETAILS_CACHE_KEY = "gitrelate_repo_details";
const DETAILS_CACHE_DURATION = 7 * ONE_DAY;
const DETAILS_CACHE_LIMIT = 500;
const LIMITED_UNTIL_KEY = "gitrelate_github_limited_until";

function getLimitedUntil(): number {
  try {
    return Number(localStorage.getItem(LIMITED_UNTIL_KEY)) || 0;
  } catch {
    return 0;
  }
}

// GitHub allows 60 requests an hour without a token. Once it refuses, there is
// no point asking again until the limit resets.
function rememberRateLimit(response: Response): void {
  const now = Date.now();
  const reset = Number(response.headers.get("x-ratelimit-reset")) * 1000;
  const retryAfter = Number(response.headers.get("retry-after")) * 1000;

  let limitedUntil = 0;
  if (response.headers.get("x-ratelimit-remaining") === "0" && reset > now) {
    limitedUntil = reset;
  } else if (retryAfter > 0) {
    limitedUntil = now + retryAfter;
  } else if (response.status === 429) {
    limitedUntil = now + 60 * 1000;
  }

  if (limitedUntil === 0) return;
  try {
    localStorage.setItem(LIMITED_UNTIL_KEY, String(limitedUntil));
  } catch {
    // The next request will simply be refused again
  }
}

/**
 * Gets a repository's details from GitHub, looking in the browser's cache first.
 * This never throws. Details are an extra, so the caller decides how quietly to
 * handle their absence.
 * @param {string} repoName - The repository in "username/repo" format, in any letter case.
 * @param {AbortSignal} [signal] - Cancels the request when aborted.
 */
export async function getRepoDetailsClient(
  repoName: string,
  signal?: AbortSignal
): Promise<RepoDetailsResult> {
  // GitHub ignores letter case in repo names, so the cache does too
  const cacheKey = repoName.toLowerCase();
  const cache = readTimedCache<RepoDetails | null>(DETAILS_CACHE_KEY);
  const now = Date.now();

  const cached = cache.get(cacheKey);
  if (cached) {
    const [details, fetchedAt] = cached;
    // A repo that was missing is checked again sooner than one that was found
    if (now - fetchedAt < (details ? DETAILS_CACHE_DURATION : ONE_DAY)) {
      return details ? { status: "found", details } : { status: "not-found" };
    }
  }

  if (now < getLimitedUntil()) {
    return { status: "unavailable" };
  }

  const remember = (details: RepoDetails | null) => {
    cache.set(cacheKey, [details, now]);
    writeTimedCache(
      DETAILS_CACHE_KEY,
      cache,
      DETAILS_CACHE_DURATION,
      DETAILS_CACHE_LIMIT
    );
  };

  const request = createRequestSignal(REQUEST_TIMEOUT, signal);
  try {
    const path = repoName.split("/").map(encodeURIComponent).join("/");
    const response = await fetch(`${GITHUB_API}/repos/${path}`, {
      headers: { Accept: "application/vnd.github+json" },
      signal: request.signal,
    });

    if (response.status === 404) {
      remember(null);
      return { status: "not-found" };
    }
    if (!response.ok) {
      if (response.status === 403 || response.status === 429) {
        rememberRateLimit(response);
      }
      return { status: "unavailable" };
    }

    const data = await response.json();
    const details: RepoDetails = {
      fullName: data.full_name,
      description: data.description ?? null,
      language: data.language ?? null,
      stars: data.stargazers_count ?? 0,
      topics: data.topics ?? [],
      archived: Boolean(data.archived),
      homepage: data.homepage || null,
    };

    remember(details);
    return { status: "found", details };
  } catch {
    // Network failure, timeout or cancellation
    return { status: "unavailable" };
  } finally {
    request.done();
  }
}
