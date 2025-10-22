# Space Test Suite

This folder contains comprehensive test scenarios for Space functionality in the Alkemio platform.

## Overview

The Space test suite validates all aspects of Space management including creation, configuration, membership, navigation, subspaces, and collaboration features.

## File Structure

```
space-test/
├── README.md                           # This file - setup and usage guide
├── seed.spec.ts                        # Test setup and preconditions
├── SPACE_TEST_PLAN.md                  # Comprehensive test plan (60+ scenarios)
├── space-creation.spec.ts              # Space creation and setup tests
├── space-navigation.spec.ts            # Tab navigation and UI tests
├── space-membership.spec.ts            # Community and membership tests
├── space-settings.spec.ts              # Settings and configuration tests
└── space-subspaces.spec.ts             # Subspace management tests
```

## Seed File Setup

The `seed.spec.ts` file handles critical preconditions for all space tests:

### What the Seed Does

1. **Creates Test Data** via `TestScenarioFactory.createBaseScenarioEmpty()`

   - Creates a space with configured settings
   - Sets up Space Admin user
   - Sets up Space Member user
   - Enables collaboration features (post collection callout)

2. **Authenticates User** via `loginWithEnvCredentials()`

   - Logs in with environment credentials
   - Verifies successful authentication
   - Prepares authenticated session for tests

3. **Navigates to Space**
   - Goes to the created space
   - Waits for page to be ready
   - Ensures stable starting state

### Seed Configuration

```typescript
const scenarioConfig: TestScenarioConfig = {
  name: 'space-test-scenario',
  space: {
    collaboration: {
      addPostCollectionCallout: true, // Enable post callout
      addTutorialCallouts: false, // Disable tutorials for cleaner tests
    },
    community: {
      admins: [TestUser.SPACE_ADMIN], // Space administrator
      members: [TestUser.SPACE_MEMBER], // Regular space member
    },
  },
};
```

### Modifying the Seed

To customize the test environment, edit the `scenarioConfig` object:

- **Add more users**: Add entries to `admins` or `members` arrays
- **Enable tutorials**: Set `addTutorialCallouts: true`
- **Change features**: Modify collaboration settings
- **Add subspaces**: Extend configuration with subspace settings

## Running Tests

### Run All Space Tests

```bash
npm run test:auth-playwright -- space-test
```

### Run Specific Test File

```bash
npm run test:auth-playwright -- space-test/space-creation.spec.ts
```

### Run Single Test

```bash
npm run test:auth-playwright -- space-test/space-creation.spec.ts -g "Create New Space with Valid Data"
```

### Run in UI Mode (for debugging)

```bash
npx playwright test space-test --ui
```

### Run with Headed Browser (visible browser)

```bash
npx playwright test space-test --headed
```

## Environment Variables

Ensure these environment variables are set (typically in `.env` file):

```bash
# Authentication
AUTH_TEST_HARNESS_EMAIL=admin@alkem.com
AUTH_TEST_HARNESS_PASSWORD=your_password

# Base URL
ALKEMIO_BASE_URL=http://localhost:3000
# OR for dev environment
ALKEMIO_BASE_URL=https://dev-alkem.io

# API Endpoint (for scenario factory)
ALKEMIO_API_ENDPOINT=http://localhost:3000/api/graphql
```

## Test Data

### Users Created by Seed

| User Type    | Role   | Access Level          |
| ------------ | ------ | --------------------- |
| SPACE_ADMIN  | Admin  | Full space management |
| SPACE_MEMBER | Member | View and contribute   |

### Space Created by Seed

- **Name**: Generated based on scenario config
- **Privacy**: Default (typically Public)
- **Features**: Post collection callout enabled
- **State**: Ready for testing

## Writing New Tests

### Example Test Structure

```typescript
import { test, expect } from '@playwright/test';

test.describe('My Space Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Seed has already run and created space + authenticated
    // Additional per-test setup if needed
  });

  test('should perform space action', async ({ page }) => {
    // Test implementation
    // The space is already created and user is logged in

    // Example: Navigate to Community tab
    await page.click('[href*="?tab=community"]');

    // Verify
    await expect(page.locator('.community-content')).toBeVisible();
  });
});
```

### Using Page Objects

Consider creating page object models for reusable interactions:

```typescript
// Example: SpacePage.ts
export class SpacePage {
  constructor(private page: Page) {}

  async navigateToHomeTab() {
    await this.page.click('[href*="?tab=home"]');
  }

  async navigateToCommunityTab() {
    await this.page.click('[href*="?tab=community"]');
  }

  async navigateToSubspacesTab() {
    await this.page.click('[href*="?tab=subspaces"]');
  }

  async getSpaceName() {
    return await this.page.locator('.space-name').textContent();
  }
}
```

## Test Plan Reference

The `SPACE_TEST_PLAN.md` file contains 60+ detailed test scenarios organized into:

1. **Space Creation and Basic Setup** (6 scenarios)
2. **Space Privacy and Visibility Settings** (4 scenarios)
3. **Space Navigation and Tabs** (5 scenarios)
4. **Space Membership and Community Management** (7 scenarios)
5. **Subspace Management** (5 scenarios)
6. **Space Settings and Configuration** (6 scenarios)
7. **Space Content and Collaboration** (4 scenarios)
8. **Space Search and Discovery** (3 scenarios)
9. **Space Permissions and Access Control** (4 scenarios)
10. **Space Lifecycle and State Management** (3 scenarios)
11. **Edge Cases and Error Handling** (6 scenarios)

Each scenario includes:

- Prerequisites
- Step-by-step instructions
- Expected results
- Success criteria

## Best Practices

### 1. Test Independence

Each test should be independent and not rely on other tests' state:

```typescript
test('independent test', async ({ page }) => {
  // Don't assume other tests have run
  // Use the seed data as starting point
  // Create any additional data needed
});
```

### 2. Clean Assertions

Use clear, descriptive assertions:

```typescript
// Good
await expect(page.getByRole('heading', { name: 'Space Name' })).toBeVisible();

// Less clear
await expect(page.locator('h1')).toBeVisible();
```

### 3. Wait for Stability

Always wait for actions to complete:

```typescript
// Good
await page.click('button');
await page.waitForLoadState('networkidle');

// Risky
await page.click('button');
// immediately assert something
```

### 4. Use Test Tags

Tag tests for easy filtering:

```typescript
test('critical user flow @smoke @critical', async ({ page }) => {
  // Test implementation
});

// Run only smoke tests
// npx playwright test --grep @smoke
```

## Debugging Tests

### 1. Use Playwright Inspector

```bash
npx playwright test space-test --debug
```

### 2. Take Screenshots on Failure

Already configured in `playwright.config.ts`, but you can manually add:

```typescript
test('my test', async ({ page }) => {
  try {
    // Test steps
  } catch (error) {
    await page.screenshot({ path: 'debug-screenshot.png' });
    throw error;
  }
});
```

### 3. View Test Trace

After test run:

```bash
npx playwright show-trace trace.zip
```

### 4. Console Logs

View browser console in test:

```typescript
page.on('console', msg => console.log('Browser:', msg.text()));
```

## Continuous Integration

### Running in CI

The tests are configured to run in CI with:

- Headless mode
- Retry on failure (2 retries)
- Single worker (no parallel execution)
- HTML report generation

### CI Environment Setup

Ensure CI has:

- Node.js 20.9.0+
- Playwright browsers installed
- Environment variables configured
- Access to test API endpoints

## Troubleshooting

### Seed Fails to Create Space

**Issue**: TestScenarioFactory fails
**Solution**:

- Check API endpoint is accessible
- Verify authentication credentials
- Check network connectivity
- Review API logs for errors

### Authentication Fails

**Issue**: loginWithEnvCredentials fails
**Solution**:

- Verify AUTH_TEST_HARNESS_EMAIL and AUTH_TEST_HARNESS_PASSWORD
- Check user exists in target environment
- Verify login endpoint is accessible
- Check for authentication method changes

### Tests Are Flaky

**Issue**: Tests pass/fail inconsistently
**Solution**:

- Add proper waits (`waitForLoadState`, `waitForSelector`)
- Increase timeout for slow operations
- Check for race conditions
- Ensure test independence

### Cannot Find Elements

**Issue**: Selectors don't match elements
**Solution**:

- Use Playwright Inspector to find correct selectors
- Prefer role-based selectors (more stable)
- Check if element is in iframe
- Verify element actually exists in current state

## Contributing

When adding new tests:

1. Follow existing test structure
2. Update this README if adding new test files
3. Add scenarios to SPACE_TEST_PLAN.md
4. Use descriptive test names
5. Add comments for complex logic
6. Ensure tests are independent
7. Verify tests pass locally before committing

## Support

For questions or issues:

- Check the main test suite documentation
- Review Playwright documentation: https://playwright.dev
- Check existing test examples in other test folders
- Consult the Alkemio development team

## License

EUPL-1.2 - See LICENSE file for details
