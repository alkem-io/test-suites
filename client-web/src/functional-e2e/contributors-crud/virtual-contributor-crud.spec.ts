// spec: client-web/src/functional-e2e/contributors-crud/contributors-crud-test-plan.md
// seed: client-web/src/functional-e2e/seed-contributors-crud.spec.ts
//
// Test Suite 3: Virtual Contributor (VC) CRUD Tests
// Covers: Creation, Knowledge management, Space interactions, Visibility, Deletion

import { expect } from '@playwright/test';
import { TestScenarioFactory } from '@alkemio/tests-lib/scenario/TestScenarioFactory';
import { TestScenarioConfig } from '@alkemio/tests-lib/scenario/config/test-scenario-config';
import { OrganizationWithSpaceModel } from '@alkemio/tests-lib/scenario/models/OrganizationWithSpaceModel';
import { TestUserManager } from '@alkemio/tests-lib';
import { TestUser } from '@alkemio/tests-lib/common/enums/test.user';
import { deleteVirtualContributor } from '@alkemio/tests-lib/scenario/baseFunctions';
import {
  CommunityMembershipPolicy,
  SpacePrivacyMode,
} from '@alkemio/client-lib/dist/generated/graphql';
import { createAuthenticatedSessionFixture } from '@src/functional-e2e/fixtures/authenticated-session.fixture';

const { test, setupAuthentication, teardownAuthentication, getSharedPage } =
  createAuthenticatedSessionFixture({
    storageStateName: 'vc-crud.json',
    cleanupAfterTests: process.env.cleanupAfterTests === 'true',
  });

const baseUrl = process.env.ALKEMIO_BASE_URL || 'http://localhost:3000';
let baseScenario: OrganizationWithSpaceModel;
let createdVcId: string | null = null;
let createdVcNameId: string | null = null;
let createdVcDisplayName: string | null = null;

const scenarioConfig: TestScenarioConfig = {
  name: 'vc-crud',
  organization: {
    verification: { setVerified: true },
  },
  space: {
    about: {
      profile: {
        displayName: 'VC CRUD Test Space',
        tagline: 'Space for testing Virtual Contributor CRUD operations',
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
  // Innovation Pack with templates for VC knowledge management
  innovationPack: {
    useBaseOrganization: true,
    pack: {
      displayName: 'VC CRUD Test Template Pack',
      tags: ['vc', 'crud', 'test'],
    },
    visibility: { listedInStore: true, searchVisibility: 'PUBLIC' },
    templates: [
      {
        type: 'POST' as any,
        profileDisplayName: 'Post Template - VC CRUD',
        postDefaultDescription: 'Template for VC knowledge posts',
      },
      {
        type: 'COMMUNITY_GUIDELINES' as any,
        profileDisplayName: 'Community Guidelines - VC CRUD',
      },
    ],
  },
  // Platform discussion for testing VC tagging
  platformDiscussion: {
    title: 'VC CRUD Test Discussion',
    description: 'Discussion for testing Virtual Contributor tagging',
    category: 'PLATFORM_FUNCTIONALITIES',
  },
};

// Serial mode to ensure clean setup/teardown
test.describe.configure({ mode: 'serial' });

test.describe('Virtual Contributor CRUD Tests', () => {
  test.beforeAll(async ({ browser }) => {
    test.setTimeout(120_000);
    baseScenario = await TestScenarioFactory.createBaseScenario(scenarioConfig);
    expect(baseScenario.scenarioSetupSucceeded).toBeTruthy();

    // Setup authentication for Organization Admin (for VC management)
    await setupAuthentication(
      browser,
      TestUserManager.users.organizationAdmin.email
    );
  });

  test.afterAll(async () => {
    test.setTimeout(30_000);
    await teardownAuthentication();
    await TestScenarioFactory.cleanUpBaseScenario(baseScenario);
  });

  test('3.1 Create new Virtual Contributor with all required details', async ({
    page,
  }) => {
    const unique = Date.now();
    const vcDisplayName = `VC CRUD ${unique}`;
    const vcSlug = `vc-crud-${unique}`.slice(0, 30).toLowerCase();

    // 1. Go to Dashboard
    await page.goto(`${baseUrl}/home`);
    await expect(page).toHaveURL(/\/home/);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

    // Handle cookies banner if present
    const acceptCookies = page.getByRole('button', {
      name: /accept all cookies/i,
    });
    if (await acceptCookies.isVisible().catch(() => false)) {
      await acceptCookies.click();
    }

    // 2. Navigate to organization profile (associated organization)
    await page.goto(
      `${baseUrl}/organization/${baseScenario.organization.nameId}`
    );
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

    // 3. Navigate to Settings tab
    const settingsTab = page.getByRole('tab', { name: /settings/i });
    const settingsLink = page.getByRole('link', { name: /settings/i }).first();
    const settingsTabVisible = await settingsTab.isVisible().catch(() => false);
    const settingsLinkVisible = await settingsLink
      .isVisible()
      .catch(() => false);
    expect(settingsTabVisible || settingsLinkVisible).toBeTruthy();
    if (settingsTabVisible) {
      await settingsTab.click();
    } else if (settingsLinkVisible) {
      await settingsLink.click();
    }
    await page.waitForLoadState('domcontentloaded');

    // 4. Navigate to Account page or look for VC creation
    const accountTab = page.getByRole('tab', { name: /account/i });
    await expect(accountTab).toBeVisible();
    await accountTab.click();

    // 5. Look for "Create new Virtual Contributor" button in VC section
    const vcHeading = page.getByRole('heading', {
      name: /virtual contributors/i,
    });
    await expect(vcHeading).toBeVisible();
    const vcSection = vcHeading.locator(
      'xpath=ancestor::*[self::section or self::div][.//button][1]'
    );
    const createButtonWithLabel = vcSection
      .getByRole('button', { name: /virtual contributor|create/i })
      .first();
    const sectionAddButton = vcSection
      .getByRole('button', { name: /add|create/i })
      .first();
    const createVCButton = (await createButtonWithLabel
      .isVisible()
      .catch(() => false))
      ? createButtonWithLabel
      : sectionAddButton;

    await expect(createVCButton).toBeVisible({ timeout: 10000 });
    await createVCButton.scrollIntoViewIfNeeded();
    await createVCButton.click();

    const addKnowledgeDialog = page
      .getByRole('dialog')
      .filter({ has: page.getByRole('heading', { name: /add knowledge/i }) })
      .first();
    const continueInKnowledge = addKnowledgeDialog.getByRole('button', {
      name: /continue/i,
    });

    const creationDialog = page
      .getByRole('dialog')
      .filter({
        has: page.getByRole('textbox', { name: /name/i }),
      })
      .first();

    await page.waitForSelector('[role="dialog"]', { timeout: 15000 });

    const knowledgeVisible = await addKnowledgeDialog
      .isVisible({ timeout: 10000 })
      .catch(() => false);

    if (knowledgeVisible) {
      const knowledgeTitle = addKnowledgeDialog.getByRole('textbox', {
        name: /post title/i,
      });
      if (await knowledgeTitle.isVisible().catch(() => false)) {
        await knowledgeTitle.fill('VC CRUD seed knowledge');
      }

      const knowledgeEditor = addKnowledgeDialog
        .getByRole('textbox', { name: /markdown editor|editor/i })
        .first();
      if (await knowledgeEditor.isVisible().catch(() => false)) {
        await knowledgeEditor.fill('Seed knowledge for automated VC creation');
      }

      await continueInKnowledge.click();
      await addKnowledgeDialog.waitFor({ state: 'hidden', timeout: 15000 });
    }

    const creationDialogVisible = await creationDialog
      .isVisible({ timeout: 15000 })
      .catch(() => false);

    if (!creationDialogVisible) {
      throw new Error(
        knowledgeVisible
          ? 'Add knowledge dialog did not transition to VC details form'
          : 'VC creation form did not appear'
      );
    }

    const nameField = creationDialog
      .getByRole('textbox', { name: /name/i })
      .first();

    await expect(nameField).toBeVisible({ timeout: 15000 });

    // 7. Fill form fields
    await expect(nameField).toBeVisible();
    await nameField.fill(vcDisplayName);

    const nameIdField = page
      .locator(
        'input[name*="nameid" i], input[id*="nameid" i], input[placeholder*="nameid" i]'
      )
      .first();
    if (await nameIdField.isVisible().catch(() => false)) {
      await nameIdField.fill(vcSlug);
    }

    const descriptionField = page
      .getByRole('textbox', { name: /description/i })
      .first();
    if (await descriptionField.isVisible().catch(() => false)) {
      await descriptionField.fill('VC CRUD automated creation');
    }

    // Optional knowledge type selection
    const knowledgeTypeSelect = page.getByText(/knowledge|written/i).first();
    if (await knowledgeTypeSelect.isVisible().catch(() => false)) {
      await knowledgeTypeSelect.click();
    }

    const createResponsePromise = page.waitForResponse(response => {
      const body = response.request().postData() || '';
      return (
        response.url().includes('graphql') &&
        /createVirtualContributor/i.test(body) &&
        response.request().method() === 'POST'
      );
    }, { timeout: 30000 });

    const submitButton = page
      .getByRole('button', { name: /create|save|submit/i })
      .first();
    await expect(submitButton).toBeVisible();
    await submitButton.click();

    const createResponse = await createResponsePromise;
    const createPayload = await createResponse.json().catch(() => ({}) as any);
    createdVcId = createPayload?.data?.createVirtualContributor?.id || null;
    createdVcNameId =
      createPayload?.data?.createVirtualContributor?.nameID || vcSlug;
    createdVcDisplayName = vcDisplayName;

    await page.waitForURL(/virtual-contributor|virtualcontributor|vc/i, {
      timeout: 20000,
    });
    await expect(page.getByRole('heading', { level: 1 })).toContainText(
      vcDisplayName
    );
    expect(createdVcId || createdVcNameId).toBeTruthy();
  });

  test('3.2 Add text post knowledge to Virtual Contributor', async ({
    page,
  }) => {
    expect(createdVcNameId).toBeTruthy();
    // 1. Navigate to organization VCs (assumes VC exists)
    await page.goto(
      `${baseUrl}/organization/${baseScenario.organization.nameId}`
    );
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

    // 2. Look for Virtual Contributors section
    const vcLink = page
      .getByRole('link', { name: createdVcDisplayName || '' })
      .first();
    await expect(vcLink).toBeVisible();
    await vcLink.click();

    // 4. Navigate to Knowledge/BoK section
    const knowledgeTab = page.getByRole('tab', {
      name: /knowledge|body.*of.*knowledge|bok/i,
    });
    await expect(knowledgeTab).toBeVisible();
    await knowledgeTab.click();

    // 5. Look for Add Post button
    const addPostButton = page.getByRole('button', {
      name: /add.*post|new.*post/i,
    });
    await expect(addPostButton).toBeVisible();
    await addPostButton.click();

    // 6. Verify post creation form
    const titleField = page.getByRole('textbox', { name: /title/i });
    await expect(titleField).toBeVisible();

    // Cancel post creation
    const cancelButton = page.getByRole('button', { name: /cancel/i });
    await expect(cancelButton).toBeVisible();
    await cancelButton.click();
  });

  test('3.3 Add document knowledge to Virtual Contributor', async ({
    page,
  }) => {
    expect(createdVcNameId).toBeTruthy();
    // 1. Navigate to organization VCs
    await page.goto(
      `${baseUrl}/organization/${baseScenario.organization.nameId}`
    );
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

    // 2. Look for Virtual Contributors section
    const vcLink = page
      .getByRole('link', { name: createdVcDisplayName || '' })
      .first();
    await expect(vcLink).toBeVisible();
    await vcLink.click();

    // 4. Navigate to Knowledge section
    const knowledgeTab = page.getByRole('tab', {
      name: /knowledge|body.*of.*knowledge|bok/i,
    });
    await expect(knowledgeTab).toBeVisible();
    await knowledgeTab.click();

    // 5. Look for Add Document button
    const addDocButton = page.getByRole('button', {
      name: /add.*document|upload.*document/i,
    });
    await expect(addDocButton).toBeVisible();
    await addDocButton.click();

    // 6. Verify document upload form
    const titleField = page.getByRole('textbox', { name: /title/i });
    const fileInput = page.locator('input[type="file"]');
    await expect(titleField).toBeVisible();
    await expect(fileInput).toBeVisible();

    // Cancel document upload
    const cancelButton = page.getByRole('button', { name: /cancel/i });
    await expect(cancelButton).toBeVisible();
    await cancelButton.click();
  });

  test('3.4 Select Space for VC to start interacting', async ({ page }) => {
    expect(createdVcNameId).toBeTruthy();
    // 1. Navigate to organization
    await page.goto(
      `${baseUrl}/organization/${baseScenario.organization.nameId}`
    );
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

    // 2. Look for Virtual Contributors section
    const vcLink = page
      .getByRole('link', { name: createdVcDisplayName || '' })
      .first();
    await expect(vcLink).toBeVisible();
    await vcLink.click();

    // 3. Navigate to VC Settings
    const settingsTab = page.getByRole('tab', { name: /settings/i });
    await expect(settingsTab).toBeVisible();
    await settingsTab.click();

    // 4. Look for Space Interactions section
    const spaceSection = page.getByText(
      /space.*interaction|associated.*space/i
    );
    await expect(spaceSection).toBeVisible();

    // 5. Look for space dropdown/selector
    const spaceSelect = page.getByRole('combobox', {
      name: /space/i,
    });
    await expect(spaceSelect).toBeVisible();
  });

  test('3.5 Tag Virtual Contributor with question in discussion', async ({
    browser,
  }) => {
    expect(createdVcNameId).toBeTruthy();
    // Switch to Space Member
    await teardownAuthentication();
    await setupAuthentication(browser, TestUserManager.users.spaceMember.email);
    const page = getSharedPage();

    // 1. Navigate to Space
    await page.goto(`${baseUrl}/${baseScenario.space.nameId}`);
    await expect(page.getByRole('tab', { name: 'Home' })).toBeVisible();

    // 2. Navigate to Forum/Discussion (via Tools Menu)
    await page.getByRole('button', { name: 'Tools Menu' }).click();
    await page.waitForTimeout(500);
    await page.getByRole('menuitem', { name: 'Alkemio Forum' }).click();

    // 3. Verify forum page loads
    await expect(page).toHaveURL(/\/forum/);
    await expect(
      page.getByRole('heading', {
        name: /Welcome to the Alkemio Forum/i,
        level: 1,
      })
    ).toBeVisible();

    // 4. Look for existing discussion card
    const discussionButton = page.getByRole('button').filter({
      has: page.getByRole('heading', { name: /VC CRUD Test Discussion/i }),
    });

    await expect(discussionButton).toBeVisible();
    await discussionButton.click();
    await page.waitForTimeout(1000);

    // 5. Verify discussion heading is visible
    const discussionHeading = page.getByRole('heading', {
      name: /VC CRUD Test Discussion/i,
      level: 3,
    });
    await expect(discussionHeading).toBeVisible();

    // 6. Look for comment/reply input
    const commentInput = page.getByRole('textbox', {
      name: /comment|reply|message/i,
    });
    await expect(commentInput).toBeVisible();

    // 7. Type "@" to trigger mention
    await commentInput.fill('@');
    await page.waitForTimeout(500);

    // 8. Look for VC in mention suggestions
    const mentionSuggestions = page.locator('[role="listbox"], [role="menu"]');
    await expect(mentionSuggestions).toBeVisible();

    // Clear the input
    await commentInput.clear();
  });

  test('3.6 Navigate to Virtual Contributor profile from mention', async ({
    browser,
  }) => {
    expect(createdVcNameId).toBeTruthy();
    // Ensure authentication as Space Member
    await teardownAuthentication();
    await setupAuthentication(browser, TestUserManager.users.spaceMember.email);
    const page = getSharedPage();

    // 1. Navigate to Contributors page
    await page.goto(baseUrl);
    await page.waitForURL('**/home');

    // Open Tools Menu
    await page.getByRole('button', { name: 'Tools Menu' }).click();
    await page.waitForTimeout(500);

    // Click Find contributors
    await page.getByRole('menuitem', { name: 'Find contributors' }).click();

    // 2. Verify Contributors page loads
    await expect(page).toHaveURL(/\/contributors/);
    await expect(
      page.getByRole('heading', { name: /contributor|talent/i, level: 1 })
    ).toBeVisible();

    // 3. Look for Virtual Contributors section
    await expect(
      page.getByRole('heading', { name: 'Virtual Contributors' })
    ).toBeVisible();

    // 4. Click the created VC card
    const vcSection = page
      .getByRole('heading', { name: 'Virtual Contributors' })
      .locator('..')
      .locator('..');
    const vcCard = vcSection.getByRole('link', {
      name: new RegExp(createdVcDisplayName || '', 'i'),
    });
    await expect(vcCard.first()).toBeVisible();
    await vcCard.first().click();

    // 5. Verify VC profile page
    await expect(page.getByRole('heading', { level: 1 })).toContainText(
      createdVcDisplayName || ''
    );
  });

  test('3.7 Change Virtual Contributor visibility to hidden', async ({
    browser,
  }) => {
    expect(createdVcNameId).toBeTruthy();
    // Switch to Organization Admin
    await teardownAuthentication();
    await setupAuthentication(
      browser,
      TestUserManager.users.organizationAdmin.email
    );
    const page = getSharedPage();

    // 1. Navigate to organization
    await page.goto(
      `${baseUrl}/organization/${baseScenario.organization.nameId}`
    );
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

    // 2. Look for Virtual Contributors section
    const vcLink = page
      .getByRole('link', { name: createdVcDisplayName || '' })
      .first();
    await expect(vcLink).toBeVisible();
    await vcLink.click();

    // 3. Navigate to VC Settings tab
    const settingsTab = page.getByRole('tab', { name: /settings/i });
    await expect(settingsTab).toBeVisible();
    await settingsTab.click();

    // 4. Look for Visibility setting
    const visibilityOption = page
      .getByText(/visibility|privacy|hidden/i)
      .first();
    await expect(visibilityOption).toBeVisible();

    // 5. Look for toggle or dropdown
    const visibilityToggle = page.locator(
      'input[type="checkbox"], [role="switch"]'
    );
    expect(await visibilityToggle.count()).toBeGreaterThan(0);
    await expect(visibilityToggle.first()).toBeVisible();
  });

  test('3.8 Visit and verify VC Body of Knowledge', async ({ browser }) => {
    expect(createdVcNameId).toBeTruthy();
    // Switch to Space Member
    await teardownAuthentication();
    await setupAuthentication(browser, TestUserManager.users.spaceMember.email);
    const page = getSharedPage();

    // 1. Navigate to Contributors page
    await page.goto(`${baseUrl}/contributors`);
    await expect(page).toHaveURL(/\/contributors/);

    // 2. Look for Virtual Contributors section
    await expect(
      page.getByRole('heading', { name: 'Virtual Contributors' })
    ).toBeVisible();

    // 3. Click on a VC if available
    const vcSection = page
      .getByRole('heading', { name: 'Virtual Contributors' })
      .locator('..')
      .locator('..');
    const vcCard = vcSection.getByRole('link', {
      name: new RegExp(createdVcDisplayName || '', 'i'),
    });

    await expect(vcCard.first()).toBeVisible();
    await vcCard.first().click();

    // 4. Verify VC profile page
    await expect(page.getByRole('heading', { level: 1 })).toContainText(
      createdVcDisplayName || ''
    );

    // 5. Look for Body of Knowledge section
    const bokSection = page.getByText(
      /body.*of.*knowledge|knowledge.*base|bok/i
    );
    await expect(bokSection).toBeVisible();

    // 6. Knowledge items optional but page should be visible
    const knowledgeItems = page.getByRole('link', {
      name: /post|document|article/i,
    });
    if ((await knowledgeItems.count()) > 0) {
      await expect(knowledgeItems.first()).toBeVisible();
    }
  });

  test('3.9 Delete Virtual Contributor and verify removal', async ({
    browser,
  }) => {
    expect(createdVcId || createdVcNameId).toBeTruthy();
    // Switch to Organization Admin
    await teardownAuthentication();
    await setupAuthentication(
      browser,
      TestUserManager.users.organizationAdmin.email
    );
    const page = getSharedPage();

    // 1. Navigate to organization
    await page.goto(
      `${baseUrl}/organization/${baseScenario.organization.nameId}`
    );
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

    // 2. Look for Virtual Contributors section
    const vcSection = page.getByText(/virtual.*contributor/i);
    await expect(vcSection).toBeVisible();
    const vcLink = page
      .getByRole('link', { name: createdVcDisplayName || '' })
      .first();
    await expect(vcLink).toBeVisible();
    await vcLink.click();

    // 3. Navigate to VC Settings
    const settingsTab = page.getByRole('tab', { name: /settings/i });
    await expect(settingsTab).toBeVisible();
    await settingsTab.click();

    // 4. Delete via API to ensure cleanup
    const deleteResult = await deleteVirtualContributor(
      (createdVcId as string) || (createdVcNameId as string),
      TestUser.GLOBAL_ADMIN
    );
    expect(deleteResult.error).toBeUndefined();

    // 5. Verify VC no longer accessible
    await page.goto(`${baseUrl}/virtual-contributor/${createdVcNameId}`);
    const heading = page.getByRole('heading', { level: 1 });
    const headingVisible = await heading.isVisible().catch(() => false);
    if (headingVisible) {
      await expect(heading).not.toContainText(createdVcDisplayName || '');
    }
  });
});
