# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Alkemio Test Suites — a QA automation monorepo for the Alkemio collaborative innovation platform. Contains three active packages with no root-level package.json; each package is managed independently.

| Package | Path | Framework | Module System | Node Version |
|---------|------|-----------|---------------|--------------|
| **@alkemio/tests-lib** | `lib/` | TypeScript library | CommonJS | 20.9.0 (Volta) |
| **@alkemio/test-suite-server-api** | `server-api/` | Jest | ESM (`"type": "module"`) | 17.9.1 (Volta) |
| **@alkemio/test-suite-client-web** | `client-web/` | Playwright + Jest | CommonJS | >=20.9.0 |

`testOld/` is deprecated legacy code — do not add to it.

## Commands

All commands must be run from within their respective package directory.

### Shared Library (lib/)

```bash
npm --prefix lib run build        # Compile TypeScript to dist/
npm --prefix lib run codegen      # Generate GraphQL types
npm --prefix lib run lint         # Type check + ESLint
```

### Server API Tests (server-api/)

```bash
# Full nightly suite (single worker)
npm --prefix server-api run test:nightly

# Domain-specific suites (30+ available — see server-api/package.json scripts)
npm --prefix server-api run test:communications
npm --prefix server-api run test:account
npm --prefix server-api run test:search
npm --prefix server-api run test:templates
# ... etc.

# Run a single test file
cd server-api && npx jest --config ./config/jest.config.mjs path/to/file.it-spec.ts

# Lint
npm --prefix server-api run lint
```

Test files use the `.it-spec.ts` suffix. Each domain has its own Jest config in `server-api/config/jest.config.*.mjs`.

### Client Web Tests (client-web/)

```bash
# Playwright E2E tests (Chrome only)
npm --prefix client-web run test:auth-playwright

# Jest unit tests
npm --prefix client-web run test

# Run a specific Playwright test file
cd client-web && npx playwright test src/functional-e2e/path/to/file.spec.ts
```

Test files use the `.spec.ts` suffix.

### GraphQL Code Generation

Each package has its own codegen config (`codegen.ts`):
```bash
npm --prefix lib run codegen
npm --prefix server-api run codegen
npm --prefix client-web run codegen
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

## Architecture

### Test Library (`lib/src/`)

Shared utilities consumed by both test suites via the `@alkemio/tests-lib` path alias (mapped to `../lib/src/index.ts` in each package's tsconfig).

Key abstractions:
- **`scenario/TestScenarioFactory`** — Core factory for creating deterministic test data (orgs, spaces, users, subspaces). Most test suites set up scenarios in `beforeAll` using this.
- **`scenario/models/OrganizationWithSpaceModel`** — Reusable hierarchical data model for org→space→subspace structures.
- **`utils/graphql.client.ts`** — Authenticated GraphQL client wrapper.
- **`scenario/mutations/`** — 40+ domain-specific GraphQL mutation helpers (space, callout, communication, account, etc.).
- **`scenario/queries/`** — Query helpers for search, entitlements, activity logs, pagination.
- **`common/enums/`** — Test users enum, privileges, roles.

### Server API Tests (`server-api/src/functional-api/`)

Jest integration tests organized by domain: `communications/`, `search/`, `account/`, `callout/`, `templates/`, `documents/`, `preferences/`, `roleset/`, `subscriptions/`, `innovation/`, etc.

Path aliases: `@generated/*`, `@utils/*`, `@functional-api/*`, `@src/*`, `@common/*`.

Global setup: `globalTestsSetup.ts` → `setupTests.ts` (WebSocket polyfill) → `jest.setup.ts` (jest-extended).

Test timeout is 30 minutes (1,800,000 ms) for long-running integration tests.

### Client Web Tests (`client-web/src/functional-e2e/`)

Playwright E2E tests organized by feature area: `explore-platform/`, `authentication/`, `my-dashboard/`, `memberships/`, `applications/`, `templates/`, `public-space/`, `user-profile/`, `support-navigation/`.

- Chrome only (branded channel, not Chromium)
- Session-based auth fixtures with storage state persistence in `.auth/`
- CI: 1 worker, 2 retries; Local: parallel, no retries

### Test Personas

Nine test personas with varying roles (see `agents.md`): Host, Facilitator, Community Manager, Project Lead, Active Stakeholder, Stakeholder, New Stakeholder, Alkemio GA (Global Admin), Alkemio SA (Support Admin).

## Code Style

- **Prettier**: single quotes, trailing commas (es5), 2-space indent, semicolons, arrow parens `avoid`
- **ESLint**: auto-fix on pre-commit via lint-staged (server-api)
- **server-api** uses ESLint 9.x flat config; **client-web** uses legacy `.eslintrc.js`

## Specification-Driven Development (SDD)

This repo follows SDD via the `.specify/` framework. New features must start with specification artifacts under `specs/NNN-feature-slug/` following the canonical workflow: constitution → specify → clarify → plan → checklist → tasks → analyze → implement. See `.specify/memory/constitution.md` for governance principles and quality gates.
