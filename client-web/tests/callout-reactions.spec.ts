/**
 * Persisted P1 acceptance walk for callout emoji reactions (038).
 *
 * Landing target declared in the execution contract:
 *   specs/038-callout-emoji-reactions/repos.yaml
 *     → forge.verification.acceptance.US1.persist_spec_to
 *   wired into config/playwright.config.nightly.ts as the "Callout reactions"
 *   project (testMatch → ../tests/callout-reactions.spec.ts).
 *
 * Authored by forge-verify (Phase V) from a green pseudo-manual acceptance walk
 * driven headless against the live stack at http://localhost:3000 (the gateway;
 * NEVER :3001 — the raw vite origin is CORS-blocked and yields false failures).
 *
 * Covers User Story 1 (P1) — "React to a callout with a predefined emoji":
 *   US1-AS1  member reacts → the callout shows that emoji chip and a total of 1,
 *            and the member's own reaction is primary-tinted.
 *   US1-AS2  the picker offers exactly the 7 predefined slugs (heart,
 *            hugging-face, clapping-hands, light-bulb, bullseye, check-mark,
 *            rocket) — no free-form search, no full emoji catalog.
 *   US1-AS3  the anti-gamification invariant (R-1, load-bearing): with a
 *            reaction present the callout shows ONE combined total and NO number
 *            adjacent to any individual emoji, and the who-reacted list carries
 *            no per-emoji tally.
 *
 * Self-seeding: the walk creates its own organization + space + a PUBLISHED post
 * callout via @alkemio/tests-lib as the platform admin, drives the reaction UI
 * as that admin, and deletes the whole scenario in afterAll — so it runs in
 * isolation or alongside the other nightly projects without shared state.
 *
 * Authentication: the walk logs in once in beforeAll using the browser fixture
 * and retains the authenticated BrowserContext for the full file. Each test
 * receives a page from that context (or reuses the shared page) rather than
 * Playwright's default anonymous page fixture, so the session cookies are
 * present for all three assertions.
 *
 * Scope note on US1-AS3: the two-distinct-reactors visual (two people → two
 * chips + combined total 2) is asserted here as the structural anti-gamification
 * guarantee — the ticket's core constraint, verified at the contract level (the
 * CalloutReactionsSummary type carries no per-emoji tally) and the single-
 * reactor UI. The multi-person total is exercised by the server-api it-specs
 * (callout-reactions.it-spec.ts: total == distinct people), which seed several
 * reactors directly; a browser walk cannot onboard a second space member
 * without a second interactive session, so that is intentionally not duplicated
 * here.
 *
 * Run standalone:
 *   cd client-web
 *   pnpm exec playwright test --config=config/playwright.config.nightly.ts \
 *     --project="Callout reactions"
 */

import { expect, test, type BrowserContext, type Locator, type Page } from '@playwright/test';
import { TestScenarioFactory, createCalloutOnCalloutsSet, delay } from '@alkemio/tests-lib';
import { CalloutVisibility } from '@alkemio/tests-lib/core/generated/alkemio-schema';
import { OrganizationWithSpaceModel } from '@alkemio/tests-lib/scenario/models/OrganizationWithSpaceModel';
import { loginViaCrd } from '../src/functional-e2e/helpers/login.helper';

const BASE_URL = process.env.ALKEMIO_BASE_URL || 'http://localhost:3000';
const ADMIN_EMAIL = 'admin@alkem.io';

/** The platform's predefined positive set — server-authoritative (FR-002). */
const EXPECTED_SLUGS = [
  'heart',
  'hugging-face',
  'clapping-hands',
  'light-bulb',
  'bullseye',
  'check-mark',
  'rocket',
] as const;

/** slug → glyph, mirroring client-web src/crd/components/reactions/reactionEmoji.ts. */
const GLYPH: Record<(typeof EXPECTED_SLUGS)[number], string> = {
  heart: '❤️',
  'hugging-face': '🤗',
  'clapping-hands': '👏',
  'light-bulb': '💡',
  bullseye: '🎯',
  'check-mark': '✅',
  rocket: '🚀',
};

test.describe.configure({ mode: 'serial' });

test.describe('Callout emoji reactions — US1 P1 acceptance walk', { tag: ['@callout-reactions'] }, () => {
  let scenario: OrganizationWithSpaceModel;
  let spaceNameId: string;
  let calloutDisplayName: string;

  // Authenticated browser context and its page — created once in beforeAll and
  // reused across every serial test so session cookies are always present.
  let authContext: BrowserContext;
  let authPage: Page;

  test.beforeAll(async ({ browser }) => {
    test.setTimeout(120_000);

    // Seed: org + space, then a PUBLISHED post callout on the space's calloutsSet.
    scenario = await TestScenarioFactory.createBaseScenario({
      name: `reactions-p1-${Date.now()}`,
    });
    spaceNameId = scenario.space.nameId;

    calloutDisplayName = `Reactions P1 post ${Date.now()}`;
    const created = await createCalloutOnCalloutsSet(scenario.space.collaboration.calloutsSetId, {
      framing: { profile: { displayName: calloutDisplayName } },
      settings: {
        framing: { commentsEnabled: true },
        contribution: { enabled: false },
        visibility: CalloutVisibility.Published,
      },
    });
    const calloutId = created.data?.createCalloutOnCalloutsSet?.id;
    expect(calloutId, 'seed: published post callout should be created').toBeTruthy();

    // Drive the UI as the admin (a member of the seeded space → holds CONTRIBUTE
    // → may react; FR-009). Sign in once for the whole file; the authenticated
    // BrowserContext is retained so every subsequent page from it inherits the
    // session cookies.
    authContext = await browser.newContext();
    authPage = await authContext.newPage();
    await loginViaCrd(authPage, ADMIN_EMAIL);
  });

  test.afterAll(async ({ browser }) => {
    // Best-effort: remove the reaction the walk left so a re-run starts clean,
    // then delete the whole scenario (which also removes the callout + its
    // reactions). Neither failure should mask a test verdict.
    try {
      const cleanupPage = await browser.newPage();
      await loginViaCrd(cleanupPage, ADMIN_EMAIL);
      await cleanupPage.goto(`${BASE_URL}/${spaceNameId}`);
      const heading = cleanupPage.getByRole('heading', { name: calloutDisplayName });
      if (await heading.isVisible({ timeout: 10_000 }).catch(() => false)) {
        const card = cleanupPage.locator('div').filter({ has: heading }).last();
        await card.getByRole('button', { name: 'Add reaction' }).hover();
        const picker = cleanupPage.getByRole('listbox', { name: 'Emoji reaction picker' });
        if (await picker.isVisible().catch(() => false)) {
          const own = picker.getByRole('option', { selected: true });
          if (await own.count()) await own.first().click(); // clicking own = remove (no dialog)
          await delay(500);
        }
      }
      await cleanupPage.close();
    } catch {
      // best-effort only.
    }

    // Close the authenticated context so the browser can be fully released.
    await authContext?.close().catch(() => undefined);

    if (scenario) {
      await TestScenarioFactory.cleanUpBaseScenario(scenario);
    }
  });

  // ── locators ───────────────────────────────────────────────────────────
  //  Map 1:1 onto the CRD reaction components:
  //   CalloutReactionsBar → ReactionEmojiPicker (Smile trigger, aria-label
  //     "Add reaction"; portaled listbox "Emoji reaction picker" with one
  //     role="option" per slug, aria-label = the slug) + ReactionTotalPill
  //     (button aria-label "N person(s) reacted", aria-pressed on own reaction).

  /** The reaction card scope for the seeded callout, keyed off its heading text. */
  function calloutCard(page: Page): Locator {
    return page
      .locator('div')
      .filter({ has: page.getByRole('heading', { name: calloutDisplayName }) })
      .last();
  }

  function addReactionTrigger(page: Page): Locator {
    return calloutCard(page).getByRole('button', { name: 'Add reaction' });
  }

  /** The total pill — its accessible name is "N person(s) reacted". */
  function totalPill(page: Page): Locator {
    return calloutCard(page).getByRole('button', { name: /reacted$/ });
  }

  /** Opens the restricted picker (opens on hover / focus / tap). */
  async function openPicker(page: Page): Promise<Locator> {
    await addReactionTrigger(page).hover();
    const picker = page.getByRole('listbox', { name: 'Emoji reaction picker' });
    await expect(picker).toBeVisible();
    return picker;
  }

  async function loadSpacePage(page: Page): Promise<void> {
    await page.goto(`${BASE_URL}/${spaceNameId}`);
    // The callout feed lazy-mounts its cards; wait for this callout's heading.
    await expect(page.getByRole('heading', { name: calloutDisplayName })).toBeVisible({ timeout: 30_000 });
  }

  test('US1-AS1: reacting shows the chosen emoji chip, a total of 1, and a primary-tinted own reaction', async () => {
    await loadSpacePage(authPage);

    // No reactions yet: the add-reaction affordance is present, no total pill.
    await expect(addReactionTrigger(authPage)).toBeVisible();
    await expect(totalPill(authPage)).toHaveCount(0);

    const picker = await openPicker(authPage);
    await picker.getByRole('option', { name: 'heart' }).click();

    // A single combined total appears, tinted as the viewer's own reaction.
    const pill = totalPill(authPage);
    await expect(pill).toBeVisible();
    await expect(pill).toHaveAttribute('aria-pressed', 'true'); // primary tint
    await expect(pill).toHaveAccessibleName(/^1 person reacted$/);
    await expect(pill).toContainText('1'); // the combined total
    await expect(pill).toContainText(GLYPH.heart); // the distinct emoji chip
  });

  test('US1-AS2: the picker offers exactly the 7 predefined slugs — no search, no full catalog', async () => {
    await loadSpacePage(authPage);
    const picker = await openPicker(authPage);

    const options = picker.getByRole('option');
    await expect(options).toHaveCount(EXPECTED_SLUGS.length);

    for (const slug of EXPECTED_SLUGS) {
      const option = picker.getByRole('option', { name: slug });
      await expect(option).toHaveCount(1);
      await expect(option).toContainText(GLYPH[slug]);
    }

    // A restricted picker: no free-form emoji search box anywhere in it.
    await expect(picker.getByRole('textbox')).toHaveCount(0);
    await expect(picker.getByRole('searchbox')).toHaveCount(0);
  });

  test('US1-AS3: exactly one combined total and no per-emoji number (R-1 anti-gamification)', async () => {
    await loadSpacePage(authPage);

    const pill = totalPill(authPage);
    await expect(pill).toBeVisible();

    // The pill exposes exactly ONE number — the combined total — and it is not
    // adjacent to any individual emoji: the emoji glyphs are aria-hidden and the
    // only number the pill renders is the total. This is the ticket's core
    // constraint (no per-emoji tally anywhere in the UI).
    const digitRuns = (await pill.innerText()).match(/\d+/g) ?? [];
    expect(digitRuns, 'the pill must render exactly one number (the combined total)').toEqual(['1']);
    await expect(pill).toHaveAccessibleName(/^1 person reacted$/);

    // The who-reacted list, opened on demand, shows person + emoji + when and
    // carries no per-emoji count / grouped tally (US2-AS2 shares this guarantee).
    await pill.click();
    const list = authPage.getByRole('list').filter({ hasText: 'admin' });
    await expect(list.getByRole('listitem')).toHaveCount(1);
    const listDigits = (await list.innerText()).match(/\d+/g) ?? [];
    expect(listDigits, 'the who-reacted list must show no numeric tallies').toEqual([]);
  });
});
