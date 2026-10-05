// @vitest-environment jsdom
import type { RelatedRepo } from "@/types/github";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Providers } from "@/app/providers";
import { routes } from "@/app/routes";

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

const INVALID_URL_MESSAGE =
  "Invalid GitHub URL. Please enter a valid GitHub repository.";

function renderAt(path: string) {
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  render(
    <Providers>
      <RouterProvider router={router} />
    </Providers>
  );
  return router;
}

function relatedRepo(repoName: string): RelatedRepo {
  return {
    repoName,
    githubUrl: `https://github.com/${repoName}`,
    stargazers: 100,
    forkers: 50,
    ratio: 2,
  };
}

describe("routes", () => {
  beforeEach(() => {
    // Not implemented by jsdom
    vi.stubGlobal(
      "matchMedia",
      vi.fn(() => ({
        matches: false,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }))
    );
    vi.stubGlobal("scrollTo", vi.fn());

    // Leave the table loading unless a test provides data
    mockedGetRelatedReposClient.mockReturnValue(new Promise(() => {}));
    mockedGetStarTotalsClient.mockResolvedValue(new Map());
    mockedGetDataWindowClient.mockReturnValue(new Promise(() => {}));
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    vi.resetAllMocks();
  });

  describe("home page", () => {
    it("renders at the root path", () => {
      renderAt("/");

      expect(
        screen.getByRole("heading", { name: "Find Related Repositories" })
      ).toBeDefined();
      expect(document.title).toBe(
        "GitRelate(d) - Find Related GitHub Repositories"
      );
      expect(mockedGetRelatedReposClient).not.toHaveBeenCalled();
    });
  });

  describe("repo page", () => {
    it("renders the repository and requests its related repos", () => {
      renderAt("/facebook/react");

      expect(
        screen.getByRole("heading", {
          name: "Related Repositories for facebook/react",
        })
      ).toBeDefined();
      expect(document.title).toBe(
        "facebook/react Related Repos - GitRelate(d)"
      );
      expect(mockedGetRelatedReposClient).toHaveBeenCalledWith(
        "facebook/react"
      );
    });

    it("sets the title for different repository names", () => {
      const testCases = [
        "microsoft/typescript",
        "vercel/next.js",
        "facebook/react-native",
        "some-org/my_repo",
        "user/repo-with-special.chars_123",
        "organization-with-long-name/repository-with-very-long-name-containing-multiple-words",
      ];

      for (const repoName of testCases) {
        renderAt(`/${repoName}`);

        expect(document.title).toBe(`${repoName} Related Repos - GitRelate(d)`);

        cleanup();
      }
    });

    it("lists the related repos once they load", async () => {
      mockedGetRelatedReposClient.mockResolvedValue([
        relatedRepo("owner/repo1"),
        relatedRepo("owner/repo2"),
      ]);

      renderAt("/facebook/react");

      expect(await screen.findByText("owner/repo1")).toBeDefined();
      expect(screen.getByText("owner/repo2")).toBeDefined();
    });

    it("starts with a fresh table when navigating to another repo", async () => {
      mockedGetRelatedReposClient.mockImplementation(async (repoName) => [
        relatedRepo(`related-to/${repoName.replace("/", "-")}`),
      ]);

      const router = renderAt("/facebook/react");
      expect(await screen.findByText("related-to/facebook-react")).toBeDefined();

      await router.navigate("/vercel/next.js");

      expect(await screen.findByText("related-to/vercel-next.js")).toBeDefined();
      expect(screen.queryByText("related-to/facebook-react")).toBe(null);
      expect(mockedGetRelatedReposClient).toHaveBeenLastCalledWith(
        "vercel/next.js"
      );
    });
  });

  describe("GitHub paths", () => {
    it("redirects paths with extra segments to the repo page", async () => {
      const testCases = [
        {
          path: "/microsoft/typescript/tree/main/src",
          expected: "/microsoft/typescript",
        },
        {
          path: "/vercel/next.js/blob/main/README.md",
          expected: "/vercel/next.js",
        },
        { path: "/facebook/react/issues", expected: "/facebook/react" },
        {
          path: "/org/repo/tree/main/src/components/ui/button",
          expected: "/org/repo",
        },
      ];

      for (const { path, expected } of testCases) {
        const router = renderAt(path);

        await waitFor(() =>
          expect(router.state.location.pathname).toBe(expected)
        );
        expect(
          screen.getByRole("heading", {
            name: `Related Repositories for ${expected.slice(1)}`,
          })
        ).toBeDefined();

        cleanup();
      }
    });

    it("shows an error for a path with only an organization name", () => {
      const router = renderAt("/facebook");

      expect(screen.getByText(INVALID_URL_MESSAGE)).toBeDefined();
      expect(router.state.location.pathname).toBe("/facebook");
      expect(mockedGetRelatedReposClient).not.toHaveBeenCalled();
    });
  });
});
