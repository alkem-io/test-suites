// Feature: Contributors callout (client-web feature 008 / story client-web#9928)
// Spec: agents-hq/specs/009-contributors-callout-ui-tests/spec.md
//
// An admin-only, collaboration-only callout that renders a space's contributors
// (People / Organizations / Virtual Contributors) as a self-updating card
// collection with a segmented type switch, per-type counts, client-side name
// search, an empty state, and a List/Map view toggle (users & orgs; VCs are
// list-only). This suite exercises those behaviours end-to-end against a live
// CRD build.
//
// Revised for client feature 025 (callout manual selection, client-web PR
// #10048): per its FR-012 the type switch derives from the *resolved*
// collection — segments render only for types with a non-zero count, and the
// switch is hidden when fewer than two types resolve. This supersedes the
// original 008 FR-009a configured-types gate the earlier version of this suite
// asserted (a configured-but-empty type no longer renders a 0-count segment).

import { TestUser } from '@alkemio/tests-lib/common/enums/test.user';
import { TestScenarioConfig } from '@alkemio/tests-lib/scenario/config/test-scenario-config';
import { OrganizationWithSpaceModel } from '@alkemio/tests-lib/scenario/models/OrganizationWithSpaceModel';
import { TestScenarioFactory } from '@alkemio/tests-lib/scenario/TestScenarioFactory';
import { TestUserManager } from '@alkemio/tests-lib';
import { expect } from '@playwright/test';
import { createAuthenticatedSessionFixture } from '../fixtures/authenticated-session.fixture';
import { ContributorsCalloutPage } from './pages';

const baseUrl = process.env.ALKEMIO_BASE_URL || 'http://localhost:3000';

const scenarioConfig: TestScenarioConfig = {
  name: 'contributors-callout',
  space: {
    about: {
      profile: { displayName: 'Contributors Callout Test Space' },
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

let baseScenario: OrganizationWithSpaceModel;

const adminFixture = createAuthenticatedSessionFixture({
  storageStateName: 'contributors-callout-admin.json',
  cleanupAfterTests: process.env.cleanupAfterTests === 'true',
});

const memberFixture = createAuthenticatedSessionFixture({
  storageStateName: 'contributors-callout-member.json',
  cleanupAfterTests: process.env.cleanupAfterTests === 'true',
});

// A single Contributors callout reused across the read-only rendering tests, so
// exactly one `region "Contributors"` exists on the page at a time.
const MAIN = `Contributors ${Date.now()}`;

// Tests 1.5–1.7 read the callout test 1.3 creates. Guard against partial runs
// (--last-failed, -g filters, editor-run subsets) where 1.3 was not selected:
// create the callout on demand so the later links of the serial chain never
// depend on an earlier test having run. Callers must already be on the space
// page.
const ensureMainCallout = async (cc: ContributorsCalloutPage) => {
  // count() does not auto-retry — wait for the feed first, or a premature 0
  // right after navigation would create a duplicate callout.
  await cc.waitForContentFeed();
  if ((await cc.calloutCard(MAIN).count()) === 0) {
    await cc.createContributorsCallout(MAIN);
  }
};

adminFixture.test.describe.serial('Contributors Callout - Admin', () => {
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

  // AC — "Contributors" is offered as a concrete, admin-only framing option.
  adminFixture.test(
    '1.1 Admin is offered the Contributors framing option',
    async ({ page }) => {
      adminFixture.test.setTimeout(30_000);
      const cc = new ContributorsCalloutPage(page, baseUrl);
      await cc.navigateToSpace(baseScenario.space.nameId);
      await expect(cc.addCalloutButton).toBeVisible();
      await cc.openCreateForm();
      await expect(cc.framingContributorsOption).toBeVisible();
    }
  );

  // AC3 — saving with zero contributor types is blocked.
  adminFixture.test(
    '1.2 Zero contributor types blocks save with a validation error',
    async ({ page }) => {
      adminFixture.test.setTimeout(30_000);
      const cc = new ContributorsCalloutPage(page, baseUrl);
      const title = `Zero Types ${Date.now()}`;
      await cc.navigateToSpace(baseScenario.space.nameId);
      await cc.openCreateForm();
      await cc.selectContributorsFraming();
      await cc.titleInput.fill(title);

      // Deselect all three types.
      await cc.setTypeSelected('People', false);
      await cc.setTypeSelected('Organizations', false);
      await cc.setTypeSelected('Virtual Contributors', false);

      // Submit is gated by submit-time validation: attempting to post surfaces
      // the "at least one type" error and does NOT create the callout.
      await cc.postButton.click();
      await expect(cc.typesRequiredError).toBeVisible();
      // Still on the create form; nothing was persisted.
      await expect(cc.framingContributorsOption).toBeVisible();

      // Abandon the draft without persisting.
      await cc.closeButton.click();
      await expect(
        page.getByRole('heading', { name: title })
      ).toHaveCount(0);
    }
  );

  // AC1/AC2 as revised by 025 FR-012 — default settings render a segmented
  // switch derived from the *resolved* collection: one segment per configured
  // type with a non-zero count. The configured-but-empty Virtual Contributors
  // type (this space has no VCs) renders no segment.
  adminFixture.test(
    '1.3 Default settings render a segmented switch of resolved (non-zero) types',
    async ({ page }) => {
      adminFixture.test.setTimeout(45_000);
      const cc = new ContributorsCalloutPage(page, baseUrl);
      await cc.navigateToSpace(baseScenario.space.nameId);

      await cc.createContributorsCallout(MAIN);

      // Scope to the callout we created — a migrated env may also carry an
      // auto-provisioned default Contributors callout on the same page.
      const col = cc.collection(MAIN);
      await expect(col.region).toBeVisible();
      // Resolved (non-zero) type segments present, each carrying its count.
      await expect(col.typeSwitchTab('People')).toBeVisible();
      await expect(col.typeSwitchTab('Organizations')).toBeVisible();
      // Configured but resolving to zero → no segment (025 FR-012).
      await expect(col.typeSwitchTab('Virtual Contributors')).toHaveCount(0);
      // Opens on the configured default type (People / users).
      await expect(col.typeSwitchTab('People')).toHaveAttribute(
        'aria-selected',
        'true'
      );
    }
  );

  // 025 FR-012 — the switch requires at least two *resolved* types: a
  // multi-type callout whose collection resolves to a single non-zero type
  // (People + the VC-less Virtual Contributors type) renders no switch at all,
  // while the resolved locatable type keeps its List/Map toggle and cards.
  // (The pre-025 "VC segment shows an empty state" scenario is unreachable
  // without a real VC in the community — the empty segment no longer renders.)
  adminFixture.test(
    '1.4 A multi-type callout resolving to one type renders no switch',
    async ({ page }) => {
      adminFixture.test.setTimeout(60_000);
      const cc = new ContributorsCalloutPage(page, baseUrl);
      await cc.navigateToSpace(baseScenario.space.nameId);

      const singleResolved = `Single Resolved ${Date.now()}`;
      await cc.createContributorsCallout(singleResolved, {
        types: ['People', 'Virtual Contributors'],
      });

      const col = cc.collection(singleResolved);
      await expect(col.region).toBeVisible();
      // Only People resolves non-zero → no segmented type switch (no tabs).
      await expect(col.typeSwitchTab('People')).toHaveCount(0);
      await expect(col.typeSwitchTab('Virtual Contributors')).toHaveCount(0);
      // The resolved (locatable) type still offers its view toggle and cards.
      await expect(col.viewToggle('Map')).toBeVisible();
      await expect(col.contributorCard('space admin').first()).toBeVisible();

      // Remove it so the later read-only tests keep exactly one multi-segment
      // callout (MAIN) on the page.
      await cc.deleteContributorsCallout(singleResolved);
    }
  );

  // AC — client-side name search scoped to the active type.
  adminFixture.test(
    '1.5 Name search filters the active type and shows a no-match empty state',
    async ({ page }) => {
      adminFixture.test.setTimeout(45_000);
      const cc = new ContributorsCalloutPage(page, baseUrl);
      await cc.navigateToSpace(baseScenario.space.nameId);
      await ensureMainCallout(cc);
      const col = cc.collection(MAIN);

      await col.switchType('People');
      await expect(col.searchInput()).toBeVisible();
      await col.search('zzz-no-such-contributor-zzz');
      await expect(col.emptySearchState()).toBeVisible();
    }
  );

  // AC5 — List/Map toggle plots the located contributors on a map.
  adminFixture.test(
    '1.6 List/Map toggle switches the People segment to a map view',
    async ({ page }) => {
      adminFixture.test.setTimeout(45_000);
      const cc = new ContributorsCalloutPage(page, baseUrl);
      await cc.navigateToSpace(baseScenario.space.nameId);
      await ensureMainCallout(cc);
      const col = cc.collection(MAIN);

      await col.switchType('People');
      await col.viewToggle('Map').click();
      await expect(col.mapRegion()).toBeVisible({ timeout: 15000 });
      await expect(col.viewToggle('Map')).toHaveAttribute('aria-pressed', 'true');

      // Back to list.
      await col.viewToggle('List').click();
      await expect(col.viewToggle('List')).toHaveAttribute(
        'aria-pressed',
        'true'
      );
    }
  );

  // AC6 — editing an existing callout's types persists after save. Excluding a
  // type that actually resolves (Organizations — with no VCs, excluding the VC
  // type would be invisible) leaves People as the only resolved type, so per
  // 025 FR-012 the persisted change manifests as the switch disappearing
  // entirely, with the people cards still rendered and the org card gone.
  adminFixture.test(
    '1.7 Excluding a type on an existing callout persists',
    async ({ page }) => {
      adminFixture.test.setTimeout(45_000);
      const cc = new ContributorsCalloutPage(page, baseUrl);
      await cc.navigateToSpace(baseScenario.space.nameId);
      await ensureMainCallout(cc);

      await cc.openEdit(MAIN);
      // Exclude Organizations (the only other resolved type).
      await cc.setTypeSelected('Organizations', false);
      await cc.saveEditButton.click();

      // Reload so the inline collection reflects the persisted settings.
      await cc.navigateToSpace(baseScenario.space.nameId);
      const col = cc.collection(MAIN);
      await expect(col.region).toBeVisible();

      // Only People resolves now → the whole switch is gone (025 FR-012).
      await expect(col.typeSwitchTab('Organizations')).toHaveCount(0, {
        timeout: 15000,
      });
      await expect(col.typeSwitchTab('People')).toHaveCount(0);
      // The people still render; the organization card does not.
      await expect(col.contributorCard('space admin').first()).toBeVisible();
      await expect(
        col.contributorCard(baseScenario.organization.profile.displayName)
      ).toHaveCount(0);
    }
  );

  // AC2 — a single type shows no segmented switch.
  adminFixture.test(
    '1.8 A single contributor type shows no segmented switch',
    async ({ page }) => {
      adminFixture.test.setTimeout(60_000);
      const cc = new ContributorsCalloutPage(page, baseUrl);
      await cc.navigateToSpace(baseScenario.space.nameId);

      // Remove the multi-type callout if this run created it (a partial run
      // that skipped 1.3/1.5–1.7 has no MAIN to remove).
      await cc.waitForContentFeed();
      if ((await cc.calloutCard(MAIN).count()) > 0) {
        await cc.deleteContributorsCallout(MAIN);
      }

      const single = `Single Type ${Date.now()}`;
      await cc.createContributorsCallout(single, { types: ['People'] });

      // Scoped to the single-type callout: it renders the collection with no
      // segmented type switch (a co-existing default callout, if any, is a
      // separate card and doesn't leak into this assertion).
      const col = cc.collection(single);
      await expect(col.region).toBeVisible();
      await expect(col.typeSwitchTab('People')).toHaveCount(0);
      await expect(col.typeSwitchTab('Organizations')).toHaveCount(0);
      await expect(col.typeSwitchTab('Virtual Contributors')).toHaveCount(0);
    }
  );

  // AC1/US1 — a non-default `defaultType` opens the collection on that segment
  // (not People), confirming the create-form default-type override is honoured.
  adminFixture.test(
    '1.9 A non-default defaultType opens the collection on that segment',
    async ({ page }) => {
      adminFixture.test.setTimeout(60_000);
      const cc = new ContributorsCalloutPage(page, baseUrl);
      await cc.navigateToSpace(baseScenario.space.nameId);

      const orgDefault = `Org Default ${Date.now()}`;
      await cc.createContributorsCallout(orgDefault, {
        defaultType: 'Organizations',
      });

      const col = cc.collection(orgDefault);
      await expect(col.region).toBeVisible();
      // Opens on the configured default type (Organizations), not People.
      await expect(col.typeSwitchTab('Organizations')).toHaveAttribute(
        'aria-selected',
        'true'
      );
      await expect(col.typeSwitchTab('People')).toHaveAttribute(
        'aria-selected',
        'false'
      );
    }
  );
});

memberFixture.test.describe.serial('Contributors Callout - Member', () => {
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

  // AC — the Contributors callout is admin-only; a member cannot create callouts
  // and therefore is never offered the framing.
  memberFixture.test(
    '2.1 A space member cannot create a Contributors callout',
    async ({ page }) => {
      memberFixture.test.setTimeout(30_000);
      const cc = new ContributorsCalloutPage(page, baseUrl);
      await cc.navigateToSpace(baseScenario.space.nameId);
      expect(await cc.isAddCalloutVisible()).toBe(false);
    }
  );
});
