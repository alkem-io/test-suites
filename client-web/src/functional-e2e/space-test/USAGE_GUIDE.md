# How to Use the Space Test Suite

This guide explains how to effectively use the seed file and test scenarios to validate Space functionality.

## Understanding the Seed File

The `seed.spec.ts` file is the **foundation** for all space tests. It runs before any other tests and sets up the required test environment.

### What Happens in the Seed

```typescript
// 1. CREATE TEST DATA
await TestScenarioFactory.createBaseScenarioEmpty(scenarioConfig);
```

This creates:

- ✅ A complete Space with the specified configuration
- ✅ Space Admin user (TestUser.SPACE_ADMIN)
- ✅ Space Member user (TestUser.SPACE_MEMBER)
- ✅ Post collection callout (enabled in config)
- ✅ All necessary backend data and relationships

```typescript
// 2. AUTHENTICATE USER
await loginWithEnvCredentials(page, { verify: true });
```

This:

- ✅ Logs in with credentials from environment variables
- ✅ Verifies login was successful (checks for dashboard elements)
- ✅ Establishes authenticated session for subsequent tests

```typescript
// 3. NAVIGATE TO SPACE
await page.goto(baseUrl);
await page.waitForLoadState('networkidle');
```

This:

- ✅ Navigates to the created space
- ✅ Waits for page to fully load
- ✅ Ensures stable starting state for tests

## Running Tests Step-by-Step

### Step 1: Set Up Environment Variables

Create or update your `.env` file:

```bash
# Authentication credentials
AUTH_TEST_HARNESS_EMAIL=admin@alkem.io
AUTH_TEST_HARNESS_PASSWORD=YourSecurePassword123!

# Base URL for the application
ALKEMIO_BASE_URL=http://localhost:3000
# OR for dev environment:
# ALKEMIO_BASE_URL=https://dev-alkem.io

# GraphQL API endpoint
ALKEMIO_API_ENDPOINT=http://localhost:3000/api/graphql
```

### Step 2: Verify Seed Works

Run just the seed file to ensure setup works:

```bash
npx playwright test space-test/seed.spec.ts --headed
```

Watch the browser:

1. Space should be created via API
2. Login page should appear and login automatically
3. Should navigate to the created space
4. Space should show Home, Community, Subspaces tabs

### Step 3: Run Individual Test Files

Once seed works, run specific test suites:

```bash
# Test space creation
npx playwright test space-test/space-creation.spec.ts

# Test navigation
npx playwright test space-test/space-navigation.spec.ts

# Test membership
npx playwright test space-test/space-membership.spec.ts

# Test settings
npx playwright test space-test/space-settings.spec.ts

# Test subspaces
npx playwright test space-test/space-subspaces.spec.ts
```

### Step 4: Run All Space Tests

```bash
# Run all space tests together
npx playwright test space-test

# Run with HTML report
npx playwright test space-test --reporter=html

# Run specific test by name
npx playwright test space-test -g "should create space with all required fields"
```

## Test File Structure Explained

Each test file follows this pattern:

```typescript
import { test, expect } from '@playwright/test';

// Clear description of what this file tests
test.describe('Feature Area', () => {
  // Setup that runs before each test
  test.beforeEach(async ({ page }) => {
    // Navigate to relevant section
    // Seed has already run - space exists and user is logged in
  });

  // Individual test scenario
  test.describe('Specific Scenario', () => {
    test('should do something specific', async ({ page }) => {
      // 1. Perform actions
      await page.click('button');

      // 2. Verify results
      await expect(page.locator('text=Success')).toBeVisible();
    });
  });
});
```

## Working with the Seed Data

### Accessing Created Users

The seed creates these users that you can use in tests:

```typescript
import { TestUser } from '@alkemio/tests-lib';

// In your test:
// TestUser.SPACE_ADMIN - Has admin permissions
// TestUser.SPACE_MEMBER - Has member permissions
```

### Modifying Seed Configuration

To change what the seed creates, edit the `scenarioConfig` in `seed.spec.ts`:

```typescript
const scenarioConfig: TestScenarioConfig = {
  name: 'space-test-scenario',
  space: {
    collaboration: {
      addPostCollectionCallout: true, // ← Enable/disable
      addTutorialCallouts: false, // ← Enable/disable
    },
    community: {
      admins: [TestUser.SPACE_ADMIN], // ← Add more admins
      members: [TestUser.SPACE_MEMBER], // ← Add more members
    },
  },
};
```

### Creating Additional Test Data

If a test needs additional data beyond the seed:

```typescript
test('should work with specific data', async ({ page }) => {
  // Seed has created basic space
  // Now create additional data for this specific test

  // Example: Create a subspace
  await page.click('text=Subspaces');
  await page.click('button:has-text("Create Subspace")');
  await page.fill('input[name="displayName"]', 'Test Subspace');
  await page.fill('input[name="nameID"]', 'test-subspace');
  await page.click('button[type="submit"]');

  // Continue with test...
});
```

## Common Patterns and Solutions

### Pattern 1: Checking if Element Exists

```typescript
// Good: Safe way to check existence
const button = page.locator('button:has-text("Create")');
const isVisible = await button.isVisible({ timeout: 3000 });

if (isVisible) {
  await button.click();
  // ... continue test
} else {
  console.log('Button not visible - user may lack permissions');
}
```

### Pattern 2: Finding Elements Flexibly

```typescript
// Use multiple selectors for resilience
const settingsButton = page
  .locator(
    'button:has-text("Settings"), ' +
      'a:has-text("Settings"), ' +
      '[data-testid="settings"]'
  )
  .first();
```

### Pattern 3: Waiting for Actions to Complete

```typescript
// Always wait after actions that trigger navigation or API calls
await page.click('button:has-text("Save")');
await page.waitForLoadState('networkidle'); // Wait for network requests

// Or wait for specific elements
await expect(page.locator('text=Saved successfully')).toBeVisible();
```

### Pattern 4: Handling Optional Features

```typescript
// Features might not be available in all environments
const feature = page.locator('.optional-feature');

if (await feature.isVisible()) {
  // Test the feature
  await feature.click();
  // ... assertions
} else {
  console.log('Optional feature not available');
  // Test passes without testing this feature
}
```

### Pattern 5: Cleaning Up After Tests

```typescript
test('should create and delete item', async ({ page }) => {
  // Create item
  const itemName = `Test Item ${Date.now()}`;
  await page.fill('input[name="name"]', itemName);
  await page.click('button:has-text("Create")');

  // Test with item
  await expect(page.locator(`text=${itemName}`)).toBeVisible();

  // Clean up: delete item
  await page.click(`text=${itemName}`);
  await page.click('button:has-text("Delete")');
  await page.click('button:has-text("Confirm")');

  // Verify cleanup
  await expect(page.locator(`text=${itemName}`)).not.toBeVisible();
});
```

## Debugging Tests

### Enable Headed Mode

See what's happening in the browser:

```bash
npx playwright test space-test --headed
```

### Use Playwright Inspector

Step through tests interactively:

```bash
npx playwright test space-test --debug
```

### Add Console Logs

```typescript
test('my test', async ({ page }) => {
  console.log('Current URL:', page.url());

  await page.click('button');
  console.log('Clicked button');

  const text = await page.locator('h1').textContent();
  console.log('Page heading:', text);
});
```

### Capture Screenshots

```typescript
test('debugging test', async ({ page }) => {
  await page.screenshot({ path: 'before-action.png' });

  await page.click('button');

  await page.screenshot({ path: 'after-action.png' });
});
```

### View Browser Console

```typescript
test('check console', async ({ page }) => {
  // Listen to console messages
  page.on('console', msg => {
    console.log('Browser console:', msg.type(), msg.text());
  });

  // Your test actions...
});
```

## Test Execution Flow

Here's what happens when you run the full suite:

```
1. SEED PHASE (seed.spec.ts)
   ├─ Create space via TestScenarioFactory
   ├─ Login user via loginWithEnvCredentials
   └─ Navigate to space

2. SPACE CREATION TESTS (space-creation.spec.ts)
   ├─ Test creating new spaces
   ├─ Test validation
   └─ Test edge cases

3. NAVIGATION TESTS (space-navigation.spec.ts)
   ├─ Test Home tab
   ├─ Test Community tab
   └─ Test Subspaces tab

4. MEMBERSHIP TESTS (space-membership.spec.ts)
   ├─ Test viewing members
   ├─ Test invitations
   └─ Test role management

5. SETTINGS TESTS (space-settings.spec.ts)
   ├─ Test general settings
   ├─ Test privacy settings
   └─ Test collaboration settings

6. SUBSPACES TESTS (space-subspaces.spec.ts)
   ├─ Test creating subspaces
   ├─ Test navigation
   └─ Test nested subspaces
```

## Frequently Asked Questions

### Q: Why do tests fail with "element not found"?

**A:** Usually means:

1. Selector is incorrect - use Playwright Inspector to find correct selector
2. Element hasn't loaded yet - add `await page.waitForLoadState('networkidle')`
3. Feature is not available in this environment - add conditional checks

### Q: How do I test as a different user?

**A:** Currently the seed logs in as one user. To test as different users:

1. Create a new test file with its own seed that logs in as different user
2. Or implement user switching within tests (advanced)
3. Or use Playwright's user context feature (advanced)

### Q: Can I run tests in parallel?

**A:** Yes, but be careful:

- Tests that modify the same space should not run in parallel
- Tests that create new spaces can run in parallel
- Configure in `playwright.config.ts`: `workers: 4`

### Q: How do I skip a test temporarily?

**A:** Use `test.skip()`:

```typescript
test.skip('temporarily disabled test', async ({ page }) => {
  // This test won't run
});
```

### Q: What if the seed fails?

**A:**

1. Check API endpoint is accessible
2. Verify authentication credentials are correct
3. Check database is accessible and has permissions
4. Review API logs for errors
5. Try running seed in headed mode to see what's happening

## Best Practices Checklist

✅ **DO:**

- Write descriptive test names
- Add comments explaining complex logic
- Use data-testid attributes for stable selectors
- Wait for actions to complete before asserting
- Clean up test data when possible
- Make tests independent of each other
- Use Page Object Models for complex pages

❌ **DON'T:**

- Hard-code test data that could conflict
- Assume specific element positions
- Chain too many actions without assertions
- Depend on test execution order
- Leave failing tests in the suite
- Use overly specific selectors that break easily
- Test implementation details

## Next Steps

1. ✅ Ensure seed works in your environment
2. ✅ Run each test file individually to verify they work
3. ✅ Review SPACE_TEST_PLAN.md for additional scenarios to implement
4. ✅ Customize tests for your specific requirements
5. ✅ Add tests to your CI/CD pipeline
6. ✅ Maintain tests as features evolve

## Additional Resources

- [Playwright Documentation](https://playwright.dev)
- [Playwright Best Practices](https://playwright.dev/docs/best-practices)
- [Writing Effective Tests](https://playwright.dev/docs/writing-tests)
- [Debugging Tests](https://playwright.dev/docs/debug)
- [Alkemio Test Library Documentation](../../lib/README.md)

## Support

For issues or questions:

- Check test output and error messages carefully
- Review this guide and README.md
- Check Playwright documentation
- Consult with the QA team or development team
