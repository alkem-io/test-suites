// spec: client-web/src/functional-e2e/plans/callouts-test-plan.md
// seed: client-web/src/functional-e2e/seed-public-space.spec.ts

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
  name: 'callout-subspace',
  space: {
    about: {
      profile: {
        displayName: 'Callout Subspace Test Space',
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
        TestUser.SUBSPACE_ADMIN,
        TestUser.SUBSPACE_MEMBER,
      ],
    },

    subspace: {
      about: {
        profile: {
          displayName: 'Callout Test Subspace',
        },
      },
      collaboration: {
        addTutorialCallouts: false,
        addPostCollectionCallout: false,
        addWhiteboardCallout: false,
      },
      community: {
        admins: [TestUser.SUBSPACE_ADMIN],
        members: [TestUser.SUBSPACE_ADMIN, TestUser.SUBSPACE_MEMBER],
      },
    },
  },
};

let baseScenario: OrganizationWithSpaceModel;
const testCalloutName = `Subspace Callout ${Date.now()}`;

const subspaceAdminFixture = createAuthenticatedSessionFixture({
  storageStateName: 'callout-subspace-admin.json',
  cleanupAfterTests: process.env.cleanupAfterTests === 'true',
});

subspaceAdminFixture.test.describe.serial(
  'Callout Creation in Subspace',
  () => {
    subspaceAdminFixture.test.beforeAll(async ({ browser }) => {
      subspaceAdminFixture.test.setTimeout(60_000);
      baseScenario =
        await TestScenarioFactory.createBaseScenario(scenarioConfig);
      await subspaceAdminFixture.setupAuthentication(
        browser,
        TestUserManager.users.subspaceAdmin.email
      );
    });

    subspaceAdminFixture.test.afterAll(async () => {
      subspaceAdminFixture.test.setTimeout(30_000);
      await subspaceAdminFixture.teardownAuthentication();
      await TestScenarioFactory.cleanUpBaseScenario(baseScenario);
    });

    subspaceAdminFixture.test(
      '1.6 Create Callout in Subspace - As Subspace Admin',
      async ({ page }) => {
        subspaceAdminFixture.test.setTimeout(45_000);
        const collaborationPage = new CollaborationPage(page, baseUrl);

        await collaborationPage.navigateToSubspace(
          baseScenario.space.nameId,
          baseScenario.subspace.nameId
        );

        await expect(collaborationPage.addCalloutButton).toBeVisible();

        await collaborationPage.clickAddCallout();

        await collaborationPage.selectCalloutType('post');

        await collaborationPage.fillCalloutDetails(
          testCalloutName,
          'A callout created in the subspace by subspace admin'
        );

        await collaborationPage.saveCallout();
        await delay(1000); // Small delay to allow callout to appear

        const isVisible =
          await collaborationPage.isCalloutVisible(testCalloutName);
        expect(isVisible).toBe(true);
      }
    );

    subspaceAdminFixture.test(
      'Verify: Subspace Admin cannot create callout in parent Space',
      async ({ page }) => {
        subspaceAdminFixture.test.setTimeout(30_000);
        const collaborationPage = new CollaborationPage(page, baseUrl);

        await collaborationPage.navigateToSpace(baseScenario.space.nameId);

        const isAddVisible = await collaborationPage.isAddCalloutVisible();
        expect(isAddVisible).toBe(false);
      }
    );
  }
);
