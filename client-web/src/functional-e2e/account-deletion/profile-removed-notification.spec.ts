// spec: client-web/src/functional-e2e/account-deletion/account-deletion-test-plan.md
// story: client-web#10107, workspace#054 — the portable delta after test-suites#620.
// routing: who receives the entry is described below.
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
// Who sees the entry: PLATFORM_ADMIN_USER_PROFILE_REMOVED goes to Platform
// Users Admin holders, minus the operator who removed the user. So the removal
// is done by one holder — the platform-roles suite's single-role Users Admin —
// and the entry is looked for in the centre of a SECOND holder: a pool user,
// persistent across runs, stripped of every platform role when acquired and
// again when released, and granted the role for this file. The remover keeps
// the in-app row switched on, so its exclusion is observed rather than implied
// by its settings.

import { test, expect } from '@playwright/test';
import { seedPlatformRoleUsers, UniqueIDGenerator } from '@alkemio/tests-lib';
import {
  acquireViewer,
  assignPlatformRole,
  baseUrl,
  deleteUserAs,
  expectNoNewIds,
  getProfileRemovedInApp,
  identityEmail,
  profileRemovedNotificationsTriggeredBy,
  provisionIdentity,
  releaseViewer,
  removeUnconfirmedUser,
  requirePlatformRoleModel,
  setProfileRemovedInApp,
  signIn,
  waitUntilUsable,
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
/** Remover-triggered entries the (persistent) viewer had before this run. */
let viewerEntriesBefore: string[] = [];
/** Set before the departed user's identity exists, so cleanup can find it. */
let departedEmail: string | undefined;
let departed: UsableUser | undefined;
let departedRemoved = false;

test.describe('Notification centre — profile-removed entry (054 delta)', () => {
  // One worker, one setup: the remover's setting is snapshotted and restored
  // around the whole file, which parallel workers would race on.
  test.describe.configure({ mode: 'default' });

  test.beforeAll(async () => {
    // Two first sign-ins: a fresh user can take a while to become usable.
    test.setTimeout(360_000);

    // Before any identity is registered or signed in.
    await requirePlatformRoleModel();

    const users = await seedPlatformRoleUsers();
    rolesAdminToken = users.tokens.PLATFORM_ROLES_ADMIN;
    remover = {
      id: users.userIds.PLATFORM_USERS_ADMIN,
      token: users.tokens.PLATFORM_USERS_ADMIN,
    };

    viewer = await acquireViewer(rolesAdminToken);
    await assignPlatformRole(
      rolesAdminToken,
      viewer.userId,
      'PLATFORM_USERS_ADMIN'
    );
    await setProfileRemovedInApp(viewer.token, viewer.userId, true);
    viewerEntriesBefore = await profileRemovedNotificationsTriggeredBy(
      viewer.token,
      remover.id
    );

    removerInAppBefore = await getProfileRemovedInApp(remover.token);
    await setProfileRemovedInApp(remover.token, remover.id, true);
    removerSelfEntriesBefore = await profileRemovedNotificationsTriggeredBy(
      remover.token,
      remover.id
    );

    const departedName = `tc14gone.${uniqueId}`;
    departedEmail = identityEmail(departedName);
    await provisionIdentity(departedName);
    departed = await waitUntilUsable(departedEmail);
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
    } else if (!departed && departedEmail) {
      const email = departedEmail;
      await attempt('remove the unconfirmed departed user', () =>
        removeUnconfirmedUser(remover.token, email)
      );
    }
    if (viewer) {
      const released = viewer;
      await attempt('release the viewer', () =>
        releaseViewer(rolesAdminToken, released)
      );
    }
    if (failures.length > 0) {
      throw new Error(
        `TC-14 cleanup left residue —\n  ${failures.join('\n  ')}`
      );
    }
  });

  test('TC-14 — the other Users Admin gets the entry, the remover does not', async () => {
    test.setTimeout(120_000);

    // By identity: a NEW entry in the viewer's centre, triggered by the remover.
    await expect
      .poll(
        async () =>
          (
            await profileRemovedNotificationsTriggeredBy(
              viewer!.token,
              remover.id
            )
          ).filter(id => !viewerEntriesBefore.includes(id)).length,
        { timeout: 60_000, intervals: [1_000, 2_000, 5_000] }
      )
      .toBeGreaterThan(0);

    // The remover's own centre must gain none. Re-read across a settle window
    // that starts once the viewer's entry exists, so a self-entry written a
    // moment after it is caught rather than raced.
    await expectNoNewIds(
      () => profileRemovedNotificationsTriggeredBy(remover.token, remover.id),
      removerSelfEntriesBefore,
      { windowMs: 10_000, intervalMs: 2_000 }
    );
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
    // already-rendered (unrefetched) list. The pool viewer may also hold
    // entries from earlier runs: every profile-removed row is rendered from
    // the same fragment, which is what this walk guards, and the API test
    // above has proved this run's entry is in the list.
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
