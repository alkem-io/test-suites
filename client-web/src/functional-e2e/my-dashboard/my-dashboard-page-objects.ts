import { Page, expect } from '@playwright/test';
import {
  logInHeaderLink,
  userMenuAvatar,
} from '../authentication/common-authentication-page-elements';

const baseUrl = process.env.ALKEMIO_BASE_URL || 'http://localhost:3000';

/**
 * The session is signed in — wherever the app landed. After sign-in the
 * client returns the user to their LAST VISITED SPACE when it knows one, and
 * to /home otherwise, so neither the URL nor a dashboard-only element is a
 * valid "signed in" signal (the 2026-10-08 nightly's login reds were exactly
 * that: a persona that had visited a space landed there, and the test waited
 * for the dashboard's "Tips & tricks"). The header is the contract.
 *
 * Order matters. The anonymous header renders "Search", "Platform navigation"
 * and a "Log in" link; only a signed-in header renders "Notifications". So
 * first wait for that authenticated-only control (which also proves the header
 * has rendered), and only then assert the "Log in" link is absent — checked
 * the other way round, the absence passes before the header exists and an
 * anonymous page goes green (reproduced 6/6 against develop).
 */
export const expectSignedIn = async (page: Page) => {
  const banner = page.getByRole('banner');
  await expect(
    banner.getByRole('button', { name: 'Notifications', exact: true })
  ).toBeVisible();
  await expect(logInHeaderLink(page)).toHaveCount(0);
  await expect(userMenuAvatar(page)).toBeVisible();
};

/**
 * The page on screen IS the authenticated home ("My dashboard"): the
 * signed-in header AND the dashboard's own "Tips & tricks" entry, which no
 * anonymous, error or space page renders. Use it where the test has navigated
 * to /home itself; after a sign-in redirect use `expectSignedIn`.
 */
export const expectOnDashboard = async (page: Page) => {
  await expectSignedIn(page);
  await expect(
    page.getByRole('button', { name: 'Tips & Tricks', exact: true })
  ).toBeVisible();
};

/** Navigates to /home, then `expectOnDashboard`. */
export const expectAuthenticatedDashboard = async (page: Page) => {
  await page.goto(`${baseUrl}/home`);
  await expectOnDashboard(page);
};

/** @deprecated use `expectSignedIn` (kept for the specs not yet migrated). */
export const verifyMyDashboardWelcomeElement = expectSignedIn;
