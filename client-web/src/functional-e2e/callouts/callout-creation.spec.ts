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
  name: 'callout-creation',
  space: {
    about: {
      profile: {
        displayName: 'Callout Creation Test Space',
      },
    },
    collaboration: {
      addTutorialCallouts: false,
      addPostCollectionCallout: false,
      addWhiteboardCallout: false,
    },
    community: {
      admins: [TestUser.SPACE_ADMIN],
      members: [
        TestUser.SPACE_MEMBER,
        TestUser.SPACE_ADMIN,
        TestUser.SUBSPACE_MEMBER,
        TestUser.SUBSPACE_ADMIN,
      ],
    },
    settings: {
      privacy: { mode: SpacePrivacyMode.Public },
      membership: {
        policy: CommunityMembershipPolicy.Applications,
      },
    },
    subspace: {
      community: {
        admins: [TestUser.SUBSPACE_ADMIN],
        members: [TestUser.SUBSPACE_MEMBER, TestUser.SUBSPACE_ADMIN],
      },
      settings: {
        privacy: { mode: SpacePrivacyMode.Public },
        membership: {
          policy: CommunityMembershipPolicy.Applications,
        },
      },
    },
  },
};

let baseScenario: OrganizationWithSpaceModel;

const adminFixture = createAuthenticatedSessionFixture({
  storageStateName: 'callout-creation-admin.json',
  cleanupAfterTests: process.env.cleanupAfterTests === 'true',
});

const memberFixture = createAuthenticatedSessionFixture({
  storageStateName: 'callout-creation-member.json',
  cleanupAfterTests: process.env.cleanupAfterTests === 'true',
});

adminFixture.test.describe.serial('Callout Creation', () => {
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
    '1.1 Create Post Callout - As Space Admin',
    async ({ page }) => {
      adminFixture.test.setTimeout(30_000);
      const collaborationPage = new CollaborationPage(page, baseUrl);
      const calloutName = `Test Post Callout ${Date.now()}`;

      await collaborationPage.navigateToSpace(baseScenario.space.nameId);

      await expect(collaborationPage.addCalloutButton).toBeVisible();

      await collaborationPage.createCallout(
        'post',
        calloutName,
        'A test post callout for E2E testing'
      );

      const calloutCard = await collaborationPage.getCalloutByName(calloutName);
      await expect(calloutCard).toBeVisible();
    }
  );

  adminFixture.test(
    '1.2 Create Whiteboard Callout - As Space Admin',
    async ({ page }) => {
      adminFixture.test.setTimeout(30_000);
      const collaborationPage = new CollaborationPage(page, baseUrl);
      const calloutName = `Test Whiteboard ${Date.now()}`;

      await collaborationPage.navigateToSpace(baseScenario.space.nameId);

      await collaborationPage.createCallout(
        'whiteboard',
        calloutName,
        'A collaborative whiteboard for visual brainstorming'
      );

      const calloutCard = await collaborationPage.getCalloutByName(calloutName);
      await expect(calloutCard).toBeVisible();
    }
  );

  adminFixture.test(
    '1.3 Create CTA (Call To Action) Callout - As Space Admin',
    async ({ page }) => {
      adminFixture.test.setTimeout(30_000);
      const collaborationPage = new CollaborationPage(page, baseUrl);
      const calloutName = `Test CTA Callout ${Date.now()}`;

      await collaborationPage.navigateToSpace(baseScenario.space.nameId);

      await collaborationPage.createCallout(
        'link',
        calloutName,
        'A call to action callout with a link',
        false,
        { linkText: 'Learn More', url: 'https://example.com' }
      );

      const calloutCard = await collaborationPage.getCalloutByName(calloutName);
      await expect(calloutCard).toBeVisible();
    }
  );

  adminFixture.test(
    '1.4 Create Memo Callout - As Space Admin',
    async ({ page }) => {
      adminFixture.test.setTimeout(30_000);
      const collaborationPage = new CollaborationPage(page, baseUrl);
      const calloutName = `Test Memo ${Date.now()}`;

      await collaborationPage.navigateToSpace(baseScenario.space.nameId);

      await collaborationPage.createCallout(
        'memo',
        calloutName,
        'A collaborative memo document'
      );

      const calloutCard = await collaborationPage.getCalloutByName(calloutName);
      await expect(calloutCard).toBeVisible();
    }
  );

  // Response Options - Collection Types
  adminFixture.test(
    '1.5 Create Callout with Posts Collection - As Space Admin',
    async ({ page }) => {
      adminFixture.test.setTimeout(30_000);
      const collaborationPage = new CollaborationPage(page, baseUrl);
      const calloutName = `Posts Collection ${Date.now()}`;

      await collaborationPage.navigateToSpace(baseScenario.space.nameId);

      await collaborationPage.createCalloutWithContributions(
        calloutName,
        'posts',
        'A callout that accepts post contributions'
      );

      const calloutCard = await collaborationPage.getCalloutByName(calloutName);
      await expect(calloutCard).toBeVisible();
    }
  );

  adminFixture.test(
    '1.6 Create Callout with Links & Files Collection - As Space Admin',
    async ({ page }) => {
      adminFixture.test.setTimeout(30_000);
      const collaborationPage = new CollaborationPage(page, baseUrl);
      const calloutName = `Links Collection ${Date.now()}`;

      await collaborationPage.navigateToSpace(baseScenario.space.nameId);

      await collaborationPage.createCalloutWithContributions(
        calloutName,
        'links',
        'A callout that accepts link contributions'
      );

      const calloutCard = await collaborationPage.getCalloutByName(calloutName);
      await expect(calloutCard).toBeVisible();
    }
  );

  adminFixture.test(
    '1.7 Create Callout with Memos Collection - As Space Admin',
    async ({ page }) => {
      adminFixture.test.setTimeout(30_000);
      const collaborationPage = new CollaborationPage(page, baseUrl);
      const calloutName = `Memos Collection ${Date.now()}`;

      await collaborationPage.navigateToSpace(baseScenario.space.nameId);

      await collaborationPage.createCalloutWithContributions(
        calloutName,
        'memos',
        'A callout that accepts memo contributions'
      );

      const calloutCard = await collaborationPage.getCalloutByName(calloutName);
      await expect(calloutCard).toBeVisible();
    }
  );

  adminFixture.test(
    '1.8 Create Callout with Whiteboards Collection - As Space Admin',
    async ({ page }) => {
      adminFixture.test.setTimeout(30_000);
      const collaborationPage = new CollaborationPage(page, baseUrl);
      const calloutName = `Whiteboards Collection ${Date.now()}`;

      await collaborationPage.navigateToSpace(baseScenario.space.nameId);

      await collaborationPage.createCalloutWithContributions(
        calloutName,
        'whiteboards',
        'A callout that accepts whiteboard contributions'
      );

      const calloutCard = await collaborationPage.getCalloutByName(calloutName);
      await expect(calloutCard).toBeVisible();
    }
  );
});

memberFixture.test.describe.serial('Callout Creation - Member', () => {
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
    '1.9 Cannot Create Callout - As Space Member',
    async ({ page }) => {
      memberFixture.test.setTimeout(30_000);
      const collaborationPage = new CollaborationPage(page, baseUrl);

      await collaborationPage.navigateToSpace(baseScenario.space.nameId);

      const isAddVisible = await collaborationPage.isAddCalloutVisible();
      expect(isAddVisible).toBe(false);
    }
  );
});
