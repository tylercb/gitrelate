import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { buildQuery, fetchDataFromClickHouse } from "./clickhouse";

vi.mock("@/utils/github", () => ({
  parseGitHubURL: vi.fn((input: string) => {
    if (input === "owner/repo" || input === "https://github.com/owner/repo") {
      return "owner/repo";
    }
    return null;
  }),
}));

const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("ClickHouse utilities", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("buildQuery", () => {
    it("builds basic query with default parameters", () => {
      const query = buildQuery("owner/repo", 100, "stargazers", 0, 0, 0);

      expect(query).toContain("repo_name = 'owner/repo'");
      expect(query).toContain("LIMIT 100");
      expect(query).toContain("ORDER BY stargazers DESC");
      expect(query).toContain("HAVING 1=1");
      expect(query).toContain("OFFSET 0");
    });

    it("builds query with minimum stargazers filter", () => {
      const query = buildQuery("owner/repo", 50, "ratio", 10, 0, 0);

      expect(query).toContain("HAVING 1=1 AND stargazers >= 10");
      expect(query).toContain("ORDER BY ratio DESC");
      expect(query).toContain("LIMIT 50");
    });

    it("builds query with all filters", () => {
      const query = buildQuery("owner/repo", 25, "forkers", 5, 2, 1.5, 10);

      expect(query).toContain(
        "HAVING 1=1 AND stargazers >= 5 AND forkers >= 2 AND ratio >= 1.5"
      );
      expect(query).toContain("ORDER BY forkers DESC");
      expect(query).toContain("LIMIT 25");
      expect(query).toContain("OFFSET 10");
    });

    it("returns null for invalid repo input", () => {
      const query = buildQuery("invalid-input", 100, "stargazers", 0, 0, 0);

      expect(query).toBeNull();
    });

    it("handles GitHub URL input", () => {
      const query = buildQuery(
        "https://github.com/owner/repo",
        100,
        "stargazers",
        0,
        0,
        0
      );

      expect(query).toContain("repo_name = 'owner/repo'");
    });

    it("builds query without optional filters when they are 0", () => {
      const query = buildQuery("owner/repo", 100, "stargazers", 0, 0, 0);

      expect(query).toBe(query); // Should not contain additional AND clauses beyond HAVING 1=1
      expect(query).toContain("HAVING 1=1");
      expect(query).not.toContain("AND stargazers >=");
      expect(query).not.toContain("AND forkers >=");
      expect(query).not.toContain("AND ratio >=");
    });
  });

  describe("fetchDataFromClickHouse", () => {
    it("fetches and parses data successfully", async () => {
      const mockResponse =
        "owner/repo1\t100\t50\t2.0\nowner/repo2\t200\t100\t2.0";

      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => mockResponse,
      });

      const result = await fetchDataFromClickHouse("SELECT * FROM test");

      expect(mockFetch).toHaveBeenCalledWith(
        "https://play.clickhouse.com/?user=explorer",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: "SELECT * FROM test",
          signal: expect.any(AbortSignal),
        }
      );

      expect(result).toEqual([
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
          forkers: 100,
          ratio: 2.0,
        },
      ]);
    });

    it("handles null ratio values", async () => {
      const mockResponse = "owner/repo1\t100\t50\t\\N";

      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => mockResponse,
      });

      const result = await fetchDataFromClickHouse("SELECT * FROM test");

      expect(result).toEqual([
        {
          repoName: "owner/repo1",
          githubUrl: "https://github.com/owner/repo1",
          stargazers: 100,
          forkers: 50,
          ratio: null,
        },
      ]);
    });

    it("returns empty array for empty response", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => "",
      });

      const result = await fetchDataFromClickHouse("SELECT * FROM test");

      expect(result).toEqual([]);
    });

    it("returns empty array for whitespace-only response", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => "   \n  \t  ",
      });

      const result = await fetchDataFromClickHouse("SELECT * FROM test");

      expect(result).toEqual([]);
    });

    it("throws error when response is not ok", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: async () => "Internal Server Error",
      });

      await expect(
        fetchDataFromClickHouse("SELECT * FROM test")
      ).rejects.toThrow("ClickHouse responded with status: 500");
    });

    it("handles timeout errors", async () => {
      mockFetch.mockRejectedValueOnce(
        Object.assign(new Error("AbortError"), { name: "AbortError" })
      );

      await expect(
        fetchDataFromClickHouse("SELECT * FROM test")
      ).rejects.toThrow("Request timed out. Please try again.");
    });

    it("handles other network errors", async () => {
      const networkError = new Error("Network error");
      mockFetch.mockRejectedValueOnce(networkError);

      await expect(
        fetchDataFromClickHouse("SELECT * FROM test")
      ).rejects.toThrow("Network error");
    });

    it("parses integer values correctly", async () => {
      const mockResponse = "owner/repo1\t123\t456\t1.23";

      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => mockResponse,
      });

      const result = await fetchDataFromClickHouse("SELECT * FROM test");

      expect(result[0].stargazers).toBe(123);
      expect(result[0].forkers).toBe(456);
      expect(result[0].ratio).toBe(1.23);
      expect(typeof result[0].stargazers).toBe("number");
      expect(typeof result[0].forkers).toBe("number");
      expect(typeof result[0].ratio).toBe("number");
    });
  });
});
