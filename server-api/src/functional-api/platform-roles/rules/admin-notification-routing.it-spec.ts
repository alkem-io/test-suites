import { afterAll, beforeAll, describe, expect, inject, test } from 'vitest';
import axios from 'axios';
import { testConfiguration } from '@alkemio/tests-lib';
import type { MailItem } from '@alkemio/tests-lib';
import type { PlatformRole } from '../capabilities.data';
import {
  createDisposableUser,
  createHostedSpace,
  deleteDisposableUser,
  spaceHost,
} from '../_support/disposable-user';
import type { DisposableUser } from '../_support/disposable-user';
import { describeOutcome } from '../_support/outcome';
import { assignRole, removeRole } from '../_support/role-set';
import { rawRead } from '../_support/raw-request';
import { emailOf } from '../_support/role-users';
import { acquirePoolUser, releasePoolUsers } from '../_support/users';
import type { RegisteredUser } from '../_support/users';

const ctx = inject('platformRoles');

/**
 * N1.admin-notification-routing — the workspace#065 routing table (spec 065,
 * Session 2026-10-07; server#6616), which supersedes the interim server T109
 * routing of 2026-10-05: each platform-admin notification goes to a fixed set
 * of target roles, and Platform Content Full Access receives none.
 *
 *   user profile created → Users Admin
 *   user profile removed → Users Admin, minus the operator who removed (FR-011)
 *   L0 space created     → Support, License Manager
 *   global role changed  → Roles Admin, minus the operator (FR-011); a
 *                          Feature-role grant emits nothing at all (FR-013)
 *
 * The two events that leave out their operator are driven by a SECOND holder
 * of the routed role — a pool user — so the observed single-role holder is a
 * bystander who must receive; otherwise "the operator is left out" and "the
 * mail is never sent" would both read as nobody.
 *
 * The shared notification personas cannot tell these apart: `admin@alkem.io`
 * holds all of those roles at once, so it receives every event whichever role
 * the server routes on. The 14 single-role users can — each event is observed
 * at the five admin-family users, with the event's email setting switched ON
 * for all five, so a user who gets nothing was not routed to rather than muted.
 * Mails are matched by recipient AND by a subject naming this run's own
 * entity, so concurrent specs on the shared inbox cannot leak in.
 */
const OBSERVED = [
  'PLATFORM_ROLES_ADMIN',
  'PLATFORM_USERS_ADMIN',
  'PLATFORM_SUPPORT',
  'PLATFORM_LICENSE_MANAGER',
  'PLATFORM_CONTENT_FULL_ACCESS',
] as const satisfies readonly PlatformRole[];
type Observed = (typeof OBSERVED)[number];

const EVENTS = [
  'userProfileCreated',
  'userProfileRemoved',
  'spaceCreated',
  'userGlobalRoleChanged',
] as const;
type Channels = { email: boolean; inApp: boolean };
type AdminSettings = Record<(typeof EVENTS)[number], Channels>;

const ADMIN_SETTINGS = `query { me { user { id settings { notification { platform { admin {
  ${EVENTS.map(e => `${e} { email inApp }`).join(' ')}
} } } } } } }`;
const UPDATE_SETTINGS =
  'mutation($data: UpdateUserSettingsInput!) { updateUserSettings(settingsData: $data) { id } }';

const readAdminSettings = async (token: string) =>
  (
    await rawRead<{
      me: {
        user: {
          id: string;
          settings: { notification: { platform: { admin: AdminSettings } } };
        };
      };
    }>(token, ADMIN_SETTINGS)
  ).me.user;

const writeAdminSettings = (
  token: string,
  userID: string,
  admin: Record<string, Partial<Channels>>
) =>
  rawRead(token, UPDATE_SETTINGS, {
    data: { userID, settings: { notification: { platform: { admin } } } },
  });

const displayNameOf = async (token: string): Promise<string> =>
  (
    await rawRead<{ me: { user: { profile: { displayName: string } } } }>(
      token,
      'query { me { user { profile { displayName } } } }'
    )
  ).me.user.profile.displayName;

/** Delivery is asynchronous; an absence only counts once the expected mail has landed AND this long has passed. */
const SETTLE_MS = 5_000;
const DELIVERY_TIMEOUT_MS = 45_000;

/**
 * EVERY page of the shared inbox. `getMailsData` reads page 1 only, and the
 * rules project fills the inbox fast enough (each disposable user's lifecycle
 * mails every admin) that a mail from a minute ago is already on page 3 — it
 * read as "never sent" on the first run of this spec.
 */
const allMails = async (): Promise<MailItem[]> => {
  const mails: MailItem[] = [];
  for (let page = 1; ; page++) {
    const { data } = await axios.get<{
      mailItems?: MailItem[];
      totalPages?: number;
    }>(testConfiguration.endPoints.mailSlurper, {
      params: { pageNumber: page },
    });
    mails.push(...(data.mailItems ?? []));
    if (page >= (data.totalPages ?? 0)) return mails;
  }
};

/** Which observed role users received a mail with exactly this subject. */
const observedRecipientsOf = async (subject: string): Promise<Observed[]> => {
  const items = await allMails();
  const addresses = new Set(
    items
      .filter(m => m.subject === subject)
      .flatMap(m => m.toAddresses ?? [])
      .map(a => a.toLowerCase())
  );
  return OBSERVED.filter(role => addresses.has(emailOf(role).toLowerCase()));
};

/**
 * Waits until every `expected` recipient has the mail, then for the settle
 * period, and returns who got it. A recipient outside `expected` ends the wait
 * at once — the routing claim is already broken.
 */
const recipientsAfterSettle = async (
  subject: string,
  expected: readonly Observed[]
): Promise<Observed[]> => {
  const deadline = Date.now() + DELIVERY_TIMEOUT_MS;
  let got = await observedRecipientsOf(subject);
  while (
    !expected.every(r => got.includes(r)) &&
    got.every(r => expected.includes(r)) &&
    Date.now() < deadline
  ) {
    await new Promise(resolve => setTimeout(resolve, 1_000));
    got = await observedRecipientsOf(subject);
  }
  if (got.every(r => expected.includes(r))) {
    await new Promise(resolve => setTimeout(resolve, SETTLE_MS));
    got = await observedRecipientsOf(subject);
  }
  return [...got].sort();
};

/**
 * One entry per observed recipient of every mail whose subject starts with
 * `prefix` — duplicates KEPT, so a second mail to the same role is visible.
 * Waits like `recipientsAfterSettle`.
 */
const deliveriesAfterSettle = async (
  prefix: string,
  expected: readonly Observed[]
): Promise<Observed[]> => {
  const read = async () =>
    (await allMails())
      .filter(m => m.subject?.startsWith(prefix))
      .flatMap(m => (m.toAddresses ?? []).map(a => a.toLowerCase()))
      .flatMap(address =>
        OBSERVED.filter(role => emailOf(role).toLowerCase() === address)
      )
      .sort();
  const deadline = Date.now() + DELIVERY_TIMEOUT_MS;
  let got = await read();
  while (
    !expected.every(r => got.includes(r)) &&
    got.every(r => expected.includes(r)) &&
    Date.now() < deadline
  ) {
    await new Promise(resolve => setTimeout(resolve, 1_000));
    got = await read();
  }
  if (got.every(r => expected.includes(r))) {
    await new Promise(resolve => setTimeout(resolve, SETTLE_MS));
    got = await read();
  }
  return got;
};

const sorted = (roles: readonly Observed[]) => [...roles].sort();

const DELETE_USER =
  'mutation($id: UUID!) { deleteUser(deleteData: { ID: $id, deleteIdentity: true }) { id } }';

describe('N1.admin-notification-routing', () => {
  const snapshots = new Map<Observed, { id: string; admin: AdminSettings }>();
  let subject: DisposableUser | undefined;
  const cleanups: (() => Promise<unknown>)[] = [];
  const onCleanup = (fn: () => Promise<unknown>) => cleanups.push(fn);
  /** Second holders: the operators of the two operator-excluding events. */
  let secondRolesAdmin: RegisteredUser;
  let secondUsersAdmin: RegisteredUser;

  const poolHolder = async (
    slot: string,
    role: 'PLATFORM_ROLES_ADMIN' | 'PLATFORM_USERS_ADMIN'
  ): Promise<RegisteredUser> => {
    const user = await acquirePoolUser(ctx.tokens.PLATFORM_ROLES_ADMIN, slot);
    onCleanup(() =>
      releasePoolUsers(ctx.tokens.PLATFORM_ROLES_ADMIN, [user.id])
    );
    const granted = await assignRole(
      ctx.tokens.PLATFORM_ROLES_ADMIN,
      role,
      user.id
    );
    expect(granted.kind, describeOutcome(granted)).toBe('ok');
    return user;
  };

  beforeAll(async () => {
    secondRolesAdmin = await poolHolder('n1rolesadmin', 'PLATFORM_ROLES_ADMIN');
    secondUsersAdmin = await poolHolder('n1usersadmin', 'PLATFORM_USERS_ADMIN');
    for (const role of OBSERVED) {
      const { id, settings } = await readAdminSettings(ctx.tokens[role]);
      snapshots.set(role, { id, admin: settings.notification.platform.admin });
    }
    // Email only — the in-app channel is left as each user had it.
    const on = Object.fromEntries(EVENTS.map(e => [e, { email: true }]));
    for (const role of OBSERVED) {
      await writeAdminSettings(ctx.tokens[role], snapshots.get(role)!.id, on);
    }
    // The switch really is on for every observed user — otherwise an absent
    // mail below would be a muted recipient, not a routing decision.
    for (const role of OBSERVED) {
      const { settings } = await readAdminSettings(ctx.tokens[role]);
      for (const event of EVENTS) {
        expect(
          settings.notification.platform.admin[event].email,
          `${role} ${event}`
        ).toBe(true);
      }
    }
  }, 120_000);

  afterAll(async () => {
    const failures: string[] = [];
    for (const cleanup of cleanups) {
      await cleanup().catch(e => failures.push((e as Error).message));
    }
    if (subject) {
      await deleteDisposableUser(ctx, subject).catch(e =>
        failures.push((e as Error).message)
      );
    }
    // Restore exactly what each user had — the shared fixtures must not leak
    // admin mail into any other suite's exact-count assertions.
    for (const [role, { id, admin }] of snapshots) {
      try {
        await writeAdminSettings(ctx.tokens[role], id, admin);
      } catch (e) {
        failures.push(`${role}: ${(e as Error).message}`);
      }
    }
    expect(failures, 'cleanup and settings restore').toEqual([]);
  });

  test('user profile created → Users Admin only', async () => {
    subject = await createDisposableUser(ctx, 'notifn');
    const name = await displayNameOf(subject.token);
    const expected = ['PLATFORM_USERS_ADMIN'] as const;
    expect(
      await recipientsAfterSettle(
        `New user registration on Alkemio: ${name}`,
        expected
      )
    ).toEqual(sorted(expected));
  }, 120_000);

  test('global role changed → Roles Admin only, minus the operator; a Feature-role grant emits nothing', async () => {
    const target = subject ?? (await createDisposableUser(ctx, 'notifn'));
    subject = target;
    const name = await displayNameOf(target.token);
    // FR-013: granted FIRST, by Users Admin. Had it emitted, the fixture Roles
    // Admin — not its operator — would hold a second mail by the time the
    // anchor below has landed and settled.
    const feature = await assignRole(
      ctx.tokens.PLATFORM_USERS_ADMIN,
      'FEATURE_BETA_TESTER',
      target.id
    );
    // The anchor: a Platform-role grant by the SECOND Roles Admin, so the
    // fixture Roles Admin is a bystander who must receive it (FR-011).
    const platform = await assignRole(
      secondRolesAdmin.token,
      'PLATFORM_RESOURCE_ADMIN',
      target.id
    );
    try {
      expect(feature.kind, describeOutcome(feature)).toBe('ok');
      expect(platform.kind, describeOutcome(platform)).toBe('ok');
      // The role label in the subject is the notifications service's to
      // render, so every grant mail on this target is matched by its prefix.
      // Exactly ONE delivery, to Roles Admin: the Platform grant's.
      expect(
        await deliveriesAfterSettle(
          `Global role change on Alkemio: ${name} - added - `,
          ['PLATFORM_ROLES_ADMIN']
        )
      ).toEqual(['PLATFORM_ROLES_ADMIN']);
    } finally {
      await removeRole(
        secondRolesAdmin.token,
        'PLATFORM_RESOURCE_ADMIN',
        target.id
      );
      await removeRole(
        ctx.tokens.PLATFORM_USERS_ADMIN,
        'FEATURE_BETA_TESTER',
        target.id
      );
    }
  }, 120_000);

  test('L0 space created → Support and License Manager only', async () => {
    const host = await spaceHost(ctx);
    const tag = 'n1space';
    const spaceId = await createHostedSpace(ctx, host, tag);
    onCleanup(() =>
      rawRead(
        host.token,
        'mutation($id: UUID!) { deleteSpace(deleteData: { ID: $id }) { id } }',
        { id: spaceId }
      )
    );
    const expected = ['PLATFORM_SUPPORT', 'PLATFORM_LICENSE_MANAGER'] as const;
    expect(
      await recipientsAfterSettle(
        `New space created - platform-roles ${tag} ${ctx.runId}`,
        expected
      )
    ).toEqual(sorted(expected));
  }, 120_000);

  test('user profile removed → Users Admin only, minus the operator who removed', async () => {
    const target = subject ?? (await createDisposableUser(ctx, 'notifn'));
    const name = await displayNameOf(target.token);
    // Removed by the SECOND Users Admin, so the fixture Users Admin is a
    // bystander who must receive it (FR-011). The target hosts no space.
    await rawRead(secondUsersAdmin.token, DELETE_USER, { id: target.id });
    subject = undefined;
    const expected = ['PLATFORM_USERS_ADMIN'] as const;
    expect(
      await recipientsAfterSettle(
        `User profile deleted from the Alkemio platform: ${name}`,
        expected
      )
    ).toEqual(sorted(expected));
  }, 120_000);
});
