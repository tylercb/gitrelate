import { ThemeToggle } from "@/app/components/ThemeToggle";

export default function Footer() {
  return (
    <footer className="bg-gray-100 dark:bg-gray-800 py-4 text-sm">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-center gap-4 mb-4">
          <p>
            GitRelate(d) created by{" "}
            <a
              href="https://github.com/tylercb"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-gray-600 dark:hover:text-gray-300"
            >
              @tylercb
            </a>{" "}
            •{" "}
            <a
              href="https://x.com/tylerhanway"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-gray-600 dark:hover:text-gray-300"
            >
              @tylerhanway
            </a>
          </p>
        </div>
        <p className="max-w-2xl mx-auto text-center">
          Data sourced from the ClickHouse GitHub event dataset. Research based
          on{" "}
          <a
            href="https://ghe.clickhouse.tech/"
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
          >
            &quot;Everything You Ever Wanted To Know About GitHub (But Were
            Afraid To Ask)&quot;
          </a>
          , by Alexey Milovidov, 2020. Licensed under CC-BY-4.0 or Apache 2.0
          with attribution required.
        </p>
        <p className="max-w-2xl mx-auto text-center mt-4 text-xs text-gray-600 dark:text-gray-400">
          This dataset includes material that may be subject to third party
          rights. Query results are published under section 107 of the Copyright
          Act of 1976; allowance is made for &quot;fair use&quot; for purposes
          such as criticism, comment, news reporting, teaching, scholarship,
          education and research. This website does not use cookies or
          analytics.
        </p>
        <div className="max-w-md mx-auto text-center mt-4">
          <ThemeToggle />
        </div>
      </div>
    </footer>
  );
}
