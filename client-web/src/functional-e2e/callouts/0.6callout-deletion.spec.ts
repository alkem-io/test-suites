// spec: client-web/src/functional-e2e/plans/callouts-test-plan.md
// seed: client-web/src/functional-e2e/seed-public-space.spec.ts

import { TestUser } from '@alkemio/tests-lib/common/enums/test.user';
import { TestScenarioConfig } from '@alkemio/tests-lib/scenario/config/test-scenario-config';
import { OrganizationWithSpaceModel } from '@alkemio/tests-lib/scenario/models/OrganizationWithSpaceModel';
import { TestScenarioFactory } from '@alkemio/tests-lib/scenario/TestScenarioFactory';
import { readCalloutsSetCallouts, TestUserManager } from '@alkemio/tests-lib';
import { expect } from '@playwright/test';
import { createAuthenticatedSessionFixture } from '../fixtures/authenticated-session.fixture';
import { must, sessionActor } from '../helpers/lib-actor.helper';
import { CollaborationPage } from './pages';
import type { Page } from '@playwright/test';

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

let baseScenario: OrganizationWithSpaceModel | undefined;

/** The callouts the server holds for the space, read as the signed-in user. */
async function readStoredCallouts(page: Page) {
  const set = must(
    await readCalloutsSetCallouts(
      baseScenario!.space.collaboration.calloutsSetId,
      await sessionActor(page)
    ),
    'read back the callouts set'
  );
  return set.lookup.calloutsSet?.callouts ?? [];
}

/**
 * The feed has finished rendering: a callout known to stay (the scenario's
 * seeded post) is on screen and no card is still a loading skeleton. Only
 * after this is a count or an absence an observation of the list rather
 * than of a page that has not rendered yet. The page object scrolls any
 * skeleton left below the fold into view first.
 */
async function expectFeedRendered(collaborationPage: CollaborationPage) {
  await collaborationPage.expectFeedRendered(
    baseScenario!.space.collaboration.calloutPostDisplayName
  );
}

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
    // The scenario is shared with the Member block below, which cleans it up.
  });

  adminFixture.test('4.1 Delete Callout - As Space Admin', async ({ page }) => {
    adminFixture.test.setTimeout(45_000);
    const collaborationPage = new CollaborationPage(page, baseUrl);
    const calloutToDelete = `Callout to Delete ${Date.now()}`;

    await collaborationPage.navigateToSpace(baseScenario!.space.nameId);

    await collaborationPage.createCallout(
      'post',
      calloutToDelete,
      'This callout will be deleted',
      true
    );

    const isVisible = await collaborationPage.isCalloutVisible(calloutToDelete);
    expect(isVisible).toBe(true);

    // Positive control before the delete: the server holds the callout once,
    // and the rendered feed shows its card. The feed lists only the current
    // tab's callouts (the set also holds the other flow states'), so the UI
    // count is taken from the rendered feed itself, not from the API total.
    const storedBefore = await readStoredCallouts(page);
    const created = storedBefore.filter(
      c => c.framing.profile.displayName === calloutToDelete
    );
    expect(created, 'the created callout is stored once').toHaveLength(1);
    const deletedId = created[0].id;
    await collaborationPage.navigateToSpace(baseScenario!.space.nameId);
    await expectFeedRendered(collaborationPage);
    await expect(
      page.getByRole('heading', { name: calloutToDelete, exact: true })
    ).toBeVisible();
    const cardsBefore = await collaborationPage.feedCardOpenLinks.count();
    expect(cardsBefore, 'the feed shows the card to delete').toBeGreaterThan(0);

    await collaborationPage.clickCallout(calloutToDelete);

    await collaborationPage.openContextualMenu();
    await expect(collaborationPage.deleteButton).toBeVisible();

    await collaborationPage.deleteButton.click();
    await expect(collaborationPage.confirmDialog).toBeVisible();
    await collaborationPage.confirmDeleteButton.click({ timeout: 5000 });

    await expect(collaborationPage.confirmDialog).toBeHidden();

    await collaborationPage.navigateToSpace(baseScenario!.space.nameId);

    // The list has rendered (the seeded post is on screen, no skeleton left)
    // before the count and the absence are read: exactly one card fewer.
    await expectFeedRendered(collaborationPage);
    await expect(collaborationPage.feedCardOpenLinks).toHaveCount(
      cardsBefore - 1
    );
    await expect(
      page.getByRole('heading', {
        name: `${calloutToDelete}`,
        exact: true,
      })
    ).toBeHidden({ timeout: 5000 });

    // And the server no longer holds it: the set lost exactly that callout.
    const storedAfter = await readStoredCallouts(page);
    expect(storedAfter.map(c => c.id)).not.toContain(deletedId);
    expect(storedAfter).toHaveLength(storedBefore.length - 1);
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
    if (baseScenario) {
      await TestScenarioFactory.cleanUpBaseScenario(baseScenario);
      baseScenario = undefined;
    }
  });

  memberFixture.test(
    '4.2 Cannot Delete Callout - As Space Member',
    async ({ page }) => {
      memberFixture.test.setTimeout(30_000);
      const collaborationPage = new CollaborationPage(page, baseUrl);

      await collaborationPage.navigateToSpace(baseScenario!.space.nameId);

      await expect(
        page.getByRole('heading', {
          name: baseScenario!.space.collaboration.calloutPostDisplayName,
          exact: true,
        })
      ).toBeVisible({ timeout: 5000 });
      await collaborationPage.clickCallout(
        baseScenario!.space.collaboration.calloutPostDisplayName
      );
      await collaborationPage.openContextualMenu();
      // Positive control first: the menu IS open, so "no Delete" is a real observation.
      await expect(page.getByRole('menu')).toBeVisible();
      await expect(page.getByRole('menuitem', { name: 'Delete' })).toHaveCount(0);
    }
  );
});

// File-level teardown. The Member block normally cleans the shared scenario,
// but a failing admin case restarts the worker (the Member block then seeds
// and cleans a scenario of its own) and a `-g` filter can skip the Member
// block entirely; either way the admin block's scenario would leak.
adminFixture.test.afterAll(async () => {
  if (baseScenario) {
    await TestScenarioFactory.cleanUpBaseScenario(baseScenario);
    baseScenario = undefined;
  }
});
