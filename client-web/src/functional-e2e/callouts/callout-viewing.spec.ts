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

// Scenario config with pre-created callouts for viewing tests
const scenarioConfig: TestScenarioConfig = {
  name: 'callout-viewing',
  space: {
    about: {
      profile: {
        displayName: 'Callout Viewing Test Space',
      },
    },
    collaboration: {
      addTutorialCallouts: false,
      addPostCollectionCallout: true, // Pre-create a post collection callout
      addWhiteboardCallout: true, // Pre-create a whiteboard callout
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
const testCalloutName = `Viewing Test Callout ${Date.now()}`;

const adminFixture = createAuthenticatedSessionFixture({
  storageStateName: 'callout-viewing-admin.json',
  cleanupAfterTests: process.env.cleanupAfterTests === 'true',
});

const memberFixture = createAuthenticatedSessionFixture({
  storageStateName: 'callout-viewing-member.json',
  cleanupAfterTests: process.env.cleanupAfterTests === 'true',
});

adminFixture.test.describe.serial('Callout Viewing', () => {
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
    '2.3 View Draft Callout - As Space Admin',
    async ({ page }) => {
      adminFixture.test.setTimeout(30_000);
      const collaborationPage = new CollaborationPage(page, baseUrl);
      const draftCalloutName = `Draft Callout Admin ${Date.now()}`;

      await collaborationPage.navigateToSpace(baseScenario.space.nameId);

      await collaborationPage.createCallout(
        'post',
        draftCalloutName,
        'This is a draft callout',
        true
      );

      const isDraftVisible =
        await collaborationPage.isCalloutVisible(draftCalloutName);
      expect(isDraftVisible).toBe(true);

      await collaborationPage.clickCallout(draftCalloutName);
      await collaborationPage.openContextualMenu();
      await expect(collaborationPage.publishMenuItem).toBeVisible();
    }
  );

  adminFixture.test(
    '2.1 View Published Callout - As Space Admin',
    async ({ page }) => {
      adminFixture.test.setTimeout(30_000);
      const collaborationPage = new CollaborationPage(page, baseUrl);

      await collaborationPage.navigateToSpace(baseScenario.space.nameId);

      await collaborationPage.createCallout(
        'post',
        testCalloutName,
        'A callout for viewing tests',
        true
      );

      const isVisible =
        await collaborationPage.isCalloutVisible(testCalloutName);
      expect(isVisible).toBe(true);

      await collaborationPage.clickCallout(testCalloutName);

      await collaborationPage.openContextualMenu();
      await collaborationPage.publishCallout();

      await expect(collaborationPage.commentInput).toBeVisible();
    }
  );
});

memberFixture.test.describe.serial('Callout Viewing - Member', () => {
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
    '2.1 View Published Callout - As Space Member',
    async ({ page }) => {
      memberFixture.test.setTimeout(30_000);
      const collaborationPage = new CollaborationPage(page, baseUrl);

      await collaborationPage.navigateToSpace(baseScenario.space.nameId);

      expect(collaborationPage.getCalloutByName(testCalloutName)).toBeDefined();
      await collaborationPage.clickCallout(testCalloutName);

      await expect(collaborationPage.commentInput).toBeVisible();
    }
  );

  memberFixture.test(
    '2.2 Cannot View Draft Callout - As Space Member',
    async ({ page }) => {
      memberFixture.test.setTimeout(30_000);
      const collaborationPage = new CollaborationPage(page, baseUrl);

      await collaborationPage.navigateToSpace(baseScenario.space.nameId);

      await collaborationPage.clickCallout(testCalloutName);
      await collaborationPage.openContextualMenu();
      await expect(collaborationPage.publishMenuItem).not.toBeVisible();
    }
  );
});
