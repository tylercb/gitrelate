import { describe, expect, it } from "vitest";
import { parseGitHubURL } from "./github";

describe("parseGitHubURL", () => {
  it("handles plain owner/repo format", () => {
    expect(parseGitHubURL("owner/repo")).toBe("owner/repo");
  });

  it("parses full GitHub URL", () => {
    expect(parseGitHubURL("https://github.com/owner/repo")).toBe("owner/repo");
  });

  it("parses GitHub URL with www", () => {
    expect(parseGitHubURL("https://www.github.com/owner/repo")).toBe(
      "owner/repo"
    );
  });

  it("handles trailing slashes", () => {
    expect(parseGitHubURL("https://github.com/owner/repo/")).toBe("owner/repo");
  });

  it("parses URLs with extra path segments", () => {
    expect(parseGitHubURL("https://github.com/owner/repo/issues")).toBe(
      "owner/repo"
    );
  });

  it("returns null for non-GitHub URLs", () => {
    expect(parseGitHubURL("https://example.com/owner/repo")).toBeNull();
  });

  it("returns null for invalid input", () => {
    expect(parseGitHubURL("not a url")).toBeNull();
  });

  it("returns null for incomplete repo names", () => {
    expect(parseGitHubURL("owner")).toBeNull();
  });

  // Additional edge cases
  it("handles .git extension in URLs", () => {
    expect(parseGitHubURL("https://github.com/owner/repo.git")).toBe(
      "owner/repo"
    );
  });

  it("handles .git extension in plain format", () => {
    expect(parseGitHubURL("owner/repo.git")).toBe("owner/repo");
  });

  it("returns null for empty string", () => {
    expect(parseGitHubURL("")).toBeNull();
  });

  it("returns null for single slash", () => {
    expect(parseGitHubURL("/")).toBeNull();
  });

  it("returns null for just owner with slash", () => {
    expect(parseGitHubURL("owner/")).toBeNull();
  });

  it("returns null for URL with only owner", () => {
    expect(parseGitHubURL("https://github.com/owner")).toBeNull();
  });

  it("handles URLs with multiple trailing slashes", () => {
    expect(parseGitHubURL("https://github.com/owner/repo///")).toBe(
      "owner/repo"
    );
  });

  it("handles http URLs", () => {
    expect(parseGitHubURL("http://github.com/owner/repo")).toBe("owner/repo");
  });

  it("parses URLs without protocol", () => {
    expect(parseGitHubURL("github.com/owner/repo")).toBe("owner/repo");
  });

  it("handles repos with dots in name", () => {
    expect(parseGitHubURL("owner/repo.name")).toBe("owner/repo.name");
  });

  it("handles repos with dashes and underscores", () => {
    expect(parseGitHubURL("owner-name/repo_name")).toBe("owner-name/repo_name");
  });
});
