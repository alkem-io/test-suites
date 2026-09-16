# Alkemio Open Bug Triage page

**Page:** https://alkem-io.github.io/test-suites/bug-triage/
**Refresh:** every Monday 06:00 UTC by `.github/workflows/bug-triage-refresh.yml`,
or on demand from the Actions tab ("Bug Triage Page Refresh" → Run workflow;
tick *full* to discard the cached state). The "synced" time in the page
eyebrow (UTC) is when the data was pulled; anything opened or closed after
that moment shows up on the next refresh.

## What is here

| File | Role |
|---|---|
| `bug_triage.py` | `sync` fetches issues, per-bug timelines, open PRs, release tags and release stories into a state dir; `build` renders the page; `status` reports the state. Python 3.8+, `gh`, no packages. |
| `config.json` | Repositories to scan, repositories deliberately excluded (with the reason), page URL, schedule. |
| `baseline.json` | Reviewed area + severity per issue (`repo/number` → `{a, s}`) from the first build on 2026-09-16. Rows here override the rules until the issue closes. Edit to override one issue; delete to let the rules decide. |
| `template.html` | The page shell: fonts, light/dark CSS tokens, chart and filter script. `build` fills the `{{...}}` slots. |

State lives on the `gh-pages` branch under `gh-pages-root/bug-triage/state/`
(issues, timelines, releases, stories, open PRs, `meta.json` with the last
sync per repo) so every scheduled run is incremental. `summary.json` next to
the page holds the counts of the last build.

## Which repositories

Only **public** repositories. The page is published on a public GitHub Pages
site, so every issue title and body on it becomes public. The private
repositories — infrastructure-operations, infrastructure-provisioning,
dev-orchestration, reporting-orchestration, platform, organisation,
synapse-migrator, assistant-service, virtual-contributor-engine-libra-flow —
are listed in `config.json` under `excluded` with the reason, and the page
prints that list under Releases and in the footer. Their bugs are tracked on
the delivery board only. (The workflow's `GITHUB_TOKEN` could not read them
anyway.)

## Running it locally

```bash
gh auth status                                      # needs the repo scope
python3 scripts/bug-triage/bug_triage.py sync --full # first time, ~3 min
python3 scripts/bug-triage/bug_triage.py sync        # afterwards, ~45 s
python3 scripts/bug-triage/bug_triage.py build --out /tmp/bug-triage.html
```

State defaults to `~/.local/state/alkemio-bug-triage/`; pass `--state DIR`
or set `ALKEMIO_BUG_TRIAGE_STATE` to change it. Open the built file in a
browser. Nothing is published from a local run.

## What counts as an open bug

An open GitHub issue in any active `alkem-io` repository that is:

- labelled `bug`, or typed *Bug* in GitHub's issue-type field, **or**
- unlabelled but with a title that states a failure (starts with "BUG", or
  says crash, cannot, unable, fails, not working, broken, leak, exception,
  regression, outage), as long as it is not a user story, task or epic.

Excluded: epics, tasks, feature requests, release stories, and issues whose
body says "working as designed" or "not a bug". Pull requests are never
counted.

Issues that were on the page when it was first reviewed (2026-09-16) keep the
area and severity recorded then, until they close. Everything newer follows
the rules below.

## Severity

Derived, not a tracker field. Treat it as a proposal.

| Severity | Rule |
|---|---|
| High | A priority label (`User High Priority`, `Rhea Priority`, `security`), or a title naming a crash, data loss, login, security, leak, outage, or a hard "cannot / unable / fails / broken" failure. |
| Low | Title is about cosmetics: typo, wording, alignment, spacing, colour, font, tooltip, overlap, truncation. |
| Medium | Everything else. |

## Area

Keyword match on the title, first rule wins, in this order: Whiteboards;
Virtual Contributors / AI; Notifications; Chat, comments & messaging;
Licensing & plans; Innovation flow & templates; Callouts, posts &
contributions; Auth, identity & permissions; Community, roles & membership;
Spaces & subspaces; Users & profiles; Organisations; Files, storage &
documents; Calendar & events; Search & navigation; Performance & stability;
API, GraphQL & MCP; Infra, CI & deployment; Test suites & QA; Markdown / rich
text editor; UI, layout & mobile; Localisation & content; Analytics;
Documentation. No match falls back to the repository's home area, then to
"Other / unclassified". Expect a few rows in a neighbouring area.

## Sections

### Totals (top right)
Open bugs by severity and the grand total.

### Where it stands (five tiles)
Each open bug is in exactly one bucket, checked in this order:

| Bucket | Meaning | Source |
|---|---|---|
| Fix PR open | An open pull request cross-references the issue or names it in its title, body or branch. | Issue timeline + open PRs |
| Fix merged, issue still open | A merged PR cross-references the issue but nobody closed it. Review these: partial fix, or just forgotten. | Issue timeline |
| Named in a release story | A `Release NN` / `Patch` story in `alkem-io/alkemio` cross-references the issue. | Issue timeline |
| On the board, no fix yet | Added to the delivery board (projects/50) or a sub-issue of an epic, with none of the above. | Issue timeline |
| No signal anywhere | Not on the board, no PR, no release story, no epic. Nobody has picked it up. | — |

The first tile, **on the delivery board**, is a plain count and overlaps the
buckets. "Planned for Release NN" cannot be shown: that lives in the board's
iteration field and needs a `read:project` token scope the workflow does not have.

### Severity by area / by age / by repository
Triage matrices over the open set. "≤90d" and ">1y" are days since the issue
was opened. "Prod-labelled" counts the `production` label. Click an area or a
repository name to filter the list at the bottom.

### Releases
One row per release story, newest first, last 13 with a ship date.

| Column | Meaning |
|---|---|
| Release | The `Release NN` story in alkem-io/alkemio. "story open" means the issue was never closed. |
| Shipped | The story's "Release date" line, or its close date if there is none. |
| server / client / notif. | Newest non-prerelease tag of that repo published on or before the ship date. |
| Raised / Closed | Bug issues opened or closed between the previous row's ship date and this one, all repositories. A cadence proxy, not the story's declared scope. |

### Over time
- **Opened and closed per month** — last 24 months, by open date and close
  date, every bug-labelled issue plus the open set.
- **Open backlog at month end** — running total of opened minus closed. The
  last point equals today's open total.
- **Time to close** — days from open to close for issues closed in that year;
  median and 90th percentile. A large p90 usually means a bulk clean-up of old
  issues.
- **Raised per quarter by area** — the eight largest areas over eight
  quarters, the rest folded into Other. Closed bugs are classified by the
  keyword rule alone, so read this as a shape, not a count.

### All open bugs
Grouped High → Medium → Low. Columns: repo, number, title (with `prod` and
`no bug label` badges), area, where it stands (the planning chips, each PR or
release story linked), age. Filters: severity, area, repository, age bucket,
flag (production-labelled, no bug label, unassigned), planning bucket, free
text on title or number. `+` expands the issue body inline; links open on
GitHub.

### Footer
Sources, inclusion rule, severity rule, and the snapshot date, for anyone who
lands on the page without this guide.

## Changing the page

Layout and script: `template.html`. Section HTML: `build()` in
`bug_triage.py`; the two must agree on row fields and element ids. To change
how one issue is classified, edit `baseline.json`. To add or drop a
repository, edit `config.json` — and remember the public-site rule above.
Rebuild locally and look at the file once before opening a PR.
