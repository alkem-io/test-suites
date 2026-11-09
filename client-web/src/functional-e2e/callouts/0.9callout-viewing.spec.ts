// spec: client-web/src/functional-e2e/plans/callouts-test-plan.md
// seed: client-web/src/functional-e2e/seed-public-space.spec.ts

import { TestUser } from '@alkemio/tests-lib/common/enums/test.user';
import { TestScenarioConfig } from '@alkemio/tests-lib/scenario/config/test-scenario-config';
import { OrganizationWithSpaceModel } from '@alkemio/tests-lib/scenario/models/OrganizationWithSpaceModel';
import { TestScenarioFactory } from '@alkemio/tests-lib/scenario/TestScenarioFactory';
import { TestUserManager, updateCalloutVisibility } from '@alkemio/tests-lib';
import { expect } from '@playwright/test';
import { createAuthenticatedSessionFixture } from '../fixtures/authenticated-session.fixture';
import { CollaborationPage } from './pages';
import { CalloutVisibility } from '@alkemio/tests-lib';
import { sessionActor } from '../helpers/lib-actor.helper';
import { expectStoredCalloutVisibility } from '../helpers/callout-visibility.helper';

const baseUrl = process.env.ALKEMIO_BASE_URL || 'http://localhost:3000';
let calloutName = '';
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
      // A published sibling that stays published throughout: the positive
      // control that the member's feed has rendered before 2.2 reads the
      // draft's absence.
      addPostCallout: true,
    },
    community: {
      admins: [TestUser.SPACE_ADMIN],
      members: [TestUser.SPACE_MEMBER, TestUser.SPACE_ADMIN],
    },
  },
};

let baseScenario: OrganizationWithSpaceModel | undefined;

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
    calloutName =
      baseScenario!.space.collaboration.calloutPostCollectionDisplayName;
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

      // The callout is a draft BEFORE the page loads (it used to be flipped
      // after `goto`, racing the feed query).
      await updateCalloutVisibility(
        baseScenario!.space.collaboration.calloutPostCollectionId,
        CalloutVisibility.Draft
      );
      await expectStoredCalloutVisibility(
        baseScenario!.space.collaboration.calloutsSetId,
        calloutName,
        TestUser.SPACE_ADMIN,
        CalloutVisibility.Draft,
        'the callout is stored as a draft before the admin views it'
      );

      await collaborationPage.navigateToSpace(baseScenario!.space.nameId);

      await expect(page.getByRole('tab', { name: 'Home' })).toBeVisible({
        timeout: 10000,
      });
      await expect(
        page.getByRole('heading', {
          name: `${calloutName}`,
          exact: true,
        })
      ).toBeVisible({
        timeout: 10000,
      });

      await collaborationPage.clickCallout(`${calloutName}`);
      await collaborationPage.openContextualMenu();
      await expect(collaborationPage.publishMenuItem).toBeVisible();
    }
  );

  adminFixture.test(
    '2.1 View Published Callout - As Space Admin',
    async ({ page }) => {
      adminFixture.test.setTimeout(30_000);
      const collaborationPage = new CollaborationPage(page, baseUrl);

      await collaborationPage.navigateToSpace(baseScenario!.space.nameId);

      await collaborationPage.clickCallout(`${calloutName}`);

      await collaborationPage.openContextualMenu();
      await collaborationPage.publishCallout();

      await expect(collaborationPage.commentInput).toBeVisible();

      // The UI publish reached the server, and the server now lists the
      // callout for the member too.
      const calloutsSetId = baseScenario!.space.collaboration.calloutsSetId;
      await expectStoredCalloutVisibility(
        calloutsSetId,
        calloutName,
        await sessionActor(page),
        CalloutVisibility.Published,
        'the UI publish reached the server'
      );
      await expectStoredCalloutVisibility(
        calloutsSetId,
        calloutName,
        TestUser.SPACE_MEMBER,
        CalloutVisibility.Published,
        'the server lists the published callout for the member'
      );
    }
  );
});

memberFixture.test.describe.serial('Callout Viewing - Member', () => {
  memberFixture.test.beforeAll(async ({ browser }) => {
    memberFixture.test.setTimeout(60_000);
    if (!baseScenario) {
      baseScenario =
        await TestScenarioFactory.createBaseScenario(scenarioConfig);
      calloutName =
        baseScenario!.space.collaboration.calloutPostCollectionDisplayName;
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
    '2.1 View Published Callout - As Space Member',
    async ({ page }) => {
      memberFixture.test.setTimeout(30_000);
      const collaborationPage = new CollaborationPage(page, baseUrl);
      await updateCalloutVisibility(
        baseScenario!.space.collaboration.calloutPostCollectionId,
        CalloutVisibility.Published
      );

      await collaborationPage.navigateToSpace(baseScenario!.space.nameId);
      await expect(page.getByRole('tab', { name: 'Home' })).toBeVisible({
        timeout: 10000,
      });
      await expect(
        page.getByRole('heading', { name: `${calloutName}`, exact: true })
      ).toBeVisible({ timeout: 20000 });
      await collaborationPage.clickCallout(`${calloutName}`);

      await expect(collaborationPage.commentInput).toBeVisible();
      await expectStoredCalloutVisibility(
        baseScenario!.space.collaboration.calloutsSetId,
        calloutName,
        await sessionActor(page),
        CalloutVisibility.Published,
        'the member session lists the callout as published'
      );
    }
  );

  memberFixture.test(
    '2.2 Cannot View Draft Callout - As Space Member',
    async ({ page }) => {
      memberFixture.test.setTimeout(30_000);
      const collaborationPage = new CollaborationPage(page, baseUrl);
      await updateCalloutVisibility(
        baseScenario!.space.collaboration.calloutPostCollectionId,
        CalloutVisibility.Draft
      );

      await collaborationPage.navigateToSpace(baseScenario!.space.nameId);
      await expect(page.getByRole('tab', { name: 'Home' })).toBeVisible({
        timeout: 10000,
      });
      // Positive control: the member sees the published sibling and no card
      // is still loading — the feed has rendered, so the draft's absence
      // below is an observation, not a page that has not loaded yet.
      await collaborationPage.expectFeedRendered(
        baseScenario!.space.collaboration.calloutPostDisplayName
      );
      await expect(
        page.getByRole('heading', { name: `${calloutName}`, exact: true })
      ).toBeHidden({ timeout: 5000 });
      await expect(
        collaborationPage.feedCalloutHeading(calloutName)
      ).toHaveCount(0);
      // Server side: the member's session is not even given the draft.
      await expectStoredCalloutVisibility(
        baseScenario!.space.collaboration.calloutsSetId,
        calloutName,
        await sessionActor(page),
        undefined,
        'the server does not list the draft for the member'
      );
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
