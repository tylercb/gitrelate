import { parseGitHubURL } from '@/utils/github';
import type { RelatedRepo } from '@/types/github';

/**
 * Builds a SQL query to retrieve data for a GitHub repository's related repositories.
 * @param {string} repoInput - The GitHub URL or repo name to parse.
 * @param {number} limit - The max number of results.
 * @param {string} orderBy - Column to order results by.
 * @param {number} minStargazers - Minimum stargazers for inclusion.
 * @param {number} minForkers - Minimum forkers for inclusion.
 * @param {number} minRatio - Minimum star-to-fork ratio.
 * @param {number} offset - The number of results to skip.
 * @returns {string | null} A SQL query string or null if the input is invalid.
 */
export const buildQuery = (
  repoInput: string,
  limit: number,
  orderBy: string,
  minStargazers: number,
  minForkers: number,
  minRatio: number,
  offset: number = 0
): string | null => {
  const repoName = parseGitHubURL(repoInput);
  if (!repoName) return null;

  let havingClause = 'HAVING 1=1';
  if (minStargazers) havingClause += ` AND stargazers >= ${minStargazers}`;
  if (minForkers) havingClause += ` AND forkers >= ${minForkers}`;
  if (minRatio) havingClause += ` AND ratio >= ${minRatio}`;

  return `
    WITH source AS (
      SELECT actor_login AS stargazer
      FROM github_events
      WHERE repo_name = '${repoName}' AND event_type = 'WatchEvent'
      GROUP BY 1
    )
    SELECT
      e.repo_name,
      count(DISTINCT(if(event_type = 'WatchEvent', e.actor_login, null))) as stargazers,
      count(DISTINCT(if(event_type = 'ForkEvent', e.actor_login, null))) as forkers,
      round(if(forkers = 0, null, stargazers / forkers), 2) AS ratio
    FROM github_events e
    JOIN source s ON e.actor_login = s.stargazer
    WHERE e.event_type IN ('ForkEvent', 'WatchEvent')
    GROUP BY e.repo_name
    ${havingClause}
    ORDER BY ${orderBy} DESC
    LIMIT ${limit}
    OFFSET ${offset}
  `;
};

/**
 * Fetches data from ClickHouse using the generated SQL query.
 * @param {string} query - The SQL query to execute.
 * @returns {Promise<any[]>} - The response data as an array of results.
 */
export const fetchDataFromClickHouse = async (query: string): Promise<RelatedRepo[]> => {
  const url = 'https://play.clickhouse.com/?user=explorer';

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: query,
    });

    if (!response.ok) {
      const responseText = await response.text();
      console.error('ClickHouse error response:', responseText);
      throw new Error(`ClickHouse responded with status: ${response.status}`);
    }

    const text = await response.text();
    return text
      .trim()
      .split('\n')
      .map((row: string) => {
        const [repoName, stargazers, forkers, ratio] = row.split('\t');
        return {
          repoName,
          githubUrl: `https://github.com/${repoName}`,
          stargazers: parseInt(stargazers, 10),
          forkers: parseInt(forkers, 10),
          ratio: ratio !== '\\N' ? parseFloat(ratio) : null,
        } as RelatedRepo;
      });
  } catch (error) {
    console.error('Error fetching data from ClickHouse:', error);
    throw error;
  }
};
