<p align="center">
  <a href="https://alkemio.org/" target="blank"><img src="https://alkemio.org/uploads/logos/alkemio-logo.svg" width="400" alt="Alkemio Logo" /></a>
</p>
<p align="center"><i>Smart safe spaces for collective action. On a platform designed to benefit society.</i></p>

# Alkemio Test Suites

Quality assurance test suites for the Alkemio platform.

This repository contains three packages managed via **pnpm workspaces**:

| Package                            | Path          | Purpose                                                     |
| ---------------------------------- | ------------- | ----------------------------------------------------------- |
| **@alkemio/tests-lib**             | `lib/`        | Shared library (GraphQL clients, test scenarios, utilities) |
| **@alkemio/test-suite-server-api** | `server-api/` | API integration tests (Vitest)                              |
| **@alkemio/test-suite-client-web** | `client-web/` | E2E browser tests (Playwright)                              |

## Prerequisites

| Tool        | Version                                       |
| ----------- | --------------------------------------------- |
| **Node.js** | `>=20.9.0` (pinned to `20.9.0` via Volta)     |
| **pnpm**    | `9.15.0` (declared in `packageManager` field) |

A locally running **Alkemio server** is required — the tests target `http://localhost:3000` by default.

## Getting Started

### 1. Install dependencies

From the repository root:

```bash
pnpm install
```

### 2. Build the shared library

Both test suites depend on `@alkemio/tests-lib`, so build it first:

```bash
pnpm --filter @alkemio/tests-lib run build
```

### 3. Create environment files

Copy the `.env.default` templates and adjust values as needed:

```bash
cp server-api/.env.default server-api/.env
cp client-web/.env.default client-web/.env
```

At minimum, set `AUTH_TEST_HARNESS_PASSWORD` to the password configured in your local Alkemio server.

### 4. Register test users

Before running any test suite, the test user accounts must exist. Create them by running:

```bash
cd server-api
pnpm exec vitest run --project contributor-management ./src/functional-api/contributor-management/user/create-user.it-spec.ts
```

## Running Tests

### API Tests (server-api)

All API tests use **Vitest**. Run from the repository root or from `server-api/`.

```bash
# Full nightly suite (serial)
pnpm --filter @alkemio/test-suite-server-api run test:nightly

# Domain-specific suite (e.g. communications, account, search, templates, …)
pnpm --filter @alkemio/test-suite-server-api run test:communications

# Single test file
cd server-api
pnpm exec vitest run --project nightly ./src/functional-api/path/to/file.it-spec.ts
```

See `server-api/package.json` scripts for the full list of available suites.

After a test run, an HTML report is generated at `server-api/html-report/`. To view it:

```bash
cd server-api
npx vite preview --outDir html-report
```

Then open `http://localhost:4173` in your browser.

### E2E Tests (client-web)

E2E tests use **Playwright** (Chrome only).

```bash
# Install Playwright browsers (first time only)
pnpm --filter @alkemio/test-suite-client-web exec playwright install

# Run all Playwright E2E tests
pnpm --filter @alkemio/test-suite-client-web run test:auth-playwright

# Run a specific test file
cd client-web
pnpm exec playwright test src/functional-e2e/path/to/file.spec.ts

# Open Playwright UI mode (interactive test runner)
cd client-web
pnpm exec playwright test --ui
```

# Known issues

### e2e tests

- space tests might fail if you have pinned space (with redirect);
