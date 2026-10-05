// User Story 4 — See when a person joined this space (P2)
// workspace#077-richer-contributor-cards · client-web#10316
//
// Spec: agents-hq/specs/077-richer-contributor-cards/spec.md US4-AS1..AS5,
// FR-010..FR-013, FR-028/FR-029; decisions D-UTC, D-CACHE, D-RENDER.
//
// REMOVABLE: human gate G-1 drops User Story 4 (this file, the text key and
// the request selection) if the acceptance join-date check finds
// import-clustered dates.
//
// Self-seeded, no SQL. Every expected month has two oracles: the API's own
// `joinedDate`, and the UTC wall-clock window in which this file assigned the
// member role (independent of the server). A backdated membership (the spec's
// "31 October 2023 23:30 UTC" example) cannot be built from this repo, so the
// month-boundary and earliest-of-duplicates rules are recorded as not covered
// in the area test plan.

import { expect, test, type Page } from '@playwright/test';
import {
  TestScenarioConfig,
  TestScenarioFactory,
  TestUserManager,
  UniqueIDGenerator,
} from '@alkemio/tests-lib';
import { RoleName } from '@alkemio/tests-lib/core/generated/alkemio-schema';
import { OrganizationWithSpaceModel } from '@alkemio/tests-lib/scenario/models/OrganizationWithSpaceModel';
import { assignRoleToUser } from '@alkemio/tests-lib/scenario/baseFunctions';
import {
  CardsFixture,
  adminGql,
  apiCards,
  createContributorsCalloutViaApi,
  monthStartUtcIso,
  monthYearLabel,
  setSpacePrivacy,
} from './cards-fixture';
import { ContributorsCalloutPage } from './pages';

const baseUrl = process.env.ALKEMIO_BASE_URL || 'http://localhost:3000';
const uid = UniqueIDGenerator.getID();
const TITLE = `US4 Cards ${uid}`;
const TITLE_L1 = `US4 Cards L1 ${uid}`;
const ADA = `US4 Ada ${uid}`;
const ORG = `US4 Org ${uid}`;
const VC = `US4 VC ${uid}`;
/** CLDR Dutch abbreviated month names — an oracle independent of the app's Intl call. */
const DUTCH_MONTHS = [
  'jan',
  'feb',
  'mrt',
  'apr',
  'mei',
  'jun',
  'jul',
  'aug',
  'sep',
  'okt',
  'nov',
  'dec',
];

const scenarioConfig: TestScenarioConfig = {
  name: `us4-cards-${uid}`,
  space: {
    collaboration: {
      addTutorialCallouts: false,
      addPostCollectionCallout: false,
      addWhiteboardCallout: false,
    },
    subspace: { collaboration: { addPostCollectionCallout: false } },
  },
  virtualContributors: {
    useBaseOrganization: true,
    virtualContributors: [{ profileDisplayName: VC }],
  },
};

let baseScenario: OrganizationWithSpaceModel;
const fixture = new CardsFixture(uid);
let subspaceDisplayName = '';
let parentCalloutId = '';
let subCalloutId = '';
/** UTC month starts the assignment windows fall in (one value unless a month boundary was crossed). */
let parentWindowMonths: string[] = [];
let subWindowMonths: string[] = [];
let parentApiMonth = '';
let subApiMonth = '';

async function openCollection(page: Page, title = TITLE) {
  const cc = new ContributorsCalloutPage(page, baseUrl);
  await cc.navigateToSpace(baseScenario.space.nameId);
  const col = cc.collection(title);
  await expect(col.region).toBeVisible({ timeout: 30_000 });
  await expect(col.cardFor(ADA)).toBeVisible({ timeout: 15_000 });
  return col;
}

const joined = (iso: string) => `Joined this space ${monthYearLabel(iso)}`;

test.describe.serial('US4 — See when a person joined this space', () => {
  test.beforeAll(async () => {
    test.setTimeout(300_000);
    await TestUserManager.populateUserModelMap();
    baseScenario = await TestScenarioFactory.createBaseScenario(scenarioConfig);
    await setSpacePrivacy(baseScenario.space.id, { mode: 'PUBLIC' });
    await setSpacePrivacy(baseScenario.subspace.id, { mode: 'PUBLIC' });
    parentCalloutId = await createContributorsCalloutViaApi(
      baseScenario.space.collaboration.calloutsSetId,
      TITLE
    );
    subCalloutId = await createContributorsCalloutViaApi(
      baseScenario.subspace.collaboration.calloutsSetId,
      TITLE_L1
    );

    const from = new Date();
    const adaId = await fixture.user(
      ADA,
      baseScenario.space.community.roleSetId
    );
    const to = new Date();
    parentWindowMonths = [monthStartUtcIso(from), monthStartUtcIso(to)];

    const subFrom = new Date();
    const res = await assignRoleToUser(
      adaId,
      baseScenario.subspace.community.roleSetId,
      RoleName.Member
    );
    if (res.error)
      throw new Error(`Ada in subspace: ${JSON.stringify(res.error)}`);
    const subTo = new Date();
    subWindowMonths = [monthStartUtcIso(subFrom), monthStartUtcIso(subTo)];

    await fixture.organization(
      ORG,
      `us4org${uid}`,
      baseScenario.space.community.roleSetId,
      { associates: 0 },
      TestUserManager.users.globalAdmin.id
    );
    await fixture.virtualContributorMember(
      baseScenario.virtualContributors![0].id,
      baseScenario.space.community.roleSetId
    );

    parentApiMonth = (await apiCards(parentCalloutId, 'USER')).find(
      c => c.displayName === ADA
    )!.joinedDate!;
    subApiMonth = (await apiCards(subCalloutId, 'USER')).find(
      c => c.displayName === ADA
    )!.joinedDate!;
    subspaceDisplayName = (
      await adminGql<{
        lookup: { space: { about: { profile: { displayName: string } } } };
      }>(
        'query($id: UUID!) { lookup { space(ID: $id) { about { profile { displayName } } } } }',
        { id: baseScenario.subspace.id }
      )
    ).lookup.space.about.profile.displayName;
  });

  test.afterAll(async () => {
    test.setTimeout(180_000);
    try {
      await fixture.cleanUp();
    } finally {
      if (baseScenario)
        await TestScenarioFactory.cleanUpBaseScenario(baseScenario);
    }
  });

  test('US4-AS1 / FR-029 — the API month equals the UTC month the membership was created in, and the card reads "Joined this space <Mon yyyy>" with no icon', async ({
    browser,
  }) => {
    expect(parentWindowMonths).toContain(parentApiMonth);
    const context = await browser.newContext({
      timezoneId: 'UTC',
      locale: 'en-US',
    });
    const page = await context.newPage();
    const col = await openCollection(page);
    const line = col.bottomLineOf(ADA);
    await expect(line).toHaveText(joined(parentApiMonth));
    // No icon: the line's own element holds only text (organisations' line has a people icon).
    await expect(line.locator('svg')).toHaveCount(0);
    await expect(line.locator('xpath=..').locator('svg')).toHaveCount(0);
    await context.close();
  });

  test('US4-AS2 / FR-011 — devices at UTC−8, UTC and UTC+14 all read the same month, never a neighbouring one', async ({
    browser,
  }) => {
    for (const timezoneId of [
      'America/Los_Angeles',
      'UTC',
      'Pacific/Kiritimati',
    ]) {
      const context = await browser.newContext({ timezoneId, locale: 'en-US' });
      const page = await context.newPage();
      const col = await openCollection(page);
      await expect(col.bottomLineOf(ADA), timezoneId).toHaveText(
        joined(parentApiMonth)
      );
      await context.close();
    }
  });

  test("US4-AS3 / FR-010 — the month belongs to the post's own space: the subspace post shows the subspace membership month, and the parent's month is unchanged on return without a reload", async ({
    browser,
  }) => {
    expect(subWindowMonths).toContain(subApiMonth);
    const context = await browser.newContext({
      timezoneId: 'UTC',
      locale: 'en-US',
    });
    const page = await context.newPage();
    const col = await openCollection(page);
    await page.evaluate(() => {
      (window as unknown as Record<string, string>).__us4NoReload = 'marker';
    });
    await expect(col.bottomLineOf(ADA)).toHaveText(joined(parentApiMonth));

    await page.getByRole('tab', { name: 'Subspaces', exact: true }).click();
    await page
      .getByRole('link')
      .filter({ hasText: subspaceDisplayName })
      .first()
      .click();
    const sub = new ContributorsCalloutPage(page, baseUrl).collection(TITLE_L1);
    await expect(sub.bottomLineOf(ADA)).toHaveText(joined(subApiMonth), {
      timeout: 30_000,
    });

    await page.goBack();
    await page.getByRole('tab', { name: 'Home', exact: true }).click();
    await expect(col.bottomLineOf(ADA)).toHaveText(joined(parentApiMonth), {
      timeout: 30_000,
    });
    expect(
      await page.evaluate(
        () => (window as unknown as Record<string, string>).__us4NoReload
      )
    ).toBe('marker');
    await context.close();
  });

  test('US4-AS4 / FR-012 — in Dutch the line reads "Lid geworden van deze Space <maand> <jaar>" for the same month, and switching back to English without a reload re-labels every card', async ({
    browser,
  }) => {
    const context = await browser.newContext({
      timezoneId: 'UTC',
      locale: 'en-US',
    });
    const page = await context.newPage();
    const col = await openCollection(page);
    await page.evaluate(() => {
      (window as unknown as Record<string, string>).__us4NoReload = 'marker';
    });
    const month = new Date(parentApiMonth);
    const dutchMonth = DUTCH_MONTHS[month.getUTCMonth()];
    const year = month.getUTCFullYear();

    await page.getByRole('button', { name: 'English' }).first().click();
    await page.getByRole('menuitem', { name: 'Nederlands' }).click();
    await expect(
      col.cardFor(ADA).getByText(/^Lid geworden van deze Space /)
    ).toHaveText(
      new RegExp(`^Lid geworden van deze Space ${dutchMonth}\\.? ${year}$`)
    );

    await page.getByRole('button', { name: 'Nederlands' }).first().click();
    await page.getByRole('menuitem', { name: 'English' }).click();
    await expect(col.bottomLineOf(ADA)).toHaveText(joined(parentApiMonth));
    await expect(
      col.region.getByText(/^Lid geworden van deze Space /)
    ).toHaveCount(0);
    expect(
      await page.evaluate(
        () => (window as unknown as Record<string, string>).__us4NoReload
      )
    ).toBe('marker');
    await context.close();
  });

  test('US4-AS5 / FR-028 — organization and virtual contributor cards carry no "Joined this space" line, and the API delivers no join date for them', async ({
    browser,
  }) => {
    for (const type of ['ORGANIZATION', 'VIRTUAL_CONTRIBUTOR'] as const) {
      const items = await apiCards(parentCalloutId, type);
      expect(items.length, type).toBeGreaterThan(0);
      expect(
        items.filter(i => i.joinedDate !== null),
        type
      ).toEqual([]);
    }
    const context = await browser.newContext({
      timezoneId: 'UTC',
      locale: 'en-US',
    });
    const page = await context.newPage();
    const col = await openCollection(page);
    await col.switchType('Organizations');
    await expect(col.bottomLineOf(ORG)).toHaveText(
      '0 associates in this organization'
    );
    await expect(col.region.getByText(/^Joined this space/)).toHaveCount(0);
    await col.switchType('Virtual Contributors');
    await expect(col.cardFor(VC)).toBeVisible();
    await expect(col.region.getByText(/^Joined this space/)).toHaveCount(0);
    await context.close();
  });
});
