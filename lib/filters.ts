import type { RelatedRepo } from "@/types/github";

export interface RepoFilterOptions {
  // Text the repository's name has to contain
  query: string;
  // Hides repositories that belong to this owner
  hideOwner: string | null;
  // Hides curated "awesome" lists
  hideAwesome: boolean;
}

/**
 * Narrows a list of repositories down to the ones that pass every active filter.
 * Matching ignores letter case.
 * @param {RelatedRepo[]} repos - The repositories to filter.
 * @param {RepoFilterOptions} options - The filters to apply.
 * @returns {RelatedRepo[]} The repositories that are left, in their original order.
 */
export const filterRepos = (
  repos: RelatedRepo[],
  { query, hideOwner, hideAwesome }: RepoFilterOptions
): RelatedRepo[] => {
  const text = query.trim().toLowerCase();
  const ownerPrefix = hideOwner ? `${hideOwner.toLowerCase()}/` : null;

  if (!text && !ownerPrefix && !hideAwesome) return repos;

  return repos.filter((repo) => {
    const name = repo.repoName.toLowerCase();

    if (text && !name.includes(text)) return false;
    if (ownerPrefix && name.startsWith(ownerPrefix)) return false;
    if (hideAwesome && name.includes("awesome")) return false;
    return true;
  });
};
