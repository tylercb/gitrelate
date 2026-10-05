// @vitest-environment jsdom
import type { RelatedRepo } from "@/types/github";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearExpiredCache,
  getDataWindowClient,
  getRelatedReposClient,
  getStarTotalsClient,
  RESULT_LIMIT,
} from "./repos.client";

vi.mock("@/lib/clickhouse", () => ({
  buildQuery: vi.fn(),
  fetchDataFromClickHouse: vi.fn(),
  fetchDataWindow: vi.fn(),
  fetchStarTotals: vi.fn(),
}));

import {
  buildQuery,
  fetchDataFromClickHouse,
  fetchDataWindow,
  fetchStarTotals,
} from "@/lib/clickhouse";

const mockBuildQuery = vi.mocked(buildQuery);
const mockFetchDataFromClickHouse = vi.mocked(fetchDataFromClickHouse);
const mockFetchDataWindow = vi.mocked(fetchDataWindow);
const mockFetchStarTotals = vi.mocked(fetchStarTotals);

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

function relatedCacheEntry(timestamp: number, expiresAt: number): string {
  return JSON.stringify({ data: [], timestamp, expiresAt });
}

describe("client repos utilities", () => {
  const mockQuery = "SELECT * FROM github_events WHERE repo_name = 'test/repo'";
  const mockRelatedRepos: RelatedRepo[] = [
    {
      repoName: "owner/repo1",
      githubUrl: "https://github.com/owner/repo1",
      stargazers: 100,
      forkers: 50,
      ratio: 2.0,
    },
    {
      repoName: "owner/repo2",
      githubUrl: "https://github.com/owner/repo2",
      stargazers: 200,
      forkers: 0,
      ratio: null as unknown as number,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    vi.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.resetAllMocks();
  });

  describe("getRelatedReposClient", () => {
    it("fetches every result in one query and caches them", async () => {
      mockBuildQuery.mockReturnValue(mockQuery);
      mockFetchDataFromClickHouse.mockResolvedValue(mockRelatedRepos);

      const result = await getRelatedReposClient("test/repo");

      expect(mockBuildQuery).toHaveBeenCalledWith(
        "test/repo",
        RESULT_LIMIT,
        "stargazers",
        0,
        0,
        0
      );
      expect(mockFetchDataFromClickHouse).toHaveBeenCalledWith(mockQuery);
      expect(result).toEqual(mockRelatedRepos);

      const cached = JSON.parse(
        localStorage.getItem("gitrelate_related_test/repo")!
      );
      expect(cached.expiresAt - cached.timestamp).toBe(ONE_DAY_MS);
    });

    it("returns the same repos from cache without querying ClickHouse again", async () => {
      mockBuildQuery.mockReturnValue(mockQuery);
      mockFetchDataFromClickHouse.mockResolvedValue(mockRelatedRepos);

      await getRelatedReposClient("test/repo");
      const result = await getRelatedReposClient("test/repo");

      expect(mockFetchDataFromClickHouse).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockRelatedRepos);
    });

    it("refetches once the cached entry has expired", async () => {
      vi.useFakeTimers();
      mockBuildQuery.mockReturnValue(mockQuery);
      mockFetchDataFromClickHouse.mockResolvedValue(mockRelatedRepos);

      await getRelatedReposClient("test/repo");
      vi.advanceTimersByTime(ONE_DAY_MS + 1);
      await getRelatedReposClient("test/repo");

      expect(mockFetchDataFromClickHouse).toHaveBeenCalledTimes(2);
    });

    it("throws error when buildQuery returns null", async () => {
      mockBuildQuery.mockReturnValue(null);

      await expect(getRelatedReposClient("invalid-repo")).rejects.toThrow(
        "Invalid repository name"
      );

      expect(mockFetchDataFromClickHouse).not.toHaveBeenCalled();
    });

    it("propagates errors from fetchDataFromClickHouse without caching", async () => {
      mockBuildQuery.mockReturnValue(mockQuery);
      mockFetchDataFromClickHouse.mockRejectedValue(
        new Error("Network timeout")
      );

      await expect(getRelatedReposClient("test/repo")).rejects.toThrow(
        "Network timeout"
      );

      expect(localStorage.length).toBe(0);
    });

    it("makes room by dropping the oldest results when storage is full", async () => {
      const now = Date.now();
      localStorage.setItem(
        "gitrelate_related_older/repo",
        relatedCacheEntry(now - 2000, now + ONE_DAY_MS)
      );
      localStorage.setItem(
        "gitrelate_related_newer/repo",
        relatedCacheEntry(now - 1000, now + ONE_DAY_MS)
      );
      mockBuildQuery.mockReturnValue(mockQuery);
      mockFetchDataFromClickHouse.mockResolvedValue(mockRelatedRepos);

      // Storage is full until one entry has been removed
      const realSetItem = Storage.prototype.setItem;
      vi.spyOn(Storage.prototype, "setItem").mockImplementation(function (
        this: Storage,
        key: string,
        value: string
      ) {
        if (this.length >= 2) {
          throw new DOMException("Storage is full", "QuotaExceededError");
        }
        realSetItem.call(this, key, value);
      });

      await getRelatedReposClient("test/repo");

      expect(localStorage.getItem("gitrelate_related_older/repo")).toBe(null);
      expect(localStorage.getItem("gitrelate_related_newer/repo")).not.toBe(
        null
      );
      expect(localStorage.getItem("gitrelate_related_test/repo")).not.toBe(
        null
      );
    });
  });

  describe("getStarTotalsClient", () => {
    it("fetches star totals and returns them by repo name", async () => {
      mockFetchStarTotals.mockResolvedValue(
        new Map([
          ["owner/repo1", 291],
          ["owner/repo2", 49946],
        ])
      );

      const result = await getStarTotalsClient(["owner/repo1", "owner/repo2"]);

      expect(mockFetchStarTotals).toHaveBeenCalledWith([
        "owner/repo1",
        "owner/repo2",
      ]);
      expect(result).toEqual(
        new Map([
          ["owner/repo1", 291],
          ["owner/repo2", 49946],
        ])
      );
    });

    it("only asks ClickHouse for repos that are not cached", async () => {
      mockFetchStarTotals.mockResolvedValueOnce(
        new Map([["owner/popular", 49946]])
      );
      await getStarTotalsClient(["owner/popular"]);

      mockFetchStarTotals.mockResolvedValueOnce(new Map([["owner/niche", 291]]));
      const result = await getStarTotalsClient(["owner/popular", "owner/niche"]);

      expect(mockFetchStarTotals).toHaveBeenLastCalledWith(["owner/niche"]);
      expect(result).toEqual(
        new Map([
          ["owner/popular", 49946],
          ["owner/niche", 291],
        ])
      );
    });

    it("does not query ClickHouse when every repo is cached", async () => {
      mockFetchStarTotals.mockResolvedValueOnce(
        new Map([["owner/repo1", 291]])
      );
      await getStarTotalsClient(["owner/repo1"]);
      const result = await getStarTotalsClient(["owner/repo1"]);

      expect(mockFetchStarTotals).toHaveBeenCalledTimes(1);
      expect(result).toEqual(new Map([["owner/repo1", 291]]));
    });

    it("refetches totals after a week", async () => {
      vi.useFakeTimers();
      mockFetchStarTotals.mockResolvedValue(new Map([["owner/repo1", 291]]));

      await getStarTotalsClient(["owner/repo1"]);
      vi.advanceTimersByTime(7 * ONE_DAY_MS + 1);
      await getStarTotalsClient(["owner/repo1"]);

      expect(mockFetchStarTotals).toHaveBeenCalledTimes(2);
    });

    it("keeps only the most recently fetched totals when the cache is too large", async () => {
      const now = Date.now();
      const seeded = Object.fromEntries(
        Array.from({ length: 5000 }, (_, i) => [`old/repo${i}`, [1, now - i]])
      );
      localStorage.setItem("gitrelate_star_totals", JSON.stringify(seeded));
      mockFetchStarTotals.mockResolvedValue(new Map([["new/repo", 291]]));

      await getStarTotalsClient(["new/repo"]);

      const cached = JSON.parse(localStorage.getItem("gitrelate_star_totals")!);
      expect(Object.keys(cached)).toHaveLength(5000);
      expect(cached["new/repo"][0]).toBe(291);
      // The entry fetched longest ago made way for the new one
      expect(cached["old/repo4999"]).toBeUndefined();
      expect(cached["old/repo0"]).toBeDefined();
    });

    it("propagates errors from fetchStarTotals", async () => {
      mockFetchStarTotals.mockRejectedValue(new Error("Network timeout"));

      await expect(getStarTotalsClient(["owner/repo1"])).rejects.toThrow(
        "Network timeout"
      );
    });
  });

  describe("getDataWindowClient", () => {
    it("fetches the data window once and then serves it from cache", async () => {
      const dataWindow = { start: "2023-01-13", end: "2026-07-02" };
      mockFetchDataWindow.mockResolvedValue(dataWindow);

      const first = await getDataWindowClient();
      const second = await getDataWindowClient();

      expect(first).toEqual(dataWindow);
      expect(second).toEqual(dataWindow);
      expect(mockFetchDataWindow).toHaveBeenCalledTimes(1);
    });

    it("refetches the data window after a day", async () => {
      vi.useFakeTimers();
      mockFetchDataWindow.mockResolvedValue({
        start: "2023-01-13",
        end: "2026-07-02",
      });

      await getDataWindowClient();
      vi.advanceTimersByTime(ONE_DAY_MS + 1);
      await getDataWindowClient();

      expect(mockFetchDataWindow).toHaveBeenCalledTimes(2);
    });
  });

  describe("clearExpiredCache", () => {
    it("removes expired, invalid and old-format entries but keeps everything else", () => {
      const now = Date.now();
      localStorage.setItem(
        "gitrelate_related_fresh/repo",
        relatedCacheEntry(now, now + 1000)
      );
      localStorage.setItem(
        "gitrelate_related_expired/repo",
        relatedCacheEntry(now - 2000, now - 1)
      );
      localStorage.setItem("gitrelate_related_invalid/repo", "not json");
      // Cached one page at a time by an earlier version
      localStorage.setItem(
        "gitrelate_repos_old/repo_0",
        relatedCacheEntry(now, now + 1000)
      );
      localStorage.setItem("gitrelate_star_totals", "{}");
      localStorage.setItem("theme", "dark");

      clearExpiredCache();

      expect(localStorage.getItem("gitrelate_related_fresh/repo")).not.toBe(
        null
      );
      expect(localStorage.getItem("gitrelate_related_expired/repo")).toBe(null);
      expect(localStorage.getItem("gitrelate_related_invalid/repo")).toBe(null);
      expect(localStorage.getItem("gitrelate_repos_old/repo_0")).toBe(null);
      expect(localStorage.getItem("gitrelate_star_totals")).toBe("{}");
      expect(localStorage.getItem("theme")).toBe("dark");
    });
  });
});
