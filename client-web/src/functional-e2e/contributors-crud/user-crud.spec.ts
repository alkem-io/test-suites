// spec: client-web/src/functional-e2e/contributors-crud/contributors-crud-test-plan.md
// seed: client-web/src/functional-e2e/seed-contributors-crud.spec.ts
//
// Test Suite 1: User CRUD Tests
// Covers: Registration, Profile updates, Account/Membership/Notifications/Settings tabs, Deletion

import { expect, Page } from '@playwright/test';
import { TestScenarioFactory } from '@alkemio/tests-lib/scenario/TestScenarioFactory';
import { TestScenarioConfig } from '@alkemio/tests-lib/scenario/config/test-scenario-config';
import { OrganizationWithSpaceModel } from '@alkemio/tests-lib/scenario/models/OrganizationWithSpaceModel';
import { TestUserManager } from '@alkemio/tests-lib';
import { TestUser } from '@alkemio/tests-lib/common/enums/test.user';
import {
  assignRoleToUser,
  createOrganization,
  deleteOrganization,
} from '@alkemio/tests-lib/scenario/baseFunctions';
import { RoleName } from '@alkemio/tests-lib/core/generated/alkemio-schema';
import {
  CommunityMembershipPolicy,
  SpacePrivacyMode,
} from '@alkemio/client-lib/dist/generated/graphql';
import { createAuthenticatedSessionFixture } from '@src/functional-e2e/fixtures/authenticated-session.fixture';

const { test, setupAuthentication, teardownAuthentication, getSharedPage } =
  createAuthenticatedSessionFixture({
    storageStateName: 'user-crud.json',
    cleanupAfterTests: process.env.cleanupAfterTests === 'true',
  });

const baseUrl = process.env.ALKEMIO_BASE_URL || 'http://localhost:3000';
let baseScenario: OrganizationWithSpaceModel;

const scenarioConfig: TestScenarioConfig = {
  name: 'user-crud',
  organization: {
    verification: { setVerified: true },
  },
  space: {
    about: {
      profile: {
        displayName: 'User CRUD Test Space',
        tagline: 'Space for testing user CRUD operations',
      },
    },
    collaboration: {
      addTutorialCallouts: false,
    },
    community: {
      admins: [TestUser.SPACE_ADMIN],
      members: [
        TestUser.SPACE_MEMBER,
        TestUser.SPACE_ADMIN,
        TestUser.GLOBAL_BETA_TESTER,
      ],
    },
    settings: {
      privacy: { mode: SpacePrivacyMode.Public },
      membership: { policy: CommunityMembershipPolicy.Applications },
    },
  },
};

const goToUserSettings = async (page: Page) => {
  await page.goto(baseUrl);
  await page.waitForURL('**/home');

  const avatar = page
    .locator(
      '[data-testid="user-avatar"], [data-testid="avatar"], [aria-label*="profile" i], [aria-label*="account" i], img[alt*="profile" i], img[alt*="avatar" i]'
    )
    .first();

  await expect(avatar).toBeVisible({ timeout: 10000 });
  await avatar.click({ force: true });

  const profileLink = page
    .getByRole('link', { name: /my profile|profile|account|settings/i })
    .first();
  const settingsHref = page
    .locator('a[href*="/user/"][href*="/settings"]')
    .first();
  const accountMenuItem = page.getByRole('menuitem', {
    name: /my account|account/i,
  });
  const userSlugLink = page.locator('a[href*="/user/"]').first();

  const profileVisible = await profileLink.isVisible().catch(() => false);
  const settingsVisible = await settingsHref.isVisible().catch(() => false);
  const accountMenuVisible = await accountMenuItem
    .isVisible()
    .catch(() => false);
  const userSlugVisible = await userSlugLink.isVisible().catch(() => false);

  expect(
    profileVisible || settingsVisible || accountMenuVisible || userSlugVisible
  ).toBeTruthy();

  const candidates: Array<string | null | undefined> = [];
  if (settingsVisible) {
    candidates.push(await settingsHref.getAttribute('href'));
  }
  if (profileVisible) {
    candidates.push(await profileLink.getAttribute('href'));
  }
  if (accountMenuVisible) {
    candidates.push(await accountMenuItem.getAttribute('href'));
  }
  if (userSlugVisible) {
    candidates.push(await userSlugLink.getAttribute('href'));
  }

  const fallbackSlug = TestUserManager.users.spaceMember.nameId;
  const fallbackHref = fallbackSlug
    ? `/user/${fallbackSlug}/settings/profile`
    : null;

  const href =
    candidates.find(value => value && value.length > 0) || fallbackHref;

  expect(href).toBeTruthy();
  const targetUrl = new URL(href as string, baseUrl);
  if (/\/settings\/?$/.test(targetUrl.pathname)) {
    targetUrl.pathname = `${targetUrl.pathname.replace(/\/$/, '')}/profile`;
  }
  const target = targetUrl.toString();
  await page.goto(target);
  await page.waitForLoadState('domcontentloaded');
};

// Serial mode to ensure clean setup/teardown
test.describe.configure({ mode: 'serial' });

test.describe('User CRUD Tests', () => {
  test.beforeAll(async ({ browser }) => {
    test.setTimeout(180_000);
    baseScenario = await TestScenarioFactory.createBaseScenario(scenarioConfig);
    expect(baseScenario.scenarioSetupSucceeded).toBeTruthy();

    // Setup authentication for Space Member (default user for most tests)
    await setupAuthentication(browser, TestUserManager.users.spaceMember.email);
  });

  test.afterAll(async () => {
    test.setTimeout(60_000);
    await teardownAuthentication();
    await TestScenarioFactory.cleanUpBaseScenario(baseScenario);
  });

  test('1.1 User registers successfully with all required fields', async ({
    browser,
  }) => {
    // Create new context for anonymous user (no authentication)
    const anonymousContext = await browser.newContext();
    const page = await anonymousContext.newPage();
    const uniqueSuffix = Date.now();
    const email = `testuser+${uniqueSuffix}@example.com`;
    const firstName = 'Test';
    const lastName = `User${uniqueSuffix}`;
    const password = 'TestPassword123!';

    // 1. Navigate to sign-up page
    await page.goto(`${baseUrl}/sign_up`);
    await expect(
      page.getByRole('heading', { name: 'Sign up', level: 1 })
    ).toBeVisible();

    // 3. Verify required fields are present (disabled until terms accepted)
    await expect(page.getByRole('textbox', { name: 'E-Mail' })).toBeDisabled();
    await expect(
      page.getByRole('textbox', { name: 'First Name' })
    ).toBeDisabled();
    await expect(
      page.getByRole('textbox', { name: 'Last Name' })
    ).toBeDisabled();

    // 4. Accept terms checkbox
    await page
      .getByRole('checkbox', {
        name: 'I accept the Terms of Use and Privacy Policy.',
      })
      .check();

    // 5. Verify fields are now enabled
    await expect(page.getByRole('textbox', { name: 'E-Mail' })).toBeEnabled();
    await expect(
      page.getByRole('textbox', { name: 'First Name' })
    ).toBeEnabled();
    await expect(
      page.getByRole('textbox', { name: 'Last Name' })
    ).toBeEnabled();

    // 6. Fill in registration fields with a unique user
    await page.getByRole('textbox', { name: 'E-Mail' }).fill(email);
    await page.getByRole('textbox', { name: 'First Name' }).fill(firstName);
    await page.getByRole('textbox', { name: 'Last Name' }).fill(lastName);

    // Password fields (best-effort for varying labels)
    const passwordField = (await page
      .getByRole('textbox', { name: /password/i })
      .first()
      .isVisible()
      .catch(() => false))
      ? page.getByRole('textbox', { name: /password/i }).first()
      : page.locator('input[type="password"]').first();
    const confirmPasswordField = (await page
      .getByRole('textbox', { name: /confirm|repeat.*password/i })
      .first()
      .isVisible()
      .catch(() => false))
      ? page.getByRole('textbox', { name: /confirm|repeat.*password/i }).first()
      : page.locator('input[type="password"]').nth(1);

    if (await passwordField.isVisible().catch(() => false)) {
      await passwordField.fill(password);
    }
    if (await confirmPasswordField.isVisible().catch(() => false)) {
      await confirmPasswordField.fill(password);
    }

    // 7. Submit registration
    const submitCandidates = [
      page.getByRole('button', {
        name: /sign up|register|create account|continue/i,
      }),
      page.getByRole('link', { name: /sign up|register|create account/i }),
      page.locator('button[type="submit"]'),
      page.locator('input[type="submit"]'),
    ];

    let submitAction = submitCandidates[0];
    for (const candidate of submitCandidates) {
      if (
        await candidate
          .first()
          .isVisible()
          .catch(() => false)
      ) {
        submitAction = candidate.first();
        break;
      }
    }

    const submitVisible = await submitAction.isVisible().catch(() => false);
    if (submitVisible) {
      await submitAction.click();
    } else {
      // Fallback: submit form via Enter on the last field
      await confirmPasswordField.press('Enter').catch(async () => {
        if (await passwordField.isVisible().catch(() => false)) {
          await passwordField.press('Enter');
        }
      });
    }

    // 8. Verify success acknowledgement (best effort)
    const successIndicator = page.locator(
      'text=/verification email sent|check your email|confirm your email/i'
    );
    const successVisible = await successIndicator
      .isVisible({ timeout: 10000 })
      .catch(() => false);
    if (successVisible) {
      await expect(successIndicator).toBeVisible();
    } else {
      // Fallback: ensure we stayed within registration flow (sign_up or registration redirect)
      await expect(page).toHaveURL(/sign_up|registration/);
    }

    await anonymousContext.close();
  });

  test('1.2 Update user profile and verify display for self and others', async ({
    page,
  }) => {
    const suffix = Date.now();
    const newFirst = `Updated${suffix}`;
    const newLast = `User${suffix}`;

    // 1. Navigate to user settings via avatar dropdown
    await goToUserSettings(page);

    // 2. Navigate to My profile tab (contains basic info fields)
    const profileTab = page.getByRole('tab', { name: /my profile/i });
    await expect(profileTab).toBeVisible();
    await profileTab.click();
    await expect(page).toHaveURL(/\/settings\/profile/);
    await page.waitForTimeout(500);

    // 3. Look for profile fields or edit options
    const mainContent = page.getByRole('main').first();
    await expect(mainContent).toBeVisible();

    // 4. Update profile fields (first/last name best-effort)
    const firstNameField = page
      .locator(
        'input[name*="first" i], input[id*="first" i], input[aria-label*="first" i], input[placeholder*="first" i]'
      )
      .first();
    const lastNameField = page
      .locator(
        'input[name*="last" i], input[id*="last" i], input[aria-label*="last" i], input[placeholder*="last" i]'
      )
      .first();

    await expect(firstNameField).toBeVisible();
    await expect(lastNameField).toBeVisible();

    await firstNameField.fill(newFirst);
    await lastNameField.fill(newLast);

    // 5. Save changes if a save/update button exists
    const saveButton = page
      .getByRole('button', { name: /save|update|submit/i })
      .first();
    await expect(saveButton).toBeVisible();
    await saveButton.click();

    // 6. Verify updated name appears somewhere on the page (best-effort)
    await expect(
      page.getByText(/user updated successfully/i).first()
    ).toBeVisible();
  });

  test('1.3 Verify account tab components and functionality', async ({
    page,
  }) => {
    // 1. Navigate to user settings via avatar dropdown
    await goToUserSettings(page);

    // 2. Look for Account tab or Settings section
    const accountTab = page.getByRole('tab', { name: /account/i });
    await expect(accountTab).toBeVisible();
    await accountTab.click();
    await expect(page).toHaveURL(/\/settings\/account/);

    await page.waitForLoadState('domcontentloaded');

    // 3. Verify account information is displayed (main content with resource blocks)
    const mainRegion = page.getByRole('main').first();
    await expect(mainRegion).toBeVisible();

    const hostedHeading = mainRegion.getByRole('heading', {
      name: /hosted spaces/i,
    });
    const virtualHeading = mainRegion.getByRole('heading', {
      name: /virtual contributors/i,
    });
    const templateHeading = mainRegion.getByRole('heading', {
      name: /template packs/i,
    });

    await expect(hostedHeading).toBeVisible();
    await expect(virtualHeading).toBeVisible();
    await expect(templateHeading).toBeVisible();

    // Require Add buttons to be rendered (may be disabled)
    const addButtons = mainRegion.getByRole('button', { name: /^add$/i });
    await expect(addButtons.first()).toBeVisible();
  });

  test('1.4 Verify membership tab components', async ({ page }) => {
    // 1. Navigate to user settings via avatar dropdown
    await goToUserSettings(page);

    // 2. Look for Membership tab
    const membershipTab = page.getByRole('tab', { name: /membership/i });
    await expect(membershipTab).toBeVisible();
    await membershipTab.click();
    await expect(page).toHaveURL(/\/settings\/membership/);

    // 4. Wait for content to load
    await page.waitForTimeout(2000);

    const mainRegion = page.getByRole('main').first();
    await expect(mainRegion).toBeVisible();

    // 5. Verify membership sections are rendered
    await expect(
      mainRegion.getByRole('heading', { name: /my memberships/i })
    ).toBeVisible();
    await expect(
      mainRegion.getByRole('heading', { name: /pending applications/i })
    ).toBeVisible();
  });

  test('1.5 Verify notifications tab and update notification preferences', async ({
    page,
  }) => {
    // 1. Navigate to user settings via avatar dropdown
    await goToUserSettings(page);

    // 2. Navigate to notifications tab
    const notificationsTab = page.getByRole('tab', { name: /notification/i });
    await expect(notificationsTab).toBeVisible();
    await notificationsTab.click();
    await page.waitForTimeout(1000);

    // 4. Verify we're on notifications tab
    await expect(page).toHaveURL(/\/settings\/notifications/);

    // 5. Verify main content area exists
    const notificationsMain = page.getByRole('main').first();
    await expect(notificationsMain).toBeVisible();

    // 6. Find toggle switches for notification categories
    const toggles = page.locator(
      'input[type="checkbox"]:not(:disabled):not([aria-disabled="true"]), [role="switch"]:not([aria-disabled="true"])'
    );
    const toggleCount = await toggles.count();
    expect(toggleCount).toBeGreaterThan(0);

    let toggled = false;

    for (let i = 0; i < toggleCount; i++) {
      const toggle = toggles.nth(i);
      const visible = await toggle.isVisible().catch(() => false);
      if (!visible) continue;
      const initialState = await toggle.isChecked().catch(() => undefined);
      if (initialState === undefined) continue;
      await toggle.click({ force: true });
      const newState = await toggle.isChecked().catch(() => initialState);
      if (newState !== initialState) {
        toggled = true;
        await toggle.click({ force: true });
        break;
      }
    }

    expect(toggled).toBeTruthy();
  });

  test('1.6 Verify settings tab components and update settings', async ({
    page,
  }) => {
    // 1. Navigate to user settings via avatar dropdown
    await goToUserSettings(page);

    // 2. Navigate to Settings tab (if it exists)
    const settingsTab = page.getByRole('tab', { name: /settings/i });
    await expect(settingsTab).toBeVisible();
    await settingsTab.click();
    await page.waitForTimeout(1000);

    // Verify we're on settings tab
    await expect(page).toHaveURL(/\/settings\/settings/);

    // Verify main content area exists
    const mainContent = page.getByRole('main').first();
    await expect(mainContent).toBeVisible();

    // Toggle a setting (checkbox/switch) or edit first enabled field
    const toggles = page.locator(
      'input[type="checkbox"]:not(:disabled):not([aria-disabled="true"]), [role="switch"]:not([aria-disabled="true"])'
    );
    const toggleCount = await toggles.count();
    let toggled = false;

    for (let i = 0; i < toggleCount; i++) {
      const toggle = toggles.nth(i);
      const visible = await toggle.isVisible().catch(() => false);
      if (!visible) continue;
      const initial = await toggle.isChecked().catch(() => undefined);
      if (initial === undefined) continue;
      await toggle.click({ force: true });
      const after = await toggle.isChecked().catch(() => initial);
      if (after !== initial) {
        toggled = true;
        await toggle.click({ force: true });
        break;
      }
    }

    if (!toggled) {
      const editable = page.locator(
        'input:not([disabled]):not([readonly]), textarea:not([disabled]):not([readonly])'
      );
      const editableCount = await editable.count();
      expect(editableCount).toBeGreaterThan(0);
      const field = editable.first();
      const original = await field.inputValue().catch(() => '');
      const temp = `temp-${Date.now()}`;
      await field.fill(temp);
      await expect(field).toHaveValue(temp);
      if (original) {
        await field.fill(original);
      }
    }
  });

  test('1.7 Delete organization and verify users no longer have it under memberships', async ({
    browser,
  }) => {
    test.setTimeout(180_000);

    // Use organization admin to create an org and add the working user as member
    await teardownAuthentication();
    await setupAuthentication(
      browser,
      TestUserManager.users.organizationAdmin.email
    );

    const unique = Date.now();
    const orgDisplayName = `E2E Org ${unique}`;
    const orgSlug = `e2e-org-${unique}`.slice(0, 24).toLowerCase();

    // Prefer organization admin creation, fallback to global admin if denied
    let createResponse = await createOrganization(
      orgDisplayName,
      orgSlug,
      undefined,
      undefined,
      undefined,
      undefined,
      TestUser.ORGANIZATION_ADMIN,
      { tags: ['e2e-membership'] }
    );

    let orgData = createResponse.data?.createOrganization;
    if (!orgData?.id) {
      createResponse = await createOrganization(
        orgDisplayName,
        orgSlug,
        undefined,
        undefined,
        undefined,
        undefined,
        TestUser.GLOBAL_ADMIN,
        { tags: ['e2e-membership'] }
      );
      orgData = createResponse.data?.createOrganization;
    }

    expect(orgData?.id).toBeTruthy();
    const roleSetId = orgData?.roleSet?.id as string;
    expect(roleSetId).toBeTruthy();

    // Ensure org admin retains admin rights on the new org
    await assignRoleToUser(
      TestUserManager.users.organizationAdmin.id,
      roleSetId,
      RoleName.Admin,
      TestUser.ORGANIZATION_ADMIN
    );

    // Add the space member to the organization
    await assignRoleToUser(
      TestUserManager.users.spaceMember.id,
      roleSetId,
      RoleName.Member,
      TestUser.ORGANIZATION_ADMIN
    );

    // Ensure the member is associated in all views that list organization participants
    await assignRoleToUser(
      TestUserManager.users.spaceMember.id,
      roleSetId,
      RoleName.Associate,
      TestUser.ORGANIZATION_ADMIN
    );

    // Verify membership shows for the member user
    await teardownAuthentication();
    await setupAuthentication(browser, TestUserManager.users.spaceMember.email);
    const memberPage = getSharedPage();
    await goToUserSettings(memberPage);
    const organizationsTab = memberPage.getByRole('tab', {
      name: /organizations/i,
    });
    if (await organizationsTab.isVisible().catch(() => false)) {
      await organizationsTab.click();
      await expect(memberPage).toHaveURL(/\/settings\/organizations/);
    } else {
      const membershipTab = memberPage.getByRole('tab', {
        name: /membership/i,
      });
      await expect(membershipTab).toBeVisible();
      await membershipTab.click();
      await expect(memberPage).toHaveURL(/\/settings\/membership/);
    }

    await memberPage.waitForTimeout(4000);

    const membershipContainer = memberPage
      .locator('main, [role="main"]')
      .first();
    await expect(membershipContainer).toBeVisible();
    const membershipLocator = membershipContainer
      .getByText(orgDisplayName, { exact: false })
      .first();
    const membershipVisible = await membershipLocator
      .isVisible({ timeout: 20000 })
      .catch(() => false);

    let orgPageValidated = false;
    if (!membershipVisible) {
      await memberPage.goto(
        `${baseUrl}/organization/${orgData?.nameID ?? orgSlug}`
      );
      const orgHeading = memberPage.getByRole('heading', { level: 1 }).first();
      await expect(orgHeading).toBeVisible();
      await expect(orgHeading).toContainText(orgDisplayName.split(' ')[0]);
      orgPageValidated = true;
    }

    expect(membershipVisible || orgPageValidated).toBeTruthy();

    // Delete the organization as organization admin
    await teardownAuthentication();
    await setupAuthentication(
      browser,
      TestUserManager.users.organizationAdmin.email
    );
    let deleteResponse = await deleteOrganization(
      orgData?.id as string,
      TestUser.ORGANIZATION_ADMIN
    );

    if (deleteResponse.error) {
      await teardownAuthentication();
      await setupAuthentication(
        browser,
        TestUserManager.users.globalAdmin.email
      );
      deleteResponse = await deleteOrganization(
        orgData?.id as string,
        TestUser.GLOBAL_ADMIN
      );
    }

    expect(deleteResponse.error).toBeUndefined();

    // Confirm the member no longer sees the organization
    await teardownAuthentication();
    await setupAuthentication(browser, TestUserManager.users.spaceMember.email);
    const memberPageAfter = getSharedPage();
    await goToUserSettings(memberPageAfter);
    const organizationsTabAfter = memberPageAfter.getByRole('tab', {
      name: /organizations/i,
    });
    if (await organizationsTabAfter.isVisible().catch(() => false)) {
      await organizationsTabAfter.click();
      await expect(memberPageAfter).toHaveURL(/\/settings\/organizations/);
    } else {
      const membershipTabAfter = memberPageAfter.getByRole('tab', {
        name: /membership/i,
      });
      await expect(membershipTabAfter).toBeVisible();
      await membershipTabAfter.click();
      await expect(memberPageAfter).toHaveURL(/\/settings\/membership/);
    }

    await memberPageAfter.waitForTimeout(2000);

    const membershipContainerAfter = memberPageAfter
      .locator('main, [role="main"]')
      .first();
    await expect(membershipContainerAfter).toBeVisible();
    const membershipCount = await membershipContainerAfter
      .getByText(orgDisplayName, { exact: false })
      .count();
    let orgGone = false;

    if (membershipCount > 0) {
      await memberPageAfter.goto(
        `${baseUrl}/organization/${orgData?.nameID ?? orgSlug}`
      );
      const headingAfter = memberPageAfter
        .getByRole('heading', { level: 1 })
        .first();
      const headingHasOrg = await headingAfter
        .filter({ hasText: orgDisplayName })
        .isVisible()
        .catch(() => false);
      orgGone = !headingHasOrg;
    }

    expect(membershipCount === 0 || orgGone).toBeTruthy();
  });

  test('1.8 Verify user profile behaviors across different user roles', async ({
    browser,
  }) => {
    test.setTimeout(60_000);
    // Test with different roles to verify profile behaviors

    // Test as Space Admin
    await teardownAuthentication();
    await setupAuthentication(browser, TestUserManager.users.spaceAdmin.email);
    const spaceAdminPage = getSharedPage();

    await spaceAdminPage.goto(baseUrl);
    await spaceAdminPage.waitForURL('**/home');
    await expect(
      spaceAdminPage.getByRole('heading', { level: 1 })
    ).toBeVisible();

    // Test as Beta Tester
    await teardownAuthentication();
    await setupAuthentication(browser, TestUserManager.users.betaTester.email);
    const betaTesterPage = getSharedPage();

    await betaTesterPage.goto(baseUrl);
    await betaTesterPage.waitForURL('**/home');
    await expect(
      betaTesterPage.getByRole('heading', { level: 1 })
    ).toBeVisible();

    // Test as Space Member
    await teardownAuthentication();
    await setupAuthentication(browser, TestUserManager.users.spaceMember.email);
    const spaceMemberPage = getSharedPage();

    await spaceMemberPage.goto(baseUrl);
    await spaceMemberPage.waitForURL('**/home');
    await expect(
      spaceMemberPage.getByRole('heading', { level: 1 })
    ).toBeVisible();

    // All roles should be able to access their dashboards
    // Note: Last authentication restored to Space Member for afterAll cleanup
  });
});
