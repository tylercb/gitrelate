import type { Metadata } from "next";
import Link from "next/link";
import { Providers } from "@/app/providers";
import { ThemeToggle } from "@/app/components/ThemeToggle";
import "./globals.css";

export const metadata: Metadata = {
  title: "GitRelate(d) - Find Related Repositories",
  description: "Find related repositories on GitHub",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="flex flex-col min-h-screen">
        <Providers>
          <header className="bg-gray-100 dark:bg-gray-800 py-4">
            <div className="container mx-auto px-4">
              <h1 className="text-2xl md:text-3xl font-bold text-center my-0">
                <Link className="hover:underline text-gray-800 dark:text-gray-200" href="/">GitRelate(d)</Link>
              </h1>
            </div>
          </header>
          <main className="flex-grow container mx-auto px-4 py-8">{children}</main>
          <footer className="bg-gray-100 dark:bg-gray-800 py-4 text-sm">
            <div className="container mx-auto px-4">
              <div className="flex items-center justify-center gap-4 mb-4">
                <p>© 2024 GitRelate(d)</p>
              </div>
              <p className="max-w-2xl mx-auto text-center">
                Data sourced from the ClickHouse GitHub event dataset. Research based on{' '}
                <a
                  href="https://ghe.clickhouse.tech/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline"
                >
                  &quot;Everything You Ever Wanted To Know About GitHub (But Were Afraid To Ask)&quot;
                </a>
                , by Alexey Milovidov, 2020. Licensed under CC-BY-4.0 or Apache 2.0 with attribution required.
              </p>
              <div className="max-w-md mx-auto text-center">
                <ThemeToggle />
              </div>
            </div>
          </footer>
        </Providers>
      </body>
    </html>
  );
}
