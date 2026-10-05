// @vitest-environment jsdom
import type { RelatedRepo, RepoDetailsResult } from "@/types/github";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import type { ComponentProps } from "react";
import { MemoryRouter } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import RepoTable from "./RepoTable";

vi.mock("@/lib/repos.client", () => ({
  getRelatedReposClient: vi.fn(),
  getStarTotalsClient: vi.fn(),
  getDataWindowClient: vi.fn(),
  clearExpiredCache: vi.fn(),
}));

vi.mock("@/lib/github.client", () => ({
  getRepoDetailsClient: vi.fn(),
}));

import { getRepoDetailsClient } from "@/lib/github.client";
import {
  getDataWindowClient,
  getRelatedReposClient,
  getStarTotalsClient,
} from "@/lib/repos.client";

const mockedGetRelatedReposClient = vi.mocked(getRelatedReposClient);
const mockedGetStarTotalsClient = vi.mocked(getStarTotalsClient);
const mockedGetDataWindowClient = vi.mocked(getDataWindowClient);
const mockedGetRepoDetailsClient = vi.mocked(getRepoDetailsClient);

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

const nicheToolDetails: RepoDetailsResult = {
  status: "found",
  details: {
    fullName: "niche/tool",
    description: "A tool for a niche",
    language: "Go",
    stars: 1234,
    topics: ["cli"],
    archived: false,
    homepage: null,
  },
};

function renderTable(props: Partial<ComponentProps<typeof RepoTable>> = {}) {
  return render(
    <MemoryRouter>
      <RepoTable repoName="test/repo" {...props} />
    </MemoryRouter>
  );
}

function isLoading(container: HTMLElement) {
  return container.querySelector(".animate-pulse") !== null;
}

// Repo names in the order their rows appear
function listedRepos() {
  return screen
    .queryAllByRole("rowheader")
    .map((cell) => cell.querySelector("a")?.textContent);
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

  describe("loading results", () => {
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
      expect(mockedGetRelatedReposClient).toHaveBeenCalledWith(
        "test/repo",
        expect.any(AbortSignal)
      );
      expect(mockedGetStarTotalsClient).toHaveBeenCalledWith(
        ["popular/giant", "niche/tool", "tiny/noise"],
        expect.any(AbortSignal)
      );
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

    it("shows the error and loads again when Try Again is clicked", async () => {
      vi.spyOn(console, "error").mockImplementation(() => {});
      mockedGetRelatedReposClient
        .mockRejectedValueOnce(
          new Error("Request timed out. Please try again.")
        )
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
    });
  });

  describe("sorting", () => {
    it("switches between relevance and most shared stars", async () => {
      mockedGetRelatedReposClient.mockResolvedValue(mockRelatedRepos);

      renderTable();
      await screen.findByText("niche/tool");

      fireEvent.click(
        screen.getByRole("button", { name: "Sort by most shared stars" })
      );
      expect(listedRepos()).toEqual(BY_SHARED_STARS);

      fireEvent.click(
        screen.getByRole("button", { name: "Sort by relevance" })
      );
      expect(listedRepos()).toEqual(BY_RELEVANCE);
    });

    it("sorts from a column header button and reports the order to screen readers", async () => {
      mockedGetRelatedReposClient.mockResolvedValue(mockRelatedRepos);

      renderTable();
      await screen.findByText("niche/tool");

      const header = screen.getByRole("columnheader", { name: /Shared stars/ });
      expect(header.getAttribute("aria-sort")).toBe("none");

      fireEvent.click(within(header).getByRole("button"));
      expect(header.getAttribute("aria-sort")).toBe("descending");
      expect(listedRepos()).toEqual(BY_SHARED_STARS);

      fireEvent.click(within(header).getByRole("button"));
      expect(header.getAttribute("aria-sort")).toBe("ascending");
      expect(listedRepos()).toEqual([...BY_SHARED_STARS].reverse());
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
      expect(
        screen.queryByRole("button", { name: "Sort by relevance" })
      ).toBe(null);

      await act(async () => {
        resolveTotals(mockStarTotals);
      });
      expect(listedRepos()).toEqual(BY_SHARED_STARS);
      expect(screen.getByText("10.7%")).toBeDefined();

      fireEvent.click(
        screen.getByRole("button", { name: "Sort by relevance" })
      );
      expect(listedRepos()).toEqual(BY_RELEVANCE);
    });

    it("falls back to most shared stars when star totals cannot be loaded", async () => {
      vi.spyOn(console, "error").mockImplementation(() => {});
      mockedGetRelatedReposClient.mockResolvedValue(mockRelatedRepos);
      mockedGetStarTotalsClient.mockRejectedValue(new Error("Network error"));

      renderTable();

      expect(await screen.findByText("popular/giant")).toBeDefined();
      expect(listedRepos()).toEqual(BY_SHARED_STARS);
      expect(
        screen.queryByRole("button", { name: "Sort by relevance" })
      ).toBe(null);
      expect(screen.queryByText(/Relevance ranking is loading/)).toBe(null);
    });
  });

  describe("filtering", () => {
    beforeEach(() => {
      mockedGetRelatedReposClient.mockResolvedValue([
        relatedRepo("test/repo", 250),
        relatedRepo("test/sibling", 40),
        relatedRepo("other/awesome-things", 30),
        relatedRepo("other/tool", 20),
      ]);
      mockedGetStarTotalsClient.mockResolvedValue(new Map());
    });

    it("narrows the results to names containing the typed text", async () => {
      renderTable();
      await screen.findByText("other/tool");

      fireEvent.change(screen.getByLabelText("Filter results by name"), {
        target: { value: "TOOL" },
      });

      expect(listedRepos()).toEqual(["other/tool"]);
      expect(screen.getByText("Showing 1 of 3 results.")).toBeDefined();
    });

    it("hides other repos from the same owner", async () => {
      renderTable();
      await screen.findByText("other/tool");

      fireEvent.click(screen.getByLabelText("Hide other test repos"));

      expect(listedRepos()).toEqual(["other/awesome-things", "other/tool"]);
    });

    it("hides awesome lists", async () => {
      renderTable();
      await screen.findByText("other/tool");

      fireEvent.click(screen.getByLabelText("Hide awesome lists"));

      expect(listedRepos()).toEqual(["test/sibling", "other/tool"]);
    });

    it("says when no result passes the filters, and recovers when they are cleared", async () => {
      renderTable();
      await screen.findByText("other/tool");
      const filter = screen.getByLabelText("Filter results by name");

      fireEvent.change(filter, { target: { value: "no such repo" } });

      expect(screen.getByText("No results match these filters.")).toBeDefined();
      expect(screen.queryByText(EMPTY_MESSAGE)).toBe(null);

      fireEvent.change(filter, { target: { value: "" } });

      expect(listedRepos()).toHaveLength(3);
      expect(screen.queryByText(/^Showing/)).toBe(null);
    });
  });

  describe("repo details", () => {
    it("loads a repo's details from GitHub the first time its row is opened", async () => {
      mockedGetRelatedReposClient.mockResolvedValue(mockRelatedRepos);
      mockedGetRepoDetailsClient.mockResolvedValue(nicheToolDetails);

      renderTable();
      await screen.findByText("niche/tool");
      expect(mockedGetRepoDetailsClient).not.toHaveBeenCalled();

      fireEvent.click(
        screen.getByRole("button", { name: "Show details for niche/tool" })
      );

      expect(await screen.findByText("A tool for a niche")).toBeDefined();
      expect(screen.getByText("⭐ 1,234 stars on GitHub")).toBeDefined();
      expect(mockedGetRepoDetailsClient).toHaveBeenCalledWith("niche/tool");
      // The details row does not count as a result
      expect(listedRepos()).toEqual(BY_RELEVANCE);

      fireEvent.click(
        screen.getByRole("button", { name: "Hide details for niche/tool" })
      );
      expect(screen.queryByText("A tool for a niche")).toBe(null);

      fireEvent.click(
        screen.getByRole("button", { name: "Show details for niche/tool" })
      );
      expect(screen.getByText("A tool for a niche")).toBeDefined();
      expect(mockedGetRepoDetailsClient).toHaveBeenCalledTimes(1);
    });

    it("says so when GitHub's limit means details cannot be loaded", async () => {
      mockedGetRelatedReposClient.mockResolvedValue(mockRelatedRepos);
      mockedGetRepoDetailsClient.mockResolvedValue({ status: "unavailable" });

      renderTable();
      await screen.findByText("niche/tool");
      fireEvent.click(
        screen.getByRole("button", { name: "Show details for niche/tool" })
      );

      expect(
        await screen.findByText(/Details are not available right now/)
      ).toBeDefined();
    });

    it("says so when the repo is no longer on GitHub", async () => {
      mockedGetRelatedReposClient.mockResolvedValue(mockRelatedRepos);
      mockedGetRepoDetailsClient.mockResolvedValue({ status: "not-found" });

      renderTable();
      await screen.findByText("niche/tool");
      fireEvent.click(
        screen.getByRole("button", { name: "Show details for niche/tool" })
      );

      expect(
        await screen.findByText(
          "This repository is no longer on GitHub under this name."
        )
      ).toBeDefined();
    });
  });

  describe("cancelling", () => {
    it("offers to cancel a slow search, and to try again afterwards", async () => {
      vi.useFakeTimers();
      mockedGetRelatedReposClient
        .mockReturnValueOnce(new Promise(() => {}))
        .mockResolvedValueOnce(mockRelatedRepos);

      renderTable();
      await act(async () => {
        await vi.advanceTimersByTimeAsync(2000);
      });
      expect(screen.queryByRole("button", { name: "Cancel" })).toBe(null);

      await act(async () => {
        await vi.advanceTimersByTimeAsync(1000);
      });
      expect(screen.getByText(/Still searching after 3 seconds/)).toBeDefined();

      const signal = mockedGetRelatedReposClient.mock.calls[0][1]!;
      expect(signal.aborted).toBe(false);

      fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

      expect(signal.aborted).toBe(true);
      expect(screen.getByText("Search cancelled.")).toBeDefined();

      fireEvent.click(screen.getByRole("button", { name: "Try Again" }));
      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });

      expect(listedRepos()).toEqual(BY_RELEVANCE);
      expect(screen.queryByText("Search cancelled.")).toBe(null);
    });

    it("cancels the search when the visitor leaves the page", () => {
      mockedGetRelatedReposClient.mockReturnValue(new Promise(() => {}));

      const { unmount } = renderTable();
      const signal = mockedGetRelatedReposClient.mock.calls[0][1]!;
      expect(signal.aborted).toBe(false);

      unmount();

      expect(signal.aborted).toBe(true);
    });
  });

  describe("no results", () => {
    it("shows the empty state and which dates the data covers", async () => {
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

    it("says when GitHub has no repo by that name", async () => {
      mockedGetRelatedReposClient.mockResolvedValue([]);

      renderTable({ sourceDetails: { status: "not-found" } });

      expect(await screen.findByText(EMPTY_MESSAGE)).toBeDefined();
      expect(
        screen.getByText("GitHub has no repository named test/repo.")
      ).toBeDefined();
    });

    it("keeps loading while GitHub is still being asked how the name is spelled", async () => {
      mockedGetRelatedReposClient.mockResolvedValue([]);

      const { container } = renderTable({ resolvingSource: true });
      await act(async () => {});

      expect(isLoading(container)).toBe(true);
      expect(screen.queryByText(EMPTY_MESSAGE)).toBe(null);
    });
  });
});
