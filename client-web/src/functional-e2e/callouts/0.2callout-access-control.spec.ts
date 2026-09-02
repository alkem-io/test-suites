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
import { createCalloutOnCalloutsSet } from '@alkemio/tests-lib/scenario/baseFunctions';
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

    // The "Add Post" create button appears after the space + collaboration tab
    // finish rendering; on the slower test env that can take longer than the
    // old 3s bound (7.1 flaked here, and 7.2 then can't find 7.1's callout).
    await expect(collaborationPage.addCalloutButton).toBeVisible({
      timeout: 15000,
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
  // 7.2 must not depend on the callout 7.1 created through the UI: under local
  // fullyParallel the two describes run in separate workers (separate scenario
  // + separate module-level Date.now() name), and a Playwright retry runs in a
  // fresh worker where the module re-evaluates, so the old name can never be
  // found again. Seed a published callout via the API here instead; the name
  // is assigned in beforeAll so a retry's fresh worker stays self-consistent.
  let memberCalloutName: string;

  memberFixture.test.beforeAll(async ({ browser }) => {
    memberFixture.test.setTimeout(60_000);
    if (!baseScenario) {
      baseScenario =
        await TestScenarioFactory.createBaseScenario(scenarioConfig);
    }
    memberCalloutName = `Member Access Test ${Date.now()}`;
    const created = await createCalloutOnCalloutsSet(
      baseScenario.space.collaboration.calloutsSetId,
      {
        framing: {
          profile: {
            displayName: memberCalloutName,
            description: 'Seeded for member limited-access checks',
          },
        },
      }
    );
    const calloutId = created.data?.createCalloutOnCalloutsSet?.id;
    if (!calloutId) {
      throw new Error(
        `[7.2 seed] published callout was not created: ${JSON.stringify(created.error ?? created)}`
      );
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

    expect(collaborationPage.getCalloutByName(memberCalloutName)).toBeDefined();
    await collaborationPage.clickCallout(memberCalloutName);

    await expect(collaborationPage.commentInput).toBeVisible();

    await collaborationPage.openContextualMenu();

    await expect(collaborationPage.editButton).not.toBeVisible();
    await expect(collaborationPage.deleteButton).not.toBeVisible();
    await expect(collaborationPage.publishMenuItem).not.toBeVisible();
    await expect(collaborationPage.shareMenuItem).toBeVisible();
  });
});
