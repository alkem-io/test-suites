// @forge-acceptance
//
// User Story 2 — Everything else keeps working
// (priority P1).
//
// Spec: the workspace feature spec (AS1..AS6)
// Contract: the workspace feature's contracts/crd-contributor-card.md
//
// This is the regression story: richer cards must not change the pre-077
// contributor-collection behaviours (search, All/Lead/Member filter, paging,
// segment switch, List/Map), must not leak enrichment through the
// MEMBERS_ONLY privacy gate, must degrade gracefully when no new value is
// available, must keep exactly one profile link per card, must not add any
// new callout-creation option, and must not leak a value from one post's
// cache entry into another's.
//
// Precondition: the "Cards" fixture exists (quickstart.md §2 — created once,
// out of band; not (re)created here), INCLUDING "Cards Subspace" (row 2) and
// "Members Only Space" (row 3). `beforeAll` resolves every space/callout by
// its exact profile display name — the fixture's nameIDs are not pinned by
// quickstart.md.
//
// Persona sign-in (nomad / Ada) uses the fixture's shared throwaway
// password, read from `CARDS_FIXTURE_PERSONA_PASSWORD` — never hardcoded
// here, since quickstart.md generates a fresh one per provisioning run and
// records it in the (gitignored) `.forge/fixture.json`. Admin sign-in reuses
// the repo-standard `AUTH_ADMIN_PASSWORD` / `AUTH_TEST_HARNESS_PASSWORD`
// convention (falls back to `change_me`, matching `login.helper.ts`'s own
// default — set the real value via env in CI/local runs).
//
// US2-AS4's first clause ("the shipped end-to-end flows ... still pass") is
// the pre-existing suites in this directory (`0.1contributors-callout.spec.ts`
// plus the other `usN-*.spec.ts` files) — re-running them is out of this
// file's scope. This file implements AS4's second clause only: every fixture
// contributor's card is found by its name as *exactly one* profile link,
// across every type segment and every page of People.

import { test, expect, type Page, type Locator } from '@playwright/test';
import { loginViaCrd } from '../helpers/login.helper';
import { resolveFixturePersonaName } from './fixture-personas';

const BASE_URL = process.env.ALKEMIO_BASE_URL || 'http://localhost:3000';
const CALLOUT_DISPLAY_NAME = 'Contributors';

const SPACE_DISPLAY_NAME = 'Cards Space';
const SUBSPACE_DISPLAY_NAME = 'Cards Subspace';
const MEMBERS_ONLY_SPACE_DISPLAY_NAME = 'Members Only Space';

const ADMIN_NAME = 'admin alkemio';
// Same roster as us1-card-content.spec.ts and us4-joined-this-space.spec.ts
// (one "Cards" fixture, one set of full display names). quickstart.md §2
// pins only first names — the surname a given provisioning run picks is not
// pinned and has been observed to differ run to run — so every spec that
// reads this fixture resolves the full display name from the live fixture
// via `resolveFixturePersonaName` (`beforeAll`) rather than hardcoding it.
let ADA_NAME: string;
let BEN_NAME: string;
let CY_NAME: string;
let DEE_NAME: string;
const GFL_NAME = 'Green Future Labs';

const NOMAD_EMAIL = 'nomad@cards-fixture.example';
const ADA_EMAIL = 'ada@cards-fixture.example';
const ADMIN_EMAIL = 'admin@alkem.io';
const PERSONA_PASSWORD =
  process.env.CARDS_FIXTURE_PERSONA_PASSWORD || 'change_me';
const ADMIN_PASSWORD =
  process.env.AUTH_ADMIN_PASSWORD ||
  process.env.AUTH_TEST_HARNESS_PASSWORD ||
  'change_me';

// Full fixture roster (quickstart.md §2) — used only by AS4's per-contributor
// link-uniqueness sweep. Populated in `beforeAll`, once ADA_NAME/BEN_NAME/
// CY_NAME/DEE_NAME are resolved from the live fixture.
let PEOPLE_NAMES: string[];
const ORGANIZATION_NAMES = [
  GFL_NAME,
  'Solo Org',
  'Capable Org',
  'Bare Org',
  'Hostile Org',
  'Schemeless Org',
  'Spacey Org',
];
const VIRTUAL_CONTRIBUTOR_NAMES = ['Helper VC', 'Quiet VC'];

let spaceNameId: string;
let membersOnlySpaceNameId: string;

async function gql<T>(query: string, variables: Record<string, unknown>): Promise<T> {
  const res = await fetch(`${BASE_URL}/graphql`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables }),
  });
  const json = await res.json();
  if (json.errors) {
    throw new Error(`GraphQL error: ${JSON.stringify(json.errors)}`);
  }
  return json.data as T;
}

/** Resolves a space's nameID by its exact profile display name — never a
 * hardcoded nameID, since quickstart.md does not pin one. */
async function resolveSpaceNameId(displayName: string): Promise<string> {
  const data = await gql<{
    spaces: { nameID: string; about: { profile: { displayName: string } } }[];
  }>(
    'query { spaces(filter: { visibilities: [ACTIVE] }) { nameID about { profile { displayName } } } }',
    {}
  );
  const match = data.spaces.find(s => s.about.profile.displayName === displayName);
  if (!match) {
    throw new Error(
      `Fixture precondition failed: no space with profile.displayName === "${displayName}" ` +
        "(the workspace feature's quickstart.md §2 — seed the Cards fixture first)."
    );
  }
  return match.nameID;
}

async function resolveCardsFixture(): Promise<void> {
  spaceNameId = await resolveSpaceNameId(SPACE_DISPLAY_NAME);
  membersOnlySpaceNameId = await resolveSpaceNameId(MEMBERS_ONLY_SPACE_DISPLAY_NAME);
  [ADA_NAME, BEN_NAME, CY_NAME, DEE_NAME] = await Promise.all([
    resolveFixturePersonaName('Ada'),
    resolveFixturePersonaName('Ben'),
    resolveFixturePersonaName('Cy'),
    resolveFixturePersonaName('Dee'),
  ]);
  PEOPLE_NAMES = [
    ADMIN_NAME,
    'Lea Moreau',
    ADA_NAME,
    BEN_NAME,
    CY_NAME,
    DEE_NAME,
    'Quiet Quinn',
    'Tess Sharma',
    'Member One',
    'Member Two',
    'Member Three',
    'Member Four',
  ];
}

// ---- locators (scoped to the Contributors post's `region`, `hasText`-based
// — mirrors us1-card-content.spec.ts's / us4-joined-this-space.spec.ts's
// workaround for the page-object's broken `has:`-filter helpers) ----

function region(page: Page): Locator {
  return page.getByRole('region', { name: 'Contributors', exact: true }).first();
}
function cardFor(page: Page, name: string): Locator {
  return region(page).locator('li').filter({ hasText: name });
}
function taglineOf(page: Page, name: string): Locator {
  return cardFor(page, name).locator('.line-clamp-2');
}
function tagsOf(page: Page, name: string): Locator {
  return cardFor(page, name).locator('[title]');
}
function locationOf(page: Page, name: string): Locator {
  return cardFor(page, name).locator('.lucide-map-pin').locator('xpath=..');
}
function bottomLineOf(page: Page, name: string): Locator {
  return cardFor(page, name).locator('.mt-auto');
}
async function dismissCookieBanner(page: Page) {
  const accept = page.getByRole('button', { name: /accept all cookies/i });
  if (await accept.isVisible({ timeout: 2000 }).catch(() => false)) {
    await accept.click();
  }
}
async function gotoCommunity(page: Page, nameId: string) {
  await page.goto(`${BASE_URL}/${nameId}/community`);
  await dismissCookieBanner(page);
  await expect(region(page)).toBeVisible({ timeout: 20000 });
  await expect(page.getByRole('heading', { name: 'Oops!' })).toHaveCount(0);
  // The card grid renders a beat after the region container itself — anchor
  // on a known, always-present card rather than a fixed sleep.
  await expect(
    region(page).getByRole('link', { name: ADMIN_NAME, exact: true })
  ).toBeVisible({ timeout: 10000 });
}
async function switchType(
  page: Page,
  type: 'People' | 'Organizations' | 'Virtual Contributors'
) {
  const tab = page.getByRole('tab', { name: new RegExp(`^${type}\\s*\\d`) });
  await tab.click();
  await expect(tab).toHaveAttribute('aria-selected', 'true');
}

test.describe.serial('US2 — Everything else keeps working', () => {
  test.beforeAll(async () => {
    await resolveCardsFixture();
  });

  test.describe('AS1 — search, filter, paging, segment switch, List/Map behave exactly as before', () => {
    test.beforeEach(async ({ page }) => {
      await gotoCommunity(page, spaceNameId);
    });

    test('AS1a — People opens with 12, All/Lead/Member filter counts are correct, and Lead/Member partition without leaks', async ({
      page,
    }) => {
      const peopleTab = page.getByRole('tab', { name: /^People/ });
      await expect(peopleTab).toHaveAttribute('aria-selected', 'true');
      await expect(peopleTab).toHaveText('People12');

      await expect(page.getByRole('tab', { name: /^All/ })).toHaveText('All12');
      await expect(page.getByRole('tab', { name: /^Lead/ })).toHaveText('Lead2');
      await expect(page.getByRole('tab', { name: /^Member/ })).toHaveText('Member10');

      await page.getByRole('tab', { name: /^Lead/ }).click();
      const leadCards = region(page).locator('li');
      await expect(leadCards).toHaveCount(2);
      await expect(leadCards.filter({ hasText: 'Lea Moreau' })).toBeVisible();
      await expect(leadCards.filter({ hasText: ADA_NAME })).toHaveCount(0);

      await page.getByRole('tab', { name: /^Member/ }).click();
      // Member is also paginated (10 members, page size 9) — Lea (a lead)
      // never appears on either page.
      await expect(region(page).locator('li').filter({ hasText: 'Lea Moreau' })).toHaveCount(0);
    });

    test('AS1b — paging past nine contributors: page 1 shows 9, "Next" reveals the remaining 3, none repeated', async ({
      page,
    }) => {
      await expect(page.getByText('Page 1 of 2')).toBeVisible();
      const page1Names = await region(page).locator('li').allTextContents();
      expect(page1Names).toHaveLength(9);

      await page.getByRole('button', { name: /next page|next/i }).click();
      await expect(page.getByText('Page 2 of 2')).toBeVisible();
      const page2Names = await region(page).locator('li').allTextContents();
      expect(page2Names).toHaveLength(3);
      for (const name of page2Names) {
        expect(page1Names).not.toContain(name);
      }
    });

    test('AS1c — name search finds Ada by name; a word that only appears in a tagline/tag finds nobody', async ({
      page,
    }) => {
      const search = region(page).getByRole('textbox', { name: 'Search by name…' });
      await search.fill('Ada');
      await expect(region(page).locator('li')).toHaveCount(1);
      await expect(region(page).locator('li').first()).toContainText(ADA_NAME);

      // "Sustainability" is one of Ada's tags/tagline words, never her name —
      // search is by name only, so it must find nobody.
      await search.fill('Sustainability');
      await expect(
        region(page).getByText('No contributors match your search.')
      ).toBeVisible();
      await expect(region(page).locator('li')).toHaveCount(0);
    });

    test('AS1d — switching segment scopes the view (Organizations 7, Virtual Contributors 2, no Map on VC), and List/Map toggles correctly', async ({
      page,
    }) => {
      await switchType(page, 'Organizations');
      await expect(region(page).locator('li')).toHaveCount(7);

      await switchType(page, 'Virtual Contributors');
      await expect(region(page).locator('li')).toHaveCount(2);
      await expect(region(page).getByRole('button', { name: 'Map', exact: true })).toHaveCount(0);

      await switchType(page, 'People');
      const mapButton = region(page).getByRole('button', { name: 'Map', exact: true });
      await mapButton.click();
      await expect(mapButton).toHaveAttribute('aria-pressed', 'true');
      await expect(region(page).getByRole('region', { name: 'Map', exact: true }).first()).toBeVisible({
        timeout: 15000,
      });

      const listButton = region(page).getByRole('button', { name: 'List', exact: true });
      await listButton.click();
      await expect(listButton).toHaveAttribute('aria-pressed', 'true');
    });
  });

  test.describe('AS2 — the MEMBERS_ONLY privacy gate: People stays empty for non-members, Organizations stays enriched', () => {
    test('AS2a — an anonymous visitor sees People empty (no tagline/tags/join month disclosed) and Organizations enriched', async ({
      browser,
    }) => {
      const context = await browser.newContext();
      const page = await context.newPage();
      await page.goto(`${BASE_URL}/${membersOnlySpaceNameId}/community`);
      await dismissCookieBanner(page);
      await expect(region(page)).toBeVisible({ timeout: 20000 });

      // Members Only Space has exactly one ORGANIZATION member (Green Future
      // Labs) and zero visible USER members here, so the collection collapses
      // to a single, tab-less "N organizations" list (feature 025's rule: a
      // type segment tab renders only when its count is non-zero) — the
      // absence of a People tab/heading/card IS the "count 0, nothing
      // disclosed" assertion.
      await expect(page.getByRole('tab', { name: /^People/ })).toHaveCount(0);
      await expect(region(page).getByText(/^\d+ organizations?$/)).toHaveText('1 organizations');

      const gflCard = cardFor(page, GFL_NAME);
      await expect(gflCard).toBeVisible();
      await expect(taglineOf(page, GFL_NAME)).not.toHaveCount(0);
      await expect(tagsOf(page, GFL_NAME)).toHaveCount(2);
      await expect(locationOf(page, GFL_NAME)).toHaveText('Rotterdam, NL');
      await expect(bottomLineOf(page, GFL_NAME)).toHaveText('3 associates in this organization');
      await expect(
        region(page).getByRole('link', { name: /^Visit the website of Green Future Labs/ })
      ).toBeVisible();

      await context.close();
    });

    test('AS2b — a signed-in non-member (nomad) sees the identical empty-People / enriched-Organizations view', async ({
      browser,
    }) => {
      test.skip(
        PERSONA_PASSWORD === 'change_me',
        'CARDS_FIXTURE_PERSONA_PASSWORD not set — see .forge/fixture.json for this run\'s value.'
      );
      const context = await browser.newContext();
      const page = await context.newPage();
      await loginViaCrd(page, NOMAD_EMAIL, PERSONA_PASSWORD, BASE_URL);
      await page.goto(`${BASE_URL}/${membersOnlySpaceNameId}/community`);
      await dismissCookieBanner(page);
      await expect(region(page)).toBeVisible({ timeout: 20000 });

      await expect(page.getByRole('tab', { name: /^People/ })).toHaveCount(0);
      const gflCard = cardFor(page, GFL_NAME);
      await expect(gflCard).toBeVisible();
      await expect(bottomLineOf(page, GFL_NAME)).toHaveText('3 associates in this organization');

      await context.close();
    });

    test('AS2c — a member (Ada) sees People as normal, herself included and enriched', async ({ browser }) => {
      test.skip(
        PERSONA_PASSWORD === 'change_me',
        'CARDS_FIXTURE_PERSONA_PASSWORD not set — see .forge/fixture.json for this run\'s value.'
      );
      const context = await browser.newContext();
      const page = await context.newPage();
      await loginViaCrd(page, ADA_EMAIL, PERSONA_PASSWORD, BASE_URL);
      await page.goto(`${BASE_URL}/${membersOnlySpaceNameId}/community`);
      await dismissCookieBanner(page);
      await expect(region(page)).toBeVisible({ timeout: 20000 });

      await expect(page.getByRole('tab', { name: /^People/ })).toHaveText('People2');
      const adaCard = cardFor(page, ADA_NAME);
      await expect(adaCard).toBeVisible();
      await expect(tagsOf(page, ADA_NAME)).toHaveCount(2);
      await expect(locationOf(page, ADA_NAME)).toHaveText('Barcelona, ES');

      await context.close();
    });
  });

  test('AS3 — a contributor with no new values renders a valid, equal-height card; the page never shows "undefined"/"null"/"Invalid Date"', async ({
    page,
  }) => {
    await gotoCommunity(page, spaceNameId);
    await page.setViewportSize({ width: 1440, height: 1200 });

    const cyCard = cardFor(page, CY_NAME);
    const adaCard = cardFor(page, ADA_NAME);
    await expect(cyCard).toBeVisible();
    await expect(adaCard).toBeVisible();

    const cyBox = await cyCard.boundingBox();
    const adaBox = await adaCard.boundingBox();
    expect(cyBox).not.toBeNull();
    expect(adaBox).not.toBeNull();
    expect(Math.abs((cyBox?.height ?? 0) - (adaBox?.height ?? 0))).toBeLessThanOrEqual(1);

    await expect(taglineOf(page, CY_NAME)).toHaveText('User has not filled in their tagline.');
    await expect(taglineOf(page, CY_NAME)).toHaveCSS('font-style', 'italic');
    await expect(tagsOf(page, CY_NAME)).toHaveCount(0);
    await expect(locationOf(page, CY_NAME)).toHaveCount(0);
    // Still a normal card: a header, and — if a bottom line renders at all —
    // it is never empty. Not asserting the literal "Joined this space" text
    // here: that line is User Story 4's (see G-1), which this repo's tasks
    // keep as an isolated, independently-removable slice; the undefined/
    // null/Invalid Date sweep below is this story's own coverage of "a
    // contributor with no new values still renders a valid card".
    await expect(region(page).getByRole('link', { name: CY_NAME, exact: true })).toBeVisible();
    const cyBottomLine = bottomLineOf(page, CY_NAME);
    if ((await cyBottomLine.count()) > 0) {
      await expect(cyBottomLine).not.toHaveText('');
    }

    for (const type of ['People', 'Organizations', 'Virtual Contributors'] as const) {
      await switchType(page, type);
      const bodyText = await page.evaluate(() => document.body.innerText);
      expect(bodyText).not.toMatch(/undefined/i);
      expect(bodyText).not.toMatch(/\bnull\b/i);
      expect(bodyText).not.toMatch(/invalid date/i);
    }
  });

  test('AS4 — every fixture contributor is found by name as exactly one profile link (People incl. page 2, Organizations, Virtual Contributors)', async ({
    page,
  }) => {
    await gotoCommunity(page, spaceNameId);

    // Page 1's exact roster is an implementation detail (creation-order
    // dependent) the contract does not pin — verify structurally instead:
    // every name visible on page 1 resolves to exactly one link, page 2's
    // names are disjoint from page 1's, and their union is the full roster.
    //
    // Presence is decided by role, never by `li` text: each card's first
    // text node is the Radix AvatarFallback initial, shown until the
    // external ui-avatars image loads (i.e. always, on an offline CI
    // runner), so a `li.textContent.startsWith(name)` check fails on a
    // correct page. The avatar is an aria-hidden link, excluded from the
    // accessibility tree, so a name-scoped `getByRole('link', { name,
    // exact: true })` cannot be confused by the fallback initial.
    await expect(region(page).locator('li')).toHaveCount(9);
    const page1Present = new Set<string>();
    for (const name of PEOPLE_NAMES) {
      const count = await region(page).getByRole('link', { name, exact: true }).count();
      expect(count, `unexpected link count for "${name}" on page 1`).toBeLessThanOrEqual(1);
      if (count === 1) {
        page1Present.add(name);
      }
    }

    await page.getByRole('button', { name: /next page|next/i }).click();
    await expect(page.getByText('Page 2 of 2')).toBeVisible();
    await expect(region(page).locator('li')).toHaveCount(3);
    const page2Present = new Set<string>();
    for (const name of PEOPLE_NAMES) {
      const count = await region(page).getByRole('link', { name, exact: true }).count();
      expect(count, `unexpected link count for "${name}" on page 2`).toBeLessThanOrEqual(1);
      if (count === 1) {
        page2Present.add(name);
      }
    }

    // Every fixture person appears exactly once — on exactly one of the two
    // pages, never both, never neither.
    for (const name of PEOPLE_NAMES) {
      const onPage1 = page1Present.has(name);
      const onPage2 = page2Present.has(name);
      expect(onPage1 !== onPage2, `"${name}" must appear on exactly one page`).toBe(true);
    }
    expect(page1Present.size + page2Present.size).toBe(PEOPLE_NAMES.length);

    await switchType(page, 'Organizations');
    for (const name of ORGANIZATION_NAMES) {
      await expect(region(page).getByRole('link', { name, exact: true })).toHaveCount(1);
    }

    await switchType(page, 'Virtual Contributors');
    for (const name of VIRTUAL_CONTRIBUTOR_NAMES) {
      await expect(region(page).getByRole('link', { name, exact: true })).toHaveCount(1);
    }
  });

  test('AS5 — an existing, never-edited Contributors post already renders enriched cards, and its edit form offers no new switch/option', async ({
    page,
  }) => {
    test.skip(
      ADMIN_PASSWORD === 'change_me',
      'AUTH_ADMIN_PASSWORD/AUTH_TEST_HARNESS_PASSWORD not set for this run.'
    );
    await loginViaCrd(page, ADMIN_EMAIL, ADMIN_PASSWORD, BASE_URL);
    await gotoCommunity(page, spaceNameId);

    // Enriched without ever having been edited.
    await expect(tagsOf(page, ADA_NAME)).toHaveCount(2);
    await expect(locationOf(page, ADA_NAME)).toHaveText('Barcelona, ES');

    await page.getByRole('link', { name: `Open ${CALLOUT_DISPLAY_NAME}` }).click({ timeout: 10000 });
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible({ timeout: 10000 });
    await dialog.getByRole('button', { name: 'settings' }).click();
    await page.getByRole('menuitem', { name: /edit/i }).click();
    const framingContributorsOption = page.getByRole('radio', { name: 'Contributors', exact: true });
    await expect(framingContributorsOption).toBeVisible({ timeout: 10000 });

    // No new card-related switch or option was added by this feature.
    const formText = (await page.getByRole('dialog').textContent()) ?? '';
    expect(formText).not.toMatch(/expanded/i);
    const switches = page.getByRole('switch');
    const switchLabels = await switches.evaluateAll(els =>
      els.map(el => el.getAttribute('aria-label') ?? el.textContent)
    );
    // "Manual selection" is feature 025's pre-existing switch — the only one.
    expect(switchLabels).toEqual(['Manual selection']);
  });

  test('AS6 — cross-post cache isolation: parent, then subspace, then back to parent (no reload) — Ada reads "Member" in the parent and "Lead" in the subspace, every time', async ({
    page,
  }) => {
    await gotoCommunity(page, spaceNameId);

    // A window-scoped marker that only a full document (re)load would clear —
    // the deterministic proof every navigation below is client-side (React
    // Router), never a hard reload (see the breadcrumb-link caveat below).
    await page.evaluate(() => {
      (window as unknown as Record<string, unknown>).__us2as6NoReloadMarker = 'us2-as6';
    });

    // Role label only — the join-month text is User Story 4's (G-1
    // removable); US4-AS3 already covers its cross-post cache isolation
    // without a date literal, so this story's own AS6 checks only the value
    // it actually owns: the role label per post.
    await expect(cardFor(page, ADA_NAME)).toContainText(`${ADA_NAME}Member`);

    // SPA navigation into the subspace: Subspaces tab -> the subspace card.
    // The card link carries no accessible name of its own (the heading
    // inside it is not exposed as the link's name) — matched by `hasText` on
    // the containing link, mirroring us4-joined-this-space.spec.ts's
    // identical workaround.
    await page.getByRole('tab', { name: 'Subspaces', exact: true }).click();
    const subspaceCard = page.locator('a').filter({ hasText: SUBSPACE_DISPLAY_NAME }).first();
    await expect(subspaceCard).toBeVisible({ timeout: 15000 });
    await subspaceCard.click();
    await expect(region(page)).toBeVisible({ timeout: 20000 });
    await expect(page.getByRole('heading', { name: 'Oops!' })).toHaveCount(0);

    await expect(cardFor(page, ADA_NAME)).toContainText(`${ADA_NAME}Lead`);

    // Back to the parent, then its Community tab. Deliberately the browser
    // Back action, not the breadcrumb link: verified live that the
    // breadcrumb ("Cards Space") performs a full document reload (a second
    // "[vite] connecting..." + a page "load" event) rather than a
    // client-side transition — which would trivially "pass" this scenario
    // for the wrong reason, since a fresh load re-fetches everything and can
    // never exhibit a cross-post cache-identity leak. Browser Back is a real,
    // reachable "return to the parent" path that stays client-side, so it is
    // the one that actually exercises the fix. No `page.goto` anywhere below.
    await page.goBack();
    const communityTab = page.getByRole('tab', { name: 'Community', exact: true });
    await communityTab.waitFor({ state: 'visible', timeout: 10000 });
    await communityTab.click();

    await expect(cardFor(page, ADA_NAME)).toContainText(`${ADA_NAME}Member`, { timeout: 15000 });

    const marker = await page.evaluate(
      () => (window as unknown as Record<string, unknown>).__us2as6NoReloadMarker
    );
    expect(marker).toBe('us2-as6');
  });
});
