import type { RepoDetails as RepoDetailsData } from "@/types/github";
import { linkableHost } from "@/utils/format";
import { cn } from "@/utils/style";

// Enough to show what a repo is about without the list taking over
const MAX_TOPICS = 8;

export default function RepoDetails({
  details,
  githubUrl,
  centered = false,
}: {
  details: RepoDetailsData;
  // Adds a link to the repo, for use where its name is not already one
  githubUrl?: string;
  centered?: boolean;
}) {
  const homepageHost = linkableHost(details.homepage);

  return (
    <div className={cn("space-y-2", centered && "text-center")}>
      {details.description && (
        <p className="text-gray-900 dark:text-gray-100">
          {details.description}
        </p>
      )}
      <p
        className={cn(
          "flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-gray-600 dark:text-gray-400",
          centered && "justify-center"
        )}
      >
        <span>⭐ {details.stars.toLocaleString()} stars on GitHub</span>
        {details.language && <span>{details.language}</span>}
        {details.archived && <span>Archived</span>}
        {homepageHost && details.homepage && (
          <a
            href={details.homepage}
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
          >
            {homepageHost}
          </a>
        )}
        {githubUrl && (
          <a
            href={githubUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
          >
            View on GitHub
          </a>
        )}
      </p>
      {details.topics.length > 0 && (
        <ul
          aria-label="Topics"
          className={cn(
            "flex flex-wrap gap-1 text-xs",
            centered && "justify-center"
          )}
        >
          {details.topics.slice(0, MAX_TOPICS).map((topic) => (
            <li
              key={topic}
              className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300"
            >
              {topic}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
