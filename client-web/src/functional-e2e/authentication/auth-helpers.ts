import { Page } from '@playwright/test';
import dotenv from 'dotenv';
import { testConfiguration } from '@src/config/test.configuration';
import { navigateToLoginPageFromMenu } from './login-page-objects';
import {
  fillUpSignInPageElements,
  pressSignInButtonSignInPage,
} from '../identity-flows/signin-page-objects';
import { verifyMyDashboardWelcomeElement } from '../my-dashboard/my-dashboard-page-objects';

export interface LoginOptions {
  /**
   * When true (default), verifies the dashboard welcome element after sign-in.
   */
  verify?: boolean;
  /**
   * Custom expected display name (fallback "admin"). Only used if verify=true.
   */
  expectedDisplayName?: string;
  /**
   * Override base URL (defaults to testConfiguration.endPoints.server)
   */
  baseUrl?: string;
}

/**
 * Low-level login helper using provided credentials.
 * Navigates to login page via menu, fills credentials, presses sign-in.
 */
export const login = async (
  page: Page,
  email: string,
  password: string,
  opts: LoginOptions = {}
): Promise<void> => {
  const { verify = true, expectedDisplayName = 'admin', baseUrl } = opts;
  const serverBase = baseUrl || testConfiguration.endPoints.server;
  await navigateToLoginPageFromMenu(serverBase, page);
  await fillUpSignInPageElements(email, password, page);
  await pressSignInButtonSignInPage(page);
  if (verify) {
    await verifyMyDashboardWelcomeElement(page, expectedDisplayName);
  }
};

/**
 * Logs in using credentials supplied via environment variables (.env) or testConfiguration.
 * Required env vars (with fallbacks):
 *  AUTH_TEST_HARNESS_EMAIL (fallback testConfiguration.identities.admin.email)
 *  AUTH_TEST_HARNESS_PASSWORD (fallback testConfiguration.identities.admin.password)
 * Throws a descriptive error if credentials are missing or still set to placeholder.
 */
export const loginWithEnvCredentials = async (
  page: Page,
  opts: LoginOptions = {}
): Promise<void> => {
  dotenv.config();
  const email =
    process.env.AUTH_TEST_HARNESS_EMAIL ||
    testConfiguration.identities.admin.email;
  const password =
    process.env.AUTH_TEST_HARNESS_PASSWORD ||
    testConfiguration.identities.admin.password;

  if (!email) {
    throw new Error(
      'AUTH_TEST_HARNESS_EMAIL not set (and no fallback in configuration).'
    );
  }
  if (!password || password === 'not set') {
    throw new Error(
      'AUTH_TEST_HARNESS_PASSWORD not set or using placeholder value.'
    );
  }
  await login(page, email, password, { expectedDisplayName: 'admin', ...opts });
};
