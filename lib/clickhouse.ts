import type { DataWindow, RelatedRepo } from "@/types/github";
import { parseGitHubURL } from "@/utils/github";

// The most stargazers of a repository that a query will look at
export const STARGAZER_SAMPLE_LIMIT = 150000;

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

  let havingClause = "HAVING 1=1";
  if (minStargazers) havingClause += ` AND stargazers >= ${minStargazers}`;
  if (minForkers) havingClause += ` AND forkers >= ${minForkers}`;
  if (minRatio) havingClause += ` AND ratio >= ${minRatio}`;

  return `
    WITH source AS (
      SELECT actor_login AS stargazer
      FROM github_events
      WHERE repo_name = '${repoName}' AND event_type = 'WatchEvent'
      GROUP BY 1
      LIMIT ${STARGAZER_SAMPLE_LIMIT}
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
    ORDER BY ${orderBy} DESC, e.repo_name
    LIMIT ${limit}
    OFFSET ${offset}
  `;
};

/**
 * Builds a SQL query that counts the stars each repository received.
 * Counting star events is far cheaper than counting distinct people and
 * differs by only a few percent, which is plenty for ranking.
 * @param {string[]} repoNames - Repositories in "username/repo" format.
 * @returns {string} A SQL query string.
 */
export const buildStarTotalsQuery = (repoNames: string[]): string => {
  const names = repoNames
    .map((name) => `'${name.replace(/\\/g, "\\\\").replace(/'/g, "\\'")}'`)
    .join(", ");

  return `
    SELECT repo_name, count() AS stars
    FROM github_events
    WHERE event_type = 'WatchEvent' AND repo_name IN (${names})
    GROUP BY repo_name
  `;
};

/**
 * Runs a SQL query against ClickHouse.
 * @param {string} query - The SQL query to execute.
 * @returns {Promise<string>} - The tab-separated response body.
 */
const runQuery = async (query: string): Promise<string> => {
  const url = "https://play.clickhouse.com/?user=explorer";
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000); // 30 second timeout

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: query,
      signal: controller.signal,
    });

    if (!response.ok) {
      const responseText = await response.text();
      console.error("ClickHouse error response:", responseText);
      throw new Error(`ClickHouse responded with status: ${response.status}`);
    }

    return await response.text();
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("Request timed out. Please try again.", { cause: error });
    }
    console.error("Error fetching data from ClickHouse:", error);
    throw error;
  } finally {
    clearTimeout(timeout);
  }
};

const parseRows = (text: string): string[][] =>
  text
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((row) => row.split("\t"));

/**
 * Fetches data from ClickHouse using the generated SQL query.
 * @param {string} query - The SQL query to execute.
 * @returns {Promise<RelatedRepo[]>} - The response data as an array of results.
 */
export const fetchDataFromClickHouse = async (
  query: string
): Promise<RelatedRepo[]> => {
  const text = await runQuery(query);

  return parseRows(text).map(
    ([repoName, stargazers, forkers, ratio]) =>
      ({
        repoName,
        githubUrl: `https://github.com/${repoName}`,
        stargazers: parseInt(stargazers, 10),
        forkers: parseInt(forkers, 10),
        ratio: ratio !== "\\N" ? parseFloat(ratio) : null,
      }) as RelatedRepo
  );
};

/**
 * Fetches how many stars each repository received.
 * @param {string[]} repoNames - Repositories in "username/repo" format.
 * @returns {Promise<Map<string, number>>} - Star totals by repository name.
 */
export const fetchStarTotals = async (
  repoNames: string[]
): Promise<Map<string, number>> => {
  if (repoNames.length === 0) return new Map();

  const text = await runQuery(buildStarTotalsQuery(repoNames));

  return new Map(
    parseRows(text).map(([repoName, stars]) => [repoName, parseInt(stars, 10)])
  );
};

/**
 * Fetches the span of time the dataset has stars for.
 * @returns {Promise<DataWindow>} - The first and last day covered.
 */
export const fetchDataWindow = async (): Promise<DataWindow> => {
  const text = await runQuery(`
    SELECT toDate(min(created_at)), toDate(max(created_at))
    FROM github_events
    WHERE event_type = 'WatchEvent'
  `);

  const [[start, end] = []] = parseRows(text);
  if (!start || !end) {
    throw new Error("ClickHouse returned no date range");
  }
  return { start, end };
};
