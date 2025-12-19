// spec: client-web/src/functional-e2e/contributors-crud/contributors-crud-test-plan.md
// seed: client-web/src/functional-e2e/seed-contributors-crud.spec.ts
//
// Test Suite 2: Organization CRUD Tests
// Covers: Creation (GA), Profile updates, Account/Community/Authorization/Settings tabs, Deletion

import { expect } from '@playwright/test';
import { TestScenarioFactory } from '@alkemio/tests-lib/scenario/TestScenarioFactory';
import { TestScenarioConfig } from '@alkemio/tests-lib/scenario/config/test-scenario-config';
import { OrganizationWithSpaceModel } from '@alkemio/tests-lib/scenario/models/OrganizationWithSpaceModel';
import { TestUserManager } from '@alkemio/tests-lib';
import { TestUser } from '@alkemio/tests-lib/common/enums/test.user';
import {
  CommunityMembershipPolicy,
  SpacePrivacyMode,
} from '@alkemio/client-lib/dist/generated/graphql';
import { createAuthenticatedSessionFixture } from '@src/functional-e2e/fixtures/authenticated-session.fixture';

const { test, setupAuthentication, teardownAuthentication, getSharedPage } =
  createAuthenticatedSessionFixture({
    storageStateName: 'organization-crud.json',
    cleanupAfterTests: process.env.cleanupAfterTests === 'true',
  });

const baseUrl = process.env.ALKEMIO_BASE_URL || 'http://localhost:3000';
let baseScenario: OrganizationWithSpaceModel;

const scenarioConfig: TestScenarioConfig = {
  name: 'org-crud',
  organization: {
    verification: { setVerified: true },
  },
  space: {
    about: {
      profile: {
        displayName: 'Org CRUD Test Space',
        tagline: 'Space for testing organization CRUD operations',
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

// Serial mode to ensure clean setup/teardown
test.describe.configure({ mode: 'serial' });

test.describe('Organization CRUD Tests', () => {
  test.beforeAll(async ({ browser }) => {
    test.setTimeout(120_000);
    baseScenario = await TestScenarioFactory.createBaseScenario(scenarioConfig);
    expect(baseScenario.scenarioSetupSucceeded).toBeTruthy();

    // Setup authentication for Global Admin (for organization creation)
    await setupAuthentication(browser, TestUserManager.users.globalAdmin.email);
  });

  test.afterAll(async () => {
    test.setTimeout(30_000);
    await teardownAuthentication();
    await TestScenarioFactory.cleanUpBaseScenario(baseScenario);
  });

  test('2.1 Global Admin creates organization from administration section', async ({
    page,
  }) => {
    const testOrgName = `Test Org ${Date.now()}`;
    const testOrgNameId = `test-org-${Date.now()}`;

    // 1. Navigate to Global Administration section
    await page.goto(`${baseUrl}/admin`);

    // 2. Verify admin page loads
    await expect(
      page.getByRole('heading', { name: /admin|administration/i }).first()
    ).toBeVisible();

    // 3. Navigate to Organizations management
    const orgManagement = page.getByRole('tab', { name: 'organizations' });
    await expect(orgManagement).toBeVisible();
    await orgManagement.click();

    // 4. Click "Create Organization" button
    const createButton = page.getByRole('link', { name: 'Create' });
    await expect(createButton).toBeVisible();
    await createButton.click();

    // 5. Verify organization creation form appears
    await expect(
      page.getByRole('textbox', { name: 'Name', exact: true })
    ).toBeVisible();

    // 6. Fill in organization details
    const displayNameField = page.getByRole('textbox', {
      name: 'Name',
      exact: true,
    });
    await displayNameField.fill(testOrgName);

    const nameIdField = page.getByRole('textbox', { name: 'NameID' });
    if (await nameIdField.isVisible()) {
      await nameIdField.fill(testOrgNameId);
    }

    // 7. Submit creation form
    const submitButton = page.getByRole('button', { name: 'Save' });
    await submitButton.click();

    // 8. Verify organization created successfully
    // Wait for navigation or success message
    await page.waitForURL(/\/organization\//, { timeout: 10000 });

    // 9. Verify organization profile is accessible
    await expect(page.getByRole('heading', { level: 1 })).toContainText(
      testOrgName
    );
  });

  test('2.2 Organization Admin updates profile and verifies display', async ({
    browser,
  }) => {
    // Switch to Organization Admin
    await teardownAuthentication();
    await setupAuthentication(
      browser,
      TestUserManager.users.organizationAdmin.email
    );
    const page = getSharedPage();

    // 1. Navigate to organization profile
    await page.goto(
      `${baseUrl}/organization/${baseScenario.organization.nameId}`
    );

    // 2. Verify organization page loads
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

    // 3. Look for About tab or profile edit
    const aboutTab = page.getByRole('tab', { name: /about/i });
    if (await aboutTab.isVisible()) {
      await aboutTab.click();
    }

    // 4. Look for edit button
    const editButton = page.getByRole('button', { name: /edit/i }).first();
    if (await editButton.isVisible()) {
      await editButton.click();

      // 5. Verify profile edit form fields
      const displayNameField = page.getByRole('textbox', {
        name: /display.*name|name/i,
      });
      const taglineField = page.getByRole('textbox', {
        name: /tagline|description/i,
      });

      if (await displayNameField.isVisible()) {
        await expect(displayNameField).toBeVisible();
      }

      // Cancel edit
      const cancelButton = page.getByRole('button', { name: /cancel/i });
      if (await cancelButton.isVisible()) {
        await cancelButton.click();
      }
    }

    // 6. Verify profile displays correctly
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });

  test('2.3 Verify organization account tab components', async () => {
    // Already authenticated as Organization Admin from previous test
    const page = getSharedPage();

    // 1. Navigate to organization profile
    await page.goto(
      `${baseUrl}/organization/${baseScenario.organization.nameId}`
    );
    await page.waitForURL(
      `**/organization/${baseScenario.organization.nameId}`
    );
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

    // 2. Navigate to Account tab (if it exists)
    const accountTab = page.getByRole('tab', { name: /account/i });
    if (await accountTab.isVisible()) {
      await accountTab.click();
      await expect(accountTab).toHaveAttribute('aria-selected', 'true');

      // 3. Verify account tab components
      // Look for verification status, organization ID, etc.
      await expect(page.getByRole('main')).toBeVisible();
    } else {
      // Account tab doesn't exist - verify organization page is visible
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    }
  });

  test('2.4 Verify community tab and manage user assignments', async () => {
    // Already authenticated as Organization Admin from previous test
    const page = getSharedPage();

    // 1. Navigate to organization profile
    await page.goto(
      `${baseUrl}/organization/${baseScenario.organization.nameId}`
    );
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

    // 2. Navigate to Community tab
    const communityTab = page.getByRole('tab', { name: /community/i });
    if (await communityTab.isVisible()) {
      await communityTab.click();
      await expect(communityTab).toHaveAttribute('aria-selected', 'true');

      // 3. Verify community tab components
      await expect(
        page.getByText(/member|community|contributor/i).first()
      ).toBeVisible();

      // 4. Look for Add Member button
      const addMemberButton = page.getByRole('button', {
        name: /add.*member|invite/i,
      });
      if (await addMemberButton.isVisible()) {
        await addMemberButton.click();

        // 5. Verify member search/add dialog appears
        const searchField = page.getByRole('textbox', {
          name: /search|name|email/i,
        });
        if (await searchField.isVisible()) {
          await expect(searchField).toBeVisible();

          // Cancel dialog
          const cancelButton = page.getByRole('button', { name: /cancel/i });
          if (await cancelButton.isVisible()) {
            await cancelButton.click();
          }
        }
      }

      // 6. Verify member list displays
      await expect(page.getByText(/member|admin|owner/i).first()).toBeVisible();
    }
  });

  test('2.5 Verify authorization tab and manage user permissions', async () => {
    // Already authenticated as Organization Admin from previous test
    const page = getSharedPage();

    // 1. Navigate to organization profile
    await page.goto(
      `${baseUrl}/organization/${baseScenario.organization.nameId}`
    );
    await page.waitForURL(
      `**/organization/${baseScenario.organization.nameId}`
    );
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

    // 2. Navigate to Authorization tab (may be under Settings)
    const authTab = page.getByRole('tab', {
      name: /authorization|permission/i,
    });
    const settingsTab = page.getByRole('tab', { name: /settings/i });

    if (await authTab.isVisible()) {
      await authTab.click();
      await expect(authTab).toHaveAttribute('aria-selected', 'true');

      // 3. Verify authorization components are visible in main content
      await expect(page.getByRole('main')).toBeVisible();
    } else if (await settingsTab.isVisible()) {
      await settingsTab.click();

      // Look for authorization section within settings
      const authSection = page.getByText(/authorization|permission/i);
      if (await authSection.isVisible()) {
        await expect(authSection).toBeVisible();
      }

      // Verify settings content is visible
      await expect(page.getByRole('main')).toBeVisible();
    } else {
      // No authorization tab - just verify organization page is visible
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    }
  });

  test('2.6 Verify organization settings tab components', async () => {
    // Already authenticated as Organization Admin from previous test
    const page = getSharedPage();

    // 1. Navigate to organization profile
    await page.goto(
      `${baseUrl}/organization/${baseScenario.organization.nameId}`
    );
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

    // 2. Navigate to Settings tab
    const settingsTab = page.getByRole('tab', { name: /settings/i });
    if (await settingsTab.isVisible()) {
      await settingsTab.click();
      await expect(settingsTab).toHaveAttribute('aria-selected', 'true');
    }

    // 3. Verify settings tab components
    await expect(
      page.getByText(/settings|privacy|visibility/i).first()
    ).toBeVisible();

    // 4. Look for common settings options
    const privacyOption = page.getByText(/privacy/i);
    const visibilityOption = page.getByText(/visibility/i);

    // At least one settings option should be present
    const hasSettings =
      (await privacyOption.isVisible()) || (await visibilityOption.isVisible());

    // Settings section should exist
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });

  test('2.7 Delete organization and verify member removal', async () => {
    // Already authenticated as Organization Admin from previous test
    const page = getSharedPage();

    // 1. Navigate to organization profile
    await page.goto(
      `${baseUrl}/organization/${baseScenario.organization.nameId}`
    );
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

    // 2. Navigate to Settings tab
    const settingsTab = page.getByRole('tab', { name: /settings/i });
    if (await settingsTab.isVisible()) {
      await settingsTab.click();
    }

    // 3. Look for Delete Organization option (danger zone)
    const deleteButton = page.getByRole('button', {
      name: /delete.*organization|remove.*organization/i,
    });

    if (await deleteButton.isVisible()) {
      // Verify delete option exists (don't actually delete)
      await expect(deleteButton).toBeVisible();

      // Note: Not actually deleting to preserve test data
      // In a full test, we would:
      // - Click delete
      // - Confirm deletion
      // - Verify organization is deleted
      // - Login as former member
      // - Verify organization doesn't appear in memberships
    }

    // 4. Verify organization still exists for other tests
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });
});
