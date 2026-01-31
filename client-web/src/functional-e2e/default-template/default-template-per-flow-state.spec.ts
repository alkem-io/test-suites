// spec: default-template/specs/default-template-per-flow-state.spec.md
// seed: client-web/src/functional-e2e/seed-template-default.spec.ts

import { expect, Page } from '@playwright/test';
import { TestScenarioFactory } from '@alkemio/tests-lib/scenario/TestScenarioFactory';
import { TestScenarioConfig } from '@alkemio/tests-lib/scenario/config/test-scenario-config';
import { OrganizationWithSpaceModel } from '@alkemio/tests-lib/scenario/models/OrganizationWithSpaceModel';
import { TestUserManager } from '@alkemio/tests-lib';
import { TestUser } from '@alkemio/tests-lib/common/enums/test.user';
import {
  CommunityMembershipPolicy,
  SpacePrivacyMode,
} from '@alkemio/client-lib/dist/generated/graphql';
import { createAuthenticatedSessionFixture } from '../fixtures/authenticated-session.fixture';
import { SpacePage, SpaceSettingsPage } from '../space/pages';

const baseUrl = process.env.ALKEMIO_BASE_URL || 'http://localhost:3000';

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Helper function to accept cookies if the dialog appears.
 * Waits for the banner to disappear after clicking.
 */
export async function acceptCookiesIfVisible(page: Page): Promise<void> {
  await page.waitForTimeout(1000);
  const acceptCookiesButton = page.getByRole('button', {
    name: /accept all cookies/i,
  });

  try {
    if (await acceptCookiesButton.first().isVisible({ timeout: 3000 })) {
      await acceptCookiesButton.first().click();
      await acceptCookiesButton
        .first()
        .waitFor({ state: 'hidden', timeout: 5000 });
    }
  } catch {
    // Banner not visible or already dismissed
  }
}

/**
 * Helper to get the flow state menu button for "Home" section
 */
function getFlowStateMenuButton(page: Page) {
  return page
    .getByRole('main')
    .getByText('Skip to next blockHome🔍 A')
    .getByRole('button')
    .nth(1);
}

/**
 * Helper to get the "Set Default Post Template" menu item
 */
function getDefaultTemplateMenuItem(page: Page) {
  return page.getByRole('menuitem', { name: 'Set Default Post Template' });
}

/**
 * Helper to get the Template Library dialog
 */
function getTemplateLibraryDialog(page: Page) {
  return page.getByRole('dialog', { name: /Template Library/i });
}

/**
 * Opens the Template Library dialog from the flow state menu
 */
async function openTemplateLibraryDialog(page: Page): Promise<void> {
  const flowStateMenu = getFlowStateMenuButton(page);
  await flowStateMenu.click();

  const menuItem = getDefaultTemplateMenuItem(page);
  await expect(menuItem).toBeVisible({ timeout: 5000 });
  await menuItem.click();

  const dialog = getTemplateLibraryDialog(page);
  await expect(dialog).toBeVisible({ timeout: 5000 });
}

// ============================================================================
// Test Configuration
// ============================================================================

const { test, setupAuthentication, teardownAuthentication } =
  createAuthenticatedSessionFixture({
    storageStateName: 'default-template-flow-state.json',
    cleanupAfterTests: process.env.cleanupAfterTests === 'true',
  });

const scenarioConfig: TestScenarioConfig = {
  name: 'default-template-per-flow-state',
  organization: {
    verification: { setVerified: true },
  },
  space: {
    about: {
      profile: {
        displayName: 'Default Template Flow State Test Space',
      },
    },
    collaboration: {
      addTutorialCallouts: false,
    },
    community: {
      admins: [TestUser.SPACE_ADMIN],
      members: [TestUser.SPACE_MEMBER, TestUser.SPACE_ADMIN],
    },
    settings: {
      privacy: { mode: SpacePrivacyMode.Private },
      membership: { policy: CommunityMembershipPolicy.Applications },
      collaboration: {
        allowMembersToCreateCallouts: true,
      },
    },
  },
  innovationPack: {
    useBaseOrganization: true,
    providerOrganization: {
      about: {
        profile: { displayName: 'Provider Org - Default Template Test' },
      },
      verification: { setVerified: true },
    },
    pack: {
      displayName: 'Default Template Test Pack',
      tags: ['default-template', 'test'],
    },
    visibility: { listedInStore: true, searchVisibility: 'PUBLIC' },
    templates: [
      {
        type: 'CALLOUT' as any,
        profileDisplayName: 'Default Post Template - Test',
        calloutFramingType: 'NONE',
        calloutResponseTypes: ['POST'],
        calloutAllowedContributors: 'MEMBERS',
        postDefaultDescription: 'This is the default post template content',
      },
      {
        type: 'CALLOUT' as any,
        profileDisplayName: 'Alternative Post Template - Test',
        calloutFramingType: 'MEMO',
        calloutResponseTypes: ['POST'],
        calloutAllowedContributors: 'MEMBERS',
        postDefaultDescription: 'Alternative template content',
      },
    ],
  },
};

let baseScenario: OrganizationWithSpaceModel;

// Serial mode for clean lifecycle
(test.describe as any).configure?.({ mode: 'serial' });

test.describe('Default Template Per Flow State', () => {
  test.beforeAll(async ({ browser }) => {
    test.setTimeout(120_000);
    baseScenario = await TestScenarioFactory.createBaseScenario(scenarioConfig);
    await setupAuthentication(browser, TestUserManager.users.spaceAdmin.email);
  });

  test.afterAll(async () => {
    test.setTimeout(30_000);
    await teardownAuthentication();
    await TestScenarioFactory.cleanUpBaseScenario(baseScenario);
  });

  test.describe('Admin Access to Default Post Template Option', () => {
    test('1.1 Verify Default Post Template option is visible in flow state menu', async ({
      page,
    }) => {
      const spacePage = new SpacePage(page, baseUrl);
      const spaceSettingsPage = new SpaceSettingsPage(page);

      await spacePage.goto(baseScenario.space.nameId);
      await acceptCookiesIfVisible(page);
      await spacePage.navigateToSettings();
      await spaceSettingsPage.layoutTab.click();
      await page.waitForLoadState('networkidle');

      // Verify Home flow state is visible
      const homeFlowState = page
        .getByRole('main')
        .locator('div')
        .filter({ hasText: /^Home$/ })
        .first();
      await expect(homeFlowState).toBeVisible({ timeout: 5000 });

      // Open flow state menu
      const flowStateMenu = getFlowStateMenuButton(page);
      await expect(flowStateMenu).toBeVisible({ timeout: 10000 });
      await flowStateMenu.click();

      // Verify "Set Default Post Template" option is visible
      const defaultTemplateOption = getDefaultTemplateMenuItem(page);
      await expect(defaultTemplateOption).toBeVisible();
    });
  });

  test.describe('Select Default Post Template Dialog', () => {
    test('2.1 Open dialog when no template is selected', async ({ page }) => {
      const spacePage = new SpacePage(page, baseUrl);

      await spacePage.goto(baseScenario.space.nameId + '/settings/layout');
      await acceptCookiesIfVisible(page);

      // Open Template Library dialog
      await openTemplateLibraryDialog(page);

      // Verify dialog opened and close it
      const dialog = getTemplateLibraryDialog(page);
      const cancelButton = dialog.getByRole('button', { name: 'Cancel' });
      await cancelButton.click();
      await expect(dialog).toBeHidden();
    });
  });

  test.describe('Template Selection Flow', () => {
    test('3.1 Add new default template for a flow state', async ({ page }) => {
      const spacePage = new SpacePage(page, baseUrl);

      await spacePage.goto(baseScenario.space.nameId + '/settings/layout');
      await acceptCookiesIfVisible(page);

      // Open Template Library dialog
      await openTemplateLibraryDialog(page);

      // Click on "Alternative Post Template - Test" to open preview
      const templateCard = page
        .getByText('Alternative Post Template - Test')
        .first();
      await templateCard.click();

      // Verify preview dialog with SELECT button and click it
      const selectButton = page.getByRole('button', { name: 'SELECT' });
      await expect(selectButton).toBeVisible({ timeout: 5000 });
      await selectButton.click();

      // Verify "Currently Selected Template" section appears with correct template
      const currentlySelectedHeading = page.getByRole('heading', {
        name: /Currently Selected Template/i,
      });
      await expect(currentlySelectedHeading).toBeVisible({ timeout: 5000 });

      const selectedTemplateName = page.getByText(
        'Alternative Post Template - Test'
      );
      await expect(selectedTemplateName.first()).toBeVisible();

      // Close the dialog
      const dialog = getTemplateLibraryDialog(page);
      const cancelButton = dialog.getByRole('button', { name: 'Cancel' });
      await cancelButton.click();
      await expect(dialog).toBeHidden();
    });

    test('3.2 Update existing default template', async ({ page }) => {
      const spacePage = new SpacePage(page, baseUrl);

      await spacePage.goto(baseScenario.space.nameId + '/settings/layout');
      await acceptCookiesIfVisible(page);

      // Open Template Library dialog
      await openTemplateLibraryDialog(page);

      // Select a different template
      const templateCard = page.getByText(
        'Callout (Memo Framing, Memo Responses)'
      );
      await templateCard.click();

      // Apply the chosen template
      const selectButton = page.getByRole('button', { name: /select/i });
      await expect(selectButton).toBeVisible({ timeout: 5000 });
      await selectButton.click();

      // Validate the selected template is displayed
      const selectedTemplateLabel = page.getByRole('heading', {
        name: /Currently Selected Template/i,
      });
      await expect(selectedTemplateLabel).toBeVisible();

      // Close dialog
      const dialog = getTemplateLibraryDialog(page);
      const cancelButton = dialog.getByRole('button', { name: 'Cancel' });
      await cancelButton.click();
      await expect(dialog).toBeHidden();
    });
  });

  test.describe('Template Auto-Loading for Members', () => {
    test('4.1 Default template is loaded when member creates a post', async ({
      browser,
    }) => {
      // Create new context and login as Space Member
      const memberContext = await browser.newContext();
      const memberPage = await memberContext.newPage();

      const { LoginPage } = await import('../space/pages');
      const loginPage = new LoginPage(memberPage, baseUrl);
      await loginPage.login(TestUserManager.users.spaceMember.email);

      // Navigate to the space
      const spacePage = new SpacePage(memberPage, baseUrl);
      await spacePage.goto(baseScenario.space.nameId);
      await acceptCookiesIfVisible(memberPage);

      // Click Add Post button
      const addPostButton = memberPage.getByRole('button', { name: 'Post' });
      await addPostButton.first().click();

      // Verify Add Post dialog opens
      const addPostDialog = memberPage.getByRole('dialog', {
        name: /add post/i,
      });
      await expect(addPostDialog).toBeVisible();

      // Verify template is pre-loaded
      const titleInput = addPostDialog.getByRole('textbox', { name: 'Title' });
      await expect(titleInput).toHaveValue(
        /Callout \(Memo Framing, Memo Responses\)/i
      );

      // Verify template content
      await expect(
        memberPage.getByText('GuidelinesPlease follow these')
      ).toBeVisible();
      await expect(
        memberPage.getByRole('button', { name: 'Memo' })
      ).toBeVisible();

      // Create a new post with unique title
      const uniquePostTitle = `Test Post ${Date.now().toString().slice(-6)}`;
      await titleInput.clear();
      await titleInput.fill(uniquePostTitle);

      // Submit post
      const postButton = addPostDialog.getByRole('button', { name: 'POST' });
      await postButton.click();

      // Verify post creation
      await expect(addPostDialog).toBeHidden({ timeout: 10000 });
      await expect(memberPage.getByText(uniquePostTitle)).toBeVisible({
        timeout: 10000,
      });

      await memberContext.close();
    });
  });
});
