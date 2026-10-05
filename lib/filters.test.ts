import type { RelatedRepo } from "@/types/github";
import { describe, expect, it } from "vitest";
import { filterRepos } from "./filters";

function repo(repoName: string): RelatedRepo {
  return {
    repoName,
    githubUrl: `https://github.com/${repoName}`,
    stargazers: 10,
    forkers: 0,
    ratio: 0,
  };
}

const repos = [
  repo("charmbracelet/bubbles"),
  repo("charmbracelet/lipgloss"),
  repo("charm/unrelated"),
  repo("spf13/cobra"),
  repo("avelino/awesome-go"),
  repo("rothgar/Awesome-TUIs"),
];

const NO_FILTERS = { query: "", hideOwner: null, hideAwesome: false };

function names(result: RelatedRepo[]): string[] {
  return result.map((r) => r.repoName);
}

describe("filterRepos", () => {
  it("returns every repo when no filter is active", () => {
    expect(filterRepos(repos, NO_FILTERS)).toBe(repos);
    expect(filterRepos(repos, { ...NO_FILTERS, query: "   " })).toBe(repos);
  });

  it("keeps repos whose name contains the text, ignoring case and outer spaces", () => {
    expect(
      names(filterRepos(repos, { ...NO_FILTERS, query: "  LIPGLOSS " }))
    ).toEqual(["charmbracelet/lipgloss"]);
    expect(names(filterRepos(repos, { ...NO_FILTERS, query: "spf13/" }))).toEqual(
      ["spf13/cobra"]
    );
  });

  it("hides every repo from the given owner, ignoring case", () => {
    const result = filterRepos(repos, {
      ...NO_FILTERS,
      hideOwner: "CharmBracelet",
    });

    expect(names(result)).toEqual([
      "charm/unrelated",
      "spf13/cobra",
      "avelino/awesome-go",
      "rothgar/Awesome-TUIs",
    ]);
  });

  it("does not hide owners whose name only starts the same way", () => {
    const result = filterRepos(repos, { ...NO_FILTERS, hideOwner: "charm" });

    expect(names(result)).toContain("charmbracelet/bubbles");
    expect(names(result)).not.toContain("charm/unrelated");
  });

  it("hides awesome lists, ignoring case", () => {
    const result = filterRepos(repos, { ...NO_FILTERS, hideAwesome: true });

    expect(names(result)).toEqual([
      "charmbracelet/bubbles",
      "charmbracelet/lipgloss",
      "charm/unrelated",
      "spf13/cobra",
    ]);
  });

  it("applies all active filters together", () => {
    const result = filterRepos(repos, {
      query: "c",
      hideOwner: "charmbracelet",
      hideAwesome: true,
    });

    expect(names(result)).toEqual(["charm/unrelated", "spf13/cobra"]);
  });
});
