import type { RelatedRepo } from "@/types/github";
import { describe, expect, it } from "vitest";
import {
  compareByRelevance,
  MIN_SHARED_STARGAZERS,
  overlapShare,
  relevanceScore,
} from "./relevance";

function repo(
  repoName: string,
  stargazers: number,
  totalStars?: number
): RelatedRepo {
  return {
    repoName,
    githubUrl: `https://github.com/${repoName}`,
    stargazers,
    forkers: 0,
    ratio: 0,
    totalStars,
  };
}

function rank(repos: RelatedRepo[]): string[] {
  return [...repos].sort(compareByRelevance).map((r) => r.repoName);
}

describe("relevance", () => {
  describe("relevanceScore", () => {
    it("divides shared stargazers by the square root of the repo's stars", () => {
      expect(relevanceScore(repo("owner/repo", 30, 900))).toBe(1);
    });

    it("returns null when the star total is unknown", () => {
      expect(relevanceScore(repo("owner/repo", 30))).toBeNull();
      expect(relevanceScore(repo("owner/repo", 30, 0))).toBeNull();
    });

    it("returns null when too few stargazers are shared to be meaningful", () => {
      expect(
        relevanceScore(repo("owner/repo", MIN_SHARED_STARGAZERS - 1, 2))
      ).toBeNull();
      expect(
        relevanceScore(repo("owner/repo", MIN_SHARED_STARGAZERS, 9))
      ).toBe(1);
    });
  });

  describe("overlapShare", () => {
    it("returns the share of the repo's stargazers that are shared", () => {
      expect(overlapShare(repo("owner/repo", 30, 300))).toBe(0.1);
    });

    it("returns null when the star total is unknown", () => {
      expect(overlapShare(repo("owner/repo", 30))).toBeNull();
    });
  });

  describe("compareByRelevance", () => {
    it("ranks a closely related niche repo above a popular one that shares more stargazers", () => {
      // Figures from matsonj/nba-monte-carlo's results
      const popular = repo("hwchase17/langchain", 50, 49946);
      const niche = repo("jwills/dbt-duckdb", 31, 291);

      expect(rank([popular, niche])).toEqual([
        "jwills/dbt-duckdb",
        "hwchase17/langchain",
      ]);
    });

    it("puts repos that cannot be scored last, ordered by shared stargazers", () => {
      const scored = repo("owner/scored", 5, 10000);
      const noTotal = repo("owner/no-total", 40);
      const tooFewShared = repo("owner/too-few-shared", 2, 2);

      expect(rank([tooFewShared, noTotal, scored])).toEqual([
        "owner/scored",
        "owner/no-total",
        "owner/too-few-shared",
      ]);
    });

    it("breaks ties by shared stargazers and then by name", () => {
      // 10 / sqrt(100) and 20 / sqrt(400) both score 1
      const fewerShared = repo("owner/a", 10, 100);
      const moreShared = repo("owner/z", 20, 400);
      const sameAsFewer = repo("owner/b", 10, 100);

      expect(rank([sameAsFewer, fewerShared, moreShared])).toEqual([
        "owner/z",
        "owner/a",
        "owner/b",
      ]);
    });

    it("falls back to shared stargazers when no repo can be scored", () => {
      expect(
        rank([repo("owner/one", 1, 5), repo("owner/two", 2, 5)])
      ).toEqual(["owner/two", "owner/one"]);
    });
  });
});
