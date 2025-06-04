import Link from "next/link";
import RepoInput from "@/app/components/RepoInput";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "GitRelate(d) - Find Related GitHub Repositories",
  description:
    "Discover GitHub repositories related to any repo based on users who starred them. Replace github.com with gitrelate.com in any repository URL to find similar projects and explore new tools.",
  keywords: [
    "github",
    "repositories",
    "related repos",
    "github discovery",
    "open source",
    "code discovery",
    "developer tools",
  ],
  alternates: {
    canonical: "https://gitrelated.com/",
  },
  openGraph: {
    title: "GitRelate(d) - Find Related GitHub Repositories",
    description:
      "Discover GitHub repositories related to any repo based on users who starred them. Replace github.com with gitrelate.com to find similar projects.",
    url: "https://gitrelated.com/",
    siteName: "GitRelate(d)",
    type: "website",
    locale: "en_US",
    images: [
      {
        url: "https://opengraph.githubassets.com/e77a7573cf968b6970ec190e2284ed4e6bd8211dc918487aec0ab1ae717f189a/tylercb/gitrelate",
        width: 1200,
        height: 600,
        alt: "GitRelate(d) - Find Related GitHub Repositories",
      },
    ],
  },
  twitter: {
    card: "summary",
    title: "GitRelate(d) - Find Related GitHub Repositories",
    description:
      "Discover GitHub repositories related to any repo based on users who starred them. Replace github.com with gitrelate.com to find similar projects.",
    creator: "@tylerhanway",
  },
  robots: {
    index: true,
    follow: false,
  },
};

export default function HomePage() {
  return (
    <div className="max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold mb-4 text-center">
        Find Related Repositories
      </h2>
      <RepoInput />
      <p className="mt-8">
        Just replace{" "}
        <span className="font-mono text-gray-600 dark:text-gray-400">
          github.com
        </span>{" "}
        in any repo&apos;s URL with{" "}
        <span className="font-mono text-gray-600 dark:text-gray-400">
          gitrelate.com
        </span>{" "}
        or{" "}
        <span className="font-mono text-gray-600 dark:text-gray-400">
          gitrelated.com
        </span>
        , and you can see other repositories that people who starred the
        original repo also liked. Works best with obscure niches with ~100
        stargazers. Lots of noise when you lookup{" "}
        <Link href="/facebook/react-native" className="underline">
          facebook/react-native
        </Link>
        .
      </p>
      <p className="mt-8">
        Discuss at{" "}
        <Link
          href="https://news.ycombinator.com/item?id=42009607"
          target="_blank"
          rel="noopener noreferrer"
          className="underline"
        >
          Hacker News
        </Link>
        .
      </p>
      <p className="mt-8 text-sm text-gray-600 dark:text-gray-400">
        Data for this project is sourced from the{" "}
        <a
          href="https://ghe.clickhouse.tech/"
          target="_blank"
          rel="noopener noreferrer"
          className="underline"
        >
          ClickHouse GitHub event dataset
        </a>{" "}
        provided by ClickHouse Inc. and licensed under CC-BY-4.0 or Apache 2.0.
      </p>
    </div>
  );
}
