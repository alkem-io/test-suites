// User Story 2 — Everything else keeps working (P1)
// workspace#077-richer-contributor-cards · client-web#10316
//
// Spec: agents-hq/specs/077-richer-contributor-cards/spec.md US2-AS1..AS6,
// FR-016, FR-032..FR-035.
//
// Self-seeded: one PUBLIC scenario space (and a PUBLIC subspace) with
// thirteen people — more than one page of nine — two leads, organizations and
// a virtual contributor. Expected counts and names come from the API, read as
// admin. Signed-in views use the harness personas `non.space` (non-member) and
// `space.admin` (member) without modifying them. The shipped flows (create,
// type switch, empty states, member view) stay in 0.1contributors-callout.spec.ts.

import { expect, test, type Browser, type Page } from '@playwright/test';
import {
  TestScenarioConfig,
  TestScenarioFactory,
  TestUser,
  TestUserManager,
  UniqueIDGenerator,
} from '@alkemio/tests-lib';
import { RoleName } from '@alkemio/tests-lib/core/generated/alkemio-schema';
import { OrganizationWithSpaceModel } from '@alkemio/tests-lib/scenario/models/OrganizationWithSpaceModel';
import { assignRoleToUser } from '@alkemio/tests-lib/scenario/baseFunctions';
import { loginViaCrd } from '../helpers/login.helper';
import {
  ApiCard,
  CardsFixture,
  adminGql,
  apiCards,
  createContributorsCalloutViaApi,
  setSpacePrivacy,
} from './cards-fixture';
import {
  BAD_CARD_TEXT,
  ContributorsCalloutPage,
  contributorCardsIn,
} from './pages';

const baseUrl = process.env.ALKEMIO_BASE_URL || 'http://localhost:3000';
const harnessPassword = process.env.AUTH_TEST_HARNESS_PASSWORD;
const uid = UniqueIDGenerator.getID();
const TITLE = `US2 Cards ${uid}`;
const TITLE_L1 = `US2 Cards L1 ${uid}`;
const N = (label: string) => `US2 ${label} ${uid}`;
/** A word that is one of Ada's tags and appears in no display name. */
const TAG_ONLY_WORD = 'Sustainability';

const ADA = N('Ada');
const LEA = N('Lea Lead');
/** Shares the 'US2 Ada' prefix so one search shows Ada and Cy side by side. */
const CY = N('Ada Cy');
const ORG = N('Org');

const scenarioConfig: TestScenarioConfig = {
  name: `us2-cards-${uid}`,
  space: {
    collaboration: {
      addTutorialCallouts: false,
      addPostCollectionCallout: false,
      addWhiteboardCallout: false,
    },
    community: {
      admins: [TestUser.SPACE_ADMIN],
      members: [TestUser.SPACE_ADMIN],
    },
    subspace: { collaboration: { addPostCollectionCallout: false } },
  },
  virtualContributors: {
    useBaseOrganization: true,
    virtualContributors: [{ profileDisplayName: N('VC') }],
  },
};

let baseScenario: OrganizationWithSpaceModel;
const fixture = new CardsFixture(uid);
let subspaceDisplayName = '';
let people: ApiCard[] = [];
let organizations: ApiCard[] = [];
let vcs: ApiCard[] = [];

test.use({ timezoneId: 'UTC', locale: 'en-US' });

async function openCollection(page: Page, title = TITLE) {
  const cc = new ContributorsCalloutPage(page, baseUrl);
  await cc.navigateToSpace(baseScenario.space.nameId);
  const col = cc.collection(title);
  await expect(col.region).toBeVisible({ timeout: 30_000 });
  await expect(col.cardItems.first()).toBeVisible({ timeout: 15_000 });
  return col;
}

/** A fresh browser context signed in as a harness persona (never modified). */
async function signedInPage(browser: Browser, email: string) {
  if (!harnessPassword)
    throw new Error('AUTH_TEST_HARNESS_PASSWORD is not set');
  const context = await browser.newContext({
    timezoneId: 'UTC',
    locale: 'en-US',
  });
  const page = await context.newPage();
  await loginViaCrd(page, email, harnessPassword, baseUrl);
  return { context, page };
}

test.describe.serial('US2 — Everything else keeps working', () => {
  test.beforeAll(async () => {
    test.setTimeout(300_000);
    await TestUserManager.populateUserModelMap();
    baseScenario = await TestScenarioFactory.createBaseScenario(scenarioConfig);
    await setSpacePrivacy(baseScenario.space.id, { mode: 'PUBLIC' });
    await setSpacePrivacy(baseScenario.subspace.id, { mode: 'PUBLIC' });
    const roleSet = baseScenario.space.community.roleSetId;
    const subRoleSet = baseScenario.subspace.community.roleSetId;
    const calloutId = await createContributorsCalloutViaApi(
      baseScenario.space.collaboration.calloutsSetId,
      TITLE
    );
    await createContributorsCalloutViaApi(
      baseScenario.subspace.collaboration.calloutsSetId,
      TITLE_L1
    );

    const adaId = await fixture.user(ADA, roleSet, {
      tagline: 'Urban planner.',
      tags: { skills: [TAG_ONLY_WORD, 'Mobility'] },
      location: { city: 'Utrecht', country: 'NL' },
    });
    // Ada is a plain member of the space and a lead of its subspace (US2-AS6).
    for (const role of [RoleName.Member, RoleName.Lead]) {
      const res = await assignRoleToUser(adaId, subRoleSet, role);
      if (res.error)
        throw new Error(
          `Ada ${role} in subspace: ${JSON.stringify(res.error)}`
        );
    }
    await fixture.user(LEA, roleSet, undefined, [
      RoleName.Member,
      RoleName.Lead,
    ]);
    await fixture.user(CY, roleSet);
    for (let i = 1; i <= 9; i++) {
      await fixture.user(N(`member-${String(i).padStart(2, '0')}`), roleSet);
    }
    await fixture.organization(
      ORG,
      `us2org${uid}`,
      roleSet,
      {
        associates: 1,
        seed: {
          tagline: 'An organization people can see.',
          tags: { keywords: ['Grid'] },
        },
      },
      TestUserManager.users.globalAdmin.id
    );
    await fixture.virtualContributorMember(
      baseScenario.virtualContributors![0].id,
      roleSet,
      {
        tagline: 'A helpful virtual contributor.',
      }
    );

    people = await apiCards(calloutId, 'USER');
    organizations = await apiCards(calloutId, 'ORGANIZATION');
    vcs = await apiCards(calloutId, 'VIRTUAL_CONTRIBUTOR');
    expect(people.length, 'more than one page of people').toBeGreaterThan(9);
    expect(
      people.filter(p => p.roleLabel === 'lead').map(p => p.displayName)
    ).toContain(LEA);
    subspaceDisplayName = (
      await adminGql<{
        lookup: { space: { about: { profile: { displayName: string } } } };
      }>(
        'query($id: UUID!) { lookup { space(ID: $id) { about { profile { displayName } } } } }',
        {
          id: baseScenario.subspace.id,
        }
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

  test('US2-AS1 — type counts and the All / Lead / Member filter match the server, and Lead and Member partition the people', async ({
    page,
  }) => {
    const col = await openCollection(page);
    const leads = people.filter(p => p.roleLabel === 'lead');
    await expect(col.typeSwitchTab('People')).toHaveAttribute(
      'aria-selected',
      'true'
    );
    await expect(col.typeSwitchTab('People')).toHaveText(
      `People${people.length}`
    );
    await expect(col.typeSwitchTab('Organizations')).toHaveText(
      `Organizations${organizations.length}`
    );
    await expect(col.typeSwitchTab('Virtual Contributors')).toHaveText(
      `Virtual Contributors${vcs.length}`
    );
    await expect(col.region.getByRole('tab', { name: /^All/ })).toHaveText(
      `All${people.length}`
    );
    await expect(col.region.getByRole('tab', { name: /^Lead/ })).toHaveText(
      `Lead${leads.length}`
    );
    await expect(col.region.getByRole('tab', { name: /^Member/ })).toHaveText(
      `Member${people.length - leads.length}`
    );

    await col.region.getByRole('tab', { name: /^Lead/ }).click();
    await expect(col.cardItems).toHaveCount(leads.length);
    for (const lead of leads)
      await expect(col.cardFor(lead.displayName)).toBeVisible();

    await col.region.getByRole('tab', { name: /^Member/ }).click();
    await expect(col.cardItems.first()).toBeVisible();
    for (const lead of leads)
      await expect(col.cardFor(lead.displayName)).toHaveCount(0);
  });

  test('US2-AS1 — paging: page 1 shows nine people, the next page the rest, none repeated and none missing', async ({
    page,
  }) => {
    const col = await openCollection(page);
    await expect(col.region.getByText('Page 1 of 2')).toBeVisible();
    await expect(col.cardItems).toHaveCount(9);
    const names = async () =>
      (await col.cardItems.allInnerTexts()).map(t => t.split('\n')[0].trim());
    const page1 = await names();
    await col.region.getByRole('button', { name: /next/i }).click();
    await expect(col.region.getByText('Page 2 of 2')).toBeVisible();
    await expect(col.cardItems).toHaveCount(people.length - 9);
    const page2 = await names();
    expect(page2.filter(n => page1.includes(n))).toEqual([]);
    expect([...page1, ...page2].sort()).toEqual(
      people.map(p => p.displayName).sort()
    );
  });

  test('US2-AS1 — search matches names only: Ada is found by name, a word that is only one of her tags finds nobody', async ({
    page,
  }) => {
    const col = await openCollection(page);
    // Positive control: the word really is on Ada's card.
    expect(people.find(p => p.displayName === ADA)?.tags).toContain(
      TAG_ONLY_WORD
    );
    await col.search(ADA);
    await expect(col.cardItems).toHaveCount(1);
    await expect(col.cardFor(ADA)).toBeVisible();
    await col.search(TAG_ONLY_WORD);
    await expect(col.emptySearchState()).toBeVisible();
    await expect(col.cardItems).toHaveCount(0);
  });

  test('US2-AS1 — switching segment scopes the list; Virtual Contributors has no Map; List and Map toggle', async ({
    page,
  }) => {
    const col = await openCollection(page);
    await col.switchType('Organizations');
    await expect(col.cardItems).toHaveCount(organizations.length);
    await expect(col.cardFor(ORG)).toBeVisible();
    await col.switchType('Virtual Contributors');
    await expect(col.cardItems).toHaveCount(vcs.length);
    await expect(col.viewToggle('Map')).toHaveCount(0);
    await col.switchType('People');
    await col.viewToggle('Map').click();
    await expect(col.viewToggle('Map')).toHaveAttribute('aria-pressed', 'true');
    await expect(col.mapRegion()).toBeVisible({ timeout: 15_000 });
    await col.viewToggle('List').click();
    await expect(col.viewToggle('List')).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    await expect(col.cardItems.first()).toBeVisible();
  });

  test('US2-AS3 / FR-034 — a contributor with none of the new values is a valid card of the same height; no card shows "undefined", "null", "Invalid Date" or "NaN"', async ({
    page,
  }) => {
    const col = await openCollection(page);
    // Cy (no new values) rendered next to Ada (every row present).
    await col.search('US2 Ada');
    await expect(col.cardItems).toHaveCount(2);
    const cy = col.cardFor(CY);
    await expect(cy).toBeVisible();
    await expect(col.tagListOf(ADA)).toBeVisible();
    const page1Heights = await col.cardItems.evaluateAll(items =>
      items.map(li => li.getBoundingClientRect().height)
    );
    const cyHeight = (await cy.boundingBox())!.height;
    expect(Math.max(...page1Heights) - cyHeight).toBeLessThanOrEqual(1);
    expect(cyHeight - Math.min(...page1Heights)).toBeLessThanOrEqual(1);
    await expect(col.taglineOf(CY)).toHaveText(
      'User has not filled in their tagline.'
    );
    await expect(col.tagListOf(CY)).toHaveCount(0);
    await expect(col.locationOf(CY)).toHaveCount(0);
    await col.search('');
    for (const type of [
      'People',
      'Organizations',
      'Virtual Contributors',
    ] as const) {
      await col.switchType(type);
      await expect(col.cardItems.first(), type).toBeVisible();
      const texts = await col.cardItems.allInnerTexts();
      expect(
        texts.filter(t => BAD_CARD_TEXT.test(t)),
        type
      ).toEqual([]);
    }
  });

  test('US2-AS5 — a post created before anyone viewed it is enriched without editing, and its edit form offers no new option', async ({
    browser,
  }) => {
    const { context, page } = await signedInPage(
      browser,
      TestUserManager.users.spaceAdmin.email
    );
    try {
      const col = await openCollection(page);
      await expect(col.taglineOf(ADA)).toHaveText('Urban planner.');
      await expect(col.tagPillsOf(ADA).first()).toHaveText(TAG_ONLY_WORD);
      await new ContributorsCalloutPage(page, baseUrl).openEdit(TITLE);
      const form = page.getByRole('dialog').last();
      await expect(
        form.getByRole('radio', { name: 'Contributors', exact: true })
      ).toBeChecked();
      const switches = await form
        .getByRole('switch')
        .evaluateAll(els =>
          els.map(e => e.getAttribute('aria-label') ?? e.textContent ?? '')
        );
      // "Manual selection" is feature 025's switch — the only one before 077.
      expect(switches).toEqual(['Manual selection']);
    } finally {
      await context.close();
    }
  });

  test('US2-AS6 — the role label belongs to the post: Ada reads "Member" in the space and "Lead" in the subspace, and "Member" again after returning, without a reload', async ({
    page,
  }) => {
    const col = await openCollection(page);
    await page.evaluate(() => {
      (window as unknown as Record<string, string>).__us2NoReload = 'marker';
    });
    await expect(col.cardFor(ADA)).toContainText(`${ADA}Member`);

    await page.getByRole('tab', { name: 'Subspaces', exact: true }).click();
    await page
      .getByRole('link')
      .filter({ hasText: subspaceDisplayName })
      .first()
      .click();
    const sub = new ContributorsCalloutPage(page, baseUrl).collection(TITLE_L1);
    await expect(sub.cardFor(ADA)).toContainText(`${ADA}Lead`, {
      timeout: 30_000,
    });

    // Browser Back lands on the space's Subspaces tab (the tab switch replaces
    // the history entry); the Home tab holds the post. Both are client-side.
    await page.goBack();
    await page.getByRole('tab', { name: 'Home', exact: true }).click();
    await expect(col.cardFor(ADA)).toContainText(`${ADA}Member`, {
      timeout: 30_000,
    });
    expect(
      await page.evaluate(
        () => (window as unknown as Record<string, string>).__us2NoReload
      )
    ).toBe('marker');
  });

  test('US2-AS2 / FR-032 — under "members only" anonymous visitors and signed-in non-members get no People cards but enriched Organizations; a member sees People', async ({
    page,
    browser,
  }) => {
    await setSpacePrivacy(baseScenario.space.id, {
      userInformationVisibility: 'MEMBERS_ONLY',
    });
    try {
      const nonMember = await signedInPage(
        browser,
        TestUserManager.users.nonSpaceMember.email
      );
      const outsiders = [
        { name: 'anonymous', page },
        { name: 'non-member', page: nonMember.page },
      ];
      for (const viewer of outsiders) {
        const col = await openCollection(viewer.page);
        await expect(
          col.typeSwitchTab('Organizations'),
          viewer.name
        ).toHaveAttribute('aria-selected', 'true');
        await expect(col.typeSwitchTab('People'), viewer.name).toHaveCount(0);
        await expect(col.taglineOf(ORG), viewer.name).toHaveText(
          'An organization people can see.'
        );
        await expect(col.bottomLineOf(ORG), viewer.name).toHaveText(
          '1 associate in this organization'
        );
        for (const person of [ADA, LEA, CY]) {
          await expect(
            viewer.page.getByRole('link', { name: person, exact: true }),
            viewer.name
          ).toHaveCount(0);
        }
        await expect(
          viewer.page.getByText(/Joined this space/),
          viewer.name
        ).toHaveCount(0);
      }
      await nonMember.context.close();

      const member = await signedInPage(
        browser,
        TestUserManager.users.spaceAdmin.email
      );
      try {
        const col = await openCollection(member.page);
        await expect(col.typeSwitchTab('People')).toHaveText(
          `People${people.length}`
        );
        await col.search(ADA);
        await expect(col.taglineOf(ADA)).toHaveText('Urban planner.');
      } finally {
        await member.context.close();
      }
    } finally {
      await setSpacePrivacy(baseScenario.space.id, {
        userInformationVisibility: 'FOLLOW_SPACE_VISIBILITY',
      });
    }
  });

  // Product finding QA-PF-01 — https://github.com/alkem-io/client-web/issues/10369
  // The avatar anchor carries aria-label={name} instead of aria-hidden, so every
  // card exposes two links with the contributor's exact name. Kept last so a
  // red here skips nothing else in this serial block.
  // Skipped by decision of the QA lead (2026-10-05) until that issue ships; the assertions below
  // are the acceptance oracle for the fix and must not be softened. Un-skip, do not delete.
  test.skip("US2-AS4 / FR-016 — every card is found by the contributor's name as exactly one profile link, in the feed, the dialog and the map list", async ({
    page,
  }) => {
    const col = await openCollection(page);
    for (const person of people.slice(0, 9)) {
      await expect(
        col.region.getByRole('link', { name: person.displayName, exact: true }),
        `feed: ${person.displayName}`
      ).toHaveCount(1);
    }
    await page
      .getByRole('link', { name: `Open ${TITLE}` })
      .first()
      .click();
    const dialogRegion = page
      .getByRole('dialog')
      .getByRole('region', { name: 'Contributors', exact: true });
    await expect(contributorCardsIn(dialogRegion).cardFor(ADA)).toBeVisible();
    await expect(
      dialogRegion.getByRole('link', { name: ADA, exact: true }),
      'dialog: Ada'
    ).toHaveCount(1);
    await dialogRegion
      .getByRole('button', { name: 'Map', exact: true })
      .click();
    await expect(
      page
        .getByRole('dialog')
        .getByRole('heading', { name: 'No location data' })
    ).toBeVisible({ timeout: 15_000 });
    await expect(
      dialogRegion.getByRole('link', { name: CY, exact: true }),
      'map list: Cy'
    ).toHaveCount(1);
  });
});
