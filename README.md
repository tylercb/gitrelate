## Getting Started

Install node v22+, bun v1.2+, then install package dependencies:

```bash
bun install
```

Run the development server:

```bash
bun dev
```

Open [http://localhost:5173](http://localhost:5173) with your browser to see the result.

## Deployment

The site is a static single-page app (Vite + React Router) served from Cloudflare Workers static assets. There is no server code: the browser queries ClickHouse directly, and paths like `/org/repo` fall back to `index.html` so the client-side router can handle them. Routing and domains are configured in `wrangler.jsonc`, response headers in `public/_headers`.

Preview the production build locally in the Workers runtime:

```bash
bun run preview
```

Every push to `main` is tested and then deployed by GitHub Actions (`.github/workflows/deploy.yml`). It needs two repository secrets: `CLOUDFLARE_API_TOKEN`, created from Cloudflare's "Edit Cloudflare Workers" token template with both zones included, and `CLOUDFLARE_ACCOUNT_ID`.

To deploy from your machine instead (run `bunx wrangler login` once first):

```bash
bun run deploy
```

## Roadmap

Planned improvements, and what has shipped so far, are tracked in [ROADMAP.md](ROADMAP.md).

## Update node packages

To check for outdated packages:

```bash
bun outdated
```

To update packages:

```bash
bunx npm-check-updates --interactive --format group --packageManager=bun --target minor
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

### Finding friends through counting stars:

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
