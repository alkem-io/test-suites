# Quickstart: Nightly Server-API Test Report

## Triggering the Workflow

### Manual Trigger (GitHub UI)

1. Go to the repository's **Actions** tab
2. Select **"Nightly Server API"** from the workflow list
3. Click **"Run workflow"**
4. Select the branch (default: current branch)
5. Click **"Run workflow"**

### Manual Trigger (CLI)

```bash
gh workflow run nightly-server-tests.yml
```

## Viewing Reports

### Latest Run

After the workflow completes, reports are available at:

```
https://<org>.github.io/<repo>/vitest/
```

The index page lists all runs grouped by date (newest first).

### Specific Run

Navigate to a specific run's report:

```
https://<org>.github.io/<repo>/vitest/<YYYY-MM-DD>/<run_id>/
```

### Top-Level Index

The main index page links to both Playwright and Vitest reports:

```
https://<org>.github.io/<repo>/
```

## How It Works

1. **Test job** runs on `arc-runner-set`:
   - Checks out source code and existing `gh-pages` content
   - Installs pnpm + Node.js + dependencies
   - Runs `pnpm --filter @alkemio/test-suite-server-api run test:nightly`
   - Copies Vitest HTML report to `out/gh-pages-root/vitest/<date>/<run_id>/`
   - Writes metadata files (status, commit, branch, runinfo)
   - Generates `vitest/index.html` summary page
   - Generates top-level `index.html`
   - Commits and pushes to `gh-pages` branch

2. **Deploy job** (runs unconditionally):
   - Calls `deploy-github-pages.yml` with `ref: gh-pages`, `path: gh-pages-root`
   - Deploys accumulated reports to GitHub Pages

## Environment Variables Required

These must be configured as GitHub repository/organization variables and secrets:

| Variable | Type | Description |
|----------|------|-------------|
| `ALKEMIO_SERVER` | var | GraphQL API endpoint |
| `ALKEMIO_SERVER_URL` | var | GraphQL API endpoint (alias) |
| `ALKEMIO_BASE_URL` | var | Web app base URL |
| `KRATOS_ENDPOINT` | var | Ory Kratos auth endpoint |
| `MAIL_SLURPER_ENDPOINT` | var | Email testing service |
| `ALKEMIO_SERVER_WS` | var | WebSocket endpoint |
| `ALKEMIO_SERVER_REST` | var | REST API endpoint |
| `AUTH_TEST_HARNESS_PASSWORD` | secret | Test user password |
