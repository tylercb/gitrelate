import { describe, expect, it } from "vitest";
import { generateMetadata } from "./page";

describe("RepoPage", () => {
  describe("generateMetadata", () => {
    it("generates correct metadata for repository", async () => {
      const params = Promise.resolve({ org: "facebook", repo: "react" });

      const metadata = await generateMetadata({ params });

      expect(metadata).toEqual({
        title: "facebook/react Related Repos - GitRelate(d)",
      });
    });

    it("generates metadata for different repository names", async () => {
      const testCases = [
        {
          org: "microsoft",
          repo: "typescript",
          expected: "microsoft/typescript Related Repos - GitRelate(d)",
        },
        {
          org: "vercel",
          repo: "next.js",
          expected: "vercel/next.js Related Repos - GitRelate(d)",
        },
        {
          org: "nodejs",
          repo: "node",
          expected: "nodejs/node Related Repos - GitRelate(d)",
        },
        {
          org: "facebook",
          repo: "react-native",
          expected: "facebook/react-native Related Repos - GitRelate(d)",
        },
      ];

      for (const { org, repo, expected } of testCases) {
        const params = Promise.resolve({ org, repo });
        const metadata = await generateMetadata({ params });

        expect(metadata).toEqual({
          title: expected,
        });
      }
    });

    it("handles special characters in repository names", async () => {
      const params = Promise.resolve({
        org: "user",
        repo: "repo-with-special.chars_123",
      });

      const metadata = await generateMetadata({ params });

      expect(metadata).toEqual({
        title: "user/repo-with-special.chars_123 Related Repos - GitRelate(d)",
      });
    });

    it("handles repository names with dots", async () => {
      const params = Promise.resolve({ org: "vercel", repo: "next.js" });

      const metadata = await generateMetadata({ params });

      expect(metadata).toEqual({
        title: "vercel/next.js Related Repos - GitRelate(d)",
      });
    });

    it("handles repository names with underscores and hyphens", async () => {
      const params = Promise.resolve({ org: "some-org", repo: "my_repo" });

      const metadata = await generateMetadata({ params });

      expect(metadata).toEqual({
        title: "some-org/my_repo Related Repos - GitRelate(d)",
      });
    });

    it("handles long repository names", async () => {
      const params = Promise.resolve({
        org: "organization-with-long-name",
        repo: "repository-with-very-long-name-containing-multiple-words",
      });

      const metadata = await generateMetadata({ params });

      expect(metadata).toEqual({
        title:
          "organization-with-long-name/repository-with-very-long-name-containing-multiple-words Related Repos - GitRelate(d)",
      });
    });
  });
});
