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
  name: 'callout-deletion',
  space: {
    about: {
      profile: {
        displayName: 'Callout Deletion Test Space',
      },
    },
    collaboration: {
      addTutorialCallouts: false,
      addPostCallout: true,
      addWhiteboardCallout: false,
    },
    community: {
      admins: [TestUser.SPACE_ADMIN],
      members: [TestUser.SPACE_MEMBER, TestUser.SPACE_ADMIN],
    },
  },
};

let baseScenario: OrganizationWithSpaceModel;

const adminFixture = createAuthenticatedSessionFixture({
  storageStateName: 'callout-deletion-admin.json',
  cleanupAfterTests: process.env.cleanupAfterTests === 'true',
});

const memberFixture = createAuthenticatedSessionFixture({
  storageStateName: 'callout-deletion-member.json',
  cleanupAfterTests: process.env.cleanupAfterTests === 'true',
});

/** @testCase TC-2207 */
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
    //if (baseScenario) {
    // await TestScenarioFactory.cleanUpBaseScenario(baseScenario);
    //}
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
    await collaborationPage.confirmDeleteButton.click({ timeout: 5000 });

    await collaborationPage.navigateToSpace(baseScenario.space.nameId);

    await expect(
      page.getByRole('heading', {
        name: `${calloutToDelete}`,
        exact: true,
      })
    ).toBeHidden({ timeout: 5000 });
  });
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
    await TestScenarioFactory.cleanUpBaseScenario(baseScenario);
  });

  memberFixture.test(
    '4.2 Cannot Delete Callout - As Space Member',
    async ({ page }) => {
      memberFixture.test.setTimeout(30_000);
      const collaborationPage = new CollaborationPage(page, baseUrl);

      await collaborationPage.navigateToSpace(baseScenario.space.nameId);

      await delay(500);
      await expect(
        page.getByRole('heading', {
          name: baseScenario.space.collaboration.calloutPostDisplayName,
          exact: true,
        })
      ).toBeVisible({ timeout: 5000 });
      await collaborationPage.clickCallout(
        baseScenario.space.collaboration.calloutPostDisplayName
      );
      await delay(500);
      await collaborationPage.openContextualMenu();
      await delay(500);
      await expect(page.getByText('Delete')).not.toBeVisible({ timeout: 4000 });
    }
  );
});
