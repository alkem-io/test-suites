// @forge-acceptance
//
// User Story 5 — Visit an organisation's website from its card
// (priority P3).
//
// Spec: the workspace feature spec (AS1..AS3)
// Contract: the workspace feature's contracts/crd-contributor-card.md §5
//
// The server normalises `website` before it ever reaches the client (trim,
// absent unless http/https — contract
// graphql-contributor-card-enrichment.md §2): a hostile `javascript:` value or
// a schemeless one is `null` on the wire, so the card component never even
// receives it. This suite proves the end-to-end behaviour through the real
// UI: the control renders only for organisations with a valid stored website,
// sits immediately before the "…" actions control, opens in an isolated new
// tab, and a hostile/absent/schemeless website never produces a control, a
// `javascript:` anchor, or an unexpected dialog anywhere on the page.

import {
  createOrganization,
  deleteOrganization,
  TestScenarioConfig,
  TestScenarioFactory,
  TestUser,
  TestUserManager,
  UniqueIDGenerator,
} from '@alkemio/tests-lib';
import { OrganizationWithSpaceModel } from '@alkemio/tests-lib/scenario/models/OrganizationWithSpaceModel';
import { RoleName } from '@alkemio/tests-lib/core/generated/alkemio-schema';
import {
  assignRoleToOrganization,
  assignRoleToVirtualContributor,
} from '@alkemio/tests-lib/scenario/baseFunctions';
import { expect } from '@playwright/test';
import { createContributorsCalloutViaApi } from './cards-fixture';
import { createAuthenticatedSessionFixture } from '../fixtures/authenticated-session.fixture';
import { ContributorsCalloutPage } from './pages';

const baseUrl = process.env.ALKEMIO_BASE_URL || 'http://localhost:3000';
const uniqueId = UniqueIDGenerator.getID();

const ORG_VALID = `US5 Valid Website Org ${uniqueId}`;
const ORG_BARE = `US5 Bare Org ${uniqueId}`;
const ORG_HOSTILE = `US5 Hostile Org ${uniqueId}`;
const ORG_SCHEMELESS = `US5 Schemeless Org ${uniqueId}`;
const ORG_SPACEY = `US5 Spacey Org ${uniqueId}`;

const VALID_WEBSITE = 'https://greenfuture.example';
const HOSTILE_WEBSITE = 'javascript:alert(document.domain)';
const SCHEMELESS_WEBSITE = 'www.example.org';
const SPACEY_WEBSITE_STORED = '  HTTPS://Spacey.example/about  ';
const SPACEY_WEBSITE_TRIMMED = 'HTTPS://Spacey.example/about';

const VC_NAME = `US5 Website VC ${uniqueId}`;
const CALLOUT_TITLE = `US5 Website ${uniqueId}`;

type OrgFixture = { id: string; roleSetId: string; name: string };
const orgs: Record<string, OrgFixture> = {};

let baseScenario: OrganizationWithSpaceModel;

const scenarioConfig: TestScenarioConfig = {
  name: `us5-org-website-${uniqueId}`,
  space: {
    about: { profile: { displayName: `US5 Org Website Space ${uniqueId}` } },
    collaboration: {
      addTutorialCallouts: false,
      addPostCollectionCallout: false,
      addWhiteboardCallout: false,
    },
    community: {
      admins: [TestUser.SPACE_ADMIN],
      members: [TestUser.SPACE_ADMIN, TestUser.SPACE_MEMBER],
    },
  },
  virtualContributors: {
    useBaseOrganization: true,
    virtualContributors: [{ profileDisplayName: VC_NAME }],
  },
};

const adminFixture = createAuthenticatedSessionFixture({
  storageStateName: 'us5-org-website-admin.json',
  cleanupAfterTests: process.env.cleanupAfterTests === 'true',
});

adminFixture.test.describe.serial(
  "US5 — Visit an organisation's website from its card",
  () => {
    adminFixture.test.beforeAll(async ({ browser }) => {
      adminFixture.test.setTimeout(120_000);

      baseScenario =
        await TestScenarioFactory.createBaseScenario(scenarioConfig);
      const spaceRoleSetID = baseScenario.space.community.roleSetId;

      const vcId = baseScenario.virtualContributors?.[0]?.id;
      if (!vcId) {
        throw new Error('Scenario did not create the virtual contributor');
      }
      const assigned = await assignRoleToVirtualContributor(
        vcId,
        spaceRoleSetID,
        RoleName.Member
      );
      if (assigned.error) {
        throw new Error(
          `Unable to add the VC to the space: ${JSON.stringify(assigned.error)}`
        );
      }

      // ---- Organisations (AS1/AS2/AS3 fixture) -----------------------
      const orgSpecs: Array<[string, string, string | undefined]> = [
        [ORG_VALID, 'valid', VALID_WEBSITE],
        [ORG_BARE, 'bare', undefined],
        [ORG_HOSTILE, 'hostile', HOSTILE_WEBSITE],
        [ORG_SCHEMELESS, 'schemeless', SCHEMELESS_WEBSITE],
        [ORG_SPACEY, 'spacey', SPACEY_WEBSITE_STORED],
      ];
      for (const [displayName, slug, website] of orgSpecs) {
        // Hostile/irregular values MUST be written through the API — the
        // settings form would validate them away. `createOrganization` sets
        // `website` directly on `CreateOrganizationInput`.
        const res = await createOrganization(
          displayName,
          `us5${slug}${uniqueId}`.toLowerCase().slice(0, 24),
          undefined,
          undefined,
          website
        );
        if (!res.data?.createOrganization) {
          throw new Error(
            `Unable to create fixture organization '${displayName}': ${JSON.stringify(res.error)}`
          );
        }
        orgs[slug] = {
          id: res.data.createOrganization.id,
          roleSetId: res.data.createOrganization.roleSet.id,
          name: displayName,
        };
        await assignRoleToOrganization(
          orgs[slug].id,
          spaceRoleSetID,
          RoleName.Member
        );
      }

      // Created through the API so every case below stands on its own; the
      // shipped 0.1 suite covers creating the post through the form.
      await createContributorsCalloutViaApi(
        baseScenario.space.collaboration.calloutsSetId,
        CALLOUT_TITLE
      );

      await adminFixture.setupAuthentication(
        browser,
        TestUserManager.users.spaceAdmin.email
      );
    });

    adminFixture.test.afterAll(async () => {
      adminFixture.test.setTimeout(60_000);
      await adminFixture.teardownAuthentication();
      const failures: string[] = [];
      for (const org of Object.values(orgs)) {
        const res = await deleteOrganization(org.id);
        if (res.error)
          failures.push(`${org.name}: ${JSON.stringify(res.error)}`);
      }
      if (baseScenario) {
        await TestScenarioFactory.cleanUpBaseScenario(baseScenario);
      }
      expect(failures, failures.join('\n')).toEqual([]);
    });

    adminFixture.test(
      'US5-AS1 — a valid https website renders an external-link control immediately before "…", opening an isolated new tab',
      async ({ page, context }) => {
        adminFixture.test.setTimeout(60_000);
        const cc = new ContributorsCalloutPage(page, baseUrl);
        await cc.navigateToSpace(baseScenario.space.nameId);

        const col = cc.collection(CALLOUT_TITLE);
        await col.switchType('Organizations');

        const website = col.websiteLink(ORG_VALID);
        await expect(website).toBeVisible();
        await expect(website).toHaveAccessibleName(
          `Visit the website of ${ORG_VALID} (opens in a new tab)`
        );
        await expect(website).toHaveAttribute('href', VALID_WEBSITE);
        await expect(website).toHaveAttribute('target', '_blank');
        const rel = await website.getAttribute('rel');
        expect(rel).toContain('noopener');
        expect(rel).toContain('noreferrer');

        // Tab order per the accessibility contract: name -> website -> "…".
        // The website control is the actions button's immediately preceding
        // sibling within the card's control cluster.
        const actions = col.actionsButton(ORG_VALID);
        await expect(actions).toBeVisible();
        const order = await page.evaluate(
          ([websiteSelector, actionsSelector]) => {
            const websiteEl = document.querySelector(websiteSelector);
            const actionsEl = document.querySelector(actionsSelector);
            if (!websiteEl || !actionsEl) return 'not-found';
            return websiteEl.nextElementSibling === actionsEl
              ? 'adjacent'
              : 'not-adjacent';
          },
          [
            `a[aria-label="Visit the website of ${ORG_VALID} (opens in a new tab)"]`,
            `button[aria-label^="Actions for ${ORG_VALID}"]`,
          ]
        );
        expect(order).toBe('adjacent');

        // Activating it opens the address in a new tab, isolated from the
        // originating page (guaranteed by target=_blank + rel=noopener —
        // asserted above — which is exactly what prevents `window.opener`
        // access). `greenfuture.example` is a reserved TLD (RFC 2606) and
        // never resolves, so the popup's COMMITTED url ends up on the
        // browser's own error page — asserting on it would never pass. The
        // outgoing navigation request is the real signal: it is issued
        // (and observable) whether or not the host resolves, and its origin
        // proves the click actually targeted the stored address rather than
        // being swallowed or redirected elsewhere.
        //
        // The listener MUST be armed at context level before the click:
        // Playwright only surfaces the `popup` page object once it has
        // already navigated to its first url, by which point the popup's
        // very first request has already been issued (and, for a
        // never-resolving host, already failed) — a `popup.waitForRequest`
        // registered after `waitForEvent('popup')` resolves is listening
        // for a second request that never comes and always times out.
        // `context.waitForEvent('request', ...)` has no such ordering
        // requirement against the click.
        const requestPromise = context.waitForEvent('request', {
          predicate: req =>
            new URL(req.url()).origin === new URL(VALID_WEBSITE).origin,
          timeout: 15_000,
        });
        const [popup, , request] = await Promise.all([
          page.waitForEvent('popup'),
          website.click(),
          requestPromise,
        ]);
        expect(new URL(request.url()).origin).toBe(
          new URL(VALID_WEBSITE).origin
        );
        await popup.close();
      }
    );

    adminFixture.test(
      'US5-AS2 — no website, a javascript: address and a schemeless address never render a control, execute, or leak a javascript: anchor',
      async ({ page }) => {
        adminFixture.test.setTimeout(60_000);
        const dialogs: string[] = [];
        page.on('dialog', dialog => {
          dialogs.push(dialog.message());
          void dialog.dismiss();
        });

        const cc = new ContributorsCalloutPage(page, baseUrl);
        await cc.navigateToSpace(baseScenario.space.nameId);
        const col = cc.collection(CALLOUT_TITLE);
        await col.switchType('Organizations');

        // Positive control: the valid organisation's control is rendered, so
        // the absences below are measured on a fully rendered list.
        await expect(col.websiteLink(ORG_VALID)).toBeVisible();
        const menu = page.getByRole('menu');
        for (const name of [ORG_BARE, ORG_HOSTILE, ORG_SCHEMELESS]) {
          const actions = col.actionsButton(name);
          await expect(actions, name).toBeVisible();
          await expect(col.websiteLink(name), name).toHaveCount(0);
          // Every other control on the card is still safe to reach: opening
          // the actions menu never triggers navigation or a dialog.
          await actions.click();
          await expect(menu, name).toBeVisible();
          await page.keyboard.press('Escape');
          await expect(menu, name).toBeHidden();
        }

        // No People or Virtual Contributor card ever shows a website control.
        await col.switchType('People');
        await expect(col.cardItems.first()).toBeVisible();
        await expect(
          col.region.getByRole('link', { name: /^Visit the website of/ })
        ).toHaveCount(0);
        await col.switchType('Virtual Contributors');
        await expect(col.cardFor(VC_NAME)).toBeVisible();
        await expect(
          col.region.getByRole('link', { name: /^Visit the website of/ })
        ).toHaveCount(0);

        // No anchor anywhere on the page carries the raw hostile value.
        await expect(page.locator('a[href^="javascript:"]')).toHaveCount(0);

        // Nothing ever prompted a browser dialog (the injection attempt never
        // executed).
        expect(dialogs).toEqual([]);
      }
    );

    adminFixture.test(
      'US5-AS3 — a stored address with surrounding whitespace and an upper-case scheme renders the trimmed address',
      async ({ page }) => {
        adminFixture.test.setTimeout(60_000);
        const cc = new ContributorsCalloutPage(page, baseUrl);
        await cc.navigateToSpace(baseScenario.space.nameId);
        const col = cc.collection(CALLOUT_TITLE);
        await col.switchType('Organizations');

        const website = col.websiteLink(ORG_SPACEY);
        await expect(website).toBeVisible();
        const href = await website.getAttribute('href');
        expect(href).toBe(SPACEY_WEBSITE_TRIMMED);
        expect(href).not.toMatch(/^\s|\s$/);
      }
    );

    // Product finding QA-PF-01 — https://github.com/alkem-io/client-web/issues/10369
    // The avatar anchor carries the organisation's name as aria-label, so the
    // card exposes two exact-name links. Kept last so a red here skips nothing.
    // Skipped by decision of the QA lead (2026-10-05) until that issue ships; the assertions below
    // are the acceptance oracle for the fix and must not be softened. Un-skip, do not delete.
    adminFixture.test.skip(
      'US5 / FR-016 — an organisation card with a website control still exposes exactly one profile link (the name)',
      async ({ page }) => {
        const cc = new ContributorsCalloutPage(page, baseUrl);
        await cc.navigateToSpace(baseScenario.space.nameId);
        const col = cc.collection(CALLOUT_TITLE);
        await col.switchType('Organizations');
        await expect(col.websiteLink(ORG_VALID)).toBeVisible();
        await expect(
          col.region.getByRole('link', { name: ORG_VALID, exact: true })
        ).toHaveCount(1);
      }
    );
  }
);
