import { test as base, Browser, BrowserContext, Page } from '@playwright/test';
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
 * Per-run cache of persona (email) → storage-state file.
 *
 * Login happens at most ONCE per persona per worker process: the first spec
 * that needs a given user drives the login form; every later spec for the same
 * user loads that persisted Kratos session from disk instead of logging in
 * again. This removes the per-file login that made the shared login page the
 * single point of failure for the whole suite — under load a slow login-form
 * render used to time out in one spec's `beforeAll` and cascade into dozens of
 * red rows across unrelated suites.
 */
const personaStatePaths = new Map<string, string>();

function personaStatePath(email: string): string {
  const slug = email.replace(/[^a-z0-9]+/gi, '-').toLowerCase();
  return path.join(process.cwd(), '.auth', `persona.${slug}.json`);
}

/**
 * Dismiss the one-time "A fresh new Alkemio is here" design dialog that can
 * overlay the shell after sign-in / first authenticated navigation.
 */
async function dismissNewDesignDialog(page: Page): Promise<void> {
  const switchToNewDesign = page.getByRole('button', {
    name: /take me to the new design/i,
  });
  if (
    await switchToNewDesign.isVisible({ timeout: 5000 }).catch(() => false)
  ) {
    await switchToNewDesign.click().catch(() => {});
  }
}

/**
 * Log a persona in once and persist its Kratos session to disk, returning the
 * storage-state path. Cached in-process for the rest of the run. The login form
 * is retried a few times so the single per-persona login is resilient to a slow
 * SPA / login-form render — the exact failure mode that flaked the full-suite
 * run when every spec logged in for itself.
 */
export async function ensurePersonaState(
  browser: Browser,
  email: string
): Promise<string> {
  const statePath = personaStatePath(email);

  // Fast path: already logged in this worker process.
  const cached = personaStatePaths.get(email);
  if (cached && fs.existsSync(cached)) return cached;

  // Survive worker restarts: Playwright recycles the worker process (e.g. after
  // a failure), which wipes the in-memory cache above. A persona file on disk is
  // from THIS run — global-setup deletes stale files at the start of every run —
  // so a fresh worker adopts it instead of driving the login form again. Without
  // this, a cold login runs inside the next spec's beforeAll and can blow its
  // (often 30s) budget, timing out the hook and cascading the whole serial file.
  if (fs.existsSync(statePath)) {
    personaStatePaths.set(email, statePath);
    return statePath;
  }

  await fs.promises.mkdir(path.dirname(statePath), { recursive: true });

  console.info(`[auth] establishing session for ${email} (first use this run)`);
  const maxAttempts = 3;
  let lastError: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const context = await browser.newContext({ storageState: undefined });
    try {
      const page = await context.newPage();
      const loginPage = new LoginPage(page, baseUrl);
      await loginPage.login(email);
      await dismissNewDesignDialog(page);
      await context.storageState({ path: statePath });
      await context.close();
      personaStatePaths.set(email, statePath);
      return statePath;
    } catch (error) {
      lastError = error;
      await context.close().catch(() => {});
      console.warn(
        `[auth] login for ${email} failed (attempt ${attempt}/${maxAttempts}): ${
          (error as Error)?.message ?? error
        }`
      );
    }
  }
  throw new Error(
    `[auth] could not establish a session for ${email} after ${maxAttempts} attempts: ${
      (lastError as Error)?.message ?? lastError
    }`
  );
}

/**
 * A Playwright `test` whose default `page` / `context` are already authenticated
 * as the given persona, by overriding the built-in `storageState` option with
 * the shared per-run session (logs in at most once per persona per run).
 *
 * Prefer this for simple specs that just need an authenticated page: Playwright
 * manages the context/page lifecycle itself (a fresh context per test), so there
 * are no shared-singleton hazards. `createAuthenticatedSessionFixture` remains
 * for specs that deliberately reuse one context/page across a serial block.
 *
 * Usage:
 * ```typescript
 * const test = createPersonaTest(TestUserManager.users.globalAdmin.email);
 * test('...', async ({ page }) => { await page.goto(...); }); // already logged in
 * ```
 */
export function createPersonaTest(email: string) {
  return base.extend({
    storageState: async ({ browser }, use) => {
      await use(await ensurePersonaState(browser, email));
    },
  });
}

/**
 * Creates a reusable authenticated session fixture that:
 * - Reuses a per-persona Kratos session (logging in at most once per user/run)
 * - Exposes the same authenticated browser context and page across all tests
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
     * Call this in your test.beforeAll to set up authentication. Logs the
     * persona in only on the first spec that needs it; subsequent specs load
     * the cached session.
     */
    setupAuthentication: async (browser: Browser, email: string) => {
      const statePath = await ensurePersonaState(browser, email);

      // Preserve the previous behaviour of exposing a per-spec storage-state
      // file (handy for debugging and honoured by cleanupAfterTests) by copying
      // the shared persona session to this fixture's named file.
      await fs.promises.mkdir(path.dirname(storageStatePath), {
        recursive: true,
      });
      await fs.promises.copyFile(statePath, storageStatePath);

      sharedContext = await browser.newContext({ storageState: statePath });
      sharedPage = await sharedContext.newPage();
      // Land on the authenticated home, matching the post-login state tests
      // previously received (LoginPage.login ends on /home).
      await sharedPage.goto(`${baseUrl}/home`);
      await dismissNewDesignDialog(sharedPage);
    },
    /**
     * Call this in your test.afterAll to clean up
     */
    teardownAuthentication: async () => {
      await sharedContext?.close();

      // Clean up the per-spec storage state file if requested. The shared
      // persona cache file is intentionally left in place for reuse.
      if (options.cleanupAfterTests) {
        try {
          await fs.promises.unlink(storageStatePath);
        } catch {
          // Ignore if file doesn't exist
        }
      }
    },
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
