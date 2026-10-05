# Roadmap

Planned improvements to how GitRelate(d) helps people find related repositories, in the order they are likely to be built.

**Tracking progress:** tick an item off in the same pull request that ships it, and move a phase's heading to "done" once every item in it is ticked. Add new ideas to the phase they fit, or to "Not planned" with the reason.

## Ground rules

Every item has to hold to these. They are why some ideas sit under "Not planned".

- **No server.** The site stays static on Cloudflare, with no Worker code and no storage. That keeps hosting free and unmetered.
- **No slower.** First results should not take noticeably longer to appear, and the JavaScript should stay close to its current size (about 110 KB gzipped).
- **Free data only.** Everything comes from sources the browser can already reach: the public ClickHouse playground, and GitHub's API within its limit of 60 requests an hour per visitor without a token.

## Phase 1: relevant and honest results (done)

- [x] **Rank by relevance by default.** Results used to be ordered by shared stargazers alone, which mostly surfaced whatever is popular everywhere. They are now ordered by shared stargazers divided by the square root of the candidate's own stars, with "most shared stars" kept as an alternative sort.
- [x] **Fetch every result in one query.** The first query returns up to 1,000 results, so "Show More" and sorting no longer hit ClickHouse again, and results can no longer repeat between pages.
- [x] **Accurate labels.** The star and fork columns are shared counts and are labelled that way. The repo being viewed moved out of its own results into a summary line, and a new column shows the overlap as a share of each repo's stargazers.
- [x] **State the data window.** The summary and the empty state say which dates the star data covers.

## Phase 2: an easier list to work through (done)

- [x] **Filters.** A text filter on repo name, plus toggles to hide repos from the same owner and "awesome" lists. Same-owner repos can dominate: 10 of the top 12 results for `charmbracelet/bubbletea` are charmbracelet's own.
- [x] **Repo details on demand.** Description, language, star count and topics for the repo being viewed, and for a result when its row is opened. These come from GitHub's API, are cached in the browser for a week, and are simply left out once the hourly limit is reached.
- [x] **Match repo names regardless of letter case.** `clickhouse/clickhouse` used to find nothing because ClickHouse only knows `ClickHouse/ClickHouse`. When a name finds nothing, the page now moves to the name as GitHub spells it, which also follows renamed repos.
- [x] **A better wait for large repos.** After three seconds the page says how long the search has been running and offers a cancel button. Queries are cancelled when the visitor navigates away.
- [x] **Mobile layout.** On a phone the table shows the repo, shared stars and overlap, and no longer scrolls sideways.
- [x] **Keyboard-accessible sorting.** Column headers are real buttons that report the current sort to screen readers.
- [x] **Refresh the home page copy.** It now says results are ranked by relevance and which dates the data covers.

## Phase 3: new ways to discover (next)

- [ ] **Combine repos.** Show what people who starred both A and B also starred. The second repo must go in a query parameter, because the path has to keep mirroring GitHub's URLs.
- [ ] **Recency lens.** Limit results to what these stargazers starred in the last 12 months, to show what this audience is into now.
- [ ] **Recent searches.** Remember the visitor's recent repos in the browser and offer them on the home page.
- [ ] **Bookmarklet.** A bookmark that swaps `github.com` for `gitrelated.com` on the page being viewed, so finding related repos takes one click.
- [ ] **Copy as Markdown.** Copy the visible results as a list of links.
- [ ] **Shareable views.** Keep the sort and filters in the URL so a view can be linked to.
- [ ] **A better home page example.** `mattiasthalen/ducklake` is suggested on the home page but has a single stargazer in the data window, so it shows almost nothing.

## Not planned

| Idea | Why not |
| --- | --- |
| A link preview per repo page | Needs Worker code to rewrite the page for each request. |
| A cache of results shared between visitors | Needs Worker code and storage. |
| Descriptions on every result row | 1,000 rows is far beyond GitHub's 60 requests an hour. It would work for visitors who supply their own GitHub token, which could be revisited now that details load on demand. |

## Notes for whoever builds these

Measured in October 2026 against the ClickHouse playground:

- **The star data runs from January 2023 to July 2026.** Older stars are missing, so long-established repos look smaller than they are.
- **`github_events` is sorted by event type, repo name, then time.** Looking up named repos is cheap. The table has no descriptions, languages or topics.
- **The `repos` table is a 2022 snapshot.** It listed `duckdb/duckdb` at 4,621 stars against about 42,000 on GitHub, and knew only 66 of 300 related repos in one test. Do not build on it.
- **The star-totals lookup is the cost of relevance ranking.** For 1,000 candidates it took between 0.1 and 4 seconds, varying from run to run. Totals are cached in the browser for a week and shared between searches, because the same very popular repos turn up in almost every result set.
- **Relevance was checked on three repos** (`matsonj/nba-monte-carlo`, `duckdb/duckdb`, `charmbracelet/bubbletea`). In each, the top results went from mostly unrelated popular projects to almost entirely on-topic ones.
- **GitHub's social preview images are not a usable source of repo details.** The image endpoint rate-limits quickly.
- **GitHub's API ignores letter case in repo names** and answers with the canonical spelling. A request for a repo that does not exist still counts against the hourly limit.
- **The playground allows a query 60 seconds.** The site gives up after 30.
