import type { RelatedRepo } from "@/types/github";

// With fewer shared stargazers than this, a high score is more likely chance
// than a real connection
export const MIN_SHARED_STARGAZERS = 3;

/**
 * Scores how related a repository is to the one being viewed.
 * This is the cosine similarity of the two repositories' stargazers, leaving
 * out the viewed repository's own size because it is the same for every candidate.
 * @param {RelatedRepo} repo - The candidate repository.
 * @returns {number | null} The score, or null if there is too little data to rank it.
 */
export const relevanceScore = (repo: RelatedRepo): number | null => {
  if (!repo.totalStars || repo.stargazers < MIN_SHARED_STARGAZERS) return null;
  return repo.stargazers / Math.sqrt(repo.totalStars);
};

/**
 * Calculates the share of a repository's stargazers who also starred the one being viewed.
 * @param {RelatedRepo} repo - The candidate repository.
 * @returns {number | null} A fraction between 0 and 1, or null if its star total is unknown.
 */
export const overlapShare = (repo: RelatedRepo): number | null => {
  if (!repo.totalStars) return null;
  return repo.stargazers / repo.totalStars;
};

/**
 * Compares two repositories so that the most relevant sorts first.
 * Repositories that cannot be scored come last, ordered by shared stargazers.
 */
export const compareByRelevance = (a: RelatedRepo, b: RelatedRepo): number => {
  const scoreA = relevanceScore(a);
  const scoreB = relevanceScore(b);

  if (scoreA !== null && scoreB !== null && scoreA !== scoreB) {
    return scoreB - scoreA;
  }
  if ((scoreA === null) !== (scoreB === null)) {
    return scoreA === null ? 1 : -1;
  }
  return (
    b.stargazers - a.stargazers || a.repoName.localeCompare(b.repoName)
  );
};
