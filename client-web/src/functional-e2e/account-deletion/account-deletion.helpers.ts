// plan: client-web/src/functional-e2e/account-deletion/account-deletion-test-plan.md
// (workspace#054, client-web#10107) — the portable delta after test-suites#620.
//
// ⚠ Never use `createAuthenticatedSessionFixture` in this area. It reuses a
// disk-cached storage state for the whole run, so the session's `created_at`
// can exceed the 15-minute freshness window the server checks on self
// deletion — which looks exactly like a product bug. Every sign-in here is a
// fresh per-test browser context (`signIn`, or `openLoggedInSession` from
// `session-revocation.helpers.ts` when a distinct disposable subject needs
// its own cookie session).
//
// `signIn` / `goToSecuritySettings` are lifted from
// `user-profile/mcp-api-keys-mint.spec.ts` — their third copy in this repo.
// test-suites#620 (merged 2026-09-03) brought `delete-account.helpers.ts`,
// now beside this file after the directory reconciliation; it carries a fourth
// copy of the same walk. Deduplicating the two helper files is a follow-up —
// kept separate here so the loopback-only walks (us1/us2/us3) and the portable
// nightly walks stay independently runnable.

import { Page } from '@playwright/test';
import { expect } from '@playwright/test';
import axios from 'axios';
import {
  assignPlatformRole as assignPlatformRoleToUser,
  AuthorizationPrivilege,
  CalloutContributionType,
  createContributionOnCallout,
  deleteUser,
  getUserToken,
  introspectEnumValues,
  NotificationEvent,
  provisionTestIdentities,
  readMyNotifications,
  readMyPlatformRoles,
  readMyPrivileges,
  readMyUser,
  readMyUserSettings,
  registerTestUser,
  removePlatformRoleFromUser,
  RoleName,
  testConfiguration,
  updateUserSettings,
} from '@alkemio/tests-lib';
import type { PlatformRoleName } from '@alkemio/tests-lib';
import { must } from '../helpers/lib-actor.helper';
import {
  acceptAllCookiesButton,
  logInHeaderLink,
} from '../authentication/common-authentication-page-elements';

import { fillSecret } from '../helpers/login.helper';
export const baseUrl = process.env.ALKEMIO_BASE_URL || 'http://localhost:3000';
export const adminEmail = process.env.AUTH_ADMIN_EMAIL || 'admin@alkem.io';
export const defaultPassword =
  process.env.AUTH_TEST_HARNESS_PASSWORD || 'change_me';

/**
 * Sign in through the real SPA form (default context/page — never a cached
 * storage state). Mirrors `mcp-api-keys-mint.spec.ts`'s walk.
 */
export const signIn = async (
  page: Page,
  email: string = adminEmail,
  password: string = defaultPassword
): Promise<void> => {
  await page.goto(baseUrl);
  if (
    await acceptAllCookiesButton(page)
      .isVisible({ timeout: 3000 })
      .catch(() => false)
  ) {
    await acceptAllCookiesButton(page).click();
  }
  if (
    await logInHeaderLink(page)
      .isVisible({ timeout: 5000 })
      .catch(() => false)
  ) {
    await logInHeaderLink(page).click();
  } else {
    await page.goto(`${baseUrl}/login`);
  }
  await page.getByRole('textbox', { name: 'E-Mail' }).fill(email);
  await fillSecret(page.getByRole('textbox', { name: 'Password' }), password);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await page.waitForURL(url => !url.pathname.startsWith('/login'), {
    timeout: 15000,
  });
  // The URL leaves /login one tick before the session is usable. Wait for the
  // authenticated-only "Notifications" header control first (it proves the
  // header has rendered), then assert the "Log in" link is gone — the other
  // way round the absence passes on a still-blank page (same ordering as
  // `expectSignedIn`).
  await expect(
    page.getByRole('banner').getByRole('button', { name: 'Notifications', exact: true })
  ).toBeVisible();
  await expect(logInHeaderLink(page)).toHaveCount(0);
};

/**
 * Navigate to the SIGNED-IN caller's OWN Security settings tab, resolving
 * their nameID from the header's "My Account" link rather than hardcoding
 * it — keeps this valid regardless of which identity the environment seeds.
 */
export const goToSecuritySettings = async (page: Page): Promise<void> => {
  await page.goto(`${baseUrl}/home`);
  const accountLink = page.getByRole('link', { name: 'My Account' });
  await accountLink.waitFor({ state: 'visible', timeout: 15000 });
  const href = await accountLink.getAttribute('href');
  const nameId = href?.match(/\/user\/([^/]+)\/settings/)?.[1];
  expect(nameId).toBeTruthy();
  await page.goto(`${baseUrl}/user/${nameId}/settings/security`);
};

/**
 * Navigate directly to an ARBITRARY user's Security settings tab by nameID —
 * for the cross-user visibility check (TC-16), where the signed-in caller is
 * never the subject whose settings are being opened.
 */
export const gotoUserSecuritySettings = async (
  page: Page,
  nameId: string
): Promise<void> => {
  await page.goto(`${baseUrl}/user/${nameId}/settings/security`);
};

/**
 * Create a Post contribution on a callout AS the given user's own bearer, so
 * the activity log's `triggeredBy` genuinely resolves to that user (never an
 * admin proxy).
 */
export const createPostContributionAsUser = async (
  token: string,
  calloutID: string,
  displayName: string
): Promise<{ postId: string; postDisplayName: string }> => {
  const response = await createContributionOnCallout(
    {
      calloutID,
      type: CalloutContributionType.Post,
      post: {
        profileData: { displayName },
      },
    },
    { bearerToken: token }
  );

  const errors = response.error?.errors;
  if (errors?.length) {
    throw new Error(
      `createContributionOnCallout failed: ${JSON.stringify(errors)}`
    );
  }
  const post = response.data?.createContributionOnCallout?.post;
  if (!post?.id) {
    throw new Error(
      `createContributionOnCallout returned no post: ${JSON.stringify(response.data)}`
    );
  }
  return { postId: post.id, postDisplayName: post.profile.displayName };
};

/**
 * Resolve the Alkemio user id for the caller identified by `token` (via
 * `me { user { id } }`) — the smallest probe available, matching
 * `session-revocation.helpers.ts::resolveAlkemioUserId`.
 */
export const resolveUserIdFromToken = async (
  token: string
): Promise<string> => {
  const response = await readMyUser({ bearerToken: token });
  const userId = response.data?.me?.user?.id;
  if (!userId) {
    throw new Error(
      `Unable to resolve user id from token: ${JSON.stringify(response.error?.errors ?? response.data)}`
    );
  }
  return userId;
};

// --------------------------------------------------------------------------
// TC-14 on the platform-role model. The profile-removed notification goes to
// Platform Users Admin holders, minus the operator who removed the user — so
// the walk needs two holders: one removes, the other looks.
// --------------------------------------------------------------------------

/**
 * Fails — never skips — unless the server under test is on the platform-role
 * model: its `RoleName` carries PLATFORM_USERS_ADMIN and no longer GLOBAL_ADMIN.
 * Asked by anonymous introspection, so it runs before any identity is
 * registered or signed in.
 */
export const requirePlatformRoleModel = async (): Promise<void> => {
  const endpoint = testConfiguration.endPoints.graphql.private;
  const response = await introspectEnumValues('RoleName');
  const roles: string[] | undefined = response.body?.data?.__type?.enumValues?.map(
    (value: { name: string }) => value.name
  );
  const problems = !roles
    ? [`its RoleName enum could not be read (HTTP ${response.status})`]
    : [
        ...(roles.includes('PLATFORM_USERS_ADMIN')
          ? []
          : ['RoleName has no PLATFORM_USERS_ADMIN']),
        ...(roles.includes('GLOBAL_ADMIN')
          ? ['RoleName still has GLOBAL_ADMIN']
          : []),
      ];
  if (problems.length > 0) {
    throw new Error(
      `Precondition failed: TC-14 needs a server on the platform-role model, where Platform Users Admin replaces Global Admin — ${endpoint}: ${problems.join('; ')}`
    );
  }
};

export type UsableUser = {
  email: string;
  displayName: string;
  userId: string;
  token: string;
};

/** The sign-in email of a harness identity named `userName`. */
export const identityEmail = (userName: string): string =>
  `${userName}@alkem.io`;

/**
 * Creates the sign-in identity for `userName` — through the Kratos ADMIN API
 * where it is configured (an already-verified identity, no self-service
 * password checks), by self-service registration otherwise. Does not wait for
 * the platform user: take the identity's handle (`identityEmail`) BEFORE
 * calling this, so a cleanup can remove it even if that user never appears.
 *
 * `userName`: `<first>.<last>`, lowercase letters and digits.
 */
export const provisionIdentity = async (userName: string): Promise<void> => {
  if (testConfiguration.endPoints.kratos.admin) {
    await provisionTestIdentities([userName]);
  } else {
    await registerTestUser(userName);
  }
};

const USABLE_TIMEOUT_MS = 150_000;
const USABLE_POLL_MS = 3_000;

/**
 * The user signing in as `email`, returned once its first sign-in has created
 * the platform user AND that user's authorization is in place — it holds
 * UPDATE on itself. The first sign-in runs user creation inside Kratos's login
 * webhook, and the user row is visible before its authorization policy is
 * written (on a busy stack by tens of seconds), so readiness is polled,
 * bounded.
 */
export const waitUntilUsable = async (email: string): Promise<UsableUser> => {
  const deadline = Date.now() + USABLE_TIMEOUT_MS;
  for (;;) {
    try {
      const token = await getUserToken(email);
      const { me } = must(
        await readMyPrivileges({ bearerToken: token }),
        `read privileges of ${email}`
      );
      if (
        !me.user?.authorization?.myPrivileges?.includes(
          AuthorizationPrivilege.Update
        )
      ) {
        throw new Error('authorization not in place yet');
      }
      return {
        email,
        displayName: me.user.profile!.displayName,
        userId: me.user.id,
        token,
      };
    } catch (e) {
      if (Date.now() > deadline) {
        throw new Error(
          `${email} could not sign in within ${USABLE_TIMEOUT_MS / 1000}s: ${(e as Error).message}`
        );
      }
      await new Promise(resolve => setTimeout(resolve, USABLE_POLL_MS));
    }
  }
};

/**
 * Removes what a provisioning left behind when its user was never confirmed
 * usable: the platform user together with its identity if the user did appear
 * after all, otherwise the bare Kratos identity — through the admin API, the
 * only way to remove one. Without that API the leftover is reported, never
 * silently kept.
 */
export const removeUnconfirmedUser = async (
  removerToken: string,
  email: string
): Promise<void> => {
  const userId = await getUserToken(email)
    .then(resolveUserIdFromToken)
    .catch(() => undefined);
  if (userId) {
    await deleteUserAs(removerToken, userId);
    return;
  }
  const admin = testConfiguration.endPoints.kratos.admin;
  if (!admin) {
    throw new Error(
      `${email} may be left behind: it never became a platform user, and without the Kratos admin API its identity cannot be removed`
    );
  }
  // The same admin paths `provisionTestIdentities` uses on this base URL.
  const identities = `${admin.replace(/\/$/, '')}/admin/identities`;
  const { data } = await axios.get<
    { id: string; traits?: { email?: string } }[]
  >(identities, { params: { credentials_identifier: email } });
  for (const identity of data.filter(i => i.traits?.email === email)) {
    await axios.delete(`${identities}/${identity.id}`);
  }
};

/** As Platform Roles Admin — the only role that assigns `PLATFORM_*` roles. */
export const assignPlatformRole = async (
  rolesAdminToken: string,
  actorID: string,
  role: PlatformRoleName
): Promise<void> => {
  must(
    await assignPlatformRoleToUser(actorID, role as RoleName, {
      bearerToken: rolesAdminToken,
    }),
    `assign ${role} to ${actorID}`
  );
};

/** The platform roles the caller holds, `REGISTERED` aside. */
const platformRolesOf = async (token: string): Promise<string[]> => {
  const { platform } = must(
    await readMyPlatformRoles({ bearerToken: token }),
    'read own platform roles'
  );
  return platform.roleSet.myRoles.filter(role => role !== 'REGISTERED');
};

/**
 * Revokes every platform role `user` holds, as Platform Roles Admin, and fails
 * unless none is left.
 */
export const revokeAllPlatformRoles = async (
  rolesAdminToken: string,
  user: Pick<UsableUser, 'userId' | 'token' | 'email'>
): Promise<void> => {
  for (const role of await platformRolesOf(user.token)) {
    must(
      await removePlatformRoleFromUser(user.userId, role as RoleName, {
        bearerToken: rolesAdminToken,
      }),
      `remove ${role} from ${user.email}`
    );
  }
  const left = await platformRolesOf(user.token);
  if (left.length > 0) {
    throw new Error(`${user.email} still holds ${left.join(', ')}`);
  }
};

/**
 * TC-14's viewer is a POOL user: one persistent identity, registered once per
 * environment and NORMALISED — every platform role revoked — when acquired and
 * again when released, so a role granted by a run that never reached its
 * cleanup does not outlive the next run. The same arrangement as the
 * platform-roles suite's pool users.
 */
const VIEWER_POOL_USER = 'prpool.tc14viewer';

export const acquireViewer = async (
  rolesAdminToken: string
): Promise<UsableUser> => {
  const email = identityEmail(VIEWER_POOL_USER);
  // From the second run on the identity exists and signing in is enough.
  const exists = await getUserToken(email).then(
    () => true,
    () => false
  );
  if (!exists) await provisionIdentity(VIEWER_POOL_USER);
  const viewer = await waitUntilUsable(email);
  await revokeAllPlatformRoles(rolesAdminToken, viewer);
  return viewer;
};

/** Leaves the viewer in place, normalised. */
export const releaseViewer = (
  rolesAdminToken: string,
  viewer: UsableUser
): Promise<void> => revokeAllPlatformRoles(rolesAdminToken, viewer);

/** Removes the user AND its sign-in identity, with the caller's own token. */
export const deleteUserAs = async (
  token: string,
  userId: string
): Promise<void> => {
  must(
    await deleteUser(userId, { bearerToken: token }, true),
    `delete user ${userId}`
  );
};

/**
 * `platform.admin.userProfileRemoved` ships `inApp: false` by default
 * (`user.service.ts::getDefaultUserSettings`) — an operational admin has to
 * opt in before the notification centre shows anything for this event at
 * all. Read and written by the user THEMSELVES: on the platform-role model
 * only the owner holds UPDATE on their settings.
 */
export const getProfileRemovedInApp = async (
  token: string
): Promise<boolean> => {
  const { me } = must(
    await readMyUserSettings({ bearerToken: token }),
    'read own notification settings'
  );
  return me.user!.settings.notification.platform.admin.userProfileRemoved.inApp;
};

export const setProfileRemovedInApp = async (
  token: string,
  userID: string,
  inApp: boolean
): Promise<void> => {
  must(
    await updateUserSettings(
      userID,
      {
        notification: {
          platform: { admin: { userProfileRemoved: { inApp } } },
        },
      },
      { bearerToken: token }
    ),
    `set userProfileRemoved.inApp=${inApp} for ${userID}`
  );
};

/**
 * Ids of the caller's OWN profile-removed in-app notifications that `actorId`
 * triggered. Newest first, in the server's default page of 25 — which always
 * holds the ones a test has just caused.
 */
export const profileRemovedNotificationsTriggeredBy = async (
  token: string,
  actorId: string
): Promise<string[]> => {
  const { me } = must(
    await readMyNotifications(
      { bearerToken: token },
      { types: [NotificationEvent.PlatformAdminUserProfileRemoved] }
    ),
    'read own profile-removed notifications'
  );
  return me.notifications.inAppNotifications
    .filter(notification => notification.triggeredBy?.id === actorId)
    .map(notification => notification.id);
};

/**
 * Re-reads `read` every `intervalMs` until `windowMs` has passed, failing on
 * the first read that returns an id not in `before` — for a "nothing new
 * arrives" assertion that must not be decided by a single early read.
 */
export const expectNoNewIds = async (
  read: () => Promise<string[]>,
  before: readonly string[],
  { windowMs, intervalMs }: { windowMs: number; intervalMs: number }
): Promise<void> => {
  const deadline = Date.now() + windowMs;
  for (;;) {
    const fresh = (await read()).filter(id => !before.includes(id));
    expect(fresh).toEqual([]);
    if (Date.now() >= deadline) return;
    await new Promise(resolve => setTimeout(resolve, intervalMs));
  }
};
