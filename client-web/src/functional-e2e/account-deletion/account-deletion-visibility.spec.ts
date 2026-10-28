// spec: client-web/src/functional-e2e/account-deletion/account-deletion-test-plan.md
// story: client-web#10107, workspace#054 — the portable delta after test-suites#620.
//
// TC-16 — the Delete-account card is owner-only.
//
// client-web#10437 (spec 054 FR-001, amended 2026-10-23): the card moved from
// the Security tab to the "Danger Zone" section at the end of the Account
// tab (`AccountDangerZone.tsx`, mounted only for the profile owner). The
// section starts collapsed, with its body mounted but hidden; the card title
// is plain text now (no heading), the section heading is "Danger Zone".

import { test, expect } from '@playwright/test';
import {
  TestScenarioFactory,
  TestScenarioNoPreCreationConfig,
  TestUserManager,
} from '@alkemio/tests-lib';
import {
  baseUrl,
  gotoUserSecuritySettings,
  signIn,
} from './account-deletion.helpers';
import {
  openSettingsSection,
  settingsSectionTrigger,
} from '../helpers/settings-section.helper';

const scenarioConfig: TestScenarioNoPreCreationConfig = {
  name: 'account-deletion-visibility',
};

test.describe('Delete-account card visibility (054 delta)', () => {
  test.beforeAll(async () => {
    // No space/org needed — this case only exercises the Security tab's
    // owner-only guard against pre-seeded personas. createBaseScenarioEmpty
    // just populates TestUserManager.users.
    await TestScenarioFactory.createBaseScenarioEmpty(scenarioConfig);
  });

  test('TC-16 — the Delete-account card is owner-only', async ({
    browser,
  }) => {
    const subject = TestUserManager.users.spaceMember;
    expect(subject.nameId).toBeTruthy();

    // Two distinct identities → two distinct browser contexts. Reusing one
    // page across a sign-out/sign-in round trip is unreliable (an already
    // authenticated visit to /login redirects away before the form renders).
    const adminContext = await browser.newContext();
    const adminPage = await adminContext.newPage();

    // Step 1 — as GLOBAL_ADMIN, open S's OWN security tab directly.
    await signIn(adminPage, TestUserManager.users.globalAdmin.email);
    await gotoUserSecuritySettings(adminPage, subject.nameId);

    // Pre-existing owner-only guard (FR-012/FR-083/FR-084, predates this
    // feature): a direct hit on another user's Security tab — even by a
    // platform admin — redirects to that user's profile tab rather than
    // rendering anything from the Security tab at all. That makes this a
    // ROUTE-level denial, not merely a missing card — record which, per the
    // build sheet: assert the redirect AND the card's absence.
    //
    // Confirmed live (2026-09-02): the URL is `/settings/security` for one
    // React Router tick before the redirect effect fires, so a regex that
    // matches BOTH `/settings/security` and `/settings/profile` resolves on
    // the pre-redirect URL and passes vacuously — waiting specifically for
    // `/settings/profile` is load-bearing here.
    await adminPage.waitForURL(
      `${baseUrl}/user/${subject.nameId}/settings/profile`,
      { timeout: 15000 }
    );

    await expect(
      adminPage.getByRole('button', { name: 'Delete account' })
    ).toHaveCount(0);

    // Step 1b — the Account tab, where the card lives now, IS reachable for
    // the admin (they may manage S's hosted resources), but the Danger Zone
    // is mounted only for the owner: no section, no card, no trigger —
    // next to a positive control that the tab itself rendered.
    await adminPage.goto(`${baseUrl}/user/${subject.nameId}/settings/account`);
    await expect(
      adminPage.getByRole('heading', { name: 'Hosted Spaces', level: 3 })
    ).toBeVisible({ timeout: 15000 });
    await expect(
      adminPage.getByRole('heading', { name: 'Danger Zone', level: 3 })
    ).toHaveCount(0);
    await expect(
      adminPage.getByRole('button', { name: 'Delete account' })
    ).toHaveCount(0);
    await adminContext.close();

    // Step 2 — as S, in a fresh context, open their OWN account tab. The
    // Danger Zone section is there; opening it reveals the card.
    const subjectContext = await browser.newContext();
    const subjectPage = await subjectContext.newPage();
    try {
      await signIn(subjectPage, subject.email);
      await subjectPage.goto(
        `${baseUrl}/user/${subject.nameId}/settings/account`
      );

      const dangerZoneTrigger = settingsSectionTrigger(
        subjectPage,
        /^Danger Zone/
      );
      await expect(dangerZoneTrigger).toBeVisible({ timeout: 15000 });
      // Collapsed by default (the card is hidden, not absent) — it opens on
      // the trigger, never on its own.
      await expect(
        subjectPage.getByRole('button', { name: 'Delete account' })
      ).toBeHidden();
      await expect(dangerZoneTrigger).toHaveAttribute('aria-expanded', 'false');
      await openSettingsSection(subjectPage, /^Danger Zone/);

      await expect(
        subjectPage
          .getByRole('paragraph')
          .filter({ hasText: /^Delete account$/ })
      ).toBeVisible();
      await expect(
        subjectPage.getByText(
          'Deleting your account is immediate and permanent. Your profile, settings, uploaded files, and sign-in credentials are removed, and this cannot be undone.'
        )
      ).toBeVisible();
      await expect(
        subjectPage.getByRole('button', { name: 'Delete account' })
      ).toBeVisible();
    } finally {
      await subjectContext.close();
    }
  });
});
