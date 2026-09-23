// @forge-acceptance
//
// User Story 4 — See when a person joined this space
// (priority P2).
//
// Spec: the workspace feature spec (AS1..AS5)
// Contract: the workspace feature's contracts/crd-contributor-card.md
//
// Walks the feature's documented "Cards" fixture
// (the workspace feature's quickstart.md §2) on the
// Cards Space's default Contributors post plus its "Cards Subspace" child
// (quickstart.md §2 table row 2): the "Joined this space <month year>" bottom
// line (no icon, UTC month-anchored — D-UTC / risk R-4), timezone
// invariance, the per-post cache-identity fix (D-CACHE — a person's month
// must never leak from one post's cache entry into another's, risk R-15),
// the render-time language decoration (D-RENDER), and the absence of
// any join line — and a null `joinedDate` — for organisation and virtual
// contributor cards.
//
// Precondition: the "Cards" fixture exists, INCLUDING "Cards Subspace" with
// its own Contributors post carrying Ada as a member/lead (quickstart.md §2
// row 2), and Ada's Cards Space membership already backdated across a month
// boundary per quickstart.md §2's own SQL steps (a)/(b) — provisioned once,
// out of band, never by this file. This file holds NO SQL and no direct
// database access: every expected label is derived from the API's own
// `joinedDate` on the parent callout's USER contributors (month-precision
// UTC — the contract's D-UTC rule: naive local-time formatting of a
// near-month-boundary instant would read as the next month to a viewer east
// of UTC, which is exactly what AS2 below guards against), so this walk
// never depends on a wall-clock date literal. The one-time backdating and
// the earliest-wins/duplicate-row proof (D-MIN) live in
// `forge.verification` → `gql-live`, not here. `beforeAll` resolves both
// spaces by their exact profile display name — the fixture's nameIDs are
// not pinned by quickstart.md.
//
// Anonymous throughout — deliberately. AS1 says "any viewer", and the
// spec's Edge Cases record that anonymous visitors of a public space see
// join months (the same audience that already sees names/avatars/locations
// there). Using no session avoids depending on any persona's credentials.

import { test, expect, type Page, type Locator } from '@playwright/test';

const BASE_URL = process.env.ALKEMIO_BASE_URL || 'http://localhost:3000';
const SPACE_DISPLAY_NAME = 'Cards Space';
const SUBSPACE_DISPLAY_NAME = 'Cards Subspace';
const CALLOUT_DISPLAY_NAME = 'Contributors';
const ADA_NAME = 'Ada Ardent';

let spaceId: string;
let spaceNameId: string;
let parentCalloutId: string;
let subspaceCalloutId: string;
// Derived in beforeAll from the API's joinedDate for Ada on the PARENT
// callout — never a literal (see the file-header note).
let expectedParentMonthLabel: string;

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

type ContributorsCalloutSummary = {
  id: string;
  framing: { type: string; profile: { displayName: string } };
};

/** The CONTRIBUTORS callout titled exactly "Contributors" on a given space —
 * the same disambiguation US1's header note documents (quickstart.md §2 also
 * seeds a distinctly-titled "People only" probe callout on Cards Space). */
async function resolveContributorsCalloutId(spaceIdForCallouts: string): Promise<string> {
  const data = await gql<{
    lookup: { space: { collaboration: { calloutsSet: { callouts: ContributorsCalloutSummary[] } } } };
  }>(
    `query($id: UUID!) {
      lookup {
        space(ID: $id) {
          collaboration { calloutsSet { callouts { id framing { type profile { displayName } } } } }
        }
      }
    }`,
    { id: spaceIdForCallouts }
  );
  const callout = data.lookup.space.collaboration.calloutsSet.callouts.find(
    c => c.framing.type === 'CONTRIBUTORS' && c.framing.profile.displayName === CALLOUT_DISPLAY_NAME
  );
  if (!callout) {
    throw new Error(
      `Fixture precondition failed: no CONTRIBUTORS callout titled "${CALLOUT_DISPLAY_NAME}" on space ${spaceIdForCallouts} ` +
        '(agents-hq/specs/077-richer-contributor-cards/quickstart.md §2).'
    );
  }
  return callout.id;
}

/** Resolves the "Cards" fixture's parent space, its "Cards Subspace" child,
 * and both spaces' "Contributors" callout ids, by exact profile display name
 * (never a hardcoded nameID — quickstart.md does not pin one). */
async function resolveCardsFixture(): Promise<void> {
  const spacesData = await gql<{
    spaces: { id: string; nameID: string; about: { profile: { displayName: string } } }[];
  }>('query { spaces(filter: { visibilities: [ACTIVE] }) { id nameID about { profile { displayName } } } }', {});
  const space = spacesData.spaces.find(s => s.about.profile.displayName === SPACE_DISPLAY_NAME);
  if (!space) {
    throw new Error(
      `Fixture precondition failed: no space with profile.displayName === "${SPACE_DISPLAY_NAME}" ` +
        '(agents-hq/specs/077-richer-contributor-cards/quickstart.md §2 — seed the "Cards" fixture first).'
    );
  }
  spaceId = space.id;
  spaceNameId = space.nameID;

  const subspacesData = await gql<{
    lookup: {
      space: {
        subspaces: { id: string; nameID: string; about: { profile: { displayName: string } } }[];
      };
    };
  }>(
    `query($id: UUID!) {
      lookup { space(ID: $id) { subspaces { id nameID about { profile { displayName } } } } }
    }`,
    { id: spaceId }
  );
  const subspace = subspacesData.lookup.space.subspaces.find(
    s => s.about.profile.displayName === SUBSPACE_DISPLAY_NAME
  );
  if (!subspace) {
    throw new Error(
      `Fixture precondition failed: no subspace with profile.displayName === "${SUBSPACE_DISPLAY_NAME}" ` +
        `under "${SPACE_DISPLAY_NAME}" (agents-hq/specs/077-richer-contributor-cards/quickstart.md §2 row 2 — ` +
        'add it with a "Contributors" callout carrying Ada as a member).'
    );
  }

  parentCalloutId = await resolveContributorsCalloutId(spaceId);
  subspaceCalloutId = await resolveContributorsCalloutId(subspace.id);
}

/** A USER contributor's `joinedDate` (month-precision UTC, per the API
 * contract) off a given Contributors callout's contributors(USER) list,
 * resolved by display name — never guessed from an email, since the fixture
 * may hold more than one "Ada"-named identity across repeated runs. Also
 * doubles as the "is this person actually a member of this post's space"
 * precondition check (used against the subspace callout below, so a missing
 * fixture fails with a clear message instead of a UI timeout). */
async function resolveContributorJoinedDate(calloutId: string, displayName: string): Promise<string> {
  const data = await gql<{
    lookup: { callout: { framing: { contributors: { displayName: string; joinedDate: string | null }[] } } };
  }>(
    `query($id: UUID!, $type: ActorType!) {
      lookup { callout(ID: $id) { framing { contributors(type: $type) { displayName joinedDate } } } }
    }`,
    { id: calloutId, type: 'USER' }
  );
  const match = data.lookup.callout.framing.contributors.find(c => c.displayName === displayName);
  if (!match) {
    throw new Error(
      `Fixture precondition failed: no USER contributor named "${displayName}" on Contributors callout ${calloutId}.`
    );
  }
  if (!match.joinedDate) {
    throw new Error(
      `Fixture precondition failed: "${displayName}"'s joinedDate is null on Contributors callout ${calloutId} — ` +
        'is she really a member of this space?'
    );
  }
  return match.joinedDate;
}

/** Formats an ISO `joinedDate` as the UI's "<Mon> <yyyy>" bottom-line label,
 * from its UTC year/month — the API's own value, never the wall clock and
 * never a hardcoded literal. */
function monthYearLabel(isoDate: string): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(isoDate));
}

// ---- locators (scoped to the Contributors post's `region`, `hasText`-based
// — mirrors us1-card-content.spec.ts's workaround for the page-object's
// broken `has:`-filter helpers) ----

function region(page: Page): Locator {
  return page.getByRole('region', { name: 'Contributors', exact: true });
}
function cardFor(page: Page, name: string): Locator {
  return region(page).locator('li').filter({ hasText: name });
}
function bottomLineOf(page: Page, name: string): Locator {
  return cardFor(page, name).locator('.mt-auto');
}
async function switchType(
  page: Page,
  type: 'People' | 'Organizations' | 'Virtual Contributors'
) {
  const tab = page.getByRole('tab', { name: new RegExp(`^${type}\\s*\\d`) });
  await tab.click();
  await expect(tab).toHaveAttribute('aria-selected', 'true');
}
async function dismissCookieBanner(page: Page) {
  const accept = page.getByRole('button', { name: /accept all cookies/i });
  if (await accept.isVisible({ timeout: 2000 }).catch(() => false)) {
    await accept.click();
  }
}
async function gotoParentCommunity(page: Page) {
  await page.goto(`${BASE_URL}/${spaceNameId}/community`);
  await dismissCookieBanner(page);
  await expect(region(page).first()).toBeVisible({ timeout: 20000 });
  await expect(page.getByRole('heading', { name: 'Oops!' })).toHaveCount(0);
}

test.describe.serial('US4 — See when a person joined this space', () => {
  test.beforeAll(async () => {
    await resolveCardsFixture();
    const parentJoinedDate = await resolveContributorJoinedDate(parentCalloutId, ADA_NAME);
    expectedParentMonthLabel = monthYearLabel(parentJoinedDate);
    // Precondition check: Ada is also a USER contributor on the subspace's
    // Contributors callout — fail fast here with a clear message rather than
    // a UI timeout deep inside AS3.
    await resolveContributorJoinedDate(subspaceCalloutId, ADA_NAME);
  });

  test.beforeEach(async ({ page }) => {
    await gotoParentCommunity(page);
  });

  test('US4-AS1 — Ada\'s bottom line reads exactly "Joined this space <the API\'s month>", with no icon', async ({
    page,
  }) => {
    const bottomLine = bottomLineOf(page, ADA_NAME);
    await expect(bottomLine).toHaveText(`Joined this space ${expectedParentMonthLabel}`);
    await expect(bottomLine.locator('svg')).toHaveCount(0);
  });

  test('US4-AS2 — both a UTC-8 and a UTC+14 device read the same month as the API, never a neighbouring one (R-4)', async ({
    browser,
  }) => {
    for (const timezoneId of ['America/Los_Angeles', 'Pacific/Kiritimati']) {
      const context = await browser.newContext({ timezoneId });
      const page = await context.newPage();
      await gotoParentCommunity(page);
      const bottomLine = bottomLineOf(page, ADA_NAME);
      await expect(bottomLine).toHaveText(`Joined this space ${expectedParentMonthLabel}`);
      await context.close();
    }
  });

  test('US4-AS3 — parent, then subspace, then back to parent (no reload): Ada reads the parent\'s month in the parent and a different month in the subspace, every time (D-CACHE / R-15)', async ({
    page,
  }) => {
    // A window-scoped marker that only a full document (re)load would clear —
    // the deterministic proof that every navigation below is client-side
    // (React Router), never a hard reload, so this exercises the Apollo cache
    // identity fix rather than three independently-fetched pages.
    await page.evaluate(() => {
      (window as unknown as Record<string, unknown>).__us4NoReloadMarker = 'us4-as3';
    });

    // Step 1 — parent (first visit, already navigated in this walk's own goto above).
    await expect(bottomLineOf(page, ADA_NAME)).toHaveText(
      `Joined this space ${expectedParentMonthLabel}`
    );

    // Step 2 — SPA navigation into the subspace: Subspaces tab -> the subspace card.
    // The subspace grid's card link carries no accessible name of its own
    // (the heading inside it is not exposed as the link's name — a locator
    // matched on the containing link's text content instead, `hasText`,
    // mirrors us1-card-content.spec.ts's workaround for the same class of
    // unnamed-link markup).
    await page.getByRole('tab', { name: 'Subspaces', exact: true }).click();
    const subspaceCard = page.locator('a').filter({ hasText: SUBSPACE_DISPLAY_NAME }).first();
    await expect(subspaceCard).toBeVisible({ timeout: 15000 });
    await subspaceCard.click();
    await expect(region(page).first()).toBeVisible({ timeout: 20000 });
    await expect(page.getByRole('heading', { name: 'Oops!' })).toHaveCount(0);

    const subspaceBottomLine = bottomLineOf(page, ADA_NAME);
    await expect(subspaceBottomLine).toBeVisible();
    const subspaceText = await subspaceBottomLine.textContent();
    expect(subspaceText).toMatch(/^Joined this space [A-Z][a-z]{2} \d{4}$/);
    // The whole point of D-CACHE: the subspace's month must never equal the
    // parent's — a shared cache entry keyed by contributor id alone (rather
    // than post + contributor) would otherwise show the same value in both.
    expect(subspaceText).not.toBe(`Joined this space ${expectedParentMonthLabel}`);

    // Step 3 — back to the parent, then its Community tab. Deliberately the
    // browser Back action, not the breadcrumb link: verified live that the
    // breadcrumb ("Cards Space", `href="http://localhost:3000/cardsspace"`,
    // no client-side click interception) performs a full document reload —
    // which would trivially "pass" this scenario for the wrong reason, since
    // a fresh page load re-fetches everything and can never exhibit the
    // cross-post cache-identity bug D-CACHE fixes. Back navigation is a real,
    // reachable "return to the parent" path (any viewer's browser back
    // button) that stays client-side, so it is the one that actually
    // exercises the fix. No `page.goto` anywhere in this test.
    await page.goBack();
    const communityTab = page.getByRole('tab', { name: 'Community', exact: true });
    await communityTab.waitFor({ state: 'visible', timeout: 10000 });
    await communityTab.click();
    await expect(bottomLineOf(page, ADA_NAME)).toHaveText(
      `Joined this space ${expectedParentMonthLabel}`,
      { timeout: 15000 }
    );

    // No full document reload occurred anywhere in this walk.
    const marker = await page.evaluate(
      () => (window as unknown as Record<string, unknown>).__us4NoReloadMarker
    );
    expect(marker).toBe('us4-as3');
  });

  test('US4-AS4 — Dutch renders a Dutch month abbreviation with "Space" kept in English; switching back to English (no reload) updates every card', async ({
    page,
  }) => {
    await page.evaluate(() => {
      (window as unknown as Record<string, unknown>).__us4NoReloadMarker = 'us4-as4';
    });

    await page.getByRole('button', { name: 'English' }).click();
    await page.getByRole('menuitem', { name: 'Nederlands' }).click();
    await expect(bottomLineOf(page, ADA_NAME)).toHaveText(/^Lid geworden van deze Space [a-z]{3}\.? \d{4}$/, {
      timeout: 10000,
    });
    // The platform term "Space" stays in English inside the Dutch sentence.
    await expect(bottomLineOf(page, ADA_NAME)).toContainText('Space');

    await page.getByRole('button', { name: 'Nederlands' }).click();
    await page.getByRole('menuitem', { name: 'English' }).click();
    await expect(bottomLineOf(page, ADA_NAME)).toHaveText(
      `Joined this space ${expectedParentMonthLabel}`,
      { timeout: 10000 }
    );
    // Every already-loaded People card re-labels too, not just Ada's.
    const allBottomLines = region(page).locator('li').locator('.mt-auto');
    const texts = await allBottomLines.allTextContents();
    for (const text of texts) {
      expect(text).toMatch(/^Joined this space [A-Z][a-z]{2} \d{4}$/);
    }

    const marker = await page.evaluate(
      () => (window as unknown as Record<string, unknown>).__us4NoReloadMarker
    );
    expect(marker).toBe('us4-as4');
  });

  test('US4-AS5 — organisation and virtual contributor cards never carry a "Joined this space" line, and their joinedDate is null for every item', async ({
    page,
  }) => {
    await switchType(page, 'Organizations');
    const orgBottomLines = region(page).locator('li').locator('.mt-auto');
    const orgTexts = await orgBottomLines.allTextContents();
    for (const text of orgTexts) {
      expect(text).not.toMatch(/Joined this space/);
    }

    await switchType(page, 'Virtual Contributors');
    await expect(region(page).getByText(/Joined this space/)).toHaveCount(0);

    // API half of the same acceptance criterion: every ORGANIZATION and
    // VIRTUAL_CONTRIBUTOR item's joinedDate is null, not merely hidden by
    // the card.
    const joinedDatesFor = async (type: 'ORGANIZATION' | 'VIRTUAL_CONTRIBUTOR') => {
      const result = await gql<{
        lookup: { callout: { framing: { contributors: { joinedDate: string | null }[] } } };
      }>(
        `query($id: UUID!, $type: ActorType!) {
          lookup { callout(ID: $id) { framing { contributors(type: $type) { joinedDate } } } }
        }`,
        { id: parentCalloutId, type }
      );
      return result.lookup.callout.framing.contributors;
    };

    const orgItems = await joinedDatesFor('ORGANIZATION');
    expect(orgItems.length).toBeGreaterThan(0);
    for (const item of orgItems) {
      expect(item.joinedDate).toBeNull();
    }

    const vcItems = await joinedDatesFor('VIRTUAL_CONTRIBUTOR');
    expect(vcItems.length).toBeGreaterThan(0);
    for (const item of vcItems) {
      expect(item.joinedDate).toBeNull();
    }
  });
});
