# @alkemio/test-plans

QA test-plan management for the Alkemio platform. Tracks test cases, composes per-release test plans, links automated tests back to them, and publishes a static dashboard to GitHub Pages.

This package implements spec [`004-qa-test-plans`](../specs/004-qa-test-plans/spec.md). The authoritative design docs live under `specs/004-qa-test-plans/`:

- [spec.md](../specs/004-qa-test-plans/spec.md) — requirements, success criteria, user stories.
- [plan.md](../specs/004-qa-test-plans/plan.md) — architecture, dependencies, project structure.
- [data-model.md](../specs/004-qa-test-plans/data-model.md) — entity schemas + dashboard view layout.
- [quickstart.md](../specs/004-qa-test-plans/quickstart.md) — step-by-step authoring workflow.
- [contracts/](../specs/004-qa-test-plans/contracts/) — JSON Schemas + the `@testCase` tag grammar.

## Authoring surface

- **Feature libraries**: `content/features/<domain>.md` — canonical test-case definitions, one markdown document per feature, organized by domain to mirror the test code tree.
- **Release plans**: `content/releases/R<N>.md` (or `R<N>.<patch>.md` for hotfixes) — per-release selection of in-scope cases + manual outcomes.
- **Automation linkage**: `@testCase TC-####` JSDoc or single-line tags above `describe`/`it`/`test` blocks in `server-api/src/functional-api/**/*.it-spec.ts` or `client-web/src/functional-e2e/**/*.spec.ts`.

All three surfaces are human-owned and version-controlled. The bot-owned run-summary JSON (automated outcomes) lives on the `gh-pages` branch and is never committed back to `develop`.

**Prefer a rich editor over raw markdown?** The `content/` directory is a valid Obsidian vault. See [OBSIDIAN.md](./OBSIDIAN.md) for the recommended settings and plugin picks. Everything else — the CLI, the dashboard, the workflow — keeps working unchanged.

## Commands

From the repo root:

```bash
# Validate content — fails on schema violations, duplicate IDs, stale release refs
pnpm --filter @alkemio/test-plans run validate

# Scan test code for @testCase tags; list coverage defects (grouped by kind)
pnpm --filter @alkemio/test-plans run scan

# Render the static dashboard to test-plans/dist/
pnpm --filter @alkemio/test-plans run build

# Same, but also pull the latest automated-run JSON from a gh-pages checkout
pnpm --filter @alkemio/test-plans exec tsx src/cli.ts build \
  --pull-runs --runs-dir=<path-to-gh-pages>/gh-pages-root/test-plans/runs

# Unit tests (Vitest)
pnpm --filter @alkemio/test-plans run test

# Type check + ESLint
pnpm --filter @alkemio/test-plans run lint
```

Convenience shortcuts are also available at the repo root (see root `package.json`):

```bash
pnpm run test-plans:validate
pnpm run test-plans:scan
pnpm run test-plans:build
```

## Dashboard layout

After `build`, `dist/` contains:

```
dist/
├── index.html                   # Landing: current + recent 8 releases
├── defects.html                 # Coverage-defects view
├── defects.csv                  # CSV export of the same defects
├── releases/
│   ├── archive.html             # All releases (patches grouped with parent)
│   └── R<N>.html                # Per-release view with headline metrics + case table
├── features/
│   └── <slug>.html              # Per-feature view with full case details + collapsible narratives
└── assets/
    └── style.css
```

In production, the workflow `.github/workflows/test-plans-sync.yml` renders and publishes this tree under `gh-pages-root/test-plans/` on the `gh-pages` branch, served via the existing nightly-reports Pages site.

## Workflow triggers

The sync workflow runs on:

1. `workflow_run` — after any "Nightly Server API" or "Nightly Playwright" workflow completes. Ingests the Vitest JSON artifact into a bot-owned run summary and re-renders the dashboard.
2. `push` to `develop` under paths `test-plans/**`, `specs/004-qa-test-plans/contracts/**`, or the workflow file itself. Re-renders the dashboard using the latest runs already on gh-pages.
3. `workflow_dispatch` — manual rebuild.

The commit-to-gh-pages step uses a `git diff --cached --quiet` guard so two consecutive runs on the same commit produce zero pushes (SC-006).

## Next steps for contributors

1. Read `../specs/004-qa-test-plans/quickstart.md` for the authoring walkthrough.
2. Add `@testCase TC-####` tags to existing test files as you encounter them, starting with the highest-traffic domains.
3. Open the dashboard regularly to confirm the orphan-automation count is moving toward zero (SC-008).
