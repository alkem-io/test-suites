// spec: client-web/src/functional-e2e/account-deletion/account-deletion-test-plan.md
// story: client-web#10107, workspace#054 — the portable delta after test-suites#620.
//
// TC-14 — the notification centre survives the removed payload fields.
//
// server#6416 removed `userEmail`/`userDisplayName` from
// InAppNotificationPayloadPlatformUserProfileRemoved (the feature's one
// declared BREAKING change). client-web#10231 already dropped the same two
// fields from the fragment and rewrote the subject copy to a neutral,
// non-interpolated string — so this is a REGRESSION GUARD proving that fix
// holds: with `errorPolicy: 'ignore'`, a client that still selected the
// removed fields would fail the whole query's validation and silently drop
// every entry — including notifications unrelated to this one — not just
// this one row (R-e). #620 counts DB rows containing the departed email; it
// never renders the notification centre at all, so this risk is entirely
// untouched by it.

import { test, expect } from '@playwright/test';
import {
  getUserToken,
  TestScenarioFactory,
  TestScenarioNoPreCreationConfig,
} from '@alkemio/tests-lib';
import {
  deleteUserAsGlobalAdmin,
  provisionDisposableUser,
} from '../session-revocation/session-revocation.helpers';
import {
  adminEmail,
  baseUrl,
  resolveUserIdFromToken,
  setUserProfileRemovedInAppNotification,
  signIn,
} from './account-deletion.helpers';

let departedUserId: string;
let departedEmail: string;
let departedDisplayName: string;
let adminUserId: string;

const scenarioConfig: TestScenarioNoPreCreationConfig = {
  name: 'account-deletion-profile-removed-notification',
};

test.describe('Notification centre — profile-removed entry (054 delta)', () => {
  test.beforeAll(async () => {
    // `graphqlErrorWrapper(..., TestUser.GLOBAL_ADMIN)` resolves the admin's
    // token through TestUserManager, which needs its map populated first.
    await TestScenarioFactory.createBaseScenarioEmpty(scenarioConfig);

    // `platform.admin.userProfileRemoved` ships `inApp: false` by default
    // (server `getDefaultUserSettings`) — confirmed live 2026-09-02: with it
    // off, the deletion below produces zero rows for this event and the
    // panel never renders the entry at all. Opt the admin persona in for the
    // duration of this test, and restore it in afterAll.
    const adminToken = await getUserToken(adminEmail);
    adminUserId = await resolveUserIdFromToken(adminToken);
    await setUserProfileRemovedInAppNotification(adminUserId, true);

    const subject = await provisionDisposableUser('del-notif');
    departedUserId = subject.userId;
    departedEmail = subject.email;
    departedDisplayName = `${subject.firstName} ${subject.lastName}`;

    // Admin-initiated deletion: the profile-removed notification payload is
    // branch-independent (fires for both self and admin deletion), so this
    // reaches the same observable state without any of #620's session-minting
    // machinery.
    await deleteUserAsGlobalAdmin(departedUserId, { deleteIdentity: true });
  });

  test.afterAll(async () => {
    if (adminUserId) {
      await setUserProfileRemovedInAppNotification(adminUserId, false);
    }
  });

  test('TC-14 — no PII, no blank row, list stays populated', async ({
    page,
  }) => {
    test.setTimeout(90_000);
    await signIn(page, adminEmail);
    await page.goto(`${baseUrl}/home`);

    // Delivery may lag behind the deletion (best-effort post-commit leg) —
    // poll by RE-OPENING the panel on each attempt (close + reopen, not a
    // full page reload — this admin persona carries ~70 existing
    // notifications, and a full `page.goto` per attempt spent its budget on
    // re-fetching all of them instead of retrying). A plain `expect.poll`
    // over a DOM assertion would only re-check the already-rendered
    // (unrefetched) list.
    await expect
      .poll(
        async () => {
          const notificationsButton = page.getByRole('button', {
            name: 'Notifications',
          });
          await notificationsButton.click();
          await page
            .getByRole('heading', { name: 'Notifications' })
            .waitFor({ state: 'visible', timeout: 15000 });
          await page
            .getByRole('status', { name: 'Loading notifications' })
            .waitFor({ state: 'hidden', timeout: 15000 })
            .catch(() => {});
          const found = await page
            .getByText('A user profile was removed from the platform')
            .first()
            .isVisible()
            .catch(() => false);
          if (!found) {
            await page.getByRole('button', { name: 'Close' }).click();
          }
          return found;
        },
        { timeout: 60000, intervals: [3000, 5000, 8000] }
      )
      .toBe(true);

    // The load-bearing assertion: the list is NOT empty. Under
    // `errorPolicy:'ignore'`, a client still selecting the removed fields
    // would fail the whole query's validation and blank the entire centre —
    // not just this row.
    await expect(page.getByText('No notifications')).toHaveCount(0);

    // No blank/undefined entries anywhere in the panel.
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByText('undefined', { exact: false })).toHaveCount(
      0
    );

    // The departed user's PII appears nowhere on the page — scan the raw
    // content, not just the visible text, so a hidden/off-screen leak is
    // caught too.
    const pageContent = await page.content();
    expect(pageContent).not.toContain(departedEmail);
    expect(pageContent).not.toContain(departedDisplayName);
  });
});
