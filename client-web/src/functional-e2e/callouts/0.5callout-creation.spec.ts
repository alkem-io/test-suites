// spec: client-web/src/functional-e2e/plans/callouts-test-plan.md
// seed: client-web/src/functional-e2e/seed-public-space.spec.ts

import {
  CalloutContributionType,
  CalloutFramingType,
  readCalloutsSetCalloutTypes,
} from '@alkemio/tests-lib';
import { TestUser } from '@alkemio/tests-lib/common/enums/test.user';
import { TestScenarioConfig } from '@alkemio/tests-lib/scenario/config/test-scenario-config';
import { OrganizationWithSpaceModel } from '@alkemio/tests-lib/scenario/models/OrganizationWithSpaceModel';
import { TestScenarioFactory } from '@alkemio/tests-lib/scenario/TestScenarioFactory';
import { createCalloutOnCalloutsSet } from '@alkemio/tests-lib/scenario/baseFunctions';
import { TestUserManager } from '@alkemio/tests-lib';
import { expect } from '@playwright/test';
import { createAuthenticatedSessionFixture } from '../fixtures/authenticated-session.fixture';
import { must, sessionActor } from '../helpers/lib-actor.helper';
import { CollaborationPage } from './pages';
import type { Page } from '@playwright/test';

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
      members: [TestUser.SPACE_MEMBER, TestUser.SPACE_ADMIN],
    },
  },
};

let baseScenario: OrganizationWithSpaceModel | undefined;

/**
 * What a created callout must BE, not only be called. The title heading the
 * cases always asserted is blind to the kind: a server (or client) that saved
 * every callout as a plain post would pass it. Each case now asserts the kind
 * twice — in the callout's detail dialog (what the user gets) and over
 * GraphQL as the acting admin (what the server stored).
 */
type ExpectedKind = {
  framing: CalloutFramingType;
  /** Contribution types the callout accepts; [] = no responses. */
  allowedTypes: CalloutContributionType[];
  /** CTA only: the link the framing carries. */
  link?: { displayName: string; uri: string };
  /** Collections only: the typed add button in the Contributions section. */
  addContributionLabel?: string;
};

/** UI: open the callout and read what its dialog renders for that kind. */
async function expectDialogShowsKind(
  collaborationPage: CollaborationPage,
  page: Page,
  name: string,
  expected: ExpectedKind
) {
  await collaborationPage.clickCallout(name);
  const view = collaborationPage.calloutDetailDialog(name);
  await expect(view.dialog).toBeVisible();
  // Positive control: the dialog body has rendered, so the counts below are
  // observations and not a read of a half-rendered dialog.
  await expect(view.discussionHeading).toBeVisible();

  if (expected.framing === CalloutFramingType.Whiteboard) {
    await expect(view.openWhiteboardButton).toBeVisible();
  } else {
    await expect(view.openWhiteboardButton).toHaveCount(0);
  }
  if (expected.framing === CalloutFramingType.Memo) {
    await expect(view.openMemoButton).toBeVisible();
  } else {
    await expect(view.openMemoButton).toHaveCount(0);
  }
  if (expected.link) {
    const cta = view.ctaLink(expected.link.displayName, expected.link.uri);
    await expect(cta).toBeVisible();
    await expect(cta).toHaveAttribute('href', expected.link.uri);
  }
  if (expected.addContributionLabel) {
    await expect(view.contributionsHeading).toBeVisible();
    await expect(
      view.addContributionButton(expected.addContributionLabel)
    ).toBeVisible();
  } else {
    await expect(view.contributionsHeading).toHaveCount(0);
  }

  await page.keyboard.press('Escape');
  await expect(view.dialog).toBeHidden();
}

/** API: the stored framing type, framing content and accepted contribution types. */
async function expectStoredKind(
  page: Page,
  calloutsSetId: string,
  name: string,
  expected: ExpectedKind
) {
  const set = must(
    await readCalloutsSetCalloutTypes(calloutsSetId, await sessionActor(page)),
    'read back the callouts set'
  );
  const matches = (set.lookup.calloutsSet?.callouts ?? []).filter(
    c => c.framing.profile.displayName === name
  );
  expect(matches, `exactly one stored callout titled "${name}"`).toHaveLength(
    1
  );
  const [callout] = matches;
  expect(callout.framing.type).toBe(expected.framing);
  expect([...callout.settings.contribution.allowedTypes].sort()).toEqual(
    [...expected.allowedTypes].sort()
  );
  expect(Boolean(callout.framing.whiteboard?.id)).toBe(
    expected.framing === CalloutFramingType.Whiteboard
  );
  expect(Boolean(callout.framing.memo?.id)).toBe(
    expected.framing === CalloutFramingType.Memo
  );
  if (expected.link) {
    expect(callout.framing.link?.uri).toBe(expected.link.uri);
    expect(callout.framing.link?.profile.displayName).toBe(
      expected.link.displayName
    );
  } else {
    expect(callout.framing.link).toBeFalsy();
  }
}

async function expectCalloutKind(
  collaborationPage: CollaborationPage,
  page: Page,
  name: string,
  expected: ExpectedKind
) {
  await expectDialogShowsKind(collaborationPage, page, name, expected);
  await expectStoredKind(
    page,
    baseScenario!.space.collaboration.calloutsSetId,
    name,
    expected
  );
}

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

      await collaborationPage.navigateToSpace(baseScenario!.space.nameId);

      await expect(collaborationPage.addCalloutButton).toBeVisible();

      await collaborationPage.createCallout(
        'post',
        calloutName,
        'A test post callout for E2E testing'
      );

      const calloutCard = await collaborationPage.getCalloutByName(calloutName);
      await expect(calloutCard).toBeVisible();

      await expectCalloutKind(collaborationPage, page, calloutName, {
        framing: CalloutFramingType.None,
        allowedTypes: [],
      });
    }
  );

  adminFixture.test(
    '1.2 Create Whiteboard Callout - As Space Admin',
    async ({ page }) => {
      adminFixture.test.setTimeout(30_000);
      const collaborationPage = new CollaborationPage(page, baseUrl);
      const calloutName = `Test Whiteboard ${Date.now()}`;

      await collaborationPage.navigateToSpace(baseScenario!.space.nameId);

      await collaborationPage.createCallout(
        'whiteboard',
        calloutName,
        'A collaborative whiteboard for visual brainstorming'
      );

      const calloutCard = await collaborationPage.getCalloutByName(calloutName);
      await expect(calloutCard).toBeVisible();

      await expectCalloutKind(collaborationPage, page, calloutName, {
        framing: CalloutFramingType.Whiteboard,
        allowedTypes: [],
      });
    }
  );

  adminFixture.test(
    '1.3 Create CTA (Call To Action) Callout - As Space Admin',
    async ({ page }) => {
      adminFixture.test.setTimeout(30_000);
      const collaborationPage = new CollaborationPage(page, baseUrl);
      const calloutName = `Test CTA Callout ${Date.now()}`;

      await collaborationPage.navigateToSpace(baseScenario!.space.nameId);

      await collaborationPage.createCallout(
        'link',
        calloutName,
        'A call to action callout with a link',
        false,
        { linkText: 'Learn More', url: 'https://example.com' }
      );

      const calloutCard = await collaborationPage.getCalloutByName(calloutName);
      await expect(calloutCard).toBeVisible();

      await expectCalloutKind(collaborationPage, page, calloutName, {
        framing: CalloutFramingType.Link,
        allowedTypes: [],
        link: { displayName: 'Learn More', uri: 'https://example.com' },
      });
    }
  );

  adminFixture.test(
    '1.4 Create Memo Callout - As Space Admin',
    async ({ page }) => {
      adminFixture.test.setTimeout(30_000);
      const collaborationPage = new CollaborationPage(page, baseUrl);
      const calloutName = `Test Memo ${Date.now()}`;

      await collaborationPage.navigateToSpace(baseScenario!.space.nameId);

      await collaborationPage.createCallout(
        'memo',
        calloutName,
        'A collaborative memo document'
      );

      const calloutCard = await collaborationPage.getCalloutByName(calloutName);
      await expect(calloutCard).toBeVisible();

      await expectCalloutKind(collaborationPage, page, calloutName, {
        framing: CalloutFramingType.Memo,
        allowedTypes: [],
      });
    }
  );

  // Response Options - Collection Types
  adminFixture.test(
    '1.5 Create Callout with Posts Collection - As Space Admin',
    async ({ page }) => {
      adminFixture.test.setTimeout(30_000);
      const collaborationPage = new CollaborationPage(page, baseUrl);
      const calloutName = `Posts Collection ${Date.now()}`;

      await collaborationPage.navigateToSpace(baseScenario!.space.nameId);

      await collaborationPage.createCalloutWithContributions(
        calloutName,
        'posts',
        'A callout that accepts post contributions'
      );

      const calloutCard = await collaborationPage.getCalloutByName(calloutName);
      await expect(calloutCard).toBeVisible();

      await expectCalloutKind(collaborationPage, page, calloutName, {
        framing: CalloutFramingType.None,
        allowedTypes: [CalloutContributionType.Post],
        addContributionLabel: 'Add Post',
      });
    }
  );

  adminFixture.test(
    '1.6 Create Callout with Links & Files Collection - As Space Admin',
    async ({ page }) => {
      adminFixture.test.setTimeout(30_000);
      const collaborationPage = new CollaborationPage(page, baseUrl);
      const calloutName = `Links Collection ${Date.now()}`;

      await collaborationPage.navigateToSpace(baseScenario!.space.nameId);

      await collaborationPage.createCalloutWithContributions(
        calloutName,
        'links',
        'A callout that accepts link contributions'
      );

      const calloutCard = await collaborationPage.getCalloutByName(calloutName);
      await expect(calloutCard).toBeVisible();

      await expectCalloutKind(collaborationPage, page, calloutName, {
        framing: CalloutFramingType.None,
        allowedTypes: [CalloutContributionType.Link],
        addContributionLabel: 'Add link or file',
      });
    }
  );

  adminFixture.test(
    '1.7 Create Callout with Memos Collection - As Space Admin',
    async ({ page }) => {
      adminFixture.test.setTimeout(30_000);
      const collaborationPage = new CollaborationPage(page, baseUrl);
      const calloutName = `Memos Collection ${Date.now()}`;

      await collaborationPage.navigateToSpace(baseScenario!.space.nameId);

      await collaborationPage.createCalloutWithContributions(
        calloutName,
        'memos',
        'A callout that accepts memo contributions'
      );

      const calloutCard = await collaborationPage.getCalloutByName(calloutName);
      await expect(calloutCard).toBeVisible();

      await expectCalloutKind(collaborationPage, page, calloutName, {
        framing: CalloutFramingType.None,
        allowedTypes: [CalloutContributionType.Memo],
        addContributionLabel: 'Add memo',
      });
    }
  );

  adminFixture.test(
    '1.8 Create Callout with Whiteboards Collection - As Space Admin',
    async ({ page }) => {
      adminFixture.test.setTimeout(30_000);
      const collaborationPage = new CollaborationPage(page, baseUrl);
      const calloutName = `Whiteboards Collection ${Date.now()}`;

      await collaborationPage.navigateToSpace(baseScenario!.space.nameId);

      await collaborationPage.createCalloutWithContributions(
        calloutName,
        'whiteboards',
        'A callout that accepts whiteboard contributions'
      );

      const calloutCard = await collaborationPage.getCalloutByName(calloutName);
      await expect(calloutCard).toBeVisible();

      await expectCalloutKind(collaborationPage, page, calloutName, {
        framing: CalloutFramingType.None,
        allowedTypes: [CalloutContributionType.Whiteboard],
        addContributionLabel: 'Add whiteboard',
      });
    }
  );
});

memberFixture.test.describe.serial('Callout Creation - Member', () => {
  let memberVisibleCalloutName = '';

  memberFixture.test.beforeAll(async ({ browser }) => {
    memberFixture.test.setTimeout(60_000);
    if (!baseScenario) {
      baseScenario =
        await TestScenarioFactory.createBaseScenario(scenarioConfig);
    }
    // A published callout the member can see: the positive control for 1.9.
    memberVisibleCalloutName = `Member Visible ${Date.now()}`;
    const seeded = await createCalloutOnCalloutsSet(
      baseScenario!.space.collaboration.calloutsSetId,
      { framing: { profile: { displayName: memberVisibleCalloutName } } }
    );
    if (!seeded.data?.createCalloutOnCalloutsSet?.id) {
      throw new Error(
        `[1.9 seed] published callout was not created: ${JSON.stringify(seeded.error ?? seeded)}`
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
      baseScenario = undefined;
    }
  });

  memberFixture.test(
    '1.9 Cannot Create Callout - As Space Member',
    async ({ page }) => {
      memberFixture.test.setTimeout(30_000);
      const collaborationPage = new CollaborationPage(page, baseUrl);

      await collaborationPage.navigateToSpace(baseScenario!.space.nameId);

      await collaborationPage.expectAddCalloutAbsent(memberVisibleCalloutName);
      const isAddVisible = await collaborationPage.isAddCalloutVisible();
      expect(isAddVisible).toBe(false);
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
