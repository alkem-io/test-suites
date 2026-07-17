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
import {
  navigateToLoginPageFromMenu,
} from './authentication/login-page-objects';
import {
  fillUpSignInPageElements,
  pressSignInButtonSignInPage,
} from './identity-flows/signin-page-objects';
import { verifyMyDashboardWelcomeElement } from './my-dashboard/my-dashboard-page-objects';

const baseUrl = process.env.ALKEMIO_BASE_URL || 'http://localhost:3000';
const serverHealthUrl =
  process.env.ALKEMIO_SERVER_HEALTH_URL || 'http://localhost:4000/health/ready';
const publicGraphqlUrl =
  process.env.ALKEMIO_PUBLIC_GRAPHQL_URL ||
  `${baseUrl}/api/public/graphql`;
const adminEmail = process.env.AUTH_ADMIN_EMAIL || 'admin@alkem.io';
const adminPassword = process.env.AUTH_TEST_HARNESS_PASSWORD || 'change_me';

test.describe(
  'TS7 upgrade — platform behavior unchanged (US2)',
  { tag: '@forge-acceptance' },
  () => {
    test.beforeEach(async ({ context }) => {
      await context.clearCookies();
    });

    test('US2-AS1: server readiness endpoint reports healthy', async ({
      request,
    }) => {
      const response = await request.get(serverHealthUrl);
      expect(response.status()).toBe(200);
      const body = await response.json();
      expect(body.status).toBe('ok');
    });

    test('US2-AS2: unauthenticated platform-metadata query returns the platform version', async ({
      request,
    }) => {
      const response = await request.post(publicGraphqlUrl, {
        data: {
          query:
            '{ platform { metadata { services { name version } } } }',
        },
      });
      expect(response.status()).toBe(200);
      const body = await response.json();
      const services = body?.data?.platform?.metadata?.services;
      expect(Array.isArray(services)).toBe(true);
      expect(services.length).toBeGreaterThan(0);
      expect(services[0].version).toMatch(/^\d+\.\d+\.\d+/);
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

      await verifyMyDashboardWelcomeElement(page);

      await page.goto(`${baseUrl}/home`);
      await expect(page).toHaveURL(/\/home/);

      await expect(
        page.getByRole('heading', { name: /Explore Spaces/i })
      ).toBeVisible({ timeout: 10000 });

      // At least one space card is rendered by the upgraded client bundle.
      await expect(page.getByText(/Showing \d+ spaces?/i)).toBeVisible();
    });
  }
);
