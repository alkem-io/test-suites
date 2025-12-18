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
  name: 'callout-deletion',
  space: {
    about: {
      profile: {
        displayName: 'Callout Deletion Test Space',
      },
    },
    collaboration: {
      addTutorialCallouts: false,
      addPostCollectionCallout: true,
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
const testCalloutName = `Deletion Test Callout ${Date.now()}`;

const adminFixture = createAuthenticatedSessionFixture({
  storageStateName: 'callout-deletion-admin.json',
  cleanupAfterTests: process.env.cleanupAfterTests === 'true',
});

const memberFixture = createAuthenticatedSessionFixture({
  storageStateName: 'callout-deletion-member.json',
  cleanupAfterTests: process.env.cleanupAfterTests === 'true',
});

adminFixture.test.describe.serial('Callout Deletion', () => {
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

  adminFixture.test('4.1 Delete Callout - As Space Admin', async ({ page }) => {
    adminFixture.test.setTimeout(45_000);
    const collaborationPage = new CollaborationPage(page, baseUrl);
    const calloutToDelete = `Callout to Delete ${Date.now()}`;

    await collaborationPage.navigateToSpace(baseScenario.space.nameId);

    await collaborationPage.createCallout(
      'post',
      calloutToDelete,
      'This callout will be deleted',
      true
    );

    const isVisible = await collaborationPage.isCalloutVisible(calloutToDelete);
    expect(isVisible).toBe(true);

    await collaborationPage.clickCallout(calloutToDelete);

    await collaborationPage.openContextualMenu();
    await expect(collaborationPage.deleteButton).toBeVisible();

    await collaborationPage.deleteButton.click();
    await expect(collaborationPage.confirmDialog).toBeVisible();
    await collaborationPage.confirmButton.click();

    await collaborationPage.navigateToSpace(baseScenario.space.nameId);

    const isDeleted = await collaborationPage.isCalloutVisible(calloutToDelete);
    expect(isDeleted).toBe(false);
  });

  adminFixture.test(
    '4.0 Setup: Create Callout for Member Test',
    async ({ page }) => {
      adminFixture.test.setTimeout(45_000);
      const collaborationPage = new CollaborationPage(page, baseUrl);

      await collaborationPage.navigateToSpace(baseScenario.space.nameId);

      await collaborationPage.createCallout(
        'post',
        testCalloutName,
        'Callout for member deletion access test',
        true
      );

      await collaborationPage.clickCallout(testCalloutName);
      await collaborationPage.openContextualMenu();
      await collaborationPage.publishCallout();
    }
  );
});

memberFixture.test.describe.serial('Callout Deletion - Member', () => {
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
    '4.2 Cannot Delete Callout - As Space Member',
    async ({ page }) => {
      memberFixture.test.setTimeout(30_000);
      const collaborationPage = new CollaborationPage(page, baseUrl);

      await collaborationPage.navigateToSpace(baseScenario.space.nameId);

      expect(collaborationPage.getCalloutByName(testCalloutName)).toBeDefined();
      await collaborationPage.clickCallout(testCalloutName);

      await collaborationPage.openContextualMenu();
      expect(collaborationPage.deleteButton).not.toBeVisible();
    }
  );
});
