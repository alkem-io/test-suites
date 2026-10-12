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
 * for the dashboard's "Tips & tricks"). The header is the contract: the
 * anonymous "Log in" link is gone and the user menu is rendered.
 */
export const expectSignedIn = async (page: Page) => {
  await expect(logInHeaderLink(page)).toHaveCount(0);
  await expect(userMenuAvatar(page)).toBeVisible();
};

/**
 * The authenticated home ("My dashboard"): navigates there explicitly, then
 * asserts the signed-in header AND the dashboard's own "Tips & tricks" entry,
 * which no anonymous or error page renders.
 */
export const expectAuthenticatedDashboard = async (page: Page) => {
  await page.goto(`${baseUrl}/home`);
  await expectSignedIn(page);
  await expect(page.getByText(/tips\s*&\s*tricks/i).first()).toBeVisible();
};

/** @deprecated use `expectSignedIn` (kept for the specs not yet migrated). */
export const verifyMyDashboardWelcomeElement = expectSignedIn;
