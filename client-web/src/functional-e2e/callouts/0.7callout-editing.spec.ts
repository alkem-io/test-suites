// spec: client-web/src/functional-e2e/plans/callouts-test-plan.md
// seed: client-web/src/functional-e2e/seed-public-space.spec.ts

import { CalloutVisibility } from '@alkemio/tests-lib';
import { TestUser } from '@alkemio/tests-lib/common/enums/test.user';
import { TestScenarioConfig } from '@alkemio/tests-lib/scenario/config/test-scenario-config';
import { OrganizationWithSpaceModel } from '@alkemio/tests-lib/scenario/models/OrganizationWithSpaceModel';
import { TestScenarioFactory } from '@alkemio/tests-lib/scenario/TestScenarioFactory';
import { TestUserManager } from '@alkemio/tests-lib';
import { expect } from '@playwright/test';
import { createAuthenticatedSessionFixture } from '../fixtures/authenticated-session.fixture';
import { CollaborationPage } from './pages';
import { sessionActor } from '../helpers/lib-actor.helper';
import { expectStoredCalloutVisibility } from '../helpers/callout-visibility.helper';
import { openPersonaPage } from '../helpers/space-access.helper';

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

let baseScenario: OrganizationWithSpaceModel | undefined;
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
      baseScenario = undefined;
    }
  });

  adminFixture.test(
    '3.1 Edit Callout Details - As Space Admin',
    async ({ page }) => {
      adminFixture.test.setTimeout(45_000);
      const collaborationPage = new CollaborationPage(page, baseUrl);
      const updatedName = `Updated Callout ${Date.now()}`;
      const updatedDescription = 'Updated description for testing';

      await collaborationPage.navigateToSpace(baseScenario!.space.nameId);

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

      // The edit reached the server: the callout is stored under the new
      // title — still a DRAFT (editing must not publish) — and no longer
      // under the original one.
      const calloutsSetId = baseScenario!.space.collaboration.calloutsSetId;
      const admin = await sessionActor(page);
      await expectStoredCalloutVisibility(
        calloutsSetId,
        updatedName,
        admin,
        CalloutVisibility.Draft,
        'the edited callout is stored under its new title, still a draft'
      );
      await expectStoredCalloutVisibility(
        calloutsSetId,
        currentCalloutName,
        admin,
        undefined,
        'no callout is stored under the original title any more'
      );

      // Update the current callout name for subsequent tests
      currentCalloutName = updatedName;

      // Publish the callout so member tests can access it
      await collaborationPage.clickCallout(updatedName);
      await collaborationPage.openContextualMenu();
      await collaborationPage.publishCallout();
      await expectStoredCalloutVisibility(
        calloutsSetId,
        updatedName,
        admin,
        CalloutVisibility.Published,
        'the publish after the edit reached the server'
      );
    }
  );

  adminFixture.test(
    '3.2 Edit Callout Settings - As Space Admin',
    async ({ page }) => {
      adminFixture.test.setTimeout(30_000);
      const collaborationPage = new CollaborationPage(page, baseUrl);

      await collaborationPage.navigateToSpace(baseScenario!.space.nameId);

      // After a fresh load the feed shows the callout under the title 3.1
      // saved: the edit survived a reload, not only the session's cache.
      await expect(
        collaborationPage.feedCalloutHeading(currentCalloutName)
      ).toBeVisible();
      await collaborationPage.clickCallout(currentCalloutName);

      // Verify settings button is available (admin can access settings)
      await collaborationPage.openContextualMenu();
      await expect(collaborationPage.editButton).toBeVisible();
    }
  );

  adminFixture.test(
    '3.4 Publish Draft Callout - As Space Admin',
    async ({ page, browser }) => {
      adminFixture.test.setTimeout(90_000);
      const collaborationPage = new CollaborationPage(page, baseUrl);
      const draftCalloutName = `Draft to Publish ${Date.now()}`;
      const calloutsSetId = baseScenario!.space.collaboration.calloutsSetId;
      const seededName =
        baseScenario!.space.collaboration.calloutPostCollectionDisplayName;

      await collaborationPage.navigateToSpace(baseScenario!.space.nameId);

      await collaborationPage.createCallout(
        'post',
        draftCalloutName,
        'This callout will be published',
        true
      );

      // Before the publish: stored as a DRAFT, and the server does not list
      // it for the member at all.
      await expectStoredCalloutVisibility(
        calloutsSetId,
        draftCalloutName,
        await sessionActor(page),
        CalloutVisibility.Draft,
        'the new callout is stored as a draft'
      );

      // The member, in their own session, does not see the draft — read only
      // after the feed has rendered (the seeded callout is on screen and no
      // card is still loading), so the absence is an observation.
      const member = await openPersonaPage(
        browser,
        TestUserManager.users.spaceMember.email
      );
      try {
        const memberView = new CollaborationPage(member.page, baseUrl);
        await memberView.navigateToSpace(baseScenario!.space.nameId);
        await memberView.expectFeedRendered(seededName);
        await expect(
          memberView.feedCalloutHeading(draftCalloutName)
        ).toHaveCount(0);
        // The member's listing holds the seeded callout (positive control)
        // but not the draft.
        await expectStoredCalloutVisibility(
          calloutsSetId,
          seededName,
          await sessionActor(member.page),
          CalloutVisibility.Published,
          'the server lists the seeded callout for the member'
        );
        await expectStoredCalloutVisibility(
          calloutsSetId,
          draftCalloutName,
          await sessionActor(member.page),
          undefined,
          'the server does not list the draft for the member'
        );

        await collaborationPage.clickCallout(draftCalloutName);

        await collaborationPage.openContextualMenu();
        await expect(collaborationPage.publishMenuItem).toBeVisible();

        await collaborationPage.publishCallout();

        // The menu is open again (Edit is shown) before Publish is read as
        // gone, so the absence is not just a menu that never opened.
        await collaborationPage.openContextualMenu();
        await expect(collaborationPage.editButton).toBeVisible();
        await expect(collaborationPage.publishMenuItem).not.toBeVisible();
        await page.keyboard.press('Escape');

        // The publish reached the server …
        await expectStoredCalloutVisibility(
          calloutsSetId,
          draftCalloutName,
          await sessionActor(page),
          CalloutVisibility.Published,
          'the publish reached the server'
        );

        // … and the member now sees the callout: listed for them by the
        // server, shown in their feed, and it opens.
        await expectStoredCalloutVisibility(
          calloutsSetId,
          draftCalloutName,
          await sessionActor(member.page),
          CalloutVisibility.Published,
          'the server lists the published callout for the member'
        );
        await memberView.navigateToSpace(baseScenario!.space.nameId);
        await memberView.expectFeedRendered(seededName);
        await expect(
          memberView.feedCalloutHeading(draftCalloutName)
        ).toBeVisible();
        await memberView.clickCallout(draftCalloutName);
        await expect(
          memberView.calloutDetailDialog(draftCalloutName).discussionHeading
        ).toBeVisible();
      } finally {
        await member.close();
      }
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
      baseScenario = undefined;
    }
  });

  memberFixture.test(
    '3.3 Cannot Edit Callout - As Space Member',
    async ({ page }) => {
      memberFixture.test.setTimeout(30_000);
      const collaborationPage = new CollaborationPage(page, baseUrl);

      await collaborationPage.navigateToSpace(baseScenario!.space.nameId);

      // expect(
      //   collaborationPage.getCalloutByName(
      //     baseScenario!.space.collaboration.calloutPostDisplayName
      //   )
      // ).toBeDefined();
      await expect(
        page.getByRole('heading', {
          name: `${baseScenario!.space.collaboration.calloutPostCollectionDisplayName}`,
          exact: true,
        })
      ).toBeVisible({ timeout: 5000 });
      await page
        .getByRole('heading', {
          name: `${baseScenario!.space.collaboration.calloutPostCollectionDisplayName}`,
          exact: true,
        })
        .click({ timeout: 5000 });
      // const isEditVisible = await collaborationPage.isEditButtonVisible();
      // expect(isEditVisible).toBe(false);
      await page
        .getByRole('button', { name: 'settings' })
        .first()
        .click({ timeout: 5000 });
      // Positive control first: the menu IS open, so "no Edit" is a real observation.
      await expect(page.getByRole('menu')).toBeVisible();
      await expect(page.getByRole('menuitem', { name: /^edit$/i })).toHaveCount(0);
    }
  );
});
