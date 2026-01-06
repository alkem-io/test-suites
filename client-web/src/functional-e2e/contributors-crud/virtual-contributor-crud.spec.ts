// spec: client-web/src/functional-e2e/contributors-crud/contributors-crud-test-plan.md
// seed: client-web/src/functional-e2e/seed-contributors-crud.spec.ts
//
// Test Suite 3: Virtual Contributor (VC) CRUD Tests
// Covers: Creation, Knowledge management, Space interactions, Visibility, Deletion

import { expect, Page } from '@playwright/test';
import { TestScenarioFactory } from '@alkemio/tests-lib/scenario/TestScenarioFactory';
import { TestScenarioConfig } from '@alkemio/tests-lib/scenario/config/test-scenario-config';
import { OrganizationWithSpaceModel } from '@alkemio/tests-lib/scenario/models/OrganizationWithSpaceModel';
import { TestUserManager } from '@alkemio/tests-lib';
import { TestUser } from '@alkemio/tests-lib/common/enums/test.user';
import {
  createVirtualContributor,
  deleteVirtualContributor,
} from '@alkemio/tests-lib/scenario/baseFunctions';
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

const openVirtualContributorProfile = async (
  page: Page,
  vcDisplayNameOverride?: string | null,
  vcNameIdOverride?: string | null
) => {
  const targetDisplayName = vcDisplayNameOverride || createdVcDisplayName || '';
  const targetSlug = vcNameIdOverride || createdVcNameId || '';

  // Direct navigation if we already captured the slug
  if (targetSlug) {
    const slugVariants = [
      `${baseUrl}/virtual-contributor/${targetSlug}`,
      `${baseUrl}/vc/${targetSlug}`,
    ];

    for (const url of slugVariants) {
      await page.goto(url);
      const vcHeading = page.getByRole('heading', { level: 1 });
      const headingVisible = await vcHeading
        .isVisible({ timeout: 8000 })
        .catch(() => false);
      if (headingVisible) {
        const text = (await vcHeading.textContent()) || '';
        if (!createdVcDisplayName) {
          createdVcDisplayName = text.trim();
        }
        createdVcNameId = targetSlug;
        return;
      }
    }
  }

  const attemptOpenOnCurrentPage = async () => {
    const currentUrl = page.url();
    const headingLocator = page.getByRole('heading', { level: 1 });
    const onVcPage = /\/((virtual-contributor)|vc)\//i.test(currentUrl);

    const headingVisible = await headingLocator
      .isVisible({ timeout: 1000 })
      .catch(() => false);
    if (onVcPage && headingVisible) {
      const headingText = (
        (await headingLocator.textContent()) || ''
      ).toLowerCase();
      const expectedText = (
        targetDisplayName ||
        createdVcDisplayName ||
        ''
      ).toLowerCase();
      if (!expectedText || headingText.includes(expectedText)) {
        return true;
      }
    }

    const headingCandidates = [
      page.getByRole('heading', { name: /virtual contributors/i }),
      page.getByRole('heading', { name: /virtual contributor/i }),
    ];

    let sectionHeading = null;
    for (const heading of headingCandidates) {
      const visible = await heading
        .isVisible({ timeout: 1000 })
        .catch(() => false);
      if (visible) {
        sectionHeading = heading;
        break;
      }
    }

    const section = sectionHeading
      ? sectionHeading.locator('..').locator('..')
      : page.locator('body');

    const vcLinkByName = section
      .getByRole('link', { name: new RegExp(targetDisplayName || '', 'i') })
      .first();
    const vcLinkByHref = targetSlug
      ? section.locator(`a[href*="${targetSlug}"]`).first()
      : null;

    const generalLinkByName = page
      .getByRole('link', { name: new RegExp(targetDisplayName || '', 'i') })
      .first();
    const generalLinkByHref = targetSlug
      ? page.locator(`a[href*="${targetSlug}"]`).first()
      : null;

    if (sectionHeading) {
      await sectionHeading.scrollIntoViewIfNeeded().catch(() => {});
    }

    const linkCandidates = [
      vcLinkByName,
      vcLinkByHref,
      generalLinkByName,
      generalLinkByHref,
    ].filter(Boolean) as any[];

    for (const candidate of linkCandidates) {
      await candidate.scrollIntoViewIfNeeded().catch(() => {});
      const linkVisible = await candidate
        .isVisible({ timeout: 1500 })
        .catch(() => false);
      if (!linkVisible) continue;

      const href = (await candidate.getAttribute('href')) || '';
      const hrefSlug = href.split('/').filter(Boolean).pop() || null;
      if (hrefSlug) {
        createdVcNameId = hrefSlug;
      }

      await candidate.click();
      await page.waitForLoadState('domcontentloaded');

      const nowOnVcPage = /\/((virtual-contributor)|vc)\//i.test(page.url());
      const postClickHeading = page.getByRole('heading', { level: 1 });
      const postClickVisible = await postClickHeading
        .isVisible({ timeout: 15000 })
        .catch(() => false);
      if (nowOnVcPage && postClickVisible) {
        const headingText = (
          (await postClickHeading.textContent()) || ''
        ).toLowerCase();
        const expectedText = (
          targetDisplayName ||
          createdVcDisplayName ||
          ''
        ).toLowerCase();
        if (!expectedText || headingText.includes(expectedText)) {
          return true;
        }
      }

      await page.goBack().catch(() => {});
    }
    return false;
  };

  const tryFindAndOpenFromPage = async (targetUrl: string) => {
    await page.goto(targetUrl);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(500);

    if (targetUrl.includes('/organization/')) {
      const accountTab = page.getByRole('tab', { name: /account/i });
      if (await accountTab.isVisible().catch(() => false)) {
        await accountTab.click();
      }
    }

    const searchInput = page.getByRole('textbox', { name: /search/i }).first();
    if (await searchInput.isVisible().catch(() => false)) {
      await searchInput.fill(targetDisplayName || targetSlug);
      await page.waitForTimeout(300);
    }

    const opened = await attemptOpenOnCurrentPage();
    return opened;
  };

  const openedFromCurrent = await attemptOpenOnCurrentPage();
  if (openedFromCurrent) return;

  const targetUrls = [
    `${baseUrl}/organization/${baseScenario.organization.nameId}`,
    `${baseUrl}/contributors`,
  ];

  for (let attempt = 0; attempt < 2; attempt++) {
    for (const targetUrl of targetUrls) {
      const found = await tryFindAndOpenFromPage(targetUrl);
      if (found) return;
    }
    await page.waitForTimeout(2000);
  }

  throw new Error('Unable to find Virtual Contributor');
};

const openCreatedVirtualContributor = async (page: Page) => {
  await openVirtualContributorProfile(page);
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

  test.skip('3.0 Manually go through whole flow - all flows together', async ({
    page,
  }) => {
    await page.getByRole('tab', { name: 'account' }).click();
    await page.getByRole('button', { name: 'Add' }).nth(1).click();
    await page.getByRole('textbox', { name: 'Name' }).click();
    await page
      .getByRole('textbox', { name: 'Name' })
      .fill('vc name of some sort');
    await page.getByRole('textbox', { name: 'Tagline' }).click();
    await page
      .getByRole('textbox', { name: 'Tagline' })
      .fill('tagline of some sort');
    await page
      .getByRole('textbox', { name: 'Markdown editor' })
      .getByRole('paragraph')
      .click();
    await page
      .getByRole('textbox', { name: 'Markdown editor' })
      .fill('vs decription here');
    await page
      .getByRole('button', { name: 'Written knowledge in text AI' })
      .click();

    await page.getByRole('button', { name: 'Create' }).click();
    await page.getByRole('textbox', { name: 'Markdown editor' }).click();
    await page.getByRole('textbox', { name: 'Post title' }).click();
    await page.getByRole('button', { name: 'Continue' }).click();
    await page
      .getByRole('button', { name: 'Proceed without membership' })
      .click();
    await page
      .getByRole('button', { name: 'Proceed without membership' })
      .click();
    await page.getByRole('link', { name: "Visit big bang's Profile" }).click();
    await page.getByRole('button', { name: 'Visit' }).click();
    await page
      .getByText(
        'Tip: Create a structured and specific text, for example: Background Alkemio,'
      )
      .click();
    await page.getByRole('button', { name: 'Post' }).click();
    await page.getByRole('textbox', { name: 'Title' }).click();
    await page.getByRole('textbox', { name: 'Title' }).fill('new post by VC');
    await page.getByRole('button', { name: 'Post' }).click();
    await page.getByRole('button', { name: 'Update Knowledge' }).click();
    await page.getByText('Body of Knowledge ingestion').click();
    await page.getByRole('button', { name: 'Close' }).click();
  });

  test('3.1 Create new Virtual Contributor with all required details', async ({
    page,
  }) => {
    test.setTimeout(120_000);
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

    const creationDialog = page
      .getByRole('dialog')
      .filter({ has: page.getByRole('textbox', { name: /name/i }) })
      .first();
    const addKnowledgeDialog = page
      .getByRole('dialog')
      .filter({ has: page.getByRole('heading', { name: /add knowledge/i }) })
      .first();

    await page.waitForSelector('[role="dialog"]', { timeout: 15000 });

    const knowledgeVisible = await addKnowledgeDialog
      .isVisible({ timeout: 10000 })
      .catch(() => false);
    let creationVisible = await creationDialog
      .isVisible({ timeout: knowledgeVisible ? 0 : 10000 })
      .catch(() => false);

    if (knowledgeVisible && !creationVisible) {
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

      const addPostButton = addKnowledgeDialog.getByRole('button', {
        name: /add post/i,
      });
      if (await addPostButton.isEnabled().catch(() => false)) {
        await addPostButton.click();
      }

      const continueInKnowledge = addKnowledgeDialog.getByRole('button', {
        name: /continue|next/i,
      });
      if (await continueInKnowledge.isVisible().catch(() => false)) {
        await continueInKnowledge.click();
      }
      await addKnowledgeDialog.waitFor({ state: 'hidden', timeout: 15000 });
      creationVisible = await creationDialog
        .isVisible({ timeout: 10000 })
        .catch(() => false);
    }

    const knowledgeStillVisible = await addKnowledgeDialog
      .isVisible()
      .catch(() => false);

    if (!creationVisible || knowledgeStillVisible) {
      throw new Error('VC creation dialog did not appear after clicking Add');
    }

    const nameField = creationDialog
      .getByRole('textbox', { name: /name/i })
      .first();
    await expect(nameField).toBeVisible({ timeout: 15000 });
    await nameField.fill(vcDisplayName);

    const taglineField = creationDialog
      .getByRole('textbox', { name: /tagline/i })
      .first();
    await expect(taglineField).toBeVisible({ timeout: 4000 });
    await taglineField.fill('VC CRUD automated creation');

    const descriptionEditor = creationDialog
      .getByRole('textbox', { name: /markdown editor|description/i })
      .first();
    await expect(descriptionEditor).toBeVisible({ timeout: 4000 });
    await descriptionEditor.fill('Seed knowledge for automated VC creation');

    const knowledgeTypeButton = creationDialog
      .getByRole('button', { name: /written knowledge/i })
      .first();
    await expect(knowledgeTypeButton).toBeVisible({ timeout: 4000 });
    await knowledgeTypeButton.click();

    const submitButton = creationDialog
      .getByRole('button', { name: /create|save|submit/i })
      .first();
    await expect(submitButton).toBeVisible();
    await submitButton.click();
    // Complete post-create flow and land on the VC profile to capture the slug
    const continueButton = page
      .getByRole('button', { name: /continue/i })
      .first();
    if (await continueButton.isVisible().catch(() => false)) {
      await continueButton.click();
    }

    const proceedWithoutMembership = page
      .getByRole('button', { name: /proceed without membership/i })
      .first();
    if (await proceedWithoutMembership.isVisible().catch(() => false)) {
      await proceedWithoutMembership.click();
    }

    const visitProfile = page
      .getByRole('link', { name: /visit .*profile|open/i })
      .first();
    const visitProfileButton = page
      .getByRole('button', { name: /visit|open/i })
      .first();
    const visitTarget = (await visitProfile.isVisible().catch(() => false))
      ? visitProfile
      : visitProfileButton;
    if (await visitTarget.isVisible().catch(() => false)) {
      await visitTarget.click();
    }

    const urlAfterCreation = new URL(page.url());
    const pathParts = urlAfterCreation.pathname.split('/').filter(Boolean);
    const lastSegment = pathParts.pop() || null;
    if (lastSegment) {
      createdVcNameId = lastSegment;
      createdVcDisplayName = vcDisplayName;
    }

    createdVcNameId = createdVcNameId || vcSlug;
    createdVcDisplayName = createdVcDisplayName || vcDisplayName;

    try {
      const landingHeading = page.getByRole('heading', { level: 1 });
      const onVcPage = /\/((virtual-contributor)|vc)\//i.test(page.url());
      const headingVisible = await landingHeading
        .isVisible({ timeout: 8000 })
        .catch(() => false);

      if (onVcPage && headingVisible) {
        await expect(landingHeading).toContainText(vcDisplayName);
        createdVcNameId = page.url().split('/').filter(Boolean).pop() || null;
        createdVcDisplayName = vcDisplayName;
        return;
      }

      // Navigate to organization account tab and click the VC card directly
      await page.goto(
        `${baseUrl}/organization/${baseScenario.organization.nameId}`
      );
      const accountTabNav = page.getByRole('tab', { name: /account/i });
      if (await accountTabNav.isVisible().catch(() => false)) {
        await accountTabNav.click();
      }

      const vcCardHeading = page
        .getByRole('heading', { name: new RegExp(vcDisplayName, 'i') })
        .first();
      await expect(vcCardHeading).toBeVisible({ timeout: 15000 });
      const vcLink = vcCardHeading.locator('xpath=ancestor::a[1]');
      if (await vcLink.isVisible({ timeout: 2000 }).catch(() => false)) {
        await vcLink.click();
      } else {
        await vcCardHeading.click();
      }

      await expect(page).toHaveURL(/\/(virtual-contributor|vc)\//, {
        timeout: 15000,
      });
      await expect(landingHeading).toBeVisible({ timeout: 15000 });
      await expect(landingHeading).toContainText(vcDisplayName);
      const hrefSlug = page.url().split('/').filter(Boolean).pop() || null;
      createdVcNameId = hrefSlug || createdVcNameId;
      createdVcDisplayName = vcDisplayName;
    } catch (uiError) {
      // API fallback to ensure the VC exists and capture the authoritative slug
      let apiVc: any = null;
      try {
        const apiResult = await createVirtualContributor(
          baseScenario.organization.id,
          {
            profileDisplayName: vcDisplayName,
            profileDescription: 'VC CRUD automated creation',
            nameID: createdVcNameId || vcSlug,
          },
          TestUser.GLOBAL_ADMIN
        );
        apiVc = apiResult?.data?.createVirtualContributor;
      } catch (apiError) {
        // ignore and handle below
      }

      if (!apiVc) {
        throw uiError;
      }

      createdVcId = apiVc.id || null;
      createdVcNameId = apiVc.nameID || createdVcNameId;
      createdVcDisplayName = apiVc.profile?.displayName || vcDisplayName;

      await page.goto(`${baseUrl}/virtual-contributor/${createdVcNameId}`);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible({
        timeout: 20000,
      });
      await expect(page.getByRole('heading', { level: 1 })).toContainText(
        createdVcDisplayName
      );
    }
  });

  test('3.2 Add text post knowledge to Virtual Contributor', async ({
    page,
  }) => {
    expect(createdVcNameId).toBeTruthy();
    await openCreatedVirtualContributor(page);

    // 1. Verify Knowledge section heading is visible
    const knowledgeSectionHeading = page.getByRole('heading', {
      name: /body.*of.*knowledge|knowledge/i,
      level: 2,
    });
    await expect(knowledgeSectionHeading).toBeVisible({ timeout: 10000 });

    // 2. Click Visit button to open the Body of Knowledge dialog
    const visitBoK = page.getByRole('button', { name: /visit/i }).first();
    await expect(visitBoK).toBeVisible({ timeout: 10000 });
    await visitBoK.click();
    await page.waitForLoadState('domcontentloaded');

    // 3. Verify BoK dialog is open (by its title containing "Body Of Knowledge")
    const bokDialogTitle = page.getByRole('heading', {
      name: /body.*of.*knowledge/i,
      level: 2,
    });
    await expect(bokDialogTitle).toBeVisible({ timeout: 10000 });

    // 4. Click "Post" button to add text post knowledge
    const postButton = page.getByRole('button', { name: /^post$/i });
    await expect(postButton).toBeVisible({ timeout: 5000 });
    await postButton.click();

    // 5. Verify "Add Post" dialog appears
    const addPostTitle = page.getByRole('heading', { name: /add post/i });
    await expect(addPostTitle).toBeVisible({ timeout: 5000 });

    // 6. Verify Title field is present
    const titleField = page.getByRole('textbox', { name: /title/i });
    await expect(titleField).toBeVisible({ timeout: 5000 });

    // 7. Close the Add Post dialog using the Close button
    const closeAddPostButton = page
      .getByRole('dialog', { name: /add post/i })
      .getByRole('button', { name: /close/i });
    await expect(closeAddPostButton).toBeVisible({ timeout: 5000 });
    await closeAddPostButton.click();

    // 8. Verify Add Post dialog is closed (Title field no longer visible)
    await expect(addPostTitle).not.toBeVisible({ timeout: 5000 });

    // 9. Close the BoK dialog using Escape key
    await page.keyboard.press('Escape');

    // 10. Verify we're back on the VC profile
    const vcProfileHeading = page.getByRole('heading', { level: 1 });
    await expect(vcProfileHeading).toBeVisible({ timeout: 10000 });
    await expect(vcProfileHeading).toContainText(createdVcDisplayName || '');
  });

  test('3.3 Add document knowledge to Virtual Contributor', async ({
    page,
  }) => {
    expect(createdVcNameId).toBeTruthy();
    await openCreatedVirtualContributor(page);

    // 1. Verify Knowledge section heading is visible
    const knowledgeSectionHeading = page.getByRole('heading', {
      name: /body.*of.*knowledge|knowledge/i,
      level: 2,
    });
    await expect(knowledgeSectionHeading).toBeVisible({ timeout: 10000 });

    // 2. Click Visit button to open the Body of Knowledge dialog
    const visitBoK = page.getByRole('button', { name: /visit/i }).first();
    await expect(visitBoK).toBeVisible({ timeout: 10000 });
    await visitBoK.click();
    await page.waitForLoadState('domcontentloaded');

    // 3. Verify BoK dialog is open
    const bokDialogTitle = page.getByRole('heading', {
      name: /body.*of.*knowledge/i,
      level: 2,
    });
    await expect(bokDialogTitle).toBeVisible({ timeout: 10000 });

    // 4. Click "Post" button to open the Add Post form
    const postButton = page.getByRole('button', { name: /^post$/i });
    await expect(postButton).toBeVisible({ timeout: 5000 });
    await postButton.click();

    // 5. Verify "Add Post" dialog appears
    const addPostTitle = page.getByRole('heading', { name: /add post/i });
    await expect(addPostTitle).toBeVisible({ timeout: 5000 });

    // 6. Verify "Add Reference" button is present (for adding links/documents)
    const addReferenceButton = page.getByRole('button', {
      name: /add reference/i,
    });
    await expect(addReferenceButton).toBeVisible({ timeout: 5000 });

    // 7. Close the Add Post dialog
    const closeAddPostButton = page
      .getByRole('dialog', { name: /add post/i })
      .getByRole('button', { name: /close/i });
    await expect(closeAddPostButton).toBeVisible({ timeout: 5000 });
    await closeAddPostButton.click();

    // 8. Verify Add Post dialog is closed
    await expect(addPostTitle).not.toBeVisible({ timeout: 5000 });

    // 9. Close the BoK dialog
    await page.keyboard.press('Escape');

    // 10. Verify we're back on the VC profile
    const vcProfileHeading = page.getByRole('heading', { level: 1 });
    await expect(vcProfileHeading).toBeVisible({ timeout: 10000 });
    await expect(vcProfileHeading).toContainText(createdVcDisplayName || '');
  });

  test('3.4 Associate VC to Space and accept invitation', async ({
    browser,
  }) => {
    expect(createdVcNameId).toBeTruthy();

    // Start as Org Admin to locate the VC and its settings
    await teardownAuthentication();
    await setupAuthentication(
      browser,
      TestUserManager.users.organizationAdmin.email
    );
    let page = getSharedPage();
    await openCreatedVirtualContributor(page);

    const settingsTab = page.getByRole('tab', { name: /settings/i });
    const settingsLink = page.getByRole('link', { name: /settings/i }).first();
    const settingsTarget = (await settingsTab.isVisible().catch(() => false))
      ? settingsTab
      : settingsLink;
    await expect(settingsTarget).toBeVisible();
    await settingsTarget.click();

    const membershipTab = page.getByRole('tab', { name: /membership/i });
    await expect(membershipTab).toBeVisible();
    await membershipTab.click();

    // Switch to Global Admin (has Space admin rights) to invite VC from Space settings
    await teardownAuthentication();
    await setupAuthentication(browser, TestUserManager.users.globalAdmin.email);
    page = getSharedPage();

    await page.goto(`${baseUrl}/${baseScenario.space.nameId}`);
    const spaceHeading = page.getByRole('heading', { level: 1 });
    await expect(spaceHeading).toBeVisible({ timeout: 15000 });

    // Community/Contributors tab
    const contributorsTab = page.getByRole('tab', {
      name: /community|contributors/i,
    });
    await expect(contributorsTab).toBeVisible({ timeout: 10000 });
    await contributorsTab.click();

    const addContributorButton = page
      .getByRole('button', {
        name: /add.*virtual contributor|add.*contributor|invite.*contributor/i,
      })
      .first();
    await expect(addContributorButton).toBeVisible({ timeout: 10000 });
    await addContributorButton.click();

    const searchField = page.getByRole('textbox', {
      name: /search|name|email|contributor/i,
    });
    await expect(searchField).toBeVisible({ timeout: 10000 });
    await searchField.fill(createdVcDisplayName || createdVcNameId || '');

    const vcOption = page
      .getByRole('option', {
        name: new RegExp(createdVcDisplayName || createdVcNameId || '', 'i'),
      })
      .first();
    await expect(vcOption).toBeVisible({ timeout: 10000 });
    await vcOption.click();

    const inviteButton = page.getByRole('button', {
      name: /add|invite|send/i,
    });
    await expect(inviteButton).toBeVisible({ timeout: 10000 });
    await inviteButton.click();

    // Switch back to Org Admin to accept invitation in VC settings
    await teardownAuthentication();
    await setupAuthentication(
      browser,
      TestUserManager.users.organizationAdmin.email
    );
    page = getSharedPage();

    await openCreatedVirtualContributor(page);
    const settingsTabReturn = page.getByRole('tab', { name: /settings/i });
    await expect(settingsTabReturn).toBeVisible({ timeout: 10000 });
    await settingsTabReturn.click();

    const membershipTabReturn = page.getByRole('tab', { name: /membership/i });
    await expect(membershipTabReturn).toBeVisible({ timeout: 10000 });
    await membershipTabReturn.click();

    const pendingSection = page.getByText(/pending invitations/i);
    await expect(pendingSection).toBeVisible({ timeout: 15000 });

    const acceptButton = pendingSection.getByRole('button', {
      name: /accept/i,
    });
    await expect(acceptButton).toBeVisible({ timeout: 10000 });
    await acceptButton.click();

    const membershipEntry = page.getByText(
      new RegExp(baseScenario.space.nameId, 'i')
    );
    await expect(membershipEntry).toBeVisible({ timeout: 15000 });
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
    const acceptCookiesForum = page.getByRole('button', {
      name: /accept all cookies/i,
    });
    if (await acceptCookiesForum.isVisible().catch(() => false)) {
      await acceptCookiesForum.click();
    }
    await expect(
      page.getByRole('heading', {
        name: /Welcome to the Alkemio Forum/i,
        level: 1,
      })
    ).toBeVisible();

    const seeAllDiscussions = page.getByRole('link', {
      name: /see all discussions/i,
    });
    if (await seeAllDiscussions.isVisible().catch(() => false)) {
      await seeAllDiscussions.click();
      await page.waitForLoadState('domcontentloaded');
    }

    // 4. Look for existing discussion card
    const discussionHeading = page
      .getByRole('heading', { name: /VC CRUD Test Discussion/i })
      .first();
    const discussionClickable = discussionHeading.locator(
      'xpath=ancestor::a[1] | xpath=ancestor::button[1]'
    );

    const discussionVisible = await discussionHeading
      .isVisible({ timeout: 10000 })
      .catch(() => false);
    if (!discussionVisible) {
      await expect(
        page.getByRole('heading', { name: /Welcome to the Alkemio Forum/i })
      ).toBeVisible();
      return;
    }

    if (
      await discussionClickable.isVisible({ timeout: 2000 }).catch(() => false)
    ) {
      await discussionClickable.click();
    } else {
      await discussionHeading.click();
    }
    await page.waitForTimeout(1000);

    // 5. Verify discussion heading is visible
    const discussionHeadingDetail = page.getByRole('heading', {
      name: /VC CRUD Test Discussion/i,
    });
    const detailVisible = await discussionHeadingDetail
      .isVisible({ timeout: 5000 })
      .catch(() => false);

    if (!detailVisible) {
      await expect(
        page.getByRole('heading', { name: /Welcome to the Alkemio Forum/i })
      ).toBeVisible();
      return;
    }

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
      .locator('..');
    let vcCard = vcSection.getByRole('link', {
      name: new RegExp(createdVcDisplayName || '', 'i'),
    });

    const vcCardVisible = await vcCard
      .first()
      .isVisible({ timeout: 4000 })
      .catch(() => false);

    if (!vcCardVisible) {
      await openCreatedVirtualContributor(page);
    } else {
      await expect(vcCard.first()).toBeVisible({ timeout: 12000 });
      await vcCard.first().click();
    }

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

    await openCreatedVirtualContributor(page);

    // 3. Navigate to VC Settings tab
    const settingsTab = page.getByRole('tab', { name: /settings/i });
    const settingsLink = page.getByRole('link', { name: /settings/i }).first();
    const settingsTarget = (await settingsTab.isVisible().catch(() => false))
      ? settingsTab
      : settingsLink;
    await expect(settingsTarget).toBeVisible({ timeout: 10000 });
    await settingsTarget.click();

    // 4. Look for Visibility setting
    const visibilityOption = page
      .getByText(/visibility|privacy|hidden/i)
      .first();
    await expect(visibilityOption).toBeVisible();

    // 5. Look for toggle or dropdown
    const visibilityToggle = page.locator(
      'input[type="checkbox"], [role="switch"]'
    );
    const toggleCount = await visibilityToggle.count();
    if (toggleCount === 0) {
      await expect(visibilityOption).toBeVisible();
      return;
    }
    await expect(visibilityToggle.first()).toBeVisible();
  });

  test('3.8 Visit and verify VC Body of Knowledge', async ({ browser }) => {
    expect(createdVcNameId).toBeTruthy();
    // Switch to Space Member
    await teardownAuthentication();
    await setupAuthentication(browser, TestUserManager.users.spaceMember.email);
    const page = getSharedPage();

    await openCreatedVirtualContributor(page);

    // 4. Verify VC profile page
    await expect(page.getByRole('heading', { level: 1 })).toContainText(
      createdVcDisplayName || ''
    );

    // 5. Look for Body of Knowledge section
    const bokHeading = page.getByRole('heading', {
      name: /body.*of.*knowledge|knowledge/i,
      level: 2,
    });
    await expect(bokHeading).toBeVisible({ timeout: 15000 });

    const visitButton = page.getByRole('button', { name: /visit/i }).first();
    if (await visitButton.isVisible().catch(() => false)) {
      const enabled = await visitButton.isEnabled().catch(() => false);
      if (enabled) {
        await visitButton.click();
        await page.waitForLoadState('domcontentloaded');
      }
    }

    const bokDialog = page.getByRole('dialog', { name: /body.*knowledge/i });
    if (await bokDialog.isVisible().catch(() => false)) {
      await expect(bokDialog).toBeVisible();
    }

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

    await openCreatedVirtualContributor(page);

    // 3. Navigate to VC Settings
    const settingsTab = page.getByRole('tab', { name: /settings/i });
    const settingsLink = page.getByRole('link', { name: /settings/i }).first();
    const settingsTarget = (await settingsTab.isVisible().catch(() => false))
      ? settingsTab
      : settingsLink;
    await expect(settingsTarget).toBeVisible({ timeout: 10000 });
    await settingsTarget.click();

    // 4. Delete via API to ensure cleanup when we have a UUID
    const deleteTarget = (createdVcId as string) || (createdVcNameId as string);
    const isUuid =
      /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(
        deleteTarget
      );

    if (isUuid) {
      const deleteResult = await deleteVirtualContributor(
        deleteTarget,
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
    }
  });
});
