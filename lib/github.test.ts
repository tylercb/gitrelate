import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getRepo, getStargazers, getStarredRepos } from "./github";

const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("GitHub API functions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.GITHUB_TOKEN = "test-token";
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("getStargazers", () => {
    it("fetches stargazers successfully", async () => {
      const mockStargazers = [
        { login: "user1", avatar_url: "https://github.com/user1.png" },
        { login: "user2", avatar_url: "https://github.com/user2.png" },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockStargazers,
      });

      const result = await getStargazers("owner/repo");

      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.github.com/repos/owner/repo/stargazers",
        {
          headers: {
            Accept: "application/vnd.github.v3.star+json",
            Authorization: "token test-token",
          },
        }
      );
      expect(result).toEqual(mockStargazers);
    });

    it("returns empty array when response is not ok", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
      });

      const result = await getStargazers("owner/repo");

      expect(result).toEqual([]);
    });

    it("handles network errors gracefully", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      await expect(getStargazers("owner/repo")).rejects.toThrow(
        "Network error"
      );
    });
  });

  describe("getStarredRepos", () => {
    it("fetches starred repos successfully", async () => {
      const mockStarredRepos = [
        {
          id: 1,
          name: "repo1",
          full_name: "owner/repo1",
          description: "A test repo",
          stargazers_count: 100,
        },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockStarredRepos,
      });

      const result = await getStarredRepos("testuser");

      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.github.com/users/testuser/starred",
        {
          headers: {
            Accept: "application/vnd.github.v3.star+json",
            Authorization: "token test-token",
          },
        }
      );
      expect(result).toEqual(mockStarredRepos);
    });

    it("returns empty array when response is not ok", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
      });

      const result = await getStarredRepos("testuser");

      expect(result).toEqual([]);
    });
  });

  describe("getRepo", () => {
    it("fetches repo successfully", async () => {
      const mockRepo = {
        id: 1,
        name: "repo",
        full_name: "owner/repo",
        description: "A test repo",
        stargazers_count: 100,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockRepo,
      });

      const result = await getRepo("owner/repo");

      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.github.com/repos/owner/repo",
        {
          headers: {
            Accept: "application/vnd.github.v3.star+json",
            Authorization: "token test-token",
          },
        }
      );
      expect(result).toEqual(mockRepo);
    });

    it("returns empty array when response is not ok", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
      });

      const result = await getRepo("owner/repo");

      expect(result).toEqual([]);
    });
  });

  describe("Authorization header", () => {
    it("includes token from environment variable", async () => {
      process.env.GITHUB_TOKEN = "custom-token";

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      });

      await getStargazers("owner/repo");

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: "token custom-token",
          }),
        })
      );
    });

    it("handles missing token gracefully", async () => {
      delete process.env.GITHUB_TOKEN;

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      });

      await getStargazers("owner/repo");

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: "token undefined",
          }),
        })
      );
    });
  });
});
