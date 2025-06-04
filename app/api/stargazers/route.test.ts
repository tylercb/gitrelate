import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";

vi.mock("@/lib/github", () => ({
  getStargazers: vi.fn(),
}));

import { getStargazers } from "@/lib/github";

const mockedGetStargazers = vi.mocked(getStargazers);

describe("Stargazers API Route", () => {
  const originalEnv = process.env.NEXT_PUBLIC_USE_CLIENT_CLICKHOUSE;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Restore original environment variable
    if (originalEnv !== undefined) {
      process.env.NEXT_PUBLIC_USE_CLIENT_CLICKHOUSE = originalEnv;
    } else {
      delete process.env.NEXT_PUBLIC_USE_CLIENT_CLICKHOUSE;
    }
    vi.resetAllMocks();
  });

  describe("when client-side fetching is enabled", () => {
    beforeEach(() => {
      process.env.NEXT_PUBLIC_USE_CLIENT_CLICKHOUSE = "true";
    });

    it("returns informational message about client-side fetching", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/stargazers?repo=owner/repo"
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({
        message:
          "Client-side fetching is enabled. Data is fetched directly from ClickHouse in the browser for better performance.",
        suggestion:
          "This API endpoint is available but not recommended when client-side fetching is enabled.",
        clientFetchingEnabled: true,
      });

      // Should not call the actual API function
      expect(mockedGetStargazers).not.toHaveBeenCalled();
    });

    it("returns the same message regardless of query parameters", async () => {
      const request = new NextRequest("http://localhost:3000/api/stargazers");

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.clientFetchingEnabled).toBe(true);
      expect(mockedGetStargazers).not.toHaveBeenCalled();
    });
  });

  describe("when client-side fetching is disabled", () => {
    beforeEach(() => {
      process.env.NEXT_PUBLIC_USE_CLIENT_CLICKHOUSE = "false";
    });

    it("returns stargazers data when repo parameter is provided", async () => {
      const mockStargazers = [
        { login: "user1", avatar_url: "https://github.com/user1.png" },
        { login: "user2", avatar_url: "https://github.com/user2.png" },
      ];

      mockedGetStargazers.mockResolvedValue(mockStargazers);

      const request = new NextRequest(
        "http://localhost:3000/api/stargazers?repo=facebook/react"
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(mockStargazers);
      expect(mockedGetStargazers).toHaveBeenCalledWith("facebook/react");
    });

    it("returns 400 error when repo parameter is missing", async () => {
      const request = new NextRequest("http://localhost:3000/api/stargazers");

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toEqual({ error: "Repo parameter is required" });
      expect(mockedGetStargazers).not.toHaveBeenCalled();
    });

    it("returns 400 error when repo parameter is empty", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/stargazers?repo="
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toEqual({ error: "Repo parameter is required" });
      expect(mockedGetStargazers).not.toHaveBeenCalled();
    });

    it("handles errors from getStargazers function", async () => {
      const consoleErrorSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});
      const error = new Error("GitHub API error");
      mockedGetStargazers.mockRejectedValue(error);

      const request = new NextRequest(
        "http://localhost:3000/api/stargazers?repo=owner/repo"
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data).toEqual({ error: "Failed to fetch stargazers" });
      expect(mockedGetStargazers).toHaveBeenCalledWith("owner/repo");
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Error fetching stargazers:",
        error
      );

      consoleErrorSpy.mockRestore();
    });

    it("handles various repo name formats", async () => {
      const mockStargazers = [
        { login: "user1", avatar_url: "https://github.com/user1.png" },
      ];
      mockedGetStargazers.mockResolvedValue(mockStargazers);

      const testCases = [
        "microsoft/typescript",
        "vercel/next.js",
        "facebook/react-native",
        "nodejs/node",
      ];

      for (const repo of testCases) {
        const request = new NextRequest(
          `http://localhost:3000/api/stargazers?repo=${repo}`
        );
        const response = await GET(request);

        expect(response.status).toBe(200);
        expect(mockedGetStargazers).toHaveBeenCalledWith(repo);
      }
    });
  });

  describe("when client-side fetching environment variable is not set", () => {
    beforeEach(() => {
      delete process.env.NEXT_PUBLIC_USE_CLIENT_CLICKHOUSE;
    });

    it("falls back to server-side implementation", async () => {
      const mockStargazers = [
        { login: "user1", avatar_url: "https://github.com/user1.png" },
      ];
      mockedGetStargazers.mockResolvedValue(mockStargazers);

      const request = new NextRequest(
        "http://localhost:3000/api/stargazers?repo=owner/repo"
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(mockStargazers);
      expect(mockedGetStargazers).toHaveBeenCalledWith("owner/repo");
    });
  });
});
