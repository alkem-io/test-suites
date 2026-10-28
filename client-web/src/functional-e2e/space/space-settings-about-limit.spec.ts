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
// on What. Filed as client-web#10452 (2026-10-20): AL-1 / AL-2 keep the ring
// assertions live, AL-1b / AL-2b carry the expected over-limit contract (the
// callout dialog's) and are skipped on that issue until it lands.
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
  overLimit: 'This text exceeds the length limits for this field.',
  countHint:
    'Formatting, images and links count toward the limit too, so this number may be higher than the text you see.',
  save: 'Save changes',
  saving: 'Saving…',
  saved: 'Changes saved',
} as const;

// Editors are named by their placeholder (bundle crd-spaceSettings, en).
// `#description` is the whole Context card (all three editors); `#why` / `#who`
// are the anchors of the two editors below What.
const EDITOR = {
  what: {
    section: '#description',
    placeholder: "What's this space about…",
    limit: WHAT_LIMIT,
  },
  why: {
    section: '#why',
    placeholder: 'Why does this space exist…',
    limit: WHY_WHO_LIMIT,
  },
  who: {
    section: '#who',
    placeholder: 'Who is this space for…',
    limit: WHY_WHO_LIMIT,
  },
} as const;
type Field = keyof typeof EDITOR;

const scenarioConfig: TestScenarioConfig = {
  name: 'about-description-limit',
  space: {
    about: { profile: { displayName: 'About Description Limit Space' } },
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

const section = (page: Page, field: Field): Locator =>
  page.locator(EDITOR[field].section);
const editor = (page: Page, field: Field): Locator =>
  section(page, field).getByRole('textbox', {
    name: EDITOR[field].placeholder,
  });
const ring = (page: Page, field: Field): Locator =>
  section(page, field).getByRole('button', {
    name: /^[\d,]+\/[\d,]+ characters$/,
  });
// client-web#10437: the per-editor Save is gone. Every edit on the tab is
// buffered and saved by the tab-wide "Unsaved changes" bar (`UnsavedChangesBar`,
// aria-hidden while clean, so a role query only resolves it once dirty); its
// "Save changes" button is the dirty signal for any of the three editors.
const saveButton = (page: Page, _field: Field): Locator =>
  page
    .getByRole('region', { name: 'Unsaved changes', exact: true })
    .getByRole('button', { name: COPY.save, exact: true });
// The "Changes saved" toast and the bar's save-error alert are page-level
// (the "Notifications" toaster region / `UnsavedChangesBar`), never inside an
// editor's section. Both render a tick after the `updateSpace` response, so
// callers check them after the persisted read, not straight after the click.
const savedToast = (page: Page): Locator =>
  page.getByText(COPY.saved, { exact: true });
const barAlert = (page: Page): Locator =>
  page
    .getByRole('region', { name: 'Unsaved changes', exact: true })
    .getByRole('alert');

/**
 * Clicks Save when the fix leaves it enabled and waits for the attempt to
 * settle: the `updateSpace` round trip when one is sent, then the bar leaving
 * "Saving…". A fix that refuses
 * the click client-side sends nothing, so that branch ends at the bounded
 * wait; one that disables Save never clicks. Either way the caller then reads
 * the persisted value (first), which can no longer race an in-flight save.
 */
const saveIfEnabledAndSettle = async (
  page: Page,
  field: Field
): Promise<void> => {
  if (!(await saveButton(page, field).isEnabled())) return;
  const saveRoundTrip = page
    .waitForResponse(
      res => /\bupdateSpace\b/.test(res.request().postData() ?? ''),
      { timeout: 15_000 }
    )
    .catch(() => null); // no request is a valid outcome (client-side refusal)
  await saveButton(page, field).click();
  await saveRoundTrip;
  // The bar stays "Saving…" through the post-save refetch; the toast fires
  // once it leaves that state (clean → hidden, or dirty / save error).
  await expect(
    page
      .getByRole('region', { name: 'Unsaved changes', exact: true })
      .getByText(COPY.saving, { exact: true })
  ).toHaveCount(0);
};
const expectPersistedLength = async (
  field: Field,
  expected: number
): Promise<void> => {
  await expect
    .poll(async () => (await aboutLengths(scenario!.space.id))[field], {
      message: `persisted ${field} length`,
    })
    .toBe(expected);
};

const tooltipWith = (page: Page, text: string): Locator =>
  page.getByRole('tooltip').filter({ hasText: text }).first();

/** Focus-opened tooltip (see 0.10callout-description-limit for why not hover). */
const expectTooltip = async (
  trigger: Locator,
  present: string[],
  absent: string[] = []
): Promise<void> => {
  const page = trigger.page();
  await trigger.focus();
  for (const t of present) await expect(tooltipWith(page, t)).toBeVisible();
  for (const t of absent) await expect(tooltipWith(page, t)).toHaveCount(0);
  await trigger.blur();
  await expect(page.getByRole('tooltip')).toHaveCount(0);
};

const aboutLengths = async (
  spaceId: string
): Promise<{ what: number; why: number; who: number }> => {
  const data = await adminGql<{
    lookup: {
      space: {
        about: {
          why: string | null;
          who: string | null;
          profile: { description: string | null };
        };
      };
    };
  }>(
    'query($id: UUID!){ lookup { space(ID: $id) { about { why who profile { description } } } } }',
    {
      id: spaceId,
    }
  );
  const a = data.lookup.space.about;
  return {
    what: a.profile.description?.length ?? 0,
    why: a.why?.length ?? 0,
    who: a.who?.length ?? 0,
  };
};

// client-web#10437: the About tab is a stack of collapsible `SettingsSection`
// cards; the What / Why / Who editors live in the "Context" card (`#description`,
// `#why` / `#who` anchors inside it), which starts collapsed — its body is in
// the DOM but hidden until the h3 trigger is clicked.
const openAbout = async (page: Page): Promise<void> => {
  await page.goto(`${baseUrl}/${scenario!.space.nameId}/settings/about`);
  const contextTrigger = page
    .getByRole('heading', { name: 'Context', exact: true })
    .getByRole('button');
  await expect(contextTrigger).toBeVisible({ timeout: 30_000 });
  await contextTrigger.click();
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

  test('AL-1 What: ring from 10,000 with the count, hint from 40,000; over 50,000 the ring is full', async ({
    page,
  }) => {
    test.setTimeout(180_000);
    await openAbout(page);

    await editor(page, 'what').fill(textForCount(WHAT_LIMIT * 0.2 - 1));
    await expect(saveButton(page, 'what')).toBeVisible(); // dirty: the editor took the text
    await expect(ring(page, 'what')).toHaveCount(0);

    await editor(page, 'what').fill(textForCount(WHAT_LIMIT * 0.2));
    await expect(ring(page, 'what')).toHaveAccessibleName(
      count(WHAT_LIMIT * 0.2, WHAT_LIMIT)
    );
    await expectTooltip(
      ring(page, 'what'),
      [count(WHAT_LIMIT * 0.2, WHAT_LIMIT)],
      [COPY.countHint]
    );

    await editor(page, 'what').fill(textForCount(WHAT_LIMIT * 0.8));
    await expectTooltip(ring(page, 'what'), [
      count(WHAT_LIMIT * 0.8, WHAT_LIMIT),
      COPY.countHint,
    ]);

    // Over the limit the ring says so (the only thing on this page that does
    // today — see AL-1b).
    await editor(page, 'what').fill(textForCount(WHAT_LIMIT + 100));
    await expect(ring(page, 'what')).toHaveAccessibleName(
      count(WHAT_LIMIT + 100, WHAT_LIMIT)
    );
  });

  // Product defect client-web#10452 (2026-10-20): the About editors only count.
  // Nothing says the text is over the limit, and Save goes through for What
  // (the server allows 65,568) and Why (server 32,784), while Who is refused by
  // the server and rendered as a generic alert. Expected, per the callout
  // contract #10422 delivered for #9972: an inline over-limit error and no
  // persisted save. Assertions below are the expected behaviour; drop the
  // skip when #10452 lands.
  test.skip('AL-1b What over 50,000: inline over-limit error, nothing persists (client-web#10452)', async ({
    page,
  }) => {
    test.setTimeout(180_000);
    await openAbout(page);
    const before = await aboutLengths(scenario!.space.id);

    await editor(page, 'what').fill(textForCount(WHAT_LIMIT + 100));
    await expect(ring(page, 'what')).toHaveAccessibleName(
      count(WHAT_LIMIT + 100, WHAT_LIMIT)
    );
    await expect(
      section(page, 'what').getByText(COPY.overLimit, { exact: true })
    ).toBeVisible();
    // Whether the fix disables Save or refuses the click is its call; either way nothing persists.
    await saveIfEnabledAndSettle(page, 'what');
    await expectPersistedLength('what', before.what);
    await expect(savedToast(page)).toHaveCount(0);
  });

  test('AL-2 Why and Who: ring from 6,400 against 32,000, hint from 25,600', async ({
    page,
  }) => {
    test.setTimeout(180_000);
    await openAbout(page);

    for (const field of ['why', 'who'] as const) {
      await editor(page, field).fill(textForCount(WHY_WHO_LIMIT * 0.2 - 1));
      await expect(saveButton(page, field)).toBeVisible();
      await expect(ring(page, field)).toHaveCount(0);

      await editor(page, field).fill(textForCount(WHY_WHO_LIMIT * 0.2));
      await expect(ring(page, field)).toHaveAccessibleName(
        count(WHY_WHO_LIMIT * 0.2, WHY_WHO_LIMIT)
      );
      await expectTooltip(
        ring(page, field),
        [count(WHY_WHO_LIMIT * 0.2, WHY_WHO_LIMIT)],
        [COPY.countHint]
      );

      await editor(page, field).fill(textForCount(WHY_WHO_LIMIT * 0.8));
      await expectTooltip(ring(page, field), [
        count(WHY_WHO_LIMIT * 0.8, WHY_WHO_LIMIT),
        COPY.countHint,
      ]);
    }
  });

  // See AL-1b: same defect, client-web#10452. Why sits between the client
  // limit and the server's (saved today); Who is pushed past the server limit
  // too (generic alert + Retry today). Expected: the inline error in both
  // cases, before any server round trip, and nothing persisted.
  test.skip('AL-2b Why and Who over 32,000: inline over-limit error, nothing persists, no server error (client-web#10452)', async ({
    page,
  }) => {
    test.setTimeout(180_000);
    await openAbout(page);
    const before = await aboutLengths(scenario!.space.id);

    await editor(page, 'why').fill(textForCount(WHY_WHO_LIMIT + 100));
    await expect(ring(page, 'why')).toHaveAccessibleName(
      count(WHY_WHO_LIMIT + 100, WHY_WHO_LIMIT)
    );
    await expect(
      section(page, 'why').getByText(COPY.overLimit, { exact: true })
    ).toBeVisible();
    await saveIfEnabledAndSettle(page, 'why');
    await expectPersistedLength('why', before.why);
    await expect(savedToast(page)).toHaveCount(0);

    await editor(page, 'who').fill(textForCount(SERVER_WHY_WHO_LIMIT + 100));
    await expect(ring(page, 'who')).toHaveAccessibleName(
      count(SERVER_WHY_WHO_LIMIT + 100, WHY_WHO_LIMIT)
    );
    await expect(
      section(page, 'who').getByText(COPY.overLimit, { exact: true })
    ).toBeVisible();
    await saveIfEnabledAndSettle(page, 'who');
    await expectPersistedLength('who', before.who);
    await expect(section(page, 'who').getByRole('alert')).toHaveCount(0);
    await expect(barAlert(page)).toHaveCount(0);
    await expect(savedToast(page)).toHaveCount(0);
  });
});
