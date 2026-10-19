// story: client-web#9972 "Unclear why I can't post" (client-web#10422), the
// Space settings About half: the What / Why / Who editors carry the same
// progress ring as the Create Callout dialog, with their own limits (What
// 50,000; Why and Who 32,000). The ring shows from 20 % of each limit and its
// tooltip gains the "formatting counts too" line from 80 %.
//
// What the About tab does NOT have (read from `SpaceSettingsAboutView` at
// develop, 2026-10-19): no `error` prop on the editors, so no live message,
// and no client-side block on Save. The PR describes Why / Who as "show the
// ring but do not block Save past the limit" (a listed follow-up) and is silent
// on What. AL-1 records what the product does for What over the limit against
// the server's own limit (65,568), so a change in either direction is caught.
//
// The count is the markdown length (typed + 1 for a plain run), as in
// `callouts/0.10callout-description-limit.spec.ts`.

import { expect, type Locator, type Page } from '@playwright/test';
import { TestScenarioFactory, TestUser } from '@alkemio/tests-lib';
import type { TestScenarioConfig } from '@alkemio/tests-lib/scenario/config/test-scenario-config';
import type { OrganizationWithSpaceModel } from '@alkemio/tests-lib/scenario/models/OrganizationWithSpaceModel';
import { adminGql } from '../contributors-callout/cards-fixture';
import { createPersonaTest } from '../fixtures/authenticated-session.fixture';

const baseUrl = process.env.ALKEMIO_BASE_URL || 'http://localhost:3000';
const test = createPersonaTest('space.admin@alkem.io');

// client-web `LONG_MARKDOWN_TEXT_LENGTH` / `SPACE_ABOUT_TEXT_LENGTH`; server `about.why`/`who` limit.
const WHAT_LIMIT = 50_000;
const WHY_WHO_LIMIT = 32_000;
const SERVER_WHY_WHO_LIMIT = 32_784;
const MARKDOWN_OVERHEAD = 1;
const textForCount = (n: number): string => 'x'.repeat(n - MARKDOWN_OVERHEAD);
const count = (n: number, max: number): string =>
  `${n.toLocaleString('en-US')}/${max.toLocaleString('en-US')} characters`;

const COPY = {
  countHint:
    'Formatting, images and links count toward the limit too, so this number may be higher than the text you see.',
  save: 'Save',
  saved: 'Saved',
} as const;

// Editors are named by their placeholder (bundle crd-spaceSettings, en).
const EDITOR = {
  what: { section: '#description', placeholder: "What's this space about…", limit: WHAT_LIMIT },
  why: { section: '#why', placeholder: 'Why does this space exist…', limit: WHY_WHO_LIMIT },
  who: { section: '#who', placeholder: 'Who is this space for…', limit: WHY_WHO_LIMIT },
} as const;
type Field = keyof typeof EDITOR;

const scenarioConfig: TestScenarioConfig = {
  name: 'about-description-limit',
  space: {
    about: { profile: { displayName: 'About Description Limit Space' } },
    collaboration: { addTutorialCallouts: false, addPostCollectionCallout: false, addWhiteboardCallout: false },
    community: { admins: [TestUser.SPACE_ADMIN], members: [TestUser.SPACE_ADMIN] },
  },
};
let scenario: OrganizationWithSpaceModel | undefined;

const section = (page: Page, field: Field): Locator => page.locator(EDITOR[field].section);
const editor = (page: Page, field: Field): Locator =>
  section(page, field).getByRole('textbox', { name: EDITOR[field].placeholder });
const ring = (page: Page, field: Field): Locator =>
  section(page, field).getByRole('button', { name: /^[\d,]+\/[\d,]+ characters$/ });
const saveButton = (page: Page, field: Field): Locator =>
  section(page, field).getByRole('button', { name: COPY.save, exact: true });
const tooltipWith = (page: Page, text: string): Locator =>
  page.getByRole('tooltip').filter({ hasText: text }).first();

/** Focus-opened tooltip (see 0.10callout-description-limit for why not hover). */
const expectTooltip = async (trigger: Locator, present: string[], absent: string[] = []): Promise<void> => {
  const page = trigger.page();
  await trigger.focus();
  for (const t of present) await expect(tooltipWith(page, t)).toBeVisible();
  for (const t of absent) await expect(tooltipWith(page, t)).toHaveCount(0);
  await trigger.blur();
  await expect(page.getByRole('tooltip')).toHaveCount(0);
};

const aboutLengths = async (spaceId: string): Promise<{ what: number; why: number; who: number }> => {
  const data = await adminGql<{
    lookup: { space: { about: { why: string | null; who: string | null; profile: { description: string | null } } } };
  }>('query($id: UUID!){ lookup { space(ID: $id) { about { why who profile { description } } } } }', {
    id: spaceId,
  });
  const a = data.lookup.space.about;
  return { what: a.profile.description?.length ?? 0, why: a.why?.length ?? 0, who: a.who?.length ?? 0 };
};

const openAbout = async (page: Page): Promise<void> => {
  await page.goto(`${baseUrl}/${scenario!.space.nameId}/settings/about`);
  await expect(editor(page, 'what')).toBeVisible({ timeout: 30_000 });
};

test.describe('Space settings About — description limits (client-web#9972)', () => {
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

  test('AL-1 What: ring from 10,000 with the count, hint from 40,000; over 50,000 the ring is full and Save is still offered — the server, not the client, is the limit', async ({
    page,
  }) => {
    test.setTimeout(180_000);
    await openAbout(page);
    const before = await aboutLengths(scenario!.space.id);

    await editor(page, 'what').fill(textForCount(WHAT_LIMIT * 0.2 - 1));
    await expect(saveButton(page, 'what')).toBeVisible(); // dirty: the editor took the text
    await expect(ring(page, 'what')).toHaveCount(0);

    await editor(page, 'what').fill(textForCount(WHAT_LIMIT * 0.2));
    await expect(ring(page, 'what')).toHaveAccessibleName(count(WHAT_LIMIT * 0.2, WHAT_LIMIT));
    await expectTooltip(ring(page, 'what'), [count(WHAT_LIMIT * 0.2, WHAT_LIMIT)], [COPY.countHint]);

    await editor(page, 'what').fill(textForCount(WHAT_LIMIT * 0.8));
    await expectTooltip(ring(page, 'what'), [count(WHAT_LIMIT * 0.8, WHAT_LIMIT), COPY.countHint]);

    // Over the limit: the ring says so; nothing else on this page does.
    await editor(page, 'what').fill(textForCount(WHAT_LIMIT + 100));
    await expect(ring(page, 'what')).toHaveAccessibleName(count(WHAT_LIMIT + 100, WHAT_LIMIT));
    await expect(section(page, 'what').getByText(/exceeds the length limit/i)).toHaveCount(0);
    await expect(saveButton(page, 'what')).toBeEnabled();

    // Observed behaviour, pinned: Save goes through, because the client only
    // counts and the server allows 65,568 on profile.description. Expected by
    // the story: the author is told and the save is refused. If this flips to
    // refused, the next two lines are what to change, with the story's blessing.
    await saveButton(page, 'what').click();
    await expect(section(page, 'what').getByText(COPY.saved, { exact: true })).toBeVisible({ timeout: 20_000 });
    await expect.poll(async () => (await aboutLengths(scenario!.space.id)).what, { timeout: 15_000 }).toBe(
      WHAT_LIMIT + 100
    );
    expect(before.what).toBeLessThan(WHAT_LIMIT);
  });

  test('AL-2 Why and Who: ring from 6,400 against 32,000, hint from 25,600; over 32,000 Save still goes through (PR follow-up, pinned) up to the server limit', async ({
    page,
  }) => {
    test.setTimeout(180_000);
    await openAbout(page);

    for (const field of ['why', 'who'] as const) {
      await editor(page, field).fill(textForCount(WHY_WHO_LIMIT * 0.2 - 1));
      await expect(saveButton(page, field)).toBeVisible();
      await expect(ring(page, field)).toHaveCount(0);

      await editor(page, field).fill(textForCount(WHY_WHO_LIMIT * 0.2));
      await expect(ring(page, field)).toHaveAccessibleName(count(WHY_WHO_LIMIT * 0.2, WHY_WHO_LIMIT));
      await expectTooltip(ring(page, field), [count(WHY_WHO_LIMIT * 0.2, WHY_WHO_LIMIT)], [COPY.countHint]);

      await editor(page, field).fill(textForCount(WHY_WHO_LIMIT * 0.8));
      await expectTooltip(ring(page, field), [count(WHY_WHO_LIMIT * 0.8, WHY_WHO_LIMIT), COPY.countHint]);
    }

    // Why over the client limit but under the server's: saved (the PR's listed follow-up).
    await editor(page, 'why').fill(textForCount(WHY_WHO_LIMIT + 100));
    await expect(ring(page, 'why')).toHaveAccessibleName(count(WHY_WHO_LIMIT + 100, WHY_WHO_LIMIT));
    await saveButton(page, 'why').click();
    await expect(section(page, 'why').getByText(COPY.saved, { exact: true })).toBeVisible({ timeout: 20_000 });
    await expect.poll(async () => (await aboutLengths(scenario!.space.id)).why, { timeout: 15_000 }).toBe(
      WHY_WHO_LIMIT + 100
    );

    // Who over the SERVER limit: the client lets the click through and the
    // server refuses, which the footer reports as an error with a Retry.
    await editor(page, 'who').fill(textForCount(SERVER_WHY_WHO_LIMIT + 100));
    await expect(ring(page, 'who')).toHaveAccessibleName(count(SERVER_WHY_WHO_LIMIT + 100, WHY_WHO_LIMIT));
    await saveButton(page, 'who').click();
    await expect(section(page, 'who').getByRole('alert')).toBeVisible({ timeout: 20_000 });
    await expect(section(page, 'who').getByRole('button', { name: 'Retry', exact: true })).toBeVisible();
    expect((await aboutLengths(scenario!.space.id)).who).toBeLessThan(WHY_WHO_LIMIT);
  });
});
