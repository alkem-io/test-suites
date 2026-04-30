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
import { TestUserManager } from '@alkemio/tests-lib';
import { expect } from '@playwright/test';
import { createAuthenticatedSessionFixture } from '../fixtures/authenticated-session.fixture';
import { CollaborationPage } from './pages';

const baseUrl = process.env.ALKEMIO_BASE_URL || 'http://localhost:3000';

const scenarioConfig: TestScenarioConfig = {
  name: 'callout-access-control',
  space: {
    about: {
      profile: {
        displayName: 'Callout Access Control Test Space',
      },
    },
    collaboration: {
      addTutorialCallouts: false,
      addPostCollectionCallout: true,
      addWhiteboardCallout: true,
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
const testCalloutName = `Admin Full Access Test ${Date.now()}`;

const adminFixture = createAuthenticatedSessionFixture({
  storageStateName: 'callout-access-admin.json',
  cleanupAfterTests: process.env.cleanupAfterTests === 'true',
});

const memberFixture = createAuthenticatedSessionFixture({
  storageStateName: 'callout-access-member.json',
  cleanupAfterTests: process.env.cleanupAfterTests === 'true',
});

/** @testCase TC-2201, TC-2202 */
adminFixture.test.describe.serial('Callout Access Control', () => {
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

  adminFixture.test('7.1 Space Admin - Full Access', async ({ page }) => {
    adminFixture.test.setTimeout(60_000);
    const collaborationPage = new CollaborationPage(page, baseUrl);

    await collaborationPage.navigateToSpace(baseScenario.space.nameId);

    await expect(collaborationPage.addCalloutButton).toBeVisible({
      timeout: 3000,
    });

    await collaborationPage.createCallout(
      'post',
      testCalloutName,
      'Testing admin full access',
      true
    );

    const isDraftVisible =
      await collaborationPage.isCalloutVisible(testCalloutName);
    expect(isDraftVisible).toBe(true);

    await collaborationPage.clickCallout(testCalloutName);

    await expect(collaborationPage.commentInput).toBeVisible();

    await collaborationPage.openContextualMenu();

    await expect(collaborationPage.editButton).toBeVisible();
    await expect(collaborationPage.deleteButton).toBeVisible();
    await expect(collaborationPage.publishMenuItem).toBeVisible();
    await expect(collaborationPage.shareMenuItem).toBeVisible();

    await collaborationPage.publishCallout();
  });
});

memberFixture.test.describe.serial('Callout Access Control - Member', () => {
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

  memberFixture.test('7.2 Space Member - Limited Access', async ({ page }) => {
    memberFixture.test.setTimeout(45_000);
    const collaborationPage = new CollaborationPage(page, baseUrl);

    await collaborationPage.navigateToSpace(baseScenario.space.nameId);

    const isAddVisible = await collaborationPage.isAddCalloutVisible();
    expect(isAddVisible).toBe(false);

    expect(collaborationPage.getCalloutByName(testCalloutName)).toBeDefined();
    await collaborationPage.clickCallout(testCalloutName);

    await expect(collaborationPage.commentInput).toBeVisible();

    await collaborationPage.openContextualMenu();

    await expect(collaborationPage.editButton).not.toBeVisible();
    await expect(collaborationPage.deleteButton).not.toBeVisible();
    await expect(collaborationPage.publishMenuItem).not.toBeVisible();
    await expect(collaborationPage.shareMenuItem).toBeVisible();
  });
});
