// @forge-acceptance
//
// User Story 1 — Recognise a contributor from the card
// (priority P1).
//
// Spec: the workspace feature spec (AS1..AS8)
// Contract: the workspace feature's contracts/crd-contributor-card.md
//
// Walks the feature's documented "Cards" fixture
// (the workspace feature's quickstart.md §2) on the
// Cards Space's default Contributors post: tagline (+ the user-only italic
// fallback), the first-two tag pills (skills-then-keywords for users,
// keywords-then-capabilities for organisations — never mixed, never "+N"),
// the location row, the organisation associates / user joined-space bottom
// line, equal card heights across breakpoints, truncation at 1440/390px, and
// parity between the feed and the callout's detail-dialog + map "No location
// data" list.
//
// Precondition: the "Cards" fixture exists (quickstart.md §2 — created once,
// out of band, via the documented API/GraphiQL steps; not (re)created here).
// `beforeAll` resolves the space by its exact profile display name so the
// walk does not depend on a hardcoded nameID.
//
// Locator note: `ContributorsCalloutPage.collection().cardFor` (and the row
// helpers built on it — taglineOf/tagsOf/locationOf/bottomLineOf) use
// `.filter({ has: region.getByRole(...) })`, where the `has:` locator is
// anchored to the SAME `region` locator as the outer locator being filtered.
// Verified against the live stack (both via a standalone script and via this
// runner): that construction always resolves to zero elements, even though
// the identical query anchored at `page` (or a plain `hasText` filter)
// resolves correctly. This file works around the defect locally with a
// `hasText`-scoped card locator rather than reusing the broken page-object
// helpers; see the US1 evidence ledger for the two-line repro. Filed as a
// test-suites defect (page-object locator only — product behaviour is
// unaffected).

import { test, expect, type Page, type Locator } from '@playwright/test';

const BASE_URL = process.env.ALKEMIO_BASE_URL || 'http://localhost:3000';
const SPACE_DISPLAY_NAME = 'Cards Space';
const CALLOUT_DISPLAY_NAME = 'Contributors';

let spaceNameId: string;

/** Resolves the Cards Space's nameID via the public schema, by exact profile
 * display name — the fixture's nameID is not pinned by quickstart.md. */
async function resolveCardsSpaceNameId(): Promise<string> {
  const query = 'query { spaces(filter: { visibilities: [ACTIVE] }) { nameID about { profile { displayName } } } }';
  const res = await fetch(`${BASE_URL}/graphql`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  });
  const json = await res.json();
  const match = (json.data?.spaces ?? []).find(
    (s: { about: { profile: { displayName: string } } }) =>
      s.about.profile.displayName === SPACE_DISPLAY_NAME
  );
  if (!match) {
    throw new Error(
      `Fixture precondition failed: no space with profile.displayName === "${SPACE_DISPLAY_NAME}" ` +
        "(the workspace feature's quickstart.md §2 — seed the Cards fixture first)."
    );
  }
  return match.nameID;
}

// ---- locators (scoped to the Contributors post's `region`, `hasText`-based
// — see the file-header note on the broken `has:`-filter page-object helpers) ----

function region(page: Page): Locator {
  return page.getByRole('region', { name: 'Contributors', exact: true });
}
/** The `<li>` card for a contributor, matched by its exact visible name. Note
 * `hasText` is a substring match, so callers pass full display names that are
 * not substrings of one another within this fixture (verified: Ada Ardent,
 * Ben Barlow, Cy Cyphers, Dee Delacroix, admin alkemio, Green Future Labs,
 * Solo Org, Capable Org, Bare Org, Helper VC, Quiet VC — none is a substring
 * of another). */
function cardFor(page: Page, name: string): Locator {
  return region(page)
    .locator('li')
    .filter({ hasText: name });
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
async function switchType(
  page: Page,
  type: 'People' | 'Organizations' | 'Virtual Contributors'
) {
  const tab = page.getByRole('tab', { name: new RegExp(`^${type}\\s*\\d`) });
  await tab.click();
  await expect(tab).toHaveAttribute('aria-selected', 'true');
}
/** Two animation frames — deterministic settle for a CSS reflow (viewport
 * resize / grid re-layout), never a blind sleep. */
async function settleLayout(page: Page) {
  await page.evaluate(
    () =>
      new Promise<void>(resolve =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
      )
  );
}

test.describe.serial('US1 — Recognise a contributor from the card', () => {
  test.beforeAll(async () => {
    spaceNameId = await resolveCardsSpaceNameId();
  });

  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/${spaceNameId}/community`);
    const accept = page.getByRole('button', { name: /accept all cookies/i });
    if (await accept.isVisible({ timeout: 2000 }).catch(() => false)) {
      await accept.click();
    }
    await expect(region(page).first()).toBeVisible({ timeout: 20000 });
    await expect(page.getByRole('heading', { name: 'Oops!' })).toHaveCount(0);
  });

  test('US1-AS1 — Ada: two-line tagline, exactly two skill pills, one location row', async ({
    page,
  }) => {
    const card = cardFor(page, 'Ada Ardent');
    await expect(card).toBeVisible();

    const tagline = taglineOf(page, 'Ada Ardent');
    const lineHeight = await tagline.evaluate(el => parseFloat(getComputedStyle(el).lineHeight));
    const box = await tagline.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.height).toBeLessThanOrEqual(lineHeight * 2 + 2);

    const tags = tagsOf(page, 'Ada Ardent');
    await expect(tags).toHaveCount(2);
    await expect(tags.nth(0)).toHaveText('Urban Planning');
    await expect(tags.nth(1)).toHaveText('Sustainability');
    await expect(card).not.toContainText(/\+\d/);

    const location = locationOf(page, 'Ada Ardent');
    await expect(location).toHaveText('Barcelona, ES');
    await expect(location.locator('.lucide-map-pin')).toHaveCount(1);
  });

  test('US1-AS2 — Cy gets the italic fallback and no rows; Bare Org / Quiet VC get no row at all', async ({
    page,
  }) => {
    await expect(taglineOf(page, 'Cy Cyphers')).toHaveText(
      'User has not filled in their tagline.'
    );
    await expect(taglineOf(page, 'Cy Cyphers')).toHaveCSS('font-style', 'italic');
    await expect(tagsOf(page, 'Cy Cyphers')).toHaveCount(0);
    await expect(locationOf(page, 'Cy Cyphers')).toHaveCount(0);

    await switchType(page, 'Organizations');
    await expect(cardFor(page, 'Bare Org')).toBeVisible();
    await expect(taglineOf(page, 'Bare Org')).toHaveCount(0);

    await switchType(page, 'Virtual Contributors');
    await expect(cardFor(page, 'Quiet VC')).toBeVisible();
    await expect(taglineOf(page, 'Quiet VC')).toHaveCount(0);
  });

  test('US1-AS3 — one tag list per card, never mixed: skills win over keywords for Ada, keywords used for Ben, capabilities for Capable Org', async ({
    page,
  }) => {
    const benTags = tagsOf(page, 'Ben Barlow');
    await expect(benTags).toHaveCount(2);
    await expect(benTags.nth(0)).toHaveText('Policy');
    await expect(benTags.nth(1)).toHaveText('Energy');

    await switchType(page, 'Organizations');
    const capableTags = tagsOf(page, 'Capable Org');
    await expect(capableTags).toHaveCount(1);
    await expect(capableTags.nth(0)).toHaveText('Funding');

    await switchType(page, 'People');
    const adaTags = tagsOf(page, 'Ada Ardent');
    await expect(adaTags).toHaveCount(2);
    await expect(adaTags.nth(0)).toHaveText('Urban Planning');
    await expect(adaTags.nth(1)).toHaveText('Sustainability');
  });

  test('US1-AS4 — Green Future Labs: rounded-square avatar, tagline, two tags, location, associates count matches its own profile; Solo Org reads singular', async ({
    page,
    context,
  }) => {
    await switchType(page, 'Organizations');
    const card = cardFor(page, 'Green Future Labs');
    await expect(card).toBeVisible();
    await expect(card.locator('[class*="rounded-md"]').first()).toBeVisible();
    await expect(taglineOf(page, 'Green Future Labs')).not.toHaveCount(0);
    const tags = tagsOf(page, 'Green Future Labs');
    await expect(tags).toHaveCount(2);
    await expect(locationOf(page, 'Green Future Labs')).toHaveText('Rotterdam, NL');
    await expect(bottomLineOf(page, 'Green Future Labs')).toHaveText(
      '3 associates in this organization'
    );
    await expect(bottomLineOf(page, 'Green Future Labs').locator('.lucide-users')).toHaveCount(1);

    await expect(bottomLineOf(page, 'Solo Org')).toHaveText('1 associate in this organization');

    // The same count as Green Future Labs' own profile page.
    const link = region(page).getByRole('link', { name: 'Green Future Labs', exact: true });
    const href = await link.getAttribute('href');
    expect(href).toBeTruthy();
    const profilePage = await context.newPage();
    await profilePage.goto(href!.startsWith('http') ? href! : `${BASE_URL}${href}`);
    await expect(profilePage.getByRole('heading', { name: /^\d+ associates?$/ })).toHaveText(
      '3 associates'
    );
    await profilePage.close();
  });

  test('US1-AS5 — Helper VC shows tagline and tags, no location row and no bottom line', async ({
    page,
  }) => {
    await switchType(page, 'Virtual Contributors');
    const card = cardFor(page, 'Helper VC');
    await expect(card).toBeVisible();
    await expect(taglineOf(page, 'Helper VC')).not.toHaveCount(0);
    await expect(tagsOf(page, 'Helper VC')).not.toHaveCount(0);
    await expect(locationOf(page, 'Helper VC')).toHaveCount(0);
    await expect(bottomLineOf(page, 'Helper VC')).toHaveCount(0);
  });

  test('US1-AS6 — equal card heights and bottom-line offsets at 1440/768/390px; no horizontal scroll', async ({
    page,
  }) => {
    for (const width of [1440, 768, 390] as const) {
      await page.setViewportSize({ width, height: 900 });
      await settleLayout(page);

      const boxes = await region(page)
        .locator('li')
        .evaluateAll(items =>
          items.map(el => {
            const r = el.getBoundingClientRect();
            const bottomLine = el.querySelector('.mt-auto');
            const blRect = bottomLine?.getBoundingClientRect();
            return { height: r.height, bottomGap: blRect ? r.bottom - blRect.bottom : null };
          })
        );
      const heights = boxes.map(b => b.height);
      expect(Math.max(...heights) - Math.min(...heights)).toBeLessThanOrEqual(1);

      const gaps = boxes.map(b => b.bottomGap).filter((g): g is number => g !== null);
      if (gaps.length > 1) {
        expect(Math.max(...gaps) - Math.min(...gaps)).toBeLessThanOrEqual(1);
      }

      const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
      const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
      expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1);
    }
  });

  test('US1-AS7 — Dee: 300-char tagline stops at two lines; a 60-char unbroken tag stays on one line and is cut with a full-text tooltip; no horizontal scroll (1440 + 390px)', async ({
    page,
  }) => {
    for (const width of [1440, 390] as const) {
      await page.setViewportSize({ width, height: 900 });
      await settleLayout(page);

      const card = cardFor(page, 'Dee Delacroix');
      await expect(card).toBeVisible();

      const tagline = taglineOf(page, 'Dee Delacroix');
      const lineHeight = await tagline.evaluate(el =>
        parseFloat(getComputedStyle(el).lineHeight)
      );
      const tlBox = await tagline.boundingBox();
      expect(tlBox).not.toBeNull();
      expect(tlBox!.height).toBeLessThanOrEqual(lineHeight * 2 + 2);

      const firstPill = tagsOf(page, 'Dee Delacroix').first();
      const title = await firstPill.getAttribute('title');
      expect(title).toHaveLength(60);
      const pillBox = await firstPill.boundingBox();
      const rowHeight = await firstPill
        .locator('xpath=..')
        .evaluate(el => el.getBoundingClientRect().height);
      // The pill row stays a single line: its height is no taller than one pill.
      expect(rowHeight).toBeLessThanOrEqual((pillBox?.height ?? 0) + 4);

      const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
      const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
      expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1);
    }
  });

  test('US1-AS8 — the detail dialog and its Map view carry the same rows and controls as the feed', async ({
    page,
  }) => {
    await page
      .getByRole('link', { name: new RegExp(`^Open ${CALLOUT_DISPLAY_NAME}$`) })
      .first()
      .click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    const dialogRegion = dialog.getByRole('region', { name: 'Contributors', exact: true });
    await expect(dialogRegion).toBeVisible();

    const dialogAdaCard = dialogRegion.locator('li').filter({ hasText: 'Ada Ardent' });
    await expect(dialogAdaCard).toBeVisible();
    await expect(dialogAdaCard.locator('.line-clamp-2')).not.toHaveCount(0);
    await expect(
      dialog.getByRole('button', { name: /^Actions for Ada Ardent/ })
    ).toBeVisible();

    const mapButton = dialog.getByRole('button', { name: 'Map', exact: true });
    await mapButton.click();
    const noLocationHeading = dialog.getByRole('heading', { name: 'No location data' });
    await expect(noLocationHeading).toBeVisible();

    // Every fixture user in this run lacks geocoded coordinates (a textual
    // city/country was never geocoded), so the whole People set — including
    // Cy, who has no rows at all — lists under "No location data" with the
    // same card markup as the feed.
    const cyInMap = dialogRegion.locator('li').filter({ hasText: 'Cy Cyphers' });
    await expect(cyInMap).toBeVisible();
  });
});
