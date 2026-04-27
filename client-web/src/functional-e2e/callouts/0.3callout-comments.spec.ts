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
  name: 'callout-comments',
  space: {
    about: {
      profile: {
        displayName: 'Callout Comments Test Space',
      },
    },
    collaboration: {
      addTutorialCallouts: false,
      addPostCollectionCallout: false,
      addWhiteboardCallout: false,
      addPostCallout: true,
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
const testCalloutName = `Comments Test Callout ${Date.now()}`;

const adminFixture = createAuthenticatedSessionFixture({
  storageStateName: 'callout-comments-admin.json',
  cleanupAfterTests: process.env.cleanupAfterTests === 'true',
});

const memberFixture = createAuthenticatedSessionFixture({
  storageStateName: 'callout-comments-member.json',
  cleanupAfterTests: process.env.cleanupAfterTests === 'true',
});

/** @testCase TC-2210, TC-2211 */
adminFixture.test.describe.serial('Callout Comments', () => {
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
    '5.2 Add Comment on Callout - As Space Admin',
    async ({ page }) => {
      adminFixture.test.setTimeout(45_000);
      const collaborationPage = new CollaborationPage(page, baseUrl);
      const adminComment = `Admin comment ${Date.now()}`;

      await collaborationPage.navigateToSpace(baseScenario.space.nameId);

      await collaborationPage.clickCallout(
        baseScenario.space.collaboration.calloutPostDisplayName
      );

      await expect(collaborationPage.commentInput).toBeVisible({
        timeout: 5000,
      });

      await collaborationPage.addComment(adminComment);

      // Wait for comment to appear - use first() in case of multiple matches and look for paragraph element
      await expect(
        page.locator('p', { hasText: adminComment }).first()
      ).toBeVisible({ timeout: 10000 });
    }
  );
});

memberFixture.test.describe.serial('Callout Comments - Member', () => {
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
    '5.1 Add Comment on Callout - As Space Member',
    async ({ page }) => {
      memberFixture.test.setTimeout(45_000);
      const collaborationPage = new CollaborationPage(page, baseUrl);
      const commentText = `Test comment from member ${Date.now()}`;

      await collaborationPage.navigateToSpace(baseScenario.space.nameId);

      await expect(
        page.getByRole('heading', {
          name: baseScenario.space.collaboration.calloutPostDisplayName,
          exact: true,
        })
      ).toBeVisible({ timeout: 5000 });
      await collaborationPage.clickCallout(
        baseScenario.space.collaboration.calloutPostDisplayName
      );

      await expect(collaborationPage.commentInput).toBeVisible({
        timeout: 5000,
      });

      await collaborationPage.addComment(commentText);

      // Wait for comment to appear - use paragraph locator for reliable matching
      await expect(
        page.locator('p', { hasText: commentText }).first()
      ).toBeVisible({ timeout: 10000 });
    }
  );

  memberFixture.test('5.5 View Comments Thread', async ({ page }) => {
    memberFixture.test.setTimeout(30_000);
    const collaborationPage = new CollaborationPage(page, baseUrl);

    await collaborationPage.navigateToSpace(baseScenario.space.nameId);

    await collaborationPage.clickCallout(
      baseScenario.space.collaboration.calloutPostDisplayName
    );

    await expect(collaborationPage.commentInput).toBeVisible({ timeout: 5000 });

    const commentCount = await collaborationPage.getCommentCount();
    expect(commentCount).toBeGreaterThanOrEqual(1);

    await expect(collaborationPage.replyButton.first()).toBeVisible();
  });
});
