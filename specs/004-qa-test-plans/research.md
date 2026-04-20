# Research: QA Test Plan Management System

Phase 0 output. Resolves the open technical questions raised in `plan.md`'s Technical Context.

---

## R1: How is the `@testCase` tag parsed from TypeScript test sources?

**Decision**: Regex scan over the raw source text of `*.it-spec.ts` and `*.spec.ts` files. Parse the first JSDoc-style comment (or single-line `//` comment) immediately preceding any `describe(`, `it(`, or `test(` call. Extract every `@testCase` directive and collect comma-separated or whitespace-separated `TC-###` IDs that follow.

**Grammar** (normative form lives in `contracts/tag-format.md`):

```
tagDirective  := "@testCase" whitespace idList
idList        := id (separator id)*
separator     := "," whitespace? | whitespace
id            := "TC-" digit+
```

**Rationale**: A TypeScript AST parse (e.g. `ts-morph`) would be strictly more correct but is overkill — the tags live in comments, not in code, and ts-morph would re-parse every test file on every sync run (slow and memory-hungry on a few thousand files). A well-targeted regex scan over raw file text completes in well under a second for the current repo size. Comment syntax is standardized; false positives (e.g. a literal `"@testCase TC-1"` inside a string) are acceptable noise the validator will either attribute correctly or flag as a defect.

**Alternatives considered**:
- *`ts-morph`-based AST walk*: rejected on performance grounds; no meaningful accuracy benefit given the tag lives in comments.
- *ESLint custom rule*: rejected — would couple sync logic to per-package lint configs (one flat-config 9.x, one legacy), and moves orphan-detection into lint errors rather than dashboard surfacing.
- *Source-code attribute (e.g. `describe.meta({ testCase: 'TC-1' }, ...)`)*: rejected — requires a wrapper API, friction on every test author, not a "lightweight tag" per FR-013.

---

## R2: How do we reliably obtain automated execution outcomes per test file?

**Decision**: Configure Vitest's JSON reporter alongside its HTML reporter for the nightly server-api run. Persist `server-api/test-results/nightly.json` as an additional artifact. The CLI's `join/outcomes.ts` reads that JSON, indexes results by file path, and joins against the tagged test cases.

```ts
// server-api/vitest.config.ts (addition, conceptual — actual config belongs in task T-###)
reporters: ['html', 'json']
outputFile: {
  html: './html-report/index.html',
  json: './test-results/nightly.json',
}
```

**Rationale**: Vitest's built-in JSON reporter emits per-file and per-test status, duration, and error details — exactly what the sync needs. No HTML scraping. This extends the existing report flow from spec 003 with a single additional output. For client-web (Playwright), use `reporter: 'json'` alongside the existing HTML reporter; same pattern.

**Alternatives considered**:
- *Parse the HTML report*: rejected — HTML layout is not a stable contract.
- *Re-run tests from the sync job*: rejected — duplicates expensive work the nightly already did; unstable re-runs would give wrong answers.
- *Rely only on exit code*: rejected — insufficient granularity (can't determine per-test outcomes from a single exit code).

---

## R3: Where do bot-owned run JSON files live, and how do they accumulate over time?

**Decision**: Bot-owned run summaries are written to the `gh-pages` branch under `gh-pages-root/test-plans/runs/<suite>/<date>.json`, alongside the dashboard it feeds. The sync workflow checks out `gh-pages`, writes the new run file, re-renders the dashboard, and commits the whole set in one push. The working branch (`develop`, PR branches) never contains run JSON.

**Rationale**: Spec FR-017 mandates the bot MUST NOT commit to human-owned files, and the simplest way to enforce that is a *different branch*. `gh-pages` is already the bot-owned publishing surface in this repo (precedent: spec 003's nightly reports). This means human PRs never review run JSON, and the sync job never triggers noisy diffs on developer PRs. Retention policy inherits whatever `cleanup-old-playwright-reports.yml` already does for the `gh-pages` history.

**Alternatives considered**:
- *Bot commits to `develop` under `test-plans/runs/`*: rejected — creates non-review-worthy noise on every nightly, conflicts with the repo's existing pre-commit + lint-staged flow.
- *GitHub Actions workflow artifacts*: rejected — artifacts have a configurable but finite retention (default 90 days) and are not browsable by stakeholders.
- *A separate, new repo for runs*: rejected — violates the "no new infra" constraint.

---

## R4: How do we render the dashboard without dragging in a full SSG?

**Decision**: Use plain EJS templates + `markdown-it` for body content + a single hand-written stylesheet. Output ~4 HTML pages (landing, per-release, per-feature, defects) written directly to the `gh-pages` working tree. No client-side routing, no hydration, no build-time frameworks.

**Rationale**: The dashboard is deeply structured but not interactive. A server-rendered static site keeps the implementation under 1500 LOC and produces files a CDN (or GitHub Pages) can serve with no runtime. EJS is 10 years stable, zero-config, and ships a templating model a QA engineer can read.

**Alternatives considered**:
- *Astro or 11ty*: rejected — both bring legitimate capability but also bring plugin ecosystems, config files, and an upgrade treadmill we don't need for a static 4-page dashboard.
- *Single-page React/Vue app*: rejected — much more code, and hydration against fresh data means either a runtime API (new infra) or stale builds.
- *Jekyll on GitHub Pages directly*: rejected — ties the dashboard to GitHub's Jekyll runtime, harder to preview locally, and adds Ruby as a second runtime.

---

## R5: How do we enrich cross-repo `alkem-io/*#N` links with title and state?

**Decision**: Use `@octokit/rest` + `@octokit/plugin-throttling` with the workflow-scoped `GITHUB_TOKEN`. Issue a single request per unique link per build pass, caching results in-memory for the build. On 404 / 403 / rate-limit, fall back to rendering the link as a plain `org/repo#N` anchor without enrichment — never fail the build.

**Scope limit**: Only links written as the shorthand `alkem-io/<repo>#<number>` (or `<org>/<repo>#<number>` where org matches an allowlist) are enrichment candidates. Arbitrary URLs pass through as-is.

**Rate-limit budget**: ~500 unique links per build is the plausible upper bound; well below the 5000/hour authenticated limit. Throttling plugin handles secondary rate-limit responses with automatic retry.

**Rationale**: Enrichment is a nicety, not a correctness concern — the forward link already works via `org/repo#N` auto-linking on GitHub itself. A graceful-degrade path means token availability, private-repo access, and rate-limit transients are non-blockers.

**Alternatives considered**:
- *GraphQL API*: rejected — REST suffices for individual issue lookups; GraphQL complexity not warranted for a single endpoint pattern.
- *Fetch during dashboard browsing (client-side)*: rejected — moves a token to the client OR requires no-auth anonymous calls (stricter rate limit, leaks repo names in requests).

---

## R6: How does the CLI integrate with the existing GitHub Actions flow?

**Decision**: Create a new workflow `.github/workflows/test-plans-sync.yml` with three triggers:

1. `workflow_run` on successful completion of `nightly-server-tests.yml` and (later) `nightly-client-tests.yml` — picks up the freshly-produced run JSON.
2. `push` to `develop` — re-renders the dashboard after a content edit lands, without re-running tests.
3. `workflow_dispatch` — manual rebuild.

The workflow checks out both `develop` (for content + CLI source) and `gh-pages` (for previous runs + publishing target), runs `pnpm --filter @alkemio/test-plans run build`, and reuses `deploy-github-pages.yml` for the push step.

**Rationale**: Decoupling the sync from the test runs themselves keeps nightly-server-tests.yml focused and lets content-only edits publish within minutes without spinning up the test runner. The `workflow_run` trigger chains naturally once nightly finishes.

**Alternatives considered**:
- *Embed sync + publish inside `nightly-server-tests.yml`*: rejected — conflates test execution with reporting, and forces every content-only edit to wait for the next nightly cron.
- *Git hook (post-merge)*: rejected — runs on developer machines, not CI; unreliable.

---

## R7: Idempotency strategy for the sync + publish step

**Decision**: Each sync produces a deterministic output given the same inputs. Specifically:

- Run JSON file name is `<date>.json` (not timestamped with second-granularity) — second run same day overwrites in place, not appends. An internal `runs` array inside the JSON keeps per-run-of-day history via `github.run_id`, so no data is lost.
- Dashboard HTML files are written as fixed names (`index.html`, `releases/R31.html`, etc.) — overwrites in place.
- The commit message on `gh-pages` is `test-plans: sync <date> run <run_id>`; same run_id twice produces an empty diff and the workflow's `git commit` step is configured with `--allow-empty=false` so the push is skipped rather than adding a no-op commit.

**Rationale**: FR-016 and SC-006 mandate zero net change on a re-run. Deterministic file names + content-derived diffs make this trivial; we avoid any timestamp-bearing content in the rendered output (timestamps come from the run JSON, which is keyed by date, not by render time).

**Alternatives considered**:
- *Content hash in the file name*: rejected — breaks stable URLs that stakeholders would bookmark.
- *Skip publish if `git status` is clean*: accepted as a secondary guard, not the primary mechanism.

---

## R8: Feature library markdown structure — one case per `##` section, or front-matter-only?

**Decision**: A feature library file has a top-level YAML front-matter block declaring the `feature` name plus library-wide defaults, followed by one `##` section per test case. The section header carries the case ID and title (`## TC-0001 — Create a space`), with a per-case YAML fenced block for structured metadata (priority, type, state, automation, links) and free-form markdown for steps/expected outcome below it.

```markdown
---
feature: communications
slug: communications
---

## TC-0001 — Conversation subscription delivers messages
```yaml
priority: P1
type: integration
state: Ready
automation: required
links:
  stories: [alkem-io/product#1234]
  bugs:    [alkem-io/server#4567]
```

**Steps**
1. Create a space with one member.
2. Subscribe the member to the space's conversation.
3. Post a message.

**Expected**
- The member receives the message over WebSocket within 2 seconds.

---

## TC-0002 — …
```

**Rationale**: This shape is:
- **Diffable**: editing one case touches one `##` block; git diff is minimal.
- **PR-reviewable**: reviewer reads the case as a self-contained unit, not a front-matter payload.
- **Parser-friendly**: `gray-matter` handles the top front-matter; a simple split-by-`## TC-` gets per-case sections; a fenced YAML block per case gives structured data.
- **IDE-friendly**: markdown renderers (GitHub, VSCode) render each case as a readable sub-document.

**Alternatives considered**:
- *One case per file*: rejected by the QA lead earlier in the spec process on file-count grounds.
- *All metadata in one big YAML list at the top*: rejected — separates case metadata from its own prose, hurts readability.
- *TOML front-matter*: rejected — less familiar to the QA team than YAML, and less tool support.

---

## R9: Release plan markdown structure

**Decision**: Release plan is a single markdown file with top-level front-matter (release name, target date), followed by an `## In-scope cases` section listing case IDs referenced from feature libraries, and a final `## Outcomes` section with one entry per case ID that has been executed for this release.

```markdown
---
release: R31
target_date: 2026-04-24
---

## In-scope cases

- TC-0001
- TC-0002
- TC-0045
- TC-0100

## Outcomes

### TC-0001 — passed
- executed: 2026-04-28
- by: automated (run 2026-04-28, nightly #1234567)
- evidence: https://alkem-io.github.io/qa-test-suites/vitest/2026-04-28/1234567/

### TC-0045 — blocked
- executed: 2026-04-29
- by: ev.dimitrovv
- reason: server-api returns 500 on permissions call; tracked in alkem-io/server#4702
```

**Rationale**:
- The "in-scope cases" list is the *selection* (the test plan composition).
- Outcomes are a flat section — one entry per executed case, outcome in the header for diff-visibility.
- Automated outcomes are *also* rendered into this file by the dashboard builder when it renders the release view — but the file on disk only holds what humans have recorded manually. Automated outcomes live in the bot-owned run JSON and are joined at render.

This keeps the release plan file purely human-owned (manual outcomes + selection) while the dashboard shows the combined picture. Satisfies FR-012 (no bot writes to human files) without requiring QAs to maintain automated outcomes by hand.

**Alternatives considered**:
- *Unified YAML block for all outcomes*: rejected — less diff-friendly, and mixing automated + manual outcomes on disk blurs the human/bot boundary.
- *Store outcomes on the case, keyed by release*: rejected — would require editing the feature library every time a release outcome lands, defeating the edit-once model.
