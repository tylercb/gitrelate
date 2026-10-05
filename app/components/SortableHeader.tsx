import type { ReactNode } from "react";
import { ArrowUpDown } from "lucide-react";
import { cn } from "@/utils/style";

export default function SortableHeader({
  children,
  sort,
  onSort,
  title,
  className,
}: {
  children: ReactNode;
  // How the table is currently sorted by this column, for screen readers
  sort: "ascending" | "descending" | "none";
  onSort: () => void;
  title?: string;
  className?: string;
}) {
  return (
    <th
      scope="col"
      aria-sort={sort}
      title={title}
      className={cn("px-2 py-3 sm:px-6 sm:whitespace-nowrap", className)}
    >
      <button
        type="button"
        onClick={onSort}
        className="inline-flex items-center uppercase text-left rounded hover:text-gray-900 dark:hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
      >
        {children}
        {/* Left out on small screens to leave more room for repo names */}
        <ArrowUpDown
          className="hidden sm:inline ml-1 shrink-0"
          size={14}
          aria-hidden
        />
      </button>
    </th>
  );
}
