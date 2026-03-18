# Research: Nightly Server-API Test Report

## R1: Vitest HTML Reporter Output Location

**Decision**: The Vitest HTML reporter outputs to `server-api/html-report/` directory. The config uses `reporters: ['html']` with `outputFile.html` set to `./html-report/report_${timestamp}.html`. The HTML reporter produces a directory of files (index.html + assets), not a single file — the `outputFile.html` path controls the output directory name.

**Rationale**: Confirmed from `server-api/vitest.config.ts` lines 53-56. The workflow will copy `server-api/html-report/` contents to the gh-pages target directory.

**Alternatives considered**: None — this is the existing configuration.

## R2: User Registration in Server-API Tests

**Decision**: User registration is handled automatically by Vitest's `globalSetup` (`server-api/src/globalTestsSetup.ts`), not a separate workflow step. The setup reads `SKIP_USER_REGISTRATION` env var (defaults to `false`). No separate `register-users` script step is needed (unlike the Playwright workflow which has an explicit step).

**Rationale**: Confirmed from `globalTestsSetup.ts` — the setup function registers all test users (except GLOBAL_ADMIN) sequentially. The client-web workflow needs a separate step because Playwright doesn't use Vitest's globalSetup.

**Alternatives considered**: Adding explicit registration step — rejected because globalSetup already handles it.

## R3: Server-API Environment Variables Required

**Decision**: The workflow needs these env vars (from `server-api/.env.default`):
- `ALKEMIO_SERVER` — GraphQL endpoint
- `ALKEMIO_SERVER_URL` — Same as ALKEMIO_SERVER
- `ALKEMIO_BASE_URL` — Base URL
- `KRATOS_ENDPOINT` — Auth service
- `AUTH_TEST_HARNESS_PASSWORD` — Test user password (secret)
- `MAIL_SLURPER_ENDPOINT` — Email testing
- `ALKEMIO_SERVER_WS` — WebSocket endpoint
- `ALKEMIO_SERVER_REST` — REST endpoint

**Rationale**: Matches the env vars used by the client-web workflow plus server-specific ones (WS, REST). All are already configured as GitHub org/repo variables and secrets.

**Alternatives considered**: None — these are required by the test suite.

## R4: Test Command for Nightly Suite

**Decision**: Use `pnpm --filter @alkemio/test-suite-server-api run test:nightly` which runs `vitest run --project nightly --maxWorkers=1 --forceExit`.

**Rationale**: From `server-api/package.json` line 33. The `nightly` project in `vitest.config.ts` (lines 122-133) includes 10 test domains: account, roleset, contributor-management, callout, communications, activity-logs, journey, storage, entitlements, templates.

**Alternatives considered**: Running `vitest run` without project filter — rejected because it would run all projects, not just the nightly subset.

## R5: Concurrent gh-pages Push Handling

**Decision**: Follow the same pattern as the client-web workflow — no explicit conflict resolution. The risk is low because the nightly-build-trigger.yml runs tests sequentially (Travis CI trigger after deploy). If manual triggers cause conflicts, the git push will fail and the report won't be published for that run (acceptable).

**Rationale**: The client-web workflow doesn't handle concurrent pushes either. The nightly cron trigger runs tests after environment setup, making concurrent runs unlikely in practice.

**Alternatives considered**: Git pull-rebase-push retry loop — rejected as over-engineering for the current use case.

## R6: Top-Level Index Page (FR-009)

**Decision**: Generate a `gh-pages-root/index.html` that links to both `playwright/index.html` and `vitest/index.html`. Both workflows should generate this page. Since the client-web workflow already has a "Back to main index" link pointing to `../` (line 121 of nightly-client-tests.yml), this index page should exist.

**Rationale**: The Playwright index already references a parent index. Creating it completes the navigation structure.

**Alternatives considered**: Skip top-level index — rejected because the Playwright index already links to it.

## R7: Vitest HTML Report Output Path Override for CI

**Decision**: The existing `vitest.config.ts` outputs to `./html-report/report_${timestamp}.html` with a dynamic timestamp. For the CI workflow, we need a predictable output path to copy from. Options:
1. Copy from `server-api/html-report/` (glob the timestamp directory)
2. Override the output path via CLI flag or env var

The Vitest HTML reporter with `outputFile.html` creates the report at the specified path. The workflow will copy from `server-api/html-report/` using a glob or by listing the directory.

**Rationale**: The timestamp in the path makes the exact directory name unpredictable at workflow time. Using `cp -r server-api/html-report/* target/` will copy all report contents regardless of the timestamp subdirectory name.

**Alternatives considered**: Modifying vitest.config.ts to use a fixed output path — rejected to avoid changing existing config.
