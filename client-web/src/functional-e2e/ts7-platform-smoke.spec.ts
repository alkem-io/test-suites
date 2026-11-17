// spec: agents-hq/specs/019-typescript-7-upgrade/spec.md (User Story 2 — Platform
// behavior unchanged on the dual-compiler layout, P1)
//
// Durable regression cover for the US2 live-boot acceptance walk: readiness →
// unauthenticated GraphQL metadata → login → home dashboard. Confirms the
// TypeScript 7 dual-compiler toolchain swap changed no product behavior.
// See US2-AS3/AS4 defect fix note in the feature's forge evidence ledger
// (build:dev now passes --mode development so import.meta.env.MODE agrees with
// NODE_ENV=development on the login-origin / id-token-hint code paths).

import { test, expect } from '@playwright/test';
import { readPlatformServiceVersions } from '@alkemio/tests-lib';
import {
  navigateToLoginPageFromMenu,
} from './authentication/login-page-objects';
import {
  fillUpSignInPageElements,
  pressSignInButtonSignInPage,
} from './identity-flows/signin-page-objects';
import { expectSignedIn } from './my-dashboard/my-dashboard-page-objects';

const baseUrl = process.env.ALKEMIO_BASE_URL || 'http://localhost:3000';
const serverHealthUrl =
  process.env.ALKEMIO_SERVER_HEALTH_URL || 'http://localhost:4000/health/ready';
const adminEmail = process.env.AUTH_ADMIN_EMAIL || 'admin@alkem.io';
const adminPassword = process.env.AUTH_TEST_HARNESS_PASSWORD || 'change_me';

test.describe(
  'TS7 upgrade — platform behavior unchanged (US2)',
  { tag: '@forge-acceptance' },
  () => {
    test.beforeEach(async ({ context }) => {
      await context.clearCookies();
    });

    // The cluster ingress does not route /health/ready (the client answers
    // it with index.html), so readiness is checked on the local stack only.
    test(
      'US2-AS1: server readiness endpoint reports healthy',
      { tag: '@local-stack' },
      async ({ request }) => {
        // The readiness check gives each dependency a 500 ms budget behind a
        // 2 s cache, so the first hit after idle can answer 503 while a cold
        // JWKS/Redis check runs. Poll until the steady state.
        await expect
          .poll(async () => (await request.get(serverHealthUrl)).status(), {
            timeout: 10_000,
          })
          .toBe(200);
        const body = await (await request.get(serverHealthUrl)).json();
        expect(body.status).toBe('ok');
      }
    );

    test('US2-AS2: an anonymous caller reads the platform metadata on the public endpoint', async () => {
      // Anonymous, on the PUBLIC GraphQL endpoint: the first thing a signed-out
      // visitor's client asks the server.
      const response = await readPlatformServiceVersions({ anonymous: 'public' });
      expect(response.status).toBe(200);
      expect(response.error).toBeUndefined();
      const services = response.data?.platform?.metadata?.services ?? [];
      expect(services.map(service => service.name)).toContain('alkemio-server');
    });

    // Known defect (W2 Tier 0 item 8, reproduced 2026-11-12): the deployed
    // server image reports `version: ""` for alkemio-server on test-alkem.io
    // and on alkem.io, because the container starts `node dist/main.js` and
    // the version is read from the npm environment. Defect record for the
    // lead: test-suites#724. Un-skip when the deployed server reports its
    // version.
    test.skip('US2-AS2b: the public platform metadata reports the server version (test-suites#724)', async () => {
      const response = await readPlatformServiceVersions({ anonymous: 'public' });
      const server = response.data?.platform?.metadata?.services?.find(
        service => service.name === 'alkemio-server'
      );
      expect(server?.version).toMatch(/^\d+\.\d+\.\d+/);
    });

    test('US2-AS3: login page renders and the local admin can sign in', async ({
      page,
    }) => {
      await navigateToLoginPageFromMenu(baseUrl, page);
      await expect(
        page.getByRole('heading', { name: 'Sign in', exact: true })
      ).toBeVisible();

      await fillUpSignInPageElements(adminEmail, adminPassword, page);
      await pressSignInButtonSignInPage(page);

      // Signing in lands back on an authenticated shell (not stuck on /login,
      // and never redirected off-origin to a nonexistent https://<domain>
      // host — the regression this spec guards against).
      await expect(page).not.toHaveURL(/\/login/);
      await expect(page.url()).toContain(baseUrl);
    });

    test('US2-AS4: signed-in home dashboard renders spaces from the upgraded client bundle', async ({
      page,
    }) => {
      await navigateToLoginPageFromMenu(baseUrl, page);
      await fillUpSignInPageElements(adminEmail, adminPassword, page);
      await pressSignInButtonSignInPage(page);

      await expectSignedIn(page);

      await page.goto(`${baseUrl}/home`);
      await expect(page).toHaveURL(/\/home/);

      await expect(
        page.getByRole('heading', { name: /Explore Spaces/i })
      ).toBeVisible({ timeout: 10000 });

      // The Explore block is rendered by the upgraded client bundle. Its
      // "Explore all Spaces" action is present regardless of how many spaces
      // the environment holds (a fresh env lists none).
      await expect(
        page.getByRole('button', { name: /Explore all Spaces/i })
      ).toBeVisible();
    });
  }
);
