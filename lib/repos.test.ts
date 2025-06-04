import type { RelatedRepo } from "@/types/github";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getRelatedReposCached, getRelatedReposUncached } from "./repos";

vi.mock("@/lib/clickhouse", () => ({
  buildQuery: vi.fn(),
  fetchDataFromClickHouse: vi.fn(),
}));

vi.mock("next/cache", () => ({
  unstable_cache: vi.fn((fn) => {
    // Return a function that just calls the original function for testing
    return () => fn();
  }),
}));

import { buildQuery, fetchDataFromClickHouse } from "@/lib/clickhouse";
import { unstable_cache } from "next/cache";

const mockBuildQuery = vi.mocked(buildQuery);
const mockFetchDataFromClickHouse = vi.mocked(fetchDataFromClickHouse);
const mockUnstableCache = vi.mocked(unstable_cache);

describe("repos utilities", () => {
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
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("getRelatedReposUncached", () => {
    it("fetches related repos successfully", async () => {
      const mockQuery =
        "SELECT * FROM github_events WHERE repo_name = 'test/repo'";
      mockBuildQuery.mockReturnValue(mockQuery);
      mockFetchDataFromClickHouse.mockResolvedValue(mockRelatedRepos);

      const result = await getRelatedReposUncached("test/repo");

      expect(mockBuildQuery).toHaveBeenCalledWith(
        "test/repo",
        100,
        "stargazers",
        0,
        0,
        0
      );
      expect(mockFetchDataFromClickHouse).toHaveBeenCalledWith(mockQuery);
      expect(result).toEqual(mockRelatedRepos);
    });

    it("throws error when buildQuery returns null", async () => {
      mockBuildQuery.mockReturnValue(null);

      await expect(getRelatedReposUncached("invalid-repo")).rejects.toThrow(
        "Invalid repository name"
      );

      expect(mockBuildQuery).toHaveBeenCalledWith(
        "invalid-repo",
        100,
        "stargazers",
        0,
        0,
        0
      );
      expect(mockFetchDataFromClickHouse).not.toHaveBeenCalled();
    });

    it("propagates errors from fetchDataFromClickHouse", async () => {
      const mockQuery =
        "SELECT * FROM github_events WHERE repo_name = 'test/repo'";
      mockBuildQuery.mockReturnValue(mockQuery);
      mockFetchDataFromClickHouse.mockRejectedValue(
        new Error("ClickHouse error")
      );

      await expect(getRelatedReposUncached("test/repo")).rejects.toThrow(
        "ClickHouse error"
      );

      expect(mockBuildQuery).toHaveBeenCalledWith(
        "test/repo",
        100,
        "stargazers",
        0,
        0,
        0
      );
      expect(mockFetchDataFromClickHouse).toHaveBeenCalledWith(mockQuery);
    });
  });

  describe("getRelatedReposCached", () => {
    it("fetches related repos with caching", async () => {
      const mockQuery =
        "SELECT * FROM github_events WHERE repo_name = 'test/repo'";
      mockBuildQuery.mockReturnValue(mockQuery);
      mockFetchDataFromClickHouse.mockResolvedValue(mockRelatedRepos);

      const result = await getRelatedReposCached("test/repo", 0);

      expect(mockUnstableCache).toHaveBeenCalledWith(
        expect.any(Function),
        ["related-repos", "test/repo", "0"],
        { revalidate: 86400 } // ONE_DAY = 60 * 60 * 24
      );

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
    });

    it("uses offset parameter correctly", async () => {
      const mockQuery =
        "SELECT * FROM github_events WHERE repo_name = 'test/repo' OFFSET 50";
      mockBuildQuery.mockReturnValue(mockQuery);
      mockFetchDataFromClickHouse.mockResolvedValue(mockRelatedRepos);

      await getRelatedReposCached("test/repo", 50);

      expect(mockUnstableCache).toHaveBeenCalledWith(
        expect.any(Function),
        ["related-repos", "test/repo", "50"],
        { revalidate: 86400 }
      );

      expect(mockBuildQuery).toHaveBeenCalledWith(
        "test/repo",
        100,
        "stargazers",
        0,
        0,
        0,
        50
      );
    });

    it("throws error when buildQuery returns null in cached version", async () => {
      mockBuildQuery.mockReturnValue(null);

      await expect(getRelatedReposCached("invalid-repo", 0)).rejects.toThrow(
        "Invalid repository name"
      );

      expect(mockBuildQuery).toHaveBeenCalledWith(
        "invalid-repo",
        100,
        "stargazers",
        0,
        0,
        0,
        0
      );
      expect(mockFetchDataFromClickHouse).not.toHaveBeenCalled();
    });

    it("propagates errors from fetchDataFromClickHouse in cached version", async () => {
      const mockQuery =
        "SELECT * FROM github_events WHERE repo_name = 'test/repo'";
      mockBuildQuery.mockReturnValue(mockQuery);
      mockFetchDataFromClickHouse.mockRejectedValue(
        new Error("Network timeout")
      );

      await expect(getRelatedReposCached("test/repo", 0)).rejects.toThrow(
        "Network timeout"
      );
    });

    it("creates cache key with different repo names correctly", async () => {
      const mockQuery = "SELECT * FROM github_events";
      mockBuildQuery.mockReturnValue(mockQuery);
      mockFetchDataFromClickHouse.mockResolvedValue([]);

      await getRelatedReposCached("facebook/react", 25);

      expect(mockUnstableCache).toHaveBeenCalledWith(
        expect.any(Function),
        ["related-repos", "facebook/react", "25"],
        { revalidate: 86400 }
      );
    });
  });

  describe("cache configuration", () => {
    it("sets correct cache revalidation time", async () => {
      const mockQuery = "SELECT * FROM test";
      mockBuildQuery.mockReturnValue(mockQuery);
      mockFetchDataFromClickHouse.mockResolvedValue([]);

      await getRelatedReposCached("test/repo", 0);

      expect(mockUnstableCache).toHaveBeenCalledWith(
        expect.any(Function),
        expect.any(Array),
        { revalidate: 86400 } // 24 hours in seconds
      );
    });
  });
});
