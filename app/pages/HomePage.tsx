import { Link } from "react-router";
import RepoInput from "@/app/components/RepoInput";
import { formatDateRange } from "@/utils/format";
import { useDataWindow } from "@/utils/useDataWindow";
import { useDocumentTitle } from "@/utils/useDocumentTitle";

// The rest of this page's metadata (description, Open Graph, etc.) is static
// and lives in index.html
export default function HomePage() {
  useDocumentTitle("GitRelate(d) - Find Related GitHub Repositories");
  const dataWindow = useDataWindow();

  return (
    <div className="max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold mb-4 text-center">
        Find Related Repositories
      </h2>
      <RepoInput />
      <div className="space-y-4 mt-8">
        <p>
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
          original repo also liked.
        </p>
        <p>
          Results are ranked by relevance, so closely related projects come
          ahead of ones that are simply popular everywhere. They are based on
          GitHub stars given{" "}
          {dataWindow ? formatDateRange(dataWindow) : "in recent years"}, and
          repos with many stargazers can take up to 30 seconds to load. Try{" "}
          <Link to="/mattiasthalen/ducklake" className="underline">
            mattiasthalen/ducklake
          </Link>{" "}
          or{" "}
          <Link to="/matsonj/nba-monte-carlo" className="underline">
            matsonj/nba-monte-carlo
          </Link>
          .
        </p>
        <p>
          This project is open source and available on{" "}
          <a
            href="https://github.com/tylercb/gitrelate"
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
          >
            GitHub
          </a>
          . Contributions and feedback are welcome! Discuss at{" "}
          <a
            href="https://news.ycombinator.com/item?id=42009607"
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
          >
            Hacker News
          </a>
          .
        </p>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Data for this project is sourced from the{" "}
          <a
            href="https://ghe.clickhouse.tech/"
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
          >
            ClickHouse GitHub event dataset
          </a>{" "}
          provided by ClickHouse Inc. and licensed under CC-BY-4.0 or Apache
          2.0.
        </p>
      </div>
    </div>
  );
}
