// E-3 (forum-discussions-test-plan.md; US4-AS1, FR-013/015) — the forum nav
// shows the client-web#10265 category labels in every locale this stack
// enables. Locally only `en` and `nl` are eligible
// (`platform.configuration.language`); the other four locales are covered by
// a client-web unit test instead (D-F).
import { expect } from '@playwright/test';
import { readMyUser, TestUserManager, updateUserSettings } from '@alkemio/tests-lib';
import { createPersonaTest } from '../fixtures/authenticated-session.fixture';
import { must, sessionActor } from '../helpers/lib-actor.helper';
import { languageConfig } from '../language-offer/helpers';

const baseUrl = process.env.ALKEMIO_BASE_URL || 'http://localhost:3000';

type LocaleExpectation = {
  help: string;
  newsletter: string;
  tipsAndTricks: string;
  oldHelpLabel: string;
};

// client-web#10265's labels — only the locally eligible codes (en, nl) are
// exercised; see the plan's full six-locale table for the rest (D-F).
const LOCALE_LABELS: Record<string, LocaleExpectation> = {
  en: {
    help: 'Q&A',
    newsletter: 'Newsletter',
    tipsAndTricks: 'Tips & Tricks',
    oldHelpLabel: 'Need Help?',
  },
  nl: {
    help: 'Q&A',
    newsletter: 'Nieuwsbrief',
    tipsAndTricks: 'Tips & Trucs',
    oldHelpLabel: 'Hulp nodig?',
  },
};

const test = createPersonaTest('forum.locale@alkem.io');

test.beforeAll(async () => {
  await TestUserManager.populateUserModelMap();
});

test.afterEach(async ({ page }) => {
  // Restore to English so a failed run does not leave the persona stranded
  // in a non-default locale for the next run.
  const actor = await sessionActor(page);
  const me = must(await readMyUser(actor), 'read own user');
  must(
    await updateUserSettings(me.me.user!.id, { language: 'en' }, actor),
    'restore language to en'
  );
});

test('TC-E3 — forum category labels render correctly in every eligible locale (US4-AS1)', async ({
  page,
}) => {
  const { eligible } = await languageConfig(page);
  const codes = Array.from(new Set(['en', ...eligible])).filter(
    code => code in LOCALE_LABELS
  );
  expect(codes.length).toBeGreaterThan(0);

  const actor = await sessionActor(page);
  const me = must(await readMyUser(actor), 'read own user');
  const userId = me.me.user!.id;

  for (const code of codes) {
    const expected = LOCALE_LABELS[code];

    must(
      await updateUserSettings(userId, { language: code }, actor),
      `set language to ${code}`
    );

    await page.goto(`${baseUrl}/forum`);
    // The nav landmark's own accessible name is itself the localised
    // "Categories" text, so it cannot be matched by a fixed English string —
    // scope by "main" instead, which stays a stable landmark across locales.
    const main = page.getByRole('main');
    await expect(
      main.getByRole('button', { name: expected.help })
    ).toBeVisible({ timeout: 20_000 });
    await expect(
      main.getByRole('button', { name: expected.newsletter })
    ).toBeVisible();
    await expect(
      main.getByRole('button', { name: expected.tipsAndTricks })
    ).toBeVisible();

    await expect(page.getByText(expected.oldHelpLabel)).toHaveCount(0);
    // No raw i18n keys leaking through (e.g. `common.enums.forumDiscussionCategory.help`).
    await expect(page.getByText(/common\.enums\./)).toHaveCount(0);
  }
});
