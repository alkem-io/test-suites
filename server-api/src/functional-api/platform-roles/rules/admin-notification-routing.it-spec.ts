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

const ctx = inject('platformRoles');

/**
 * N1.admin-notification-routing — server T109, operator ruling of 2026-10-05
 * (workspace#027 slice-b-ledger §10): each platform-admin notification goes to
 * a fixed set of target roles, and Platform Content Full Access receives none.
 *
 *   user profile created / removed → Support, Users Admin
 *   L0 space created               → Support, Users Admin, License Manager
 *   global role changed            → Roles Admin only
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

const sorted = (roles: readonly Observed[]) => [...roles].sort();

describe('N1.admin-notification-routing', () => {
  const snapshots = new Map<Observed, { id: string; admin: AdminSettings }>();
  let subject: DisposableUser | undefined;
  const cleanups: (() => Promise<unknown>)[] = [];
  const onCleanup = (fn: () => Promise<unknown>) => cleanups.push(fn);

  beforeAll(async () => {
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

  test('user profile created → Support and Users Admin only', async () => {
    subject = await createDisposableUser(ctx, 'notifn');
    const name = await displayNameOf(subject.token);
    const expected = ['PLATFORM_SUPPORT', 'PLATFORM_USERS_ADMIN'] as const;
    expect(
      await recipientsAfterSettle(
        `New user registration on Alkemio: ${name}`,
        expected
      )
    ).toEqual(sorted(expected));
  }, 120_000);

  test('global role changed → Roles Admin only (Users Admin grants a Feature role)', async () => {
    const target = subject ?? (await createDisposableUser(ctx, 'notifn'));
    subject = target;
    const name = await displayNameOf(target.token);
    const granted = await assignRole(
      ctx.tokens.PLATFORM_USERS_ADMIN,
      'FEATURE_BETA_TESTER',
      target.id
    );
    expect(granted.kind, describeOutcome(granted)).toBe('ok');
    try {
      const prefix = `Global role change on Alkemio: ${name} - added - `;
      // The role label in the subject is the notifications service's to
      // render; find this grant's subject by its prefix once it has landed.
      const findSubject = async () =>
        (await allMails()).find(m => m.subject?.startsWith(prefix))?.subject;
      let roleChangeSubject = await findSubject();
      const deadline = Date.now() + DELIVERY_TIMEOUT_MS;
      while (!roleChangeSubject && Date.now() < deadline) {
        await new Promise(resolve => setTimeout(resolve, 1_000));
        roleChangeSubject = await findSubject();
      }
      expect(roleChangeSubject, `a mail starting "${prefix}"`).toBeDefined();
      const expected = ['PLATFORM_ROLES_ADMIN'] as const;
      expect(await recipientsAfterSettle(roleChangeSubject!, expected)).toEqual(
        sorted(expected)
      );
    } finally {
      await removeRole(
        ctx.tokens.PLATFORM_USERS_ADMIN,
        'FEATURE_BETA_TESTER',
        target.id
      );
    }
  }, 120_000);

  test('L0 space created → Support, Users Admin and License Manager only', async () => {
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
    const expected = [
      'PLATFORM_SUPPORT',
      'PLATFORM_USERS_ADMIN',
      'PLATFORM_LICENSE_MANAGER',
    ] as const;
    expect(
      await recipientsAfterSettle(
        `New space created - platform-roles ${tag} ${ctx.runId}`,
        expected
      )
    ).toEqual(sorted(expected));
  }, 120_000);

  test('user profile removed → Support and Users Admin only', async () => {
    const target = subject ?? (await createDisposableUser(ctx, 'notifn'));
    const name = await displayNameOf(target.token);
    await deleteDisposableUser(ctx, target);
    subject = undefined;
    const expected = ['PLATFORM_SUPPORT', 'PLATFORM_USERS_ADMIN'] as const;
    expect(
      await recipientsAfterSettle(
        `User profile deleted from the Alkemio platform: ${name}`,
        expected
      )
    ).toEqual(sorted(expected));
  }, 120_000);
});
