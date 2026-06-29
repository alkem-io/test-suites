import { test, expect } from '@playwright/test';
import {
  TestScenarioConfig,
  TestUser,
  TestScenarioFactory,
} from '@alkemio/tests-lib';
import { OrganizationWithSpaceModel } from '@alkemio/tests-lib/scenario/models/OrganizationWithSpaceModel';

const password = process.env.AUTH_TEST_HARNESS_PASSWORD || 'change_me';
const baseUrl = process.env.ALKEMIO_BASE_URL || 'http://localhost:3000';

let baseScenario: OrganizationWithSpaceModel;

const scenarioConfig: TestScenarioConfig = {
  name: 'home-menus',
  space: {
    collaboration: {
      addTutorialCallouts: false,
    },
    community: {
      admins: [TestUser.SPACE_ADMIN],
      members: [TestUser.SPACE_MEMBER],
    },
  },
};

test.describe.skip('Home Page Menus', () => {
  test.beforeAll(async () => {
    baseScenario = await TestScenarioFactory.createBaseScenario(scenarioConfig);
  });

  test.afterAll(async () => {
    await TestScenarioFactory.cleanUpBaseScenario(baseScenario);
  });

  test.beforeEach(async ({ page }) => {
    // CRD header uses a direct "Log in" link (not the MUI PersonIcon menu).
    // NOTE: this describe block remains test.skip — selectors migrated only.
    await page.goto(baseUrl);
    const cookieButton = page.getByRole('button', {
      name: 'Accept All Cookies',
    });
    if (await cookieButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await cookieButton.click();
    }
    const loginLink = page.getByRole('link', { name: 'Log in', exact: true });
    await loginLink.waitFor({ state: 'visible', timeout: 30_000 });
    await loginLink.click();
    await page.waitForURL(/.*login.*/);
    await page.getByRole('textbox', { name: 'E-Mail' }).fill('admin@alkem.io');
    await page.getByRole('textbox', { name: 'Password' }).fill(password);
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    await page.waitForURL(`${baseUrl}/home`);
  });

  test('Tools Menu Navigation', async ({ page }) => {
    // Open Tools Menu
    await page.getByRole('button', { name: 'Tools Menu' }).click();

    // Verify Template Library
    const templateLibraryLink = page.getByRole('menuitem', {
      name: 'Template Library',
    });
    await expect(templateLibraryLink).toBeVisible();
    await expect(templateLibraryLink).toHaveAttribute(
      'href',
      '/innovation-library'
    );

    // Verify Forum
    const forumLink = page.getByRole('menuitem', { name: 'Alkemio Forum' });
    await expect(forumLink).toBeVisible();
    await expect(forumLink).toHaveAttribute('href', '/forum');

    // Verify Explore Spaces
    const exploreSpacesLink = page.getByRole('menuitem', {
      name: 'Explore Spaces',
    });
    await expect(exploreSpacesLink).toBeVisible();
    await expect(exploreSpacesLink).toHaveAttribute('href', '/spaces');

    // Verify Contributors
    const contributorsLink = page.getByRole('menuitem', {
      name: 'Find contributors',
    });
    await expect(contributorsLink).toBeVisible();
    await expect(contributorsLink).toHaveAttribute('href', '/contributors');

    // Verify Powered by
    const poweredByLink = page.getByRole('link', { name: 'Powered by' });
    await expect(poweredByLink).toBeVisible();
    await expect(poweredByLink).toHaveAttribute('href', '/home');
  });

  test('User Menu Navigation', async ({ page }) => {
    // Open User Menu
    await page.getByRole('img', { name: 'User Menu' }).click();

    // Verify Dashboard
    const dashboardLink = page.getByRole('menuitem', { name: 'My Dashboard' });
    await expect(dashboardLink).toBeVisible();
    await expect(dashboardLink).toHaveAttribute('href', '/home');

    // Verify Profile
    const profileLink = page.getByRole('menuitem', { name: 'My profile' });
    await expect(profileLink).toBeVisible();
    await expect(profileLink).toHaveAttribute('href', '/user/admin-alkemio');

    // Verify Account
    const accountLink = page.getByRole('menuitem', { name: 'My Account' });
    await expect(accountLink).toBeVisible();
    await expect(accountLink).toHaveAttribute(
      'href',
      '/user/admin-alkemio/settings/account'
    );

    // Verify Log out
    const logoutButton = page.getByRole('menuitem', { name: 'Sign out' });
    await expect(logoutButton).toBeVisible();
  });

  test('Left Sidebar Menu Navigation', async ({ page }) => {
    // Verify Invitations
    await page.getByRole('button', { name: 'Invitations' }).click();
    await expect(
      page.getByRole('dialog', { name: 'My Pending Memberships' })
    ).toBeVisible();
    await page.getByRole('button', { name: 'Close' }).click();
    await expect(
      page.getByRole('dialog', { name: 'My Pending Memberships' })
    ).toBeHidden();

    // Verify My Latest Activity
    await page.getByRole('button', { name: 'My Latest Activity' }).click();
    await expect(
      page.getByRole('dialog', { name: 'My Latest Activity' })
    ).toBeVisible();
    await page.getByRole('button', { name: 'Close' }).click();
    await expect(
      page.getByRole('dialog', { name: 'My Latest Activity' })
    ).toBeHidden();

    // Verify Latest Activity In My Spaces
    await page
      .getByRole('button', { name: 'Latest Activity In My Spaces' })
      .click();
    await expect(
      page.getByRole('dialog', { name: 'Latest Activity In My Spaces' })
    ).toBeVisible();
    await page.getByRole('button', { name: 'Close' }).click();
    await expect(
      page.getByRole('dialog', { name: 'Latest Activity In My Spaces' })
    ).toBeHidden();

    // Verify Tips & Tricks
    await page.getByRole('button', { name: 'Tips & Tricks' }).click();
    await expect(
      page.getByRole('dialog', { name: 'Tips & Tricks' })
    ).toBeVisible();
    await page.getByRole('button', { name: 'Close' }).click();
    await expect(
      page.getByRole('dialog', { name: 'Tips & Tricks' })
    ).toBeHidden();

    // Verify My Account
    const myAccountLink = page.getByRole('link', { name: 'My Account' });
    await expect(myAccountLink).toBeVisible();
    await expect(myAccountLink).toHaveAttribute(
      'href',
      '/user/admin-alkemio/settings/account'
    );

    // Verify Create my own Space
    const createSpaceLink = page.getByRole('link', {
      name: 'Create my own Space',
    });
    await expect(createSpaceLink).toBeVisible();
    await expect(createSpaceLink).toHaveAttribute(
      'href',
      expect.stringMatching(
        /^(https:\/\/welcome\.alkem\.io\/want-to-own-space\/|\/user\/admin-alkemio\/settings\/account)$/
      )
    );

    // Verify Activity View Toggle
    const activityViewCheckbox = page.getByRole('checkbox', {
      name: 'Activity View',
    });
    await activityViewCheckbox.click();
    await expect(activityViewCheckbox).toBeChecked();
    // Verify that the view changed (e.g., sidebar items might change or main content updates)
    // Based on manual verification, "Latest Activity in my Spaces" heading appeared in main content
    await expect(
      page.getByRole('heading', { name: 'Latest Activity in my Spaces' })
    ).toBeVisible();
  });
});
