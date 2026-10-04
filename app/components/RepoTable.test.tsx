// @vitest-environment jsdom
import type { RelatedRepo } from "@/types/github";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import RepoTable from "./RepoTable";

vi.mock("@/lib/repos.client", () => ({
  getRelatedReposClient: vi.fn(),
  clearExpiredCache: vi.fn(),
}));

import { getRelatedReposClient } from "@/lib/repos.client";

const mockedGetRelatedReposClient = vi.mocked(getRelatedReposClient);

const EMPTY_MESSAGE = "No related repositories found.";

const mockRelatedRepos: RelatedRepo[] = [
  {
    repoName: "owner/repo1",
    githubUrl: "https://github.com/owner/repo1",
    stargazers: 100,
    forkers: 50,
    ratio: 2.0,
  },
];

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

describe("RepoTable", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.resetAllMocks();
  });

  it("shows a loading skeleton while the first page loads", () => {
    mockedGetRelatedReposClient.mockReturnValue(new Promise(() => {}));

    const { container } = renderTable();

    expect(isLoading(container)).toBe(true);
    expect(screen.queryByText(EMPTY_MESSAGE)).toBe(null);
  });

  it("lists the related repos once they load", async () => {
    mockedGetRelatedReposClient.mockResolvedValue(mockRelatedRepos);

    const { container } = renderTable();

    expect(await screen.findByText("owner/repo1")).toBeDefined();
    expect(isLoading(container)).toBe(false);
    expect(mockedGetRelatedReposClient).toHaveBeenCalledWith("test/repo", 0);
  });

  it("shows the empty state when no related repos are found", async () => {
    mockedGetRelatedReposClient.mockResolvedValue([]);

    const { container } = renderTable();

    expect(await screen.findByText(EMPTY_MESSAGE)).toBeDefined();
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
    expect(await screen.findByText("owner/repo1")).toBeDefined();
    expect(screen.queryByText("Error Loading Data")).toBe(null);
    expect(mockedGetRelatedReposClient).toHaveBeenCalledTimes(2);
    expect(mockedGetRelatedReposClient).toHaveBeenLastCalledWith(
      "test/repo",
      0
    );
  });
});
