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
  name: 'callout-full-workflow',
  space: {
    about: {
      profile: {
        displayName: 'Callout Full Workflow Test Space',
      },
    },
    collaboration: {
      addTutorialCallouts: false,
      addPostCollectionCallout: false,
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
const sharedCalloutName = `Full Workflow Callout ${Date.now()}`;

const adminFixture = createAuthenticatedSessionFixture({
  storageStateName: 'callout-workflow-admin.json',
  cleanupAfterTests: process.env.cleanupAfterTests === 'true',
});

const memberFixture = createAuthenticatedSessionFixture({
  storageStateName: 'callout-workflow-member.json',
  cleanupAfterTests: process.env.cleanupAfterTests === 'true',
});

adminFixture.test.describe.serial('8.1 Post Collection - Full Workflow', () => {
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
    'Step 1: Admin creates Post Collection callout',
    async ({ page }) => {
      adminFixture.test.setTimeout(45_000);
      const collaborationPage = new CollaborationPage(page, baseUrl);

      await collaborationPage.navigateToSpace(baseScenario.space.nameId);

      await collaborationPage.createCalloutWithContributions(
        sharedCalloutName,
        'posts',
        'A post collection for the full workflow test',
        true
      );

      const isVisible =
        await collaborationPage.isCalloutVisible(sharedCalloutName);
      expect(isVisible).toBe(true);
    }
  );

  adminFixture.test('Step 2: Admin publishes the callout', async ({ page }) => {
    adminFixture.test.setTimeout(30_000);
    const collaborationPage = new CollaborationPage(page, baseUrl);

    await collaborationPage.navigateToSpace(baseScenario.space.nameId);
    await collaborationPage.clickCallout(sharedCalloutName);

    await collaborationPage.openContextualMenu();
    await collaborationPage.publishCallout();

    await collaborationPage.openContextualMenu();
    await expect(collaborationPage.publishMenuItem).not.toBeVisible();
  });
});

memberFixture.test.describe.serial(
  '8.1 Post Collection - Member Contributions',
  () => {
    memberFixture.test.beforeAll(async ({ browser }) => {
      memberFixture.test.setTimeout(60_000);
      await memberFixture.setupAuthentication(
        browser,
        TestUserManager.users.spaceMember.email
      );
    });

    memberFixture.test.afterAll(async () => {
      memberFixture.test.setTimeout(30_000);
      await memberFixture.teardownAuthentication();
    });

    memberFixture.test(
      'Step 3: Member adds post contribution',
      async ({ page }) => {
        memberFixture.test.setTimeout(45_000);
        const collaborationPage = new CollaborationPage(page, baseUrl);
        const postTitle = `Member Post ${Date.now()}`;
        const postContent = 'This is a contribution from a space member';

        await collaborationPage.navigateToSpace(baseScenario.space.nameId);

        await collaborationPage.clickCallout(sharedCalloutName);

        await collaborationPage.addPostContribution(postTitle, postContent);
        await delay(1000); // Small delay to allow contribution to render
        await expect(page.getByText(postTitle).first()).toBeVisible({
          timeout: 3000,
        });
      }
    );

    memberFixture.test(
      'Step 4: Member comments on callout',
      async ({ page }) => {
        memberFixture.test.setTimeout(45_000);
        const collaborationPage = new CollaborationPage(page, baseUrl);
        const commentText = `Member comment ${Date.now()}`;

        await collaborationPage.navigateToSpace(baseScenario.space.nameId);
        await collaborationPage.clickCallout(sharedCalloutName);

        await expect(collaborationPage.commentInput).toBeVisible();

        await collaborationPage.addComment(commentText);

        // Wait for comment to appear - use paragraph locator for reliable matching
        await expect(
          page.locator('p', { hasText: commentText }).first()
        ).toBeVisible({ timeout: 10000 });
      }
    );
  }
);

const adminModerationFixture = createAuthenticatedSessionFixture({
  storageStateName: 'callout-workflow-admin-mod.json',
  cleanupAfterTests: process.env.cleanupAfterTests === 'true',
});

adminModerationFixture.test.describe.serial(
  '8.1 Post Collection - Admin Moderation',
  () => {
    adminModerationFixture.test.beforeAll(async ({ browser }) => {
      adminModerationFixture.test.setTimeout(60_000);
      await adminModerationFixture.setupAuthentication(
        browser,
        TestUserManager.users.spaceAdmin.email
      );
    });

    adminModerationFixture.test.afterAll(async () => {
      adminModerationFixture.test.setTimeout(30_000);
      await adminModerationFixture.teardownAuthentication();
      if (baseScenario) {
        await TestScenarioFactory.cleanUpBaseScenario(baseScenario);
      }
    });

    adminModerationFixture.test(
      'Step 5: Admin moderates content',
      async ({ page }) => {
        adminModerationFixture.test.setTimeout(45_000);
        const collaborationPage = new CollaborationPage(page, baseUrl);

        await collaborationPage.navigateToSpace(baseScenario.space.nameId);
        await collaborationPage.clickCallout(sharedCalloutName);

        const contributions = collaborationPage.contributionsList;
        await expect(contributions.first()).toBeVisible();

        const contributionCount =
          await collaborationPage.getContributionCount();
        expect(contributionCount).toBeGreaterThan(0);

        const commentCount = await collaborationPage.getCommentCount();
        expect(commentCount).toBeGreaterThan(0);

        // Verify comments are visible using Reply button (each comment has one)
        await expect(collaborationPage.replyButton.first()).toBeVisible();

        await collaborationPage.openContextualMenu();
        await expect(collaborationPage.editButton).toBeVisible();
        await expect(collaborationPage.deleteButton).toBeVisible();
      }
    );
  }
);
