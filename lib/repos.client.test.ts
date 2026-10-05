// @vitest-environment jsdom
import type { RelatedRepo } from "@/types/github";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clearExpiredCache, getRelatedReposClient } from "./repos.client";

vi.mock("@/lib/clickhouse", () => ({
  buildQuery: vi.fn(),
  fetchDataFromClickHouse: vi.fn(),
}));

import { buildQuery, fetchDataFromClickHouse } from "@/lib/clickhouse";

const mockBuildQuery = vi.mocked(buildQuery);
const mockFetchDataFromClickHouse = vi.mocked(fetchDataFromClickHouse);

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

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
      forkers: 75,
      ratio: 2.67,
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
    it("fetches related repos and caches them", async () => {
      mockBuildQuery.mockReturnValue(mockQuery);
      mockFetchDataFromClickHouse.mockResolvedValue(mockRelatedRepos);

      const result = await getRelatedReposClient("test/repo", 0);

      expect(mockBuildQuery).toHaveBeenCalledWith(
        "test/repo",
        100,
        "stargazers",
        0,
        0,
        0,
        0
      );
      expect(mockFetchDataFromClickHouse).toHaveBeenCalledWith(mockQuery);
      expect(result).toEqual(mockRelatedRepos);

      const cached = JSON.parse(
        localStorage.getItem("gitrelate_repos_test/repo_0")!
      );
      expect(cached.data).toEqual(mockRelatedRepos);
      expect(cached.expiresAt - cached.timestamp).toBe(ONE_DAY_MS);
    });

    it("returns cached data without querying ClickHouse again", async () => {
      mockBuildQuery.mockReturnValue(mockQuery);
      mockFetchDataFromClickHouse.mockResolvedValue(mockRelatedRepos);

      await getRelatedReposClient("test/repo", 0);
      const result = await getRelatedReposClient("test/repo", 0);

      expect(mockFetchDataFromClickHouse).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockRelatedRepos);
    });

    it("uses offset parameter correctly", async () => {
      mockBuildQuery.mockReturnValue(mockQuery);
      mockFetchDataFromClickHouse.mockResolvedValue(mockRelatedRepos);

      await getRelatedReposClient("test/repo", 0);
      await getRelatedReposClient("test/repo", 100);

      expect(mockBuildQuery).toHaveBeenLastCalledWith(
        "test/repo",
        100,
        "stargazers",
        0,
        0,
        0,
        100
      );
      // Each offset is cached separately
      expect(mockFetchDataFromClickHouse).toHaveBeenCalledTimes(2);
      expect(localStorage.getItem("gitrelate_repos_test/repo_100")).not.toBe(
        null
      );
    });

    it("refetches once the cached entry has expired", async () => {
      vi.useFakeTimers();
      mockBuildQuery.mockReturnValue(mockQuery);
      mockFetchDataFromClickHouse.mockResolvedValue(mockRelatedRepos);

      await getRelatedReposClient("test/repo", 0);
      vi.advanceTimersByTime(ONE_DAY_MS + 1);
      await getRelatedReposClient("test/repo", 0);

      expect(mockFetchDataFromClickHouse).toHaveBeenCalledTimes(2);
    });

    it("throws error when buildQuery returns null", async () => {
      mockBuildQuery.mockReturnValue(null);

      await expect(getRelatedReposClient("invalid-repo", 0)).rejects.toThrow(
        "Invalid repository name"
      );

      expect(mockFetchDataFromClickHouse).not.toHaveBeenCalled();
    });

    it("propagates errors from fetchDataFromClickHouse without caching", async () => {
      mockBuildQuery.mockReturnValue(mockQuery);
      mockFetchDataFromClickHouse.mockRejectedValue(
        new Error("Network timeout")
      );

      await expect(getRelatedReposClient("test/repo", 0)).rejects.toThrow(
        "Network timeout"
      );

      expect(localStorage.length).toBe(0);
    });
  });

  describe("clearExpiredCache", () => {
    it("removes expired and invalid entries but keeps everything else", () => {
      const now = Date.now();
      localStorage.setItem(
        "gitrelate_repos_fresh/repo_0",
        JSON.stringify({ data: [], timestamp: now, expiresAt: now + 1000 })
      );
      localStorage.setItem(
        "gitrelate_repos_expired/repo_0",
        JSON.stringify({ data: [], timestamp: now - 2000, expiresAt: now - 1 })
      );
      localStorage.setItem("gitrelate_repos_invalid/repo_0", "not json");
      localStorage.setItem("theme", "dark");

      clearExpiredCache();

      expect(localStorage.getItem("gitrelate_repos_fresh/repo_0")).not.toBe(
        null
      );
      expect(localStorage.getItem("gitrelate_repos_expired/repo_0")).toBe(null);
      expect(localStorage.getItem("gitrelate_repos_invalid/repo_0")).toBe(null);
      expect(localStorage.getItem("theme")).toBe("dark");
    });
  });
});
