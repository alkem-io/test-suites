// spec: client-web/src/functional-e2e/plans/callouts-test-plan.md › 10.6
// story: client-web#9972 "Unclear why I can't post" (client-web#10422)
//
// The Create Callout dialog now tells the author, BEFORE any click, that the
// description is over the 50,000-character limit: a live error under the
// editor, a progress ring whose accessible name is the count, and footer
// buttons that are dimmed with a hint but stay operable so a click still runs
// validation. The ring appears from 20 % of the limit and its tooltip gains a
// "formatting counts too" line from 80 %. A missing title wins over an
// over-long description. None of the `callouts/*` specs took the editor past
// the limit before this file.
//
// The count the client checks is the MARKDOWN length. For a plain `x` run the
// serialised markdown is the text plus ONE trailing newline, so the count is
// always typed + 1 (observed on the local stack, 2026-10-19; it is the case the
// tooltip's "formatting counts too" line describes). Every fill below is
// expressed as the COUNT it should produce; `textForCount` applies the offset,
// and DL-1 pins the offset first so a change in serialisation fails loudly.

import { expect, type Locator, type Page } from '@playwright/test';
import { TestScenarioFactory, TestUser } from '@alkemio/tests-lib';
import type { TestScenarioConfig } from '@alkemio/tests-lib/scenario/config/test-scenario-config';
import type { OrganizationWithSpaceModel } from '@alkemio/tests-lib/scenario/models/OrganizationWithSpaceModel';
import { adminGql } from '../contributors-callout/cards-fixture';
import { createPersonaTest } from '../fixtures/authenticated-session.fixture';
import { CollaborationPage } from './pages';

const baseUrl = process.env.ALKEMIO_BASE_URL || 'http://localhost:3000';
const test = createPersonaTest('space.admin@alkem.io');

// client-web `LONG_MARKDOWN_TEXT_LENGTH` and the ring thresholds in MarkdownEditor.
const LIMIT = 50_000;
const RING_FROM = LIMIT * 0.2;
const HINT_FROM = LIMIT * 0.8;

// Copy (bundles crd-common, crd-markdown, crd-space; en)
const COPY = {
  overLimit: 'This text exceeds the length limits for this field.',
  descriptionHint: 'Shorten the description to continue — it is over the length limit',
  titleHint: 'Add a title to your Post to continue',
  countHint:
    'Formatting, images and links count toward the limit too, so this number may be higher than the text you see.',
  post: 'Post',
  saveDraft: 'Save Draft',
} as const;

const count = (n: number): string => `${n.toLocaleString('en-US')}/${LIMIT.toLocaleString('en-US')} characters`;
/** Serialisation adds one trailing newline: the text that makes the counter read `n`. */
const MARKDOWN_OVERHEAD = 1;
const textForCount = (n: number): string => 'x'.repeat(n - MARKDOWN_OVERHEAD);

const scenarioConfig: TestScenarioConfig = {
  name: 'callout-description-limit',
  space: {
    about: { profile: { displayName: 'Callout Description Limit Space' } },
    collaboration: {
      addTutorialCallouts: false,
      addPostCollectionCallout: false,
      addWhiteboardCallout: false,
    },
    community: {
      admins: [TestUser.SPACE_ADMIN],
      members: [TestUser.SPACE_ADMIN],
    },
  },
};

let scenario: OrganizationWithSpaceModel | undefined;

// ---------------------------------------------------------------------------
// Locators (scoped to the Create Callout dialog)
// ---------------------------------------------------------------------------
const dialog = (page: Page): Locator => page.getByRole('dialog');
const ring = (page: Page): Locator =>
  dialog(page).getByRole('button', { name: /^[\d,]+\/[\d,]+ characters$/ });
const postButton = (page: Page): Locator =>
  dialog(page).getByRole('button', { name: COPY.post, exact: true });
const draftButton = (page: Page): Locator =>
  dialog(page).getByRole('button', { name: COPY.saveDraft, exact: true });
/**
 * Opens a Radix tooltip by FOCUSING its trigger, asserts `text` is in it, then
 * blurs the trigger to close it. Pointer hover is avoided on purpose: Radix
 * tracks a "grace area" between trigger and bubble, and re-hovering the same
 * trigger after a pointer leave did not reopen it reliably (seen on the ring
 * and on the footer buttons, 2026-10-19). Focus opens the tooltip with no
 * delay and no grace-area state, and it is the keyboard user's path anyway.
 */
const expectTooltip = async (
  trigger: Locator,
  present: readonly string[],
  absent: readonly string[] = []
): Promise<void> => {
  const page = trigger.page();
  await trigger.focus();
  for (const text of present) {
    await expect(tooltipWith(page, text)).toBeVisible();
  }
  for (const text of absent) {
    await expect(tooltipWith(page, text)).toHaveCount(0);
  }
  await trigger.blur();
  await expect(page.getByRole('tooltip')).toHaveCount(0);
};

// Radix renders each open tooltip twice (the visible bubble and a hidden copy
// with the same text), so match on the text and take the first.
const tooltipWith = (page: Page, text: string): Locator =>
  page.getByRole('tooltip').filter({ hasText: text }).first();

/** The hint the footer buttons point at through `aria-describedby`, or null when not blocked. */
const blockedHint = async (button: Locator): Promise<string | null> => {
  const id = await button.getAttribute('aria-describedby');
  if (!id) return null;
  return button.page().locator(`[id="${id}"]`).textContent();
};

const expectBlocked = async (page: Page, hint: string): Promise<void> => {
  for (const button of [postButton(page), draftButton(page)]) {
    // Dimmed + hinted, never disabled: a click must still run validation.
    await expect(button).toBeEnabled();
    await expect.poll(() => blockedHint(button)).toBe(hint);
    await expectTooltip(button, [hint]);
  }
};

const expectNotBlocked = async (page: Page): Promise<void> => {
  for (const button of [postButton(page), draftButton(page)]) {
    await expect(button).toBeEnabled();
    await expect(button).not.toHaveAttribute('aria-describedby', /.+/);
  }
};

const calloutTitles = async (spaceId: string): Promise<string[]> => {
  const data = await adminGql<{
    lookup: {
      space: {
        collaboration: { calloutsSet: { callouts: { framing: { profile: { displayName: string } } }[] } };
      };
    };
  }>(
    'query($id: UUID!){ lookup { space(ID: $id) { collaboration { calloutsSet { callouts { framing { profile { displayName } } } } } } } }',
    { id: spaceId }
  );
  return data.lookup.space.collaboration.calloutsSet.callouts.map(c => c.framing.profile.displayName);
};

/** Opens the Create Callout dialog on the scenario Space with `title` filled. */
const openCreateDialog = async (page: Page, title: string): Promise<CollaborationPage> => {
  const collaboration = new CollaborationPage(page, baseUrl);
  await collaboration.navigateToSpace(scenario!.space.nameId);
  await collaboration.clickAddCallout();
  await expect(dialog(page)).toBeVisible();
  await collaboration.displayNameInput.fill(title);
  return collaboration;
};

/** Replaces the editor text. `fill` on the contenteditable replaces, not appends. */
const setDescription = async (collaboration: CollaborationPage, text: string): Promise<void> => {
  await collaboration.descriptionInput.first().fill(text);
};

test.describe('Create Callout — description over the limit (client-web#9972)', () => {
  test.beforeAll(async () => {
    test.setTimeout(120_000);
    scenario = await TestScenarioFactory.createBaseScenario(scenarioConfig);
  });

  test.afterAll(async () => {
    test.setTimeout(60_000);
    if (scenario) {
      await TestScenarioFactory.cleanUpBaseScenario(scenario);
      scenario = undefined;
    }
  });

  test('DL-1 over the limit: live error, full ring with the count, footer dimmed with a hint, a click still runs validation and creates nothing', async ({
    page,
  }) => {
    test.setTimeout(120_000);
    const title = `dl1-long-${Date.now()}`;
    const collaboration = await openCreateDialog(page, title);
    await expectNotBlocked(page);

    // Pin the serialisation offset first: 10,000 typed characters count as 10,001.
    await setDescription(collaboration, 'x'.repeat(RING_FROM));
    await expect(ring(page)).toHaveAccessibleName(count(RING_FROM + MARKDOWN_OVERHEAD));

    await setDescription(collaboration, textForCount(LIMIT + 100));

    // Before any click: the error, and the ring named with the exact count.
    const error = dialog(page).getByText(COPY.overLimit, { exact: true });
    await expect(error).toBeVisible();
    await expect(error).toHaveAttribute('aria-live', 'polite');
    await expect(ring(page)).toHaveAccessibleName(count(LIMIT + 100));
    await expectTooltip(ring(page), [count(LIMIT + 100), COPY.countHint]);

    await expectBlocked(page, COPY.descriptionHint);

    // The click reaches validation: the dialog stays, the error stays, nothing is created.
    await postButton(page).click();
    await expect(dialog(page)).toBeVisible();
    await expect(error).toBeVisible();
    await draftButton(page).click();
    await expect(dialog(page)).toBeVisible();
    await expect(error).toBeVisible();
    expect(await calloutTitles(scenario!.space.id)).not.toContain(title);

    // Back under the limit: everything clears and Post creates the callout.
    await setDescription(collaboration, textForCount(LIMIT - 100));
    await expect(error).toHaveCount(0);
    await expect(ring(page)).toHaveAccessibleName(count(LIMIT - 100));
    await expectNotBlocked(page);
    await postButton(page).click();
    await expect(dialog(page)).toHaveCount(0);
    await expect(page.getByRole('heading', { name: title }).first()).toBeVisible({ timeout: 15_000 });
    expect(await calloutTitles(scenario!.space.id)).toContain(title);
    // Exactly one: a late write from the two over-limit clicks above would be a second callout with this title.
    expect((await calloutTitles(scenario!.space.id)).filter(t => t === title)).toHaveLength(1);
  });

  test('DL-2 a missing title wins over an over-long description', async ({ page }) => {
    const collaboration = await openCreateDialog(page, 'dl2-will-be-cleared');
    await setDescription(collaboration, textForCount(LIMIT + 100));
    await expectBlocked(page, COPY.descriptionHint);

    await collaboration.displayNameInput.fill('');
    await expectBlocked(page, COPY.titleHint);
    // The description error itself is still shown; only the footer reason changes.
    await expect(dialog(page).getByText(COPY.overLimit, { exact: true })).toBeVisible();
  });

  test('DL-3 ring thresholds: hidden under 20 %, shown from 20 %, the formatting hint from 80 %; 50,000 allowed, 50,001 refused', async ({
    page,
  }) => {
    const collaboration = await openCreateDialog(page, 'dl3-thresholds');

    await setDescription(collaboration, textForCount(RING_FROM - 1));
    // Positive control first: the editor took the text (no error, no block), then no ring.
    await expectNotBlocked(page);
    await expect(ring(page)).toHaveCount(0);

    await setDescription(collaboration, textForCount(RING_FROM));
    await expect(ring(page)).toHaveAccessibleName(count(RING_FROM));
    await expectTooltip(ring(page), [count(RING_FROM)], [COPY.countHint]);

    // BVA on the 80 % boundary: one under has no formatting hint, the boundary has it.
    await setDescription(collaboration, textForCount(HINT_FROM - 1));
    await expect(ring(page)).toHaveAccessibleName(count(HINT_FROM - 1));
    await expectTooltip(ring(page), [count(HINT_FROM - 1)], [COPY.countHint]);

    await setDescription(collaboration, textForCount(HINT_FROM));
    await expect(ring(page)).toHaveAccessibleName(count(HINT_FROM));
    await expectTooltip(ring(page), [count(HINT_FROM), COPY.countHint]);

    // Exactly at the limit is still allowed.
    await setDescription(collaboration, textForCount(LIMIT));
    await expect(ring(page)).toHaveAccessibleName(count(LIMIT));
    await expect(dialog(page).getByText(COPY.overLimit, { exact: true })).toHaveCount(0);
    await expectNotBlocked(page);

    // BVA on the limit: one character over is already an error, and the footer is blocked.
    await setDescription(collaboration, textForCount(LIMIT + 1));
    await expect(ring(page)).toHaveAccessibleName(count(LIMIT + 1));
    await expect(dialog(page).getByText(COPY.overLimit, { exact: true })).toBeVisible();
    await expectBlocked(page, COPY.descriptionHint);
  });
});
