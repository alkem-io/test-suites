// spec: client-web/src/functional-e2e/account-deletion/account-deletion-test-plan.md
// story: client-web#10107, workspace#054 — the portable delta after test-suites#620.
// routing: workspace#065 — who receives the entry.
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
//
// Who sees the entry (workspace#065): PLATFORM_ADMIN_USER_PROFILE_REMOVED goes
// to Platform Users Admin holders, minus the operator who removed the user. So
// the removal is done by one holder — the platform-roles suite's single-role
// Users Admin — and the entry is looked for in the centre of a SECOND holder, a
// run-unique user granted the role for this file. The remover keeps the in-app
// row switched on, so its exclusion is observed rather than implied by its
// settings.

import { test, expect } from '@playwright/test';
import { seedPlatformRoleUsers, UniqueIDGenerator } from '@alkemio/tests-lib';
import {
  assignPlatformRole,
  baseUrl,
  deleteUserAs,
  getProfileRemovedInApp,
  profileRemovedNotificationsTriggeredBy,
  provisionUsableUser,
  removePlatformRole,
  setProfileRemovedInApp,
  signIn,
} from './account-deletion.helpers';
import type { UsableUser } from './account-deletion.helpers';

const uniqueId = UniqueIDGenerator.getID();

let rolesAdminToken: string;
/** The Users Admin who removes the departed user. */
let remover: { id: string; token: string };
let removerInAppBefore: boolean | undefined;
/** Remover-triggered entries already in the remover's own centre. */
let removerSelfEntriesBefore: string[] = [];
/** The second Users Admin, whose centre must show the entry. */
let viewer: UsableUser | undefined;
let viewerHoldsRole = false;
let departed: UsableUser | undefined;
let departedRemoved = false;

test.describe('Notification centre — profile-removed entry (054 delta)', () => {
  // One worker, one setup: the remover's setting is snapshotted and restored
  // around the whole file, which parallel workers would race on.
  test.describe.configure({ mode: 'default' });

  test.beforeAll(async () => {
    // Two first sign-ins: a fresh user can take a while to become usable.
    test.setTimeout(360_000);

    const users = await seedPlatformRoleUsers();
    rolesAdminToken = users.tokens.PLATFORM_ROLES_ADMIN;
    remover = {
      id: users.userIds.PLATFORM_USERS_ADMIN,
      token: users.tokens.PLATFORM_USERS_ADMIN,
    };

    viewer = await provisionUsableUser(`tc14viewer.${uniqueId}`);
    await assignPlatformRole(
      rolesAdminToken,
      viewer.userId,
      'PLATFORM_USERS_ADMIN'
    );
    viewerHoldsRole = true;
    await setProfileRemovedInApp(viewer.token, viewer.userId, true);

    removerInAppBefore = await getProfileRemovedInApp(remover.token);
    await setProfileRemovedInApp(remover.token, remover.id, true);
    removerSelfEntriesBefore = await profileRemovedNotificationsTriggeredBy(
      remover.token,
      remover.id
    );

    departed = await provisionUsableUser(`tc14gone.${uniqueId}`);
    await deleteUserAs(remover.token, departed.userId);
    departedRemoved = true;
  });

  test.afterAll(async () => {
    test.setTimeout(180_000);
    const failures: string[] = [];
    const attempt = async (what: string, step: () => Promise<unknown>) => {
      try {
        await step();
      } catch (e) {
        failures.push(`${what}: ${(e as Error).message}`);
      }
    };
    if (removerInAppBefore !== undefined) {
      await attempt('restore the remover setting', () =>
        setProfileRemovedInApp(remover.token, remover.id, removerInAppBefore!)
      );
    }
    if (departed && !departedRemoved) {
      const { userId } = departed;
      await attempt('remove the departed user', () =>
        deleteUserAs(remover.token, userId)
      );
    }
    if (viewer) {
      const { userId } = viewer;
      if (viewerHoldsRole) {
        await attempt('revoke the viewer role', () =>
          removePlatformRole(rolesAdminToken, userId, 'PLATFORM_USERS_ADMIN')
        );
      }
      await attempt('remove the viewer', () =>
        deleteUserAs(remover.token, userId)
      );
    }
    if (failures.length > 0) {
      throw new Error(
        `TC-14 cleanup left residue —\n  ${failures.join('\n  ')}`
      );
    }
  });

  test('TC-14 — the other Users Admin gets the entry, the remover does not', async () => {
    // By identity: the viewer's centre did not exist before this run, and the
    // entry must be the one the remover triggered.
    await expect
      .poll(
        async () =>
          (
            await profileRemovedNotificationsTriggeredBy(
              viewer!.token,
              remover.id
            )
          ).length,
        { timeout: 60_000, intervals: [1_000, 2_000, 5_000] }
      )
      .toBeGreaterThan(0);

    // Both legs are written by the same dispatch, so once the viewer's entry
    // exists the remover's would too.
    const removerSelfEntries = await profileRemovedNotificationsTriggeredBy(
      remover.token,
      remover.id
    );
    expect(
      removerSelfEntries.filter(id => !removerSelfEntriesBefore.includes(id))
    ).toEqual([]);
  });

  test('TC-14 — no PII, no blank row, list stays populated', async ({
    page,
  }) => {
    test.setTimeout(90_000);
    await signIn(page, viewer!.email);
    await page.goto(`${baseUrl}/home`);

    // Delivery may lag behind the deletion (best-effort post-commit leg) —
    // poll by RE-OPENING the panel on each attempt (close + reopen, not a
    // full page reload — a persona with a long notification history spends
    // its budget on re-fetching all of them instead of retrying). A plain
    // `expect.poll` over a DOM assertion would only re-check the
    // already-rendered (unrefetched) list.
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
    expect(pageContent).not.toContain(departed!.email);
    expect(pageContent).not.toContain(departed!.displayName);
  });
});
