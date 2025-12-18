// spec: client-web/src/functional-e2e/plans/callouts-test-plan.md
// seed: client-web/src/functional-e2e/seed-public-space.spec.ts

import {
  CommunityMembershipPolicy,
  SpacePrivacyMode,
} from '@alkemio/client-lib/dist/generated/graphql';
import { TestUser } from '@alkemio/tests-lib/common/enums/test.user';
import { TestScenarioConfig } from '@alkemio/tests-lib/scenario/config/test-scenario-config';
import { OrganizationWithSpaceModel } from '@alkemio/tests-lib/scenario/models/OrganizationWithSpaceModel';
import { TestScenarioFactory } from '@alkemio/tests-lib/scenario/TestScenarioFactory';
import { delay, TestUserManager } from '@alkemio/tests-lib';
import { expect } from '@playwright/test';
import { createAuthenticatedSessionFixture } from '../fixtures/authenticated-session.fixture';
import { CollaborationPage } from './pages';

const baseUrl = process.env.ALKEMIO_BASE_URL || 'http://localhost:3000';

const scenarioConfig: TestScenarioConfig = {
  name: 'callout-contributions',
  space: {
    about: {
      profile: {
        displayName: 'Callout Contributions Test Space',
      },
    },
    collaboration: {
      addTutorialCallouts: false,
      addPostCollectionCallout: true, // For post contributions
      addWhiteboardCallout: false,
    },
    community: {
      admins: [TestUser.SPACE_ADMIN],
      members: [TestUser.SPACE_MEMBER, TestUser.SPACE_ADMIN],
    },
    settings: {
      privacy: { mode: SpacePrivacyMode.Public },
      membership: {
        policy: CommunityMembershipPolicy.Applications,
      },
    },
  },
};

let baseScenario: OrganizationWithSpaceModel;
const testPostCalloutName = `Post Collection Test ${Date.now()}`;
const testLinkCalloutName = `Link Collection Test ${Date.now()}`;

const memberFixture = createAuthenticatedSessionFixture({
  storageStateName: 'callout-contributions-member.json',
  cleanupAfterTests: process.env.cleanupAfterTests === 'true',
});

const adminFixture = createAuthenticatedSessionFixture({
  storageStateName: 'callout-contributions-admin.json',
  cleanupAfterTests: process.env.cleanupAfterTests === 'true',
});

adminFixture.test.describe.serial('Callout Contributions - Setup', () => {
  adminFixture.test.beforeAll(async ({ browser }) => {
    adminFixture.test.setTimeout(60_000);
    baseScenario = await TestScenarioFactory.createBaseScenario(scenarioConfig);
    await adminFixture.setupAuthentication(
      browser,
      TestUserManager.users.spaceAdmin.email
    );
  });

  adminFixture.test.afterAll(async () => {
    adminFixture.test.setTimeout(30_000);
    await adminFixture.teardownAuthentication();
  });

  adminFixture.test(
    'Setup: Create Callouts for Contributions',
    async ({ page }) => {
      adminFixture.test.setTimeout(45_000);
      const collaborationPage = new CollaborationPage(page, baseUrl);

      await collaborationPage.navigateToSpace(baseScenario.space.nameId);

      // Create a callout with Posts collection type enabled
      await collaborationPage.createCalloutWithContributions(
        testPostCalloutName,
        'posts',
        'A post collection for testing contributions',
        true
      );
      await collaborationPage.clickCallout(testPostCalloutName);
      await collaborationPage.openContextualMenu();
      await collaborationPage.publishCallout();

      await collaborationPage.navigateToSpace(baseScenario.space.nameId);

      // Create a callout with Links collection type enabled
      await collaborationPage.createCalloutWithContributions(
        testLinkCalloutName,
        'links',
        'A link collection for testing contributions',
        true
      );
      await collaborationPage.clickCallout(testLinkCalloutName);
      await collaborationPage.openContextualMenu();
      await collaborationPage.publishCallout();
    }
  );
});

memberFixture.test.describe.serial('Callout Contributions - Member', () => {
  memberFixture.test.beforeAll(async ({ browser }) => {
    memberFixture.test.setTimeout(60_000);
    if (!baseScenario) {
      baseScenario =
        await TestScenarioFactory.createBaseScenario(scenarioConfig);
    }
    await memberFixture.setupAuthentication(
      browser,
      TestUserManager.users.spaceMember.email
    );
  });

  memberFixture.test.afterAll(async () => {
    memberFixture.test.setTimeout(30_000);
    await memberFixture.teardownAuthentication();
    if (baseScenario) {
      await TestScenarioFactory.cleanUpBaseScenario(baseScenario);
    }
  });

  memberFixture.test(
    '6.1 Add Post Contribution - As Space Member',
    async ({ page }) => {
      memberFixture.test.setTimeout(45_000);
      const collaborationPage = new CollaborationPage(page, baseUrl);
      const postTitle = `Test Post ${Date.now()}`;
      const postContent = 'This is a test post contribution from a member';

      await collaborationPage.navigateToSpace(baseScenario.space.nameId);

      expect(
        collaborationPage.getCalloutByName(testPostCalloutName)
      ).toBeDefined();
      await collaborationPage.clickCallout(testPostCalloutName);

      await expect(collaborationPage.addContributionButton).toBeVisible();

      await collaborationPage.addPostContribution(postTitle, postContent);

      await expect(page.getByText(postTitle).first()).toBeVisible();
    }
  );

  memberFixture.test(
    '6.2 Add Link Contribution - As Space Member',
    async ({ page }) => {
      memberFixture.test.setTimeout(45_000);
      const collaborationPage = new CollaborationPage(page, baseUrl);
      const linkUrl = 'https://example.com/test-resource';
      const linkTitle = `Test Link ${Date.now()}`;

      await collaborationPage.navigateToSpace(baseScenario.space.nameId);

      await collaborationPage.clickCallout(testLinkCalloutName);

      await expect(collaborationPage.addContributionButton.first()).toBeVisible(
        { timeout: 3000 }
      );

      await collaborationPage.addLinkContribution(linkUrl, linkTitle);

      await expect(page.getByText(linkTitle).first()).toBeVisible();
    }
  );

  memberFixture.test(
    '6.4 Edit Own Contribution - As Space Member',
    async ({ page }) => {
      memberFixture.test.setTimeout(45_000);
      const collaborationPage = new CollaborationPage(page, baseUrl);
      const originalTitle = 'Original Post Title';
      const originalContent = 'Original content for testing';
      const editedTitle = `Edited Post ${Date.now()}`;
      const editedContent = 'This content has been edited';

      await collaborationPage.navigateToSpace(baseScenario.space.nameId);
      await collaborationPage.clickCallout(testPostCalloutName);

      // Add a post contribution
      await collaborationPage.addPostContribution(
        originalTitle,
        originalContent
      );
      await expect(page.getByText(originalTitle).first()).toBeVisible();

      // Find and open the contribution card
      const contributionCard = page
        .getByRole('heading', { level: 2 })
        .filter({ hasText: originalTitle })
        .first();
      await contributionCard.click();

      // Click edit button (contextual menu)
      const editButton = page
        .locator('[data-testid="EditOutlinedIcon"]')
        .first();
      await expect(editButton).toBeVisible();
      await editButton.click();

      await delay(500); // Small delay to allow editor to load

      // Edit the title
      const titleInput = page.getByLabel(/title/i);
      await titleInput.clear();
      await titleInput.fill(editedTitle);

      // Edit the content
      const contentEditor = page.getByRole('textbox', {
        name: /markdown editor/i,
      });
      await contentEditor.click();
      await page.keyboard.press('Control+A');
      await page.keyboard.type(editedContent, { delay: 50 });

      // Save changes
      await page.getByRole('button', { name: /save/i }).click();

      // Verify edited content is visible
      await expect(page.getByText(editedTitle).first()).toBeVisible({
        timeout: 5000,
      });
    }
  );
});
