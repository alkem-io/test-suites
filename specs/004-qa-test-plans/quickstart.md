# Quickstart — QA Test Plan Management System

How a QA engineer uses the system end-to-end, once it's shipped.

## Prerequisites

- Write access to the `qa/test-suites` repository.
- Local clone on a branch off `develop`.
- `pnpm install` already run in the repo root.

---

## 1. Create or edit a feature library

Each feature has a single markdown file under `test-plans/content/features/`. To add a case:

1. Open the relevant file (e.g., `test-plans/content/features/communications.md`). Create it if it doesn't exist — include the top-level front-matter block with `feature:` and `slug:`.
2. Append a new case section at the bottom:

   ````markdown
   ## TC-0042 — New message notification reaches offline subscriber
   ```yaml
   priority: P2
   type: integration
   state: Draft
   automation: required
   owner: ev.dimitrovv
   links:
     stories: [alkem-io/product#1234]
   ```

   **Steps**
   1. Create a space with member A (online) and member B (offline).
   2. Post a message addressed to both.

   **Expected**
   - Member A receives the message live.
   - Member B receives a notification on their next login.
   ````

3. Pick the next unused `TC-####` ID. The CLI's `validate` command will fail if you reuse an ID; run it locally before committing:

   ```bash
   pnpm --filter @alkemio/test-plans run validate
   ```

4. Commit, push, open a PR. After merge to `develop`, the `test-plans-sync.yml` workflow re-renders the dashboard within ~5 minutes.

---

## 2. Compose a release test plan

Release plans live under `test-plans/content/releases/<release>.md`.

1. Create `test-plans/content/releases/R31.md`:

   ```markdown
   ---
   release: R31
   target_date: 2026-04-24
   description: Messaging and space-conversion hardening (weekly release).
   ---

   ## In-scope cases

   - TC-0001
   - TC-0002
   - TC-0042
   - TC-0100

   ## Outcomes

   (Leave empty at planning time; add entries as you manually execute cases.)
   ```

2. Validate:

   ```bash
   pnpm --filter @alkemio/test-plans run validate
   ```

   The validator fails if any in-scope case ID does not exist in a feature library.

3. Commit and push. The release immediately appears on the dashboard landing page.

---

## 3. Record a manual outcome

You manually executed TC-0100 against Release R31 and it failed. Edit the release plan file and append to the `## Outcomes` section:

```markdown
### TC-0100 — failed
- executed: 2026-04-28
- by: ev.dimitrovv
- evidence: server returned 500 on /spaces — alkem-io/server#4702
```

Commit, push. The dashboard reflects this on next sync.

---

## 4. Link an automated test to a case

Open the test file (e.g. `server-api/src/functional-api/communications/conversations/conversations.it-spec.ts`) and add a `@testCase` tag above the relevant `describe` or `test` block:

```ts
// @testCase TC-0001
describe('Conversation subscriptions', () => {
  it('delivers a message to the subscriber', async () => { /* ... */ });
});
```

- Use `@testCase TC-0001, TC-0002` to cover multiple cases from one block.
- Use a `@testCase` on an outer `describe` to cover all inner tests that don't override it.

The next nightly run + sync cycle will join this test's pass/fail outcome into TC-0001's view.

---

## 5. Run the full sync locally (preview)

```bash
# 1. Validate content only — fast, no network
pnpm --filter @alkemio/test-plans run validate

# 2. Scan code for @testCase tags and report coverage defects — no rendering
pnpm --filter @alkemio/test-plans run scan

# 3. Build the dashboard using the last published run JSON pulled from gh-pages
pnpm --filter @alkemio/test-plans run build -- --pull-runs

# 4. Preview the dashboard locally
pnpm --filter @alkemio/test-plans exec serve dist/
# Opens at http://localhost:3000
```

The `--pull-runs` flag fetches the latest `runs/<suite>/<date>.json` from the `gh-pages` branch so your local preview reflects real automated outcomes. Without it, the preview shows all cases as "not-run" for the automated portion.

---

## 6. Common commands

| Command                                                          | Purpose                                                              |
|------------------------------------------------------------------|----------------------------------------------------------------------|
| `pnpm --filter @alkemio/test-plans run validate`                 | Check content schema (fast, pre-commit friendly).                    |
| `pnpm --filter @alkemio/test-plans run scan`                     | Scan test code for `@testCase` tags; list coverage defects.          |
| `pnpm --filter @alkemio/test-plans run build`                    | Render the dashboard to `dist/`.                                     |
| `pnpm --filter @alkemio/test-plans run build -- --pull-runs`     | Build using latest real automated outcomes from `gh-pages`.          |
| `pnpm --filter @alkemio/test-plans test`                         | Run Vitest unit tests for the CLI itself.                            |
| `pnpm --filter @alkemio/test-plans run lint`                     | Type-check + ESLint.                                                 |

---

## 7. Troubleshooting

**"Orphan automation" defects**
- Every automated test must reference at least one case. Open the file named in the defect and add a `@testCase` tag above the enclosing `describe` or `test`.

**"Unknown case reference" defects**
- Your `@testCase TC-####` points to an ID that does not exist in any feature library. Check for typos, or add the case to the appropriate feature library.

**"Missing required automation" defects**
- Your case is marked `automation: required` but no test has a matching `@testCase` tag. Either add the automation or change the case to `automation: optional`.

**"Stale release reference" defects**
- A release plan includes a case ID that has been retired or deleted. Either remove it from the release plan's `In-scope cases` or restore the case in its feature library.

---

## 8. Where the dashboard lives

After merge to `develop` and the sync workflow completes, the dashboard is published at:

```text
https://alkem-io.github.io/qa-test-suites/test-plans/
```

Stakeholders (PMs, leadership, engineers from other repos) consume it read-only — no GitHub permissions beyond org membership required.
