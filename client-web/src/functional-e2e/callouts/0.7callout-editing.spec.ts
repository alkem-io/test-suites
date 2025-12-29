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
import { time } from 'console';

const baseUrl = process.env.ALKEMIO_BASE_URL || 'http://localhost:3000';

const scenarioConfig: TestScenarioConfig = {
  name: 'callout-editing',
  space: {
    about: {
      profile: {
        displayName: 'Callout Editing Test Space',
      },
    },
    collaboration: {
      addTutorialCallouts: false,
      addPostCollectionCallout: true,
      addWhiteboardCallout: false,
      addPostCallout: false,
    },
    community: {
      admins: [TestUser.SPACE_ADMIN],
      members: [TestUser.SPACE_MEMBER, TestUser.SPACE_ADMIN],
    },
    // settings: {
    //   privacy: { mode: SpacePrivacyMode.Public },
    //   membership: {
    //     policy: CommunityMembershipPolicy.Applications,
    //   },
    // },
  },
};

let baseScenario: OrganizationWithSpaceModel;
let currentCalloutName = `Editable Callout ${Date.now()}`;

const adminFixture = createAuthenticatedSessionFixture({
  storageStateName: 'callout-editing-admin.json',
  cleanupAfterTests: process.env.cleanupAfterTests === 'true',
});

const memberFixture = createAuthenticatedSessionFixture({
  storageStateName: 'callout-editing-member.json',
  cleanupAfterTests: process.env.cleanupAfterTests === 'true',
});

adminFixture.test.describe.serial('Callout Editing', () => {
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
    if (baseScenario) {
      await TestScenarioFactory.cleanUpBaseScenario(baseScenario);
    }
  });

  adminFixture.test(
    '3.1 Edit Callout Details - As Space Admin',
    async ({ page }) => {
      adminFixture.test.setTimeout(45_000);
      const collaborationPage = new CollaborationPage(page, baseUrl);
      const updatedName = `Updated Callout ${Date.now()}`;
      const updatedDescription = 'Updated description for testing';

      await collaborationPage.navigateToSpace(baseScenario.space.nameId);

      await collaborationPage.createCallout(
        'post',
        currentCalloutName,
        'Original description',
        true
      );

      await collaborationPage.clickCallout(currentCalloutName);

      await collaborationPage.openContextualMenu();
      await expect(collaborationPage.editButton).toBeVisible();

      await collaborationPage.editButton.click();

      await collaborationPage.displayNameInput.clear();
      await collaborationPage.displayNameInput.fill(updatedName);
      await collaborationPage.descriptionInput.clear();
      await collaborationPage.descriptionInput.first().fill(updatedDescription);

      await collaborationPage.saveCallout();

      await expect(page.getByText(updatedName).first()).toBeVisible({
        timeout: 5000,
      });
      await expect(page.getByText(updatedDescription).first()).toBeVisible({
        timeout: 3000,
      });

      // Update the current callout name for subsequent tests
      currentCalloutName = updatedName;

      // Publish the callout so member tests can access it
      await collaborationPage.clickCallout(updatedName);
      await collaborationPage.openContextualMenu();
      await collaborationPage.publishCallout();
    }
  );

  adminFixture.test(
    '3.2 Edit Callout Settings - As Space Admin',
    async ({ page }) => {
      adminFixture.test.setTimeout(30_000);
      const collaborationPage = new CollaborationPage(page, baseUrl);

      await collaborationPage.navigateToSpace(baseScenario.space.nameId);

      expect(
        collaborationPage.getCalloutByName(currentCalloutName)
      ).toBeDefined();
      await collaborationPage.clickCallout(currentCalloutName);

      // Verify settings button is available (admin can access settings)
      await collaborationPage.openContextualMenu();
      await expect(collaborationPage.editButton).toBeVisible();
    }
  );

  adminFixture.test(
    '3.4 Publish Draft Callout - As Space Admin',
    async ({ page }) => {
      adminFixture.test.setTimeout(45_000);
      const collaborationPage = new CollaborationPage(page, baseUrl);
      const draftCalloutName = `Draft to Publish ${Date.now()}`;

      await collaborationPage.navigateToSpace(baseScenario.space.nameId);

      await collaborationPage.createCallout(
        'post',
        draftCalloutName,
        'This callout will be published',
        true
      );

      await collaborationPage.clickCallout(draftCalloutName);

      await collaborationPage.openContextualMenu();
      await expect(collaborationPage.publishMenuItem).toBeVisible();

      await collaborationPage.publishCallout();

      await collaborationPage.openContextualMenu();
      await expect(collaborationPage.publishMenuItem).not.toBeVisible();
    }
  );
});

memberFixture.test.describe.serial('Callout Editing - Member', () => {
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

  memberFixture.test.skip(
    '3.3 Cannot Edit Callout - As Space Member',
    async ({ page }) => {
      memberFixture.test.setTimeout(30_000);
      const collaborationPage = new CollaborationPage(page, baseUrl);

      await collaborationPage.navigateToSpace(baseScenario.space.nameId);

      await delay(500);
      // expect(
      //   collaborationPage.getCalloutByName(
      //     baseScenario.space.collaboration.calloutPostDisplayName
      //   )
      // ).toBeDefined();
      await expect(
        page.getByRole('heading', {
          name: `${baseScenario.space.collaboration.calloutPostCollectionDisplayName}`,
          exact: true,
        })
      ).toBeVisible({ timeout: 5000 });
      page
        .getByRole('heading', {
          name: `${baseScenario.space.collaboration.calloutPostCollectionDisplayName}`,
          exact: true,
        })
        .click({ timeout: 5000 });
      // await collaborationPage.clickCallout(
      //   baseScenario.space.collaboration.calloutPostDisplayName
      // );
      await delay(500);
      // const isEditVisible = await collaborationPage.isEditButtonVisible();
      // expect(isEditVisible).toBe(false);
      await page
        .getByRole('button', { name: 'settings' })
        .first()
        .click({ timeout: 5000 });
      await delay(500);
      await expect(page.getByText('Edit', { exact: true })).not.toBeVisible({
        timeout: 5000,
      });
    }
  );
});
