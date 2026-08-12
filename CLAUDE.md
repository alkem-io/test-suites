# CLAUDE.md

> **Workspace context.** This repo is part of the Alkemio polyrepo at
> [alkem-io/agents-hq](https://github.com/alkem-io/agents-hq).
> Cross-repo (vertical) feature specs live there under `specs/NNN-*/`. When
> working on a `feat/NNN-...` branch in this repo, the matching workspace
> spec is the single source of truth.

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Alkemio Test Suites — a QA automation monorepo for the Alkemio collaborative innovation platform. Uses **pnpm workspaces** to manage three packages from a single root.

| Package | Path | Framework | Module System | Node Version |
|---------|------|-----------|---------------|--------------|
| **@alkemio/tests-lib** | `lib/` | TypeScript library | CommonJS | 20.9.0 (Volta) |
| **@alkemio/test-suite-server-api** | `server-api/` | Vitest | ESM (`"type": "module"`) | 20.9.0 (Volta) |
| **@alkemio/test-suite-client-web** | `client-web/` | Playwright + Jest | CommonJS | >=20.9.0 |

`testOld/` is deprecated legacy code — do not add to it.

## Commands

All commands can be run from the repository root using `pnpm --filter`.

### Install all dependencies

```bash
pnpm install
```

### Shared Library (lib/)

```bash
pnpm --filter @alkemio/tests-lib run build        # Compile TypeScript to dist/
pnpm --filter @alkemio/tests-lib run codegen      # Generate GraphQL types
pnpm --filter @alkemio/tests-lib run lint         # Type check + ESLint
```

### Server API Tests (server-api/)

```bash
# Full nightly suite (single worker)
pnpm --filter @alkemio/test-suite-server-api run test:nightly

# Domain-specific suites (27+ available — see server-api/package.json scripts)
pnpm --filter @alkemio/test-suite-server-api run test:communications
pnpm --filter @alkemio/test-suite-server-api run test:account
pnpm --filter @alkemio/test-suite-server-api run test:search
pnpm --filter @alkemio/test-suite-server-api run test:templates
# ... etc.

# Run a single test file
cd server-api && pnpm exec vitest run path/to/file.it-spec.ts

# Lint
pnpm --filter @alkemio/test-suite-server-api run lint
```

Test files use the `.it-spec.ts` suffix. All domain projects are defined in a single `server-api/vitest.config.ts`.

### Client Web Tests (client-web/)

```bash
# Install Playwright browsers (required after fresh install)
pnpm --filter @alkemio/test-suite-client-web exec playwright install

# Playwright E2E tests (Chrome only)
pnpm --filter @alkemio/test-suite-client-web run test:auth-playwright

# Jest unit tests
pnpm --filter @alkemio/test-suite-client-web run test

# Run a specific Playwright test file
cd client-web && pnpm exec playwright test src/functional-e2e/path/to/file.spec.ts
```

Test files use the `.spec.ts` suffix.

### GraphQL Code Generation

Each package has its own codegen config (`codegen.ts`):
```bash
pnpm --filter @alkemio/tests-lib run codegen
pnpm --filter @alkemio/test-suite-server-api run codegen
pnpm --filter @alkemio/test-suite-client-web run codegen
```

## Environment Setup

Copy `.env.default` to `.env` in both `server-api/` and `client-web/`. Key variables:

- `ALKEMIO_SERVER` — GraphQL API endpoint (default: `http://localhost:3000/api/private/non-interactive/graphql`)
- `ALKEMIO_BASE_URL` — Web app URL (default: `http://localhost:3000`)
- `KRATOS_ENDPOINT` — Ory Kratos auth endpoint
- `AUTH_TEST_HARNESS_PASSWORD` — Test user password
- `MAIL_SLURPER_ENDPOINT` — Email testing service
- `ALKEMIO_SERVER_WS` — WebSocket endpoint for subscriptions
- `UI_HEADLESS` — Headless browser mode for Playwright (client-web only)
- `RABBITMQ_MANAGEMENT_ENDPOINT` / `_USER` / `_PASSWORD` — RabbitMQ management HTTP API, used for EMIT-level assertions on internal queues with no GraphQL surface (`alkemio-push-notifications`)

### Messaging digest windows (034-messaging-notifications)

Messaging notifications are **debounced then digested** per
`(recipient, channel, kind)` track — never sent on message arrival. The four
windows are env-overridable so a test stack can run them at seconds scale, and
the **same nine variables must be set on the SERVER under test and on the
harness** or every messaging wait will be measured against the wrong window:

| Variable | Test stack | Production in-code default |
|---|---|---|
| `MESSAGING_DIGEST_PUSH_DIRECT_QUIET_SECONDS` | 2 | 60 |
| `MESSAGING_DIGEST_PUSH_DIRECT_MAX_DELAY_SECONDS` | 10 | 300 |
| `MESSAGING_DIGEST_PUSH_GROUP_QUIET_SECONDS` | 3 | 300 |
| `MESSAGING_DIGEST_PUSH_GROUP_MAX_DELAY_SECONDS` | 12 | 900 |
| `MESSAGING_DIGEST_EMAIL_DIRECT_QUIET_SECONDS` | 4 | 300 |
| `MESSAGING_DIGEST_EMAIL_DIRECT_MAX_DELAY_SECONDS` | 15 | 1800 |
| `MESSAGING_DIGEST_EMAIL_GROUP_QUIET_SECONDS` | 6 | 1200 |
| `MESSAGING_DIGEST_EMAIL_GROUP_MAX_DELAY_SECONDS` | 20 | 3600 |
| `MESSAGING_DIGEST_SWEEP_INTERVAL_SECONDS` | 1 | 10 |

Never hard-code a messaging wait. Derive it from
`digestWindow(channel, kind)` (`lib/src/utils/messaging-digest-windows.ts`,
re-exported from `@alkemio/tests-lib`), which returns the sleeps AND the
per-test timeout:

- `quietGraceMs` = `quiet + sweep + settle` — wait FOR a digest.
- `maxDelayGraceMs` = `maxDelay + sweep + settle` — the strongest bound; use it
  for every load-bearing **negative** assertion, so "no email arrived" means
  "none will ever arrive" rather than "none has arrived *yet*".
- `testTimeoutMs` / `digestTestTimeoutMs([...])` — per-test timeouts that scale
  with the windows the test actually waits on.

An unset variable falls back to the **production** default, never to the short
test value — falling back the other way is how a negative test goes green for
the wrong reason.

## Architecture

### Workspace Structure

The root `pnpm-workspace.yaml` defines three workspace packages: `lib`, `server-api`, `client-web`. Both `server-api` and `client-web` depend on `@alkemio/tests-lib` via `"workspace:*"`. The root `.npmrc` uses `node-linker=hoisted` for broad compatibility.

### Test Library (`lib/src/`)

Shared utilities consumed by both test suites via the `@alkemio/tests-lib` workspace dependency (plus TypeScript path aliases mapped to `../lib/src/index.ts` in each package's tsconfig for compile-time resolution).

Key abstractions:
- **`scenario/TestScenarioFactory`** — Core factory for creating deterministic test data (orgs, spaces, users, subspaces). Most test suites set up scenarios in `beforeAll` using this.
- **`scenario/models/OrganizationWithSpaceModel`** — Reusable hierarchical data model for org→space→subspace structures.
- **`utils/graphql.client.ts`** — Authenticated GraphQL client wrapper.
- **`scenario/mutations/`** — 40+ domain-specific GraphQL mutation helpers (space, callout, communication, account, etc.).
- **`scenario/queries/`** — Query helpers for search, entitlements, activity logs, pagination.
- **`common/enums/`** — Test users enum, privileges, roles.

### Server API Tests (`server-api/src/functional-api/`)

Vitest integration tests organized by domain: `communications/`, `search/`, `account/`, `callout/`, `templates/`, `documents/`, `preferences/`, `roleset/`, `subscriptions/`, `innovation/`, etc.

Path aliases: `@generated/*`, `@utils/*`, `@functional-api/*`, `@src/*`, `@common/*` — resolved via `resolve.alias` in `vitest.config.ts`.

Global setup: `globalTestsSetup.ts` (user registration) → `setupTests.ts` (WebSocket polyfill + custom matchers).

Test timeout is 30 minutes (1,800,000 ms) for long-running integration tests.

### Client Web Tests (`client-web/src/functional-e2e/`)

Playwright E2E tests organized by feature area: `explore-platform/`, `authentication/`, `my-dashboard/`, `memberships/`, `applications/`, `templates/`, `public-space/`, `user-profile/`, `support-navigation/`, `messaging-notifications/`.

`messaging-notifications/` is the one area that does **not** use the session-based auth fixtures: its walks register every persona inline through the real sign-up flow, because they assert on notification-settings defaults for a brand-new account and on digest tracks that must start empty. Its shared fixtures live in `messaging-notifications/messaging.helpers.ts`.

- Chrome only (branded channel, not Chromium)
- Session-based auth fixtures with storage state persistence in `.auth/`
- CI: 1 worker, 2 retries; Local: parallel, no retries

### Test Personas

Nine test personas with varying roles (see `agents.md`): Host, Facilitator, Community Manager, Project Lead, Active Stakeholder, Stakeholder, New Stakeholder, Alkemio GA (Global Admin), Alkemio SA (Support Admin).

## Code Style

- **Prettier**: single quotes, trailing commas (es5), 2-space indent, semicolons, arrow parens `avoid`
- **ESLint**: auto-fix on pre-commit via lint-staged (root-level husky)
- **server-api** uses ESLint 9.x flat config; **client-web** uses legacy `.eslintrc.js`

## Specification-Driven Development (SDD)

This repo follows SDD via the `.specify/` framework. New features must start with specification artifacts under `specs/NNN-feature-slug/` following the canonical workflow: constitution → specify → clarify → plan → checklist → tasks → analyze → implement. See `.specify/memory/constitution.md` for governance principles and quality gates.

## Active Technologies
- TypeScript ~5.7.3, Node.js 20.9.0 (Volta) + Vitest ^4.0.18, @vitest/ui ^4.0.18 (002-jest-to-vitest)
- YAML (GitHub Actions workflow), Bash (shell steps) + Vitest HTML reporter (already configured), `deploy-github-pages.yml` reusable workflow, `pnpm/action-setup@v4`, `actions/setup-node@v6`, `actions/checkout@v5` (003-nightly-server-report)
- `gh-pages` branch under `gh-pages-root/vitest/` directory (003-nightly-server-report)
- Playwright Test (Chrome branded channel), `@alkemio/tests-lib` (MailSlurper helpers: `getVerificationLink`, `getRecoveryCode`, `getRecoveryLink`, `deleteMailSlurperMails`, `UniqueIDGenerator`, `delay`) (005-crd-auth-ui-tests)

## Recent Changes
- 002-jest-to-vitest: Migrated server-api from Jest to Vitest. Added Vitest ^4.0.18, @vitest/ui ^4.0.18. Path aliases resolved via `resolve.alias` in vitest.config.ts.
