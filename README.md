This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

Install node v20+, bun v1.2+, then install package dependencies:

```bash
bun install
```

Run the development server:

```bash
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Environment Variables

Create an `.env` file to set the GitHub token for authenticated API requests (to avoid rate limits):

```
GITHUB_TOKEN=your_github_token_here
```

## Update node packages

To check for outdated packages:

```bash
bun outdated
```

To update packages:

```bash
bunx npm-check-updates --interactive --format group --packageManager=bun --target minor
```

## Folder Structure

```
/gitrelate
  /app
    /[repo]          # Dynamic route for repository-related pages
    /api             # API routes for GitHub API interactions
    /components      # Reusable components for displaying repo data
    /layout.tsx      # Layout with shared elements like header/footer
    /page.tsx        # Home page for inputting GitHub repo URL
  /lib               # Utility functions for GitHub data fetching
  /types             # Type definitions for GitHub API responses
```

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Prompt

```
I'm building a repository discovery tool using Next.js and React Server Components, where users can input a GitHub repository URL to see related repositories. This project uses both the GitHub API and the BigQuery public dataset called GH Archive for accessing GitHub event data. Here are the core requirements and setup:

  1. GitHub API and GH Archive on BigQuery: The tool will use the GitHub API to access real-time stargazers and starred repositories for live data. For deeper analysis and history, the tool will query the GH Archive dataset on Google BigQuery, which is updated hourly, to find repositories with shared stargazers, similar contributions, or overlapping topics.

  2. Technical Requirements:

     a. Built with Next.js (version 15) and React Server Components for optimized server-rendered pages.
     b. The project will use Bun as the runtime environment.
     c. Key components include:
        - A utility function to query the GitHub API and BigQuery dataset.
        - A React Server Component to render the list of related repositories based on data from these sources.
        - An optional API route to handle data fetching logic if needed.

  3. Data Flow:

     a. Users enter a GitHub repository URL, and the tool uses the GitHub API and GH Archive to fetch data.
     b. The React Server Component displays a list of related repositories based on shared stars, topics, or contributions.

  4. Goal: To build a seamless experience for discovering repositories connected by shared interests and contributions, leveraging both live and historical data.

Please help with guidance, example code, or improvements for using GitHub's API and BigQuery in this setup, especially focusing on optimal data fetching patterns, performance considerations, and any best practices for handling rate limits with the GitHub API.
```

## GitHub Event Type:

[WatchEvent](https://docs.github.com/en/rest/using-the-rest-api/github-event-types?apiVersion=2022-11-28#watchevent) - when someone stars a repository. The type of activity is specified in the action property of the payload object. For more information, see "REST API endpoints for activity."

The event object includes properties that are common for all events. Each event object includes a payload property and the value is unique to each event type. The payload object for this event is described below.

## GitHub List stargazers

When requesting a [list of stargazers](https://docs.github.com/en/rest/activity/starring?apiVersion=2022-11-28#list-stargazers), you can set a custom media type to find out when each user starred your repo.

`application/vnd.github.star+json` - Includes a timestamp of when the star was created.

## ClickHouse

[GitHub Events](https://ghe.clickhouse.tech/) - ClickHouse dataset for GitHub events from GH Archive.

### Repository affinity list:

What are the top repositories sorted by the number of stars from people who starred the ClickHouse repository?

```sql
SELECT
    repo_name,
    count() AS stars
FROM github_events
WHERE (event_type = 'WatchEvent') AND (actor_login IN
(
    SELECT actor_login
    FROM github_events
    WHERE (event_type = 'WatchEvent') AND (repo_name IN ('ClickHouse/ClickHouse', 'yandex/ClickHouse'))
)) AND (repo_name NOT IN ('ClickHouse/ClickHouse', 'yandex/ClickHouse'))
GROUP BY repo_name
ORDER BY stars DESC
LIMIT 50
```

Let's calculate the affinity index: the ratio of stars to repositories that were given by users that gave a star to ClickHouse.

```sql
SELECT
    repo_name,
    uniq(actor_login) AS total_stars,
    uniqIf(actor_login, actor_login IN
    (
        SELECT actor_login
        FROM github_events
        WHERE (event_type = 'WatchEvent') AND (repo_name IN ('ClickHouse/ClickHouse', 'yandex/ClickHouse'))
    )) AS clickhouse_stars,
    round(clickhouse_stars / total_stars, 2) AS ratio
FROM github_events
WHERE (event_type = 'WatchEvent') AND (repo_name NOT IN ('ClickHouse/ClickHouse', 'yandex/ClickHouse'))
GROUP BY repo_name
HAVING total_stars >= 100
ORDER BY ratio DESC
LIMIT 50
```

This is the perfect exploration tool for related repositories!

### Finding friends through county stars:

Let me find a friend by the intersection on starred repositories.

```sql
WITH repo_name IN
    (
        SELECT repo_name
        FROM github_events
        WHERE (event_type = 'WatchEvent') AND (actor_login IN ('alexey-milovidov'))
    ) AS is_my_repo
SELECT
    actor_login,
    sum(is_my_repo) AS stars_my,
    sum(NOT is_my_repo) AS stars_other,
    round(stars_my / (203 + stars_other), 3) AS ratio
FROM github_events
WHERE event_type = 'WatchEvent'
GROUP BY actor_login
ORDER BY ratio DESC
LIMIT 50
```

### Affinity by issues and PRs

Authors that contributed to ClickHouse also contributed to what repositories?

```sql
SELECT
    repo_name,
    count() AS prs,
    uniq(actor_login) AS authors
FROM github_events
WHERE (event_type = 'PullRequestEvent') AND (action = 'opened') AND (actor_login IN
(
    SELECT actor_login
    FROM github_events
    WHERE (event_type = 'PullRequestEvent') AND (action = 'opened') AND (repo_name IN ('yandex/ClickHouse', 'ClickHouse/ClickHouse'))
)) AND (repo_name NOT ILIKE '%ClickHouse%')
GROUP BY repo_name
ORDER BY authors DESC
LIMIT 50
```

Authors that filed an issue in ClickHouse also filed issues in what repositories?

```sql
SELECT
    repo_name,
    count() AS prs,
    uniq(actor_login) AS authors
FROM github_events
WHERE (event_type = 'IssuesEvent') AND (action = 'opened') AND (actor_login IN
(
    SELECT actor_login
    FROM github_events
    WHERE (event_type = 'IssuesEvent') AND (action = 'opened') AND (repo_name IN ('yandex/ClickHouse', 'ClickHouse/ClickHouse'))
)) AND (repo_name NOT ILIKE '%ClickHouse%')
GROUP BY repo_name
ORDER BY authors DESC
LIMIT 50
```

Let's check the proportion of stars to forks.

```sql
SELECT
    repo_name,
    sum(event_type = 'ForkEvent') AS forks,
    sum(event_type = 'WatchEvent') AS stars,
    round(stars / forks, 3) AS ratio
FROM github_events
WHERE event_type IN ('ForkEvent', 'WatchEvent')
GROUP BY repo_name
ORDER BY forks DESC
LIMIT 50
```

## ClickHouse Demo Access

Connect with clickhouse-client:

```bash
clickhouse-client --secure --host play.clickhouse.com --user explorer
```

HTTPS interface: https://play.clickhouse.com/ (port 443)

Minimal web UI: https://play.clickhouse.com/play?user=play

Keep in mind that this dataset is actually very small for ClickHouse. There are multiple companies that use distributed multi-petabyte ClickHouse setups for various heavy duty tasks, e.g. to analyze a significant share of all internet traffic in real time. This article is not intended to advertise ClickHouse, but at least now you know where to look.

## ClickHouse Sharing the results

We encourage you to create your own research and tools based on the dataset. This article is open-source and the content is available under the CC-BY-4.0 license or Apache 2 license. Attribution is required. You can propose changes, extend the article, and share ideas by pull requests and issues on GitHub repository. Please notify us about interesting usages of the dataset. We also encourage the application of the dataset for DBMS benchmarks.

If you need to cite this article, please do it as follows:
`"Milovidov A., 2020. Everything You Ever Wanted To Know About GitHub (But Were Afraid To Ask), https://ghe.clickhouse.tech/"`

The authors don't own any rights to the dataset. The dataset includes material that may be subject to third party rights. The query results from the dataset are published under section 107 of the Copyright Act of 1976; allowance is made for "fair use" for purposes such as criticism, comment, news reporting, teaching, scholarship, education and research. Fair use is a use permitted by copyright statute that might otherwise be infringing.
