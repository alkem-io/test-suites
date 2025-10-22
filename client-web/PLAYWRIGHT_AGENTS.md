# Playwright Agents Setup

This document explains the Playwright Agents setup for the Alkemio test suite.

## Overview

Playwright Agents is an AI-powered testing feature that can automatically generate, plan, and heal tests. It uses the seed file and fixtures to understand your application's authentication state and initial setup.

## File Structure

```
client-web/src/functional-e2e/
├── fixtures.ts              # Custom fixtures for authentication and scenario setup
├── seed.spec.ts             # The seed file used by Playwright Agents
├── authentication/          # Authentication helpers
├── identity-flows/          # Identity-related page objects
└── space-test/             # Other test files
```

## Key Components

### 1. `fixtures.ts`

Defines custom Playwright fixtures that provide:

- **`authenticatedPage`**: A Page instance that's already logged in
- **`authenticatedContext`**: A BrowserContext with authentication
- **`scenarioData`**: Test scenario data (spaces, users, etc.) - scoped to worker

### 2. `seed.spec.ts`

The main seed file that:

- Imports test and expect from `./fixtures` (NOT from `@playwright/test`)
- Uses the `authenticatedPage` fixture to provide an already-authenticated page
- Sets up the initial state for AI-generated tests
- This file will be copied by Playwright Agents into generated tests

### 3. Authentication Helpers

Located in `authentication/auth-helpers.ts`:

- `loginWithEnvCredentials()`: Logs in using environment variables
- Uses credentials from `.env` file or test configuration

## How It Works

1. **Fixture-based Authentication**: Instead of using `test.beforeAll()` hooks, we use Playwright fixtures to provide an authenticated page state.

2. **Worker-scoped Scenario**: The `scenarioData` fixture is scoped to 'worker', meaning it runs once per parallel worker process, creating the test scenario data efficiently.

3. **Agent Integration**: When Playwright Agents generates new tests, it copies the seed file's fixture imports and uses them in the generated tests.

## Usage

### Running the Seed Test

```bash
npm run test:auth-playwright -- seed.spec.ts
```

### Using Playwright Agents

#### 1. Initialize Agents (if not done)

```bash
npx playwright init-agents --loop vscode
# or
npx playwright init-agents --loop claude
```

#### 2. Generate Tests with Planner Agent

```bash
npx playwright agent-planner
```

The agent will:

- Read your `seed.spec.ts` file
- Understand the authentication and fixture setup
- Create a test plan based on your application

#### 3. Generate Test Code

```bash
npx playwright agent-generator
```

The generated tests will:

- Import from `./fixtures`
- Use the `authenticatedPage` fixture automatically
- Have access to the scenario data

### Writing Tests Manually with Fixtures

```typescript
import { test, expect } from './fixtures';

test('my test', async ({ authenticatedPage, scenarioData }) => {
  // authenticatedPage is already logged in
  await authenticatedPage.goto('/some-path');

  // Your test logic here
  await expect(authenticatedPage.locator('h1')).toBeVisible();
});
```

## Important Notes

### ⚠️ One Seed File Only

- You should have **only ONE** `seed.spec.ts` file at the root of your test directory
- Other test files should have different names (e.g., `space-navigation.spec.ts`)

### ⚠️ Always Import from Fixtures

```typescript
// ✅ Correct
import { test, expect } from './fixtures';

// ❌ Wrong - Agents won't see your authentication state
import { test, expect } from '@playwright/test';
```

### ⚠️ Use Fixtures, Not Hooks

```typescript
// ✅ Correct - Using fixture
test('my test', async ({ authenticatedPage }) => {
  // Page is already authenticated
});

// ❌ Wrong - beforeAll doesn't work with agents
test.beforeAll(async ({ page }) => {
  await login(page);
});
```

## Environment Variables

Required environment variables (set in `.env` file):

```env
AUTH_TEST_HARNESS_EMAIL=your-email@example.com
AUTH_TEST_HARNESS_PASSWORD=your-password
ALKEMIO_BASE_URL=http://localhost:3000
```

## Troubleshooting

### Agent-generated tests don't recognize authentication

**Solution**: Ensure generated tests import from `./fixtures` instead of `@playwright/test`

### Multiple seed files causing confusion

**Solution**: Keep only one `seed.spec.ts` at the test root (`src/functional-e2e/seed.spec.ts`)

### Tests fail with authentication errors

**Solution**: Check that:

1. Environment variables are set correctly
2. The `loginWithEnvCredentials` function works
3. Fixtures are being used in your tests

### Scenario data not available

**Solution**: The `scenarioData` fixture runs once per worker. Make sure your test imports it:

```typescript
test('my test', async ({ authenticatedPage, scenarioData }) => {
  // scenarioData is available here
});
```

## Resources

- [Playwright Agents Documentation](https://playwright.dev/docs/agents)
- [Playwright Fixtures Guide](https://playwright.dev/docs/test-fixtures)
- [Authentication in Playwright](https://playwright.dev/docs/auth)
