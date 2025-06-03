/**
 * Parses a GitHub URL path and returns the repository in "username/repo" format.
 * @param {string} url - The GitHub URL to parse.
 * @returns {string | null} The parsed repository name or null if the URL is invalid.
 */
export const parseGitHubURL = (input: string): string | null => {
  try {
    const url = new URL(input);
    if (url.hostname === 'github.com' || url.hostname === 'www.github.com') {
      const pathSegments = url.pathname.split('/').filter(Boolean);
      if (pathSegments.length >= 2) {
        const [owner, repoSegment] = pathSegments;
        const repo = repoSegment.replace(/\.git$/, '');
        return `${owner}/${repo}`;
      }
    }
  } catch {
    // Direct "org/repo" input without full URL
    const match = input.match(/^([^/]+)\/([^/]+)$/);
    if (match) {
      const [, owner, repoSegment] = match;
      const repo = repoSegment.replace(/\.git$/, '');
      return `${owner}/${repo}`;
    }
    return null;
  }
  return null;
};
