// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getRepoDetailsClient } from "./github.client";

const mockFetch = vi.fn();

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

const clickhouseJson = {
  full_name: "ClickHouse/ClickHouse",
  description: "A real-time analytics database",
  language: "C++",
  stargazers_count: 50247,
  topics: ["analytics", "database"],
  archived: false,
  homepage: "https://clickhouse.com",
};

const clickhouseDetails = {
  fullName: "ClickHouse/ClickHouse",
  description: "A real-time analytics database",
  language: "C++",
  stars: 50247,
  topics: ["analytics", "database"],
  archived: false,
  homepage: "https://clickhouse.com",
};

function response(
  status: number,
  body: unknown = {},
  headers: Record<string, string> = {}
) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: new Headers(headers),
    json: async () => body,
  };
}

describe("getRepoDetailsClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("fetch", mockFetch);
    localStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.resetAllMocks();
  });

  it("fetches a repo's details from GitHub", async () => {
    mockFetch.mockResolvedValue(response(200, clickhouseJson));

    const result = await getRepoDetailsClient("ClickHouse/ClickHouse");

    expect(mockFetch).toHaveBeenCalledWith(
      "https://api.github.com/repos/ClickHouse/ClickHouse",
      {
        headers: { Accept: "application/vnd.github+json" },
        signal: expect.any(AbortSignal),
      }
    );
    expect(result).toEqual({ status: "found", details: clickhouseDetails });
  });

  it("returns the name as GitHub spells it when typed in another letter case", async () => {
    mockFetch.mockResolvedValue(response(200, clickhouseJson));

    const result = await getRepoDetailsClient("clickhouse/clickhouse");

    expect(result).toMatchObject({
      status: "found",
      details: { fullName: "ClickHouse/ClickHouse" },
    });
  });

  it("fills in what a repo leaves blank", async () => {
    mockFetch.mockResolvedValue(
      response(200, {
        full_name: "owner/bare",
        description: null,
        language: null,
        stargazers_count: 3,
        homepage: "",
      })
    );

    const result = await getRepoDetailsClient("owner/bare");

    expect(result).toEqual({
      status: "found",
      details: {
        fullName: "owner/bare",
        description: null,
        language: null,
        stars: 3,
        topics: [],
        archived: false,
        homepage: null,
      },
    });
  });

  it("serves a repeat request from cache, whatever its letter case", async () => {
    mockFetch.mockResolvedValue(response(200, clickhouseJson));

    await getRepoDetailsClient("ClickHouse/ClickHouse");
    const result = await getRepoDetailsClient("clickhouse/CLICKHOUSE");

    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ status: "found", details: clickhouseDetails });
  });

  it("fetches details again after a week", async () => {
    vi.useFakeTimers();
    mockFetch.mockResolvedValue(response(200, clickhouseJson));

    await getRepoDetailsClient("ClickHouse/ClickHouse");
    vi.advanceTimersByTime(7 * ONE_DAY_MS + 1);
    await getRepoDetailsClient("ClickHouse/ClickHouse");

    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it("reports a repo GitHub does not have, and remembers that for a day", async () => {
    vi.useFakeTimers();
    mockFetch.mockResolvedValue(response(404, { message: "Not Found" }));

    const first = await getRepoDetailsClient("owner/missing");
    const second = await getRepoDetailsClient("owner/missing");

    expect(first).toEqual({ status: "not-found" });
    expect(second).toEqual({ status: "not-found" });
    expect(mockFetch).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(ONE_DAY_MS + 1);
    await getRepoDetailsClient("owner/missing");

    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it("stops asking GitHub once the hourly limit is reached, until it resets", async () => {
    vi.useFakeTimers();
    const resetInSeconds = Math.floor(Date.now() / 1000) + 600;
    mockFetch.mockResolvedValueOnce(
      response(
        403,
        { message: "API rate limit exceeded" },
        {
          "x-ratelimit-remaining": "0",
          "x-ratelimit-reset": String(resetInSeconds),
        }
      )
    );

    const limited = await getRepoDetailsClient("owner/repo1");
    const whileLimited = await getRepoDetailsClient("owner/repo2");

    expect(limited).toEqual({ status: "unavailable" });
    expect(whileLimited).toEqual({ status: "unavailable" });
    expect(mockFetch).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(601 * 1000);
    mockFetch.mockResolvedValueOnce(response(200, clickhouseJson));
    const afterReset = await getRepoDetailsClient("ClickHouse/ClickHouse");

    expect(afterReset.status).toBe("found");
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it("still serves cached details while the hourly limit is reached", async () => {
    mockFetch.mockResolvedValueOnce(response(200, clickhouseJson));
    await getRepoDetailsClient("ClickHouse/ClickHouse");

    mockFetch.mockResolvedValueOnce(
      response(
        429,
        {},
        {
          "retry-after": "60",
        }
      )
    );
    await getRepoDetailsClient("owner/other");
    const result = await getRepoDetailsClient("ClickHouse/ClickHouse");

    expect(result).toEqual({ status: "found", details: clickhouseDetails });
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it("does not treat a server error as the hourly limit", async () => {
    mockFetch.mockResolvedValueOnce(response(500));
    mockFetch.mockResolvedValueOnce(response(200, clickhouseJson));

    const failed = await getRepoDetailsClient("ClickHouse/ClickHouse");
    const retried = await getRepoDetailsClient("ClickHouse/ClickHouse");

    expect(failed).toEqual({ status: "unavailable" });
    expect(retried.status).toBe("found");
  });

  it("reports details as unavailable instead of throwing when the request fails", async () => {
    mockFetch.mockRejectedValue(new Error("Network error"));

    await expect(getRepoDetailsClient("owner/repo")).resolves.toEqual({
      status: "unavailable",
    });
    expect(localStorage.getItem("gitrelate_repo_details")).toBe(null);
  });

  it("aborts the request when the caller cancels", async () => {
    const controller = new AbortController();
    let requestSignal: AbortSignal | undefined;
    mockFetch.mockImplementation((_url, init) => {
      requestSignal = init.signal;
      return new Promise((_resolve, reject) => {
        init.signal.addEventListener("abort", () =>
          reject(Object.assign(new Error("Aborted"), { name: "AbortError" }))
        );
      });
    });

    const pending = getRepoDetailsClient("owner/repo", controller.signal);
    controller.abort();

    await expect(pending).resolves.toEqual({ status: "unavailable" });
    expect(requestSignal?.aborted).toBe(true);
  });
});
