// @vitest-environment jsdom
import type { RelatedRepo } from "@/types/github";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import RepoTable from "./RepoTable";

vi.mock("@/lib/repos.client", () => ({
  getRelatedReposClient: vi.fn(),
  getStarTotalsClient: vi.fn(),
  getDataWindowClient: vi.fn(),
  clearExpiredCache: vi.fn(),
}));

import {
  getDataWindowClient,
  getRelatedReposClient,
  getStarTotalsClient,
} from "@/lib/repos.client";

const mockedGetRelatedReposClient = vi.mocked(getRelatedReposClient);
const mockedGetStarTotalsClient = vi.mocked(getStarTotalsClient);
const mockedGetDataWindowClient = vi.mocked(getDataWindowClient);

const EMPTY_MESSAGE = "No related repositories found.";

function relatedRepo(repoName: string, stargazers: number): RelatedRepo {
  return {
    repoName,
    githubUrl: `https://github.com/${repoName}`,
    stargazers,
    forkers: 0,
    ratio: null as unknown as number,
  };
}

// In the order ClickHouse returns them: by shared stargazers, starting with
// the repo being viewed
const mockRelatedRepos: RelatedRepo[] = [
  relatedRepo("test/repo", 250),
  relatedRepo("popular/giant", 50),
  relatedRepo("niche/tool", 31),
  relatedRepo("tiny/noise", 1),
];

const mockStarTotals = new Map([
  ["popular/giant", 49946],
  ["niche/tool", 291],
  ["tiny/noise", 2],
]);

const BY_RELEVANCE = ["niche/tool", "popular/giant", "tiny/noise"];
const BY_SHARED_STARS = ["popular/giant", "niche/tool", "tiny/noise"];

function renderTable() {
  return render(
    <MemoryRouter>
      <RepoTable repoName="test/repo" />
    </MemoryRouter>
  );
}

function isLoading(container: HTMLElement) {
  return container.querySelector(".animate-pulse") !== null;
}

// Repo names in the order their rows appear
function listedRepos() {
  return screen
    .getAllByRole("row")
    .slice(1)
    .map((row) => row.querySelector("a")?.textContent);
}

describe("RepoTable", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedGetStarTotalsClient.mockResolvedValue(mockStarTotals);
    mockedGetDataWindowClient.mockResolvedValue({
      start: "2023-01-13",
      end: "2026-07-02",
    });
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.resetAllMocks();
  });

  it("shows a loading skeleton while the first page loads", () => {
    mockedGetRelatedReposClient.mockReturnValue(new Promise(() => {}));

    const { container } = renderTable();

    expect(isLoading(container)).toBe(true);
    expect(screen.queryByText(EMPTY_MESSAGE)).toBe(null);
  });

  it("lists related repos by relevance, leaving out the repo being viewed", async () => {
    mockedGetRelatedReposClient.mockResolvedValue(mockRelatedRepos);

    const { container } = renderTable();

    expect(await screen.findByText("niche/tool")).toBeDefined();
    expect(listedRepos()).toEqual(BY_RELEVANCE);
    expect(isLoading(container)).toBe(false);
    expect(mockedGetRelatedReposClient).toHaveBeenCalledWith("test/repo");
    expect(mockedGetStarTotalsClient).toHaveBeenCalledWith([
      "popular/giant",
      "niche/tool",
      "tiny/noise",
    ]);
  });

  it("says how many stargazers and which dates the results are based on", async () => {
    mockedGetRelatedReposClient.mockResolvedValue(mockRelatedRepos);

    renderTable();

    expect(
      await screen.findByText(
        "Based on the 250 people who starred test/repo between Jan 2023 and Jul 2026."
      )
    ).toBeDefined();
  });

  it("shows each repo's overlap as a share of its own stargazers", async () => {
    mockedGetRelatedReposClient.mockResolvedValue(mockRelatedRepos);

    renderTable();

    const overlap = await screen.findByText("10.7%");
    expect(overlap.getAttribute("title")).toBe("31 of its 291 stargazers");
    expect(screen.getByText("0.1%")).toBeDefined();
  });

  it("switches between relevance and most shared stars", async () => {
    mockedGetRelatedReposClient.mockResolvedValue(mockRelatedRepos);

    renderTable();
    await screen.findByText("niche/tool");

    fireEvent.click(
      screen.getByRole("button", { name: "Sort by most shared stars" })
    );
    expect(listedRepos()).toEqual(BY_SHARED_STARS);

    fireEvent.click(screen.getByRole("button", { name: "Sort by relevance" }));
    expect(listedRepos()).toEqual(BY_RELEVANCE);
  });

  it("does not reorder results on screen when star totals arrive late", async () => {
    vi.useFakeTimers();
    let resolveTotals!: (totals: Map<string, number>) => void;
    mockedGetRelatedReposClient.mockResolvedValue(mockRelatedRepos);
    mockedGetStarTotalsClient.mockReturnValue(
      new Promise((resolve) => {
        resolveTotals = resolve;
      })
    );

    const { container } = renderTable();

    // Results wait briefly for the totals so they can open in relevance order
    await act(async () => {
      await vi.advanceTimersByTimeAsync(999);
    });
    expect(isLoading(container)).toBe(true);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1);
    });
    expect(listedRepos()).toEqual(BY_SHARED_STARS);
    expect(screen.getByText(/Relevance ranking is loading/)).toBeDefined();
    expect(screen.queryByRole("button", { name: "Sort by relevance" })).toBe(
      null
    );

    await act(async () => {
      resolveTotals(mockStarTotals);
    });
    expect(listedRepos()).toEqual(BY_SHARED_STARS);
    expect(screen.getByText("10.7%")).toBeDefined();

    fireEvent.click(screen.getByRole("button", { name: "Sort by relevance" }));
    expect(listedRepos()).toEqual(BY_RELEVANCE);
  });

  it("falls back to most shared stars when star totals cannot be loaded", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    mockedGetRelatedReposClient.mockResolvedValue(mockRelatedRepos);
    mockedGetStarTotalsClient.mockRejectedValue(new Error("Network error"));

    renderTable();

    expect(await screen.findByText("popular/giant")).toBeDefined();
    expect(listedRepos()).toEqual(BY_SHARED_STARS);
    expect(screen.queryByRole("button", { name: "Sort by relevance" })).toBe(
      null
    );
    expect(screen.queryByText(/Relevance ranking is loading/)).toBe(null);
  });

  it("shows more results without another request", async () => {
    mockedGetRelatedReposClient.mockResolvedValue([
      relatedRepo("test/repo", 1000),
      ...Array.from({ length: 150 }, (_, i) =>
        relatedRepo(`owner/repo${String(i).padStart(3, "0")}`, 500 - i)
      ),
    ]);
    mockedGetStarTotalsClient.mockResolvedValue(new Map());

    renderTable();
    await screen.findByText("owner/repo000");

    expect(listedRepos()).toHaveLength(100);

    fireEvent.click(screen.getByRole("button", { name: "Show More" }));

    expect(listedRepos()).toHaveLength(150);
    expect(screen.queryByRole("button", { name: "Show More" })).toBe(null);
    expect(mockedGetRelatedReposClient).toHaveBeenCalledTimes(1);
  });

  it("shows the empty state when no related repos are found", async () => {
    mockedGetRelatedReposClient.mockResolvedValue([]);

    const { container } = renderTable();

    expect(await screen.findByText(EMPTY_MESSAGE)).toBeDefined();
    expect(
      await screen.findByText(
        "The data only covers stars given between Jan 2023 and Jul 2026."
      )
    ).toBeDefined();
    expect(isLoading(container)).toBe(false);
    expect(screen.queryByRole("button", { name: "Show More" })).toBe(null);
  });

  it("shows the error and loads again when Try Again is clicked", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    mockedGetRelatedReposClient
      .mockRejectedValueOnce(new Error("Request timed out. Please try again."))
      .mockResolvedValueOnce(mockRelatedRepos);

    const { container } = renderTable();

    expect(await screen.findByText("Error Loading Data")).toBeDefined();
    expect(
      screen.getByText("Request timed out. Please try again.")
    ).toBeDefined();

    fireEvent.click(screen.getByRole("button", { name: "Try Again" }));

    expect(isLoading(container)).toBe(true);
    expect(await screen.findByText("niche/tool")).toBeDefined();
    expect(screen.queryByText("Error Loading Data")).toBe(null);
    expect(mockedGetRelatedReposClient).toHaveBeenCalledTimes(2);
    expect(mockedGetRelatedReposClient).toHaveBeenLastCalledWith("test/repo");
  });
});
