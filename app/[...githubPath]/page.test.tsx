import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { redirect } from "next/navigation";
import GitHubPathPage from "./page";

vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
}));

vi.mock("@/utils/github", () => ({
  parseGitHubURL: vi.fn(),
}));

import { parseGitHubURL } from "@/utils/github";

const mockedRedirect = vi.mocked(redirect);
const mockedParseGitHubURL = vi.mocked(parseGitHubURL);

describe("GitHubPathPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("when GitHub path is valid", () => {
    it("redirects to correct org/repo route for simple repository", async () => {
      mockedParseGitHubURL.mockReturnValue("facebook/react");

      const params = Promise.resolve({ githubPath: ["facebook", "react"] });

      await GitHubPathPage({ params });

      expect(mockedParseGitHubURL).toHaveBeenCalledWith(
        "https://github.com/facebook/react"
      );
      expect(mockedRedirect).toHaveBeenCalledWith("/facebook/react");
    });

    it("redirects for repository with special characters", async () => {
      mockedParseGitHubURL.mockReturnValue("vercel/next.js");

      const params = Promise.resolve({ githubPath: ["vercel", "next.js"] });

      await GitHubPathPage({ params });

      expect(mockedParseGitHubURL).toHaveBeenCalledWith(
        "https://github.com/vercel/next.js"
      );
      expect(mockedRedirect).toHaveBeenCalledWith("/vercel/next.js");
    });

    it("redirects for repository with hyphens", async () => {
      mockedParseGitHubURL.mockReturnValue("facebook/react-native");

      const params = Promise.resolve({
        githubPath: ["facebook", "react-native"],
      });

      await GitHubPathPage({ params });

      expect(mockedParseGitHubURL).toHaveBeenCalledWith(
        "https://github.com/facebook/react-native"
      );
      expect(mockedRedirect).toHaveBeenCalledWith("/facebook/react-native");
    });

    it("handles complex paths with additional segments", async () => {
      mockedParseGitHubURL.mockReturnValue("microsoft/typescript");

      const params = Promise.resolve({
        githubPath: ["microsoft", "typescript", "tree", "main", "src"],
      });

      await GitHubPathPage({ params });

      expect(mockedParseGitHubURL).toHaveBeenCalledWith(
        "https://github.com/microsoft/typescript/tree/main/src"
      );
      expect(mockedRedirect).toHaveBeenCalledWith("/microsoft/typescript");
    });

    it("handles single segment paths", async () => {
      mockedParseGitHubURL.mockReturnValue("nodejs/node");

      const params = Promise.resolve({ githubPath: ["nodejs", "node"] });

      await GitHubPathPage({ params });

      expect(mockedParseGitHubURL).toHaveBeenCalledWith(
        "https://github.com/nodejs/node"
      );
      expect(mockedRedirect).toHaveBeenCalledWith("/nodejs/node");
    });
  });

  describe("when GitHub path is invalid", () => {
    it("returns error message when parseGitHubURL returns null", async () => {
      mockedParseGitHubURL.mockReturnValue(null);

      const params = Promise.resolve({ githubPath: ["invalid"] });

      const result = await GitHubPathPage({ params });

      expect(mockedParseGitHubURL).toHaveBeenCalledWith(
        "https://github.com/invalid"
      );
      expect(mockedRedirect).not.toHaveBeenCalled();
      // Check that it returns JSX with the error message
      expect(result).toBeDefined();
      expect(result.type).toBe("div");
      expect(result.props.children).toBe(
        "Invalid GitHub URL. Please enter a valid GitHub repository."
      );
    });

    it("returns error message for empty path", async () => {
      mockedParseGitHubURL.mockReturnValue(null);

      const params = Promise.resolve({ githubPath: [] });

      const result = await GitHubPathPage({ params });

      expect(mockedParseGitHubURL).toHaveBeenCalledWith("https://github.com/");
      expect(mockedRedirect).not.toHaveBeenCalled();
      // Check that it returns JSX with the error message
      expect(result).toBeDefined();
      expect(result.type).toBe("div");
      expect(result.props.children).toBe(
        "Invalid GitHub URL. Please enter a valid GitHub repository."
      );
    });

    it("returns error message for malformed repository names", async () => {
      mockedParseGitHubURL.mockReturnValue(null);

      const params = Promise.resolve({
        githubPath: ["not-a-valid-repo-format"],
      });

      const result = await GitHubPathPage({ params });

      expect(mockedParseGitHubURL).toHaveBeenCalledWith(
        "https://github.com/not-a-valid-repo-format"
      );
      expect(mockedRedirect).not.toHaveBeenCalled();
      // Check that it returns JSX with the error message
      expect(result).toBeDefined();
      expect(result.type).toBe("div");
      expect(result.props.children).toBe(
        "Invalid GitHub URL. Please enter a valid GitHub repository."
      );
    });
  });

  describe("edge cases", () => {
    it("handles URLs with encoded characters", async () => {
      mockedParseGitHubURL.mockReturnValue("user/repo-with-special-chars");

      const params = Promise.resolve({
        githubPath: ["user", "repo%20with%20spaces"],
      });

      await GitHubPathPage({ params });

      expect(mockedParseGitHubURL).toHaveBeenCalledWith(
        "https://github.com/user/repo%20with%20spaces"
      );
      expect(mockedRedirect).toHaveBeenCalledWith(
        "/user/repo-with-special-chars"
      );
    });

    it("handles very long paths", async () => {
      mockedParseGitHubURL.mockReturnValue("org/repo");

      const longPath = [
        "org",
        "repo",
        "tree",
        "main",
        "src",
        "components",
        "ui",
        "button",
      ];
      const params = Promise.resolve({ githubPath: longPath });

      await GitHubPathPage({ params });

      expect(mockedParseGitHubURL).toHaveBeenCalledWith(
        `https://github.com/${longPath.join("/")}`
      );
      expect(mockedRedirect).toHaveBeenCalledWith("/org/repo");
    });

    it("handles path with only organization name", async () => {
      mockedParseGitHubURL.mockReturnValue(null);

      const params = Promise.resolve({ githubPath: ["facebook"] });

      const result = await GitHubPathPage({ params });

      expect(mockedParseGitHubURL).toHaveBeenCalledWith(
        "https://github.com/facebook"
      );
      expect(mockedRedirect).not.toHaveBeenCalled();
      // Check that it returns JSX with the error message
      expect(result).toBeDefined();
      expect(result.type).toBe("div");
      expect(result.props.children).toBe(
        "Invalid GitHub URL. Please enter a valid GitHub repository."
      );
    });
  });

  describe("parseGitHubURL integration", () => {
    it("properly constructs GitHub URLs for parsing", async () => {
      const testCases = [
        {
          input: ["microsoft", "typescript"],
          expected: "https://github.com/microsoft/typescript",
        },
        {
          input: ["vercel", "next.js", "blob", "main", "README.md"],
          expected: "https://github.com/vercel/next.js/blob/main/README.md",
        },
        {
          input: ["facebook", "react", "issues"],
          expected: "https://github.com/facebook/react/issues",
        },
      ];

      for (const testCase of testCases) {
        mockedParseGitHubURL.mockReturnValue("owner/repo");

        const params = Promise.resolve({ githubPath: testCase.input });
        await GitHubPathPage({ params });

        expect(mockedParseGitHubURL).toHaveBeenCalledWith(testCase.expected);
      }
    });
  });
});
