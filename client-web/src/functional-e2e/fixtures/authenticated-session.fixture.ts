import { test as base, BrowserContext, Page } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { LoginPage } from '@src/functional-e2e/space/pages';

const baseUrl = process.env.ALKEMIO_BASE_URL || 'http://localhost:3000';

export interface AuthenticatedSessionOptions {
  storageStateName: string;
  /** Clean up storage state file after tests complete. Default: false (keep for debugging) */
  cleanupAfterTests?: boolean;
}

let sharedContext: BrowserContext;
let sharedPage: Page;

/**
 * Creates a reusable authenticated session fixture that:
 * - Logs in once in beforeAll
 * - Persists the session to a storage state file
 * - Reuses the same browser context and page across all tests
 *
 * Usage:
 * ```typescript
 * import { createAuthenticatedSessionFixture } from '@src/functional-e2e/fixtures/authenticated-session.fixture';
 *
 * const test = createAuthenticatedSessionFixture({ storageStateName: 'my-test.json' });
 *
 * test.beforeAll(async ({ browser }) => {
 *   // Your test setup here
 * });
 *
 * test('my test', async ({ page }) => {
 *   // page is already authenticated
 * });
 * ```
 */
export function createAuthenticatedSessionFixture(
  options: AuthenticatedSessionOptions
) {
  const storageStatePath = path.join(
    process.cwd(),
    '.auth',
    options.storageStateName
  );

  const test = base.extend<{ context: BrowserContext; page: Page }>({
    context: async ({}, use) => {
      await use(sharedContext);
    },
    page: async ({}, use) => {
      await use(sharedPage);
    },
  });

  return {
    test,
    /**
     * Call this in your test.beforeAll to set up authentication
     */
    setupAuthentication: async (browser: any, email: string) => {
      await fs.promises.mkdir(path.dirname(storageStatePath), {
        recursive: true,
      });
      sharedContext = await browser.newContext({ storageState: undefined });
      sharedPage = await sharedContext.newPage();
      const loginPage = new LoginPage(sharedPage, baseUrl);
      await loginPage.login(email);
      await sharedPage.context().storageState({ path: storageStatePath });
    },
    /**
     * Call this in your test.afterAll to clean up
     */
    // teardownAuthentication: async () => {
    //   await sharedContext?.close();

    //   // Clean up storage state file if requested
    //   if (options.cleanupAfterTests) {
    //     try {
    //       await fs.promises.unlink(storageStatePath);
    //     } catch (error) {
    //       // Ignore if file doesn't exist
    //     }
    //   }
    // },
    /**
     * Get the shared page instance (useful for additional setup)
     */
    getSharedPage: () => sharedPage,
    /**
     * Get the shared context instance
     */
    getSharedContext: () => sharedContext,
  };
}
