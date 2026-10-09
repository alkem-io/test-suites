import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import {
  getGraphqlClient,
  NotificationEvent,
  PLATFORM_ROLE_NAMES,
} from '@alkemio/tests-lib';
import type {
  PlatformRoleName,
  SeededPlatformRoleUsers,
} from '@alkemio/tests-lib';
import {
  PLATFORM_ADMIN_ROWS,
  restorePlatformAdminRows,
  setPlatformAdminChannels,
  snapshotPlatformAdminRows,
} from '@functional-api/platform-roles/_support/platform-admin-settings';
import type { PlatformAdminSnapshot } from '@functional-api/platform-roles/_support/platform-admin-settings';
import { rawRead } from '@functional-api/platform-roles/_support/raw-request';
import { bearer } from '@functional-api/platform-roles/_support/types';
import { releasePoolUsers } from '@functional-api/platform-roles/_support/users';
import {
  cleanUp,
  platformRoleHolders,
  poolHolderWithRole,
  roleHolder,
} from './platform-admin-mail.helpers';
import type { Holder } from './platform-admin-mail.helpers';

/**
 * Who the server resolves as the recipients of each of the five platform-admin
 * notification events, asked of its own recipient resolution —
 * `notificationRecipients`, the same code path a real event goes through, read
 * against the STORED platform authorization policy.
 *
 * The routing below is written out by hand from the operator-approved matrix.
 * It is never imported from, or derived from, the server's routing table: a
 * divergence between the two is exactly what this file exists to catch.
 *
 * Holders are the 14 single-role users (`platformRoleHolders()`), each holding
 * exactly its one role. Other holders may exist on a shared stack, so every
 * assertion is about THESE users: recipients outside them are ignored, never
 * counted. Each role an actor-excluding event is routed to also gets a SECOND
 * holder for the file — a pool user granted that role — so "the actor is left
 * out" can be told apart from "everybody is left out".
 *
 * A holder whose channel is off is invisible to the resolution on that channel
 * whatever the routing, so `beforeAll` switches email, in-app and push of all
 * five platform-admin rows on for every holder — after snapshotting them — and
 * `afterAll` writes the snapshot back. Every channel is then asserted alike.
 *
 * Not observable here: the email-change event also leaves out the user whose
 * address changed. That filter sits in the server's notification adapter, after
 * resolution, so this query cannot show it.
 */

const EVENTS = [
  NotificationEvent.PlatformAdminGlobalRoleChanged,
  NotificationEvent.UserEmailChangeGlobalAdminNotification,
  NotificationEvent.PlatformAdminUserProfileCreated,
  NotificationEvent.PlatformAdminUserProfileRemoved,
  NotificationEvent.PlatformAdminSpaceCreated,
] as const;
type RoutedEvent = (typeof EVENTS)[number];

const ROUTING: Readonly<
  Record<
    RoutedEvent,
    { recipients: readonly PlatformRoleName[]; excludesActor: boolean }
  >
> = {
  [NotificationEvent.PlatformAdminGlobalRoleChanged]: {
    recipients: ['PLATFORM_ROLES_ADMIN'],
    excludesActor: true,
  },
  [NotificationEvent.UserEmailChangeGlobalAdminNotification]: {
    recipients: ['PLATFORM_USERS_ADMIN'],
    excludesActor: true,
  },
  [NotificationEvent.PlatformAdminUserProfileCreated]: {
    recipients: ['PLATFORM_USERS_ADMIN'],
    excludesActor: false,
  },
  [NotificationEvent.PlatformAdminUserProfileRemoved]: {
    recipients: ['PLATFORM_USERS_ADMIN'],
    excludesActor: true,
  },
  [NotificationEvent.PlatformAdminSpaceCreated]: {
    recipients: ['PLATFORM_SUPPORT', 'PLATFORM_LICENSE_MANAGER'],
    excludesActor: false,
  },
};

/** Never a recipient of any of the five events. */
const NEVER_RECIPIENTS: readonly PlatformRoleName[] = [
  'PLATFORM_CONTENT_FULL_ACCESS',
  'PLATFORM_AUDIT_READER',
  'PLATFORM_SPACES_READER',
  'PLATFORM_SETTINGS_ADMIN',
  'PLATFORM_RESOURCE_ADMIN',
  'PLATFORM_OPERATIONS_ADMIN',
  'FEATURE_BETA_TESTER',
  'FEATURE_VIRTUAL_ASSISTANT',
  'FEATURE_ORGANIZATION_CREATOR',
  'FEATURE_VC_CAMPAIGN',
];

const CHANNELS = [
  'emailRecipients',
  'inAppRecipients',
  'pushRecipients',
] as const;

const unique = <T>(items: readonly T[]): T[] => [...new Set(items)];

/** Every role that receives at least one of the five events. */
const ROUTED_ROLES = unique(EVENTS.flatMap(event => ROUTING[event].recipients));

/** The roles an actor-excluding event is routed to — each gets a second holder. */
const ACTOR_EXCLUDED_ROLES = unique(
  EVENTS.filter(event => ROUTING[event].excludesActor).flatMap(
    event => ROUTING[event].recipients
  )
);

/** `PLATFORM_USERS_ADMIN` → `routingusersadmin`: one stable pool slot per role. */
const poolSlot = (role: PlatformRoleName): string =>
  `routing${role
    .replace(/^PLATFORM_/, '')
    .replace(/_/g, '')
    .toLowerCase()}`;

const MY_PLATFORM_PRIVILEGES =
  'query { platform { authorization { myPrivileges } } }';

let users: SeededPlatformRoleUsers;
let roleOf: ReadonlyMap<string, PlatformRoleName> = new Map();
const secondHolders = new Map<PlatformRoleName, Holder>();
const snapshot: PlatformAdminSnapshot = [];

/** The single-role holders among `recipients`, sorted; anyone else is ignored. */
const holdersIn = (recipients: readonly { id: string }[]): PlatformRoleName[] =>
  recipients.flatMap(({ id }) => roleOf.get(id) ?? []).sort();

const idsOf = (recipients: readonly { id: string }[]): string[] =>
  recipients.map(({ id }) => id);

const sorted = (roles: readonly PlatformRoleName[]): PlatformRoleName[] =>
  [...roles].sort();

const secondHolder = (role: PlatformRoleName): Holder => {
  const holder = secondHolders.get(role);
  if (!holder) throw new Error(`no second holder of ${role} was set up`);
  return holder;
};

/** The query is gated on PLATFORM_SETTINGS_ADMIN — its holder is the caller. */
const resolveRecipients = async (event: RoutedEvent, triggeredBy?: string) =>
  (
    await getGraphqlClient().notificationRecipients(
      { eventData: { eventType: event, triggeredBy } },
      bearer(users.tokens.PLATFORM_SETTINGS_ADMIN)
    )
  ).data.notificationRecipients;

beforeAll(async () => {
  users = await platformRoleHolders();
  roleOf = new Map(
    PLATFORM_ROLE_NAMES.map(role => [users.userIds[role], role] as const)
  );
  const holders = PLATFORM_ROLE_NAMES.map(role => roleHolder(users, role));
  snapshot.push(...(await snapshotPlatformAdminRows(holders)));
  for (const role of ACTOR_EXCLUDED_ROLES) {
    const holder = await poolHolderWithRole(users, poolSlot(role), role);
    secondHolders.set(role, holder);
    snapshot.push(...(await snapshotPlatformAdminRows([holder])));
  }
  await setPlatformAdminChannels(
    [...holders, ...secondHolders.values()],
    PLATFORM_ADMIN_ROWS,
    { email: true, inApp: true, push: true }
  );
});

afterAll(async () => {
  await cleanUp([
    ['restore the holders settings', () => restorePlatformAdminRows(snapshot)],
    [
      'release the second holders',
      async () => {
        if (secondHolders.size > 0) {
          await releasePoolUsers(
            users.tokens.PLATFORM_ROLES_ADMIN,
            [...secondHolders.values()].map(holder => holder.id)
          );
        }
      },
    ],
  ]);
});

describe('platform-admin notification routing', () => {
  test('the matrix accounts for every role exactly once — routed to some event, or never a recipient', () => {
    expect(sorted([...ROUTED_ROLES, ...NEVER_RECIPIENTS])).toEqual(
      sorted(PLATFORM_ROLE_NAMES)
    );
  });

  test(`RECEIVE_NOTIFICATIONS_ADMIN on the platform is held by exactly ${sorted(ROUTED_ROLES).join(' + ')}`, async () => {
    const holding: PlatformRoleName[] = [];
    for (const role of PLATFORM_ROLE_NAMES) {
      const { platform } = await rawRead<{
        platform: { authorization: { myPrivileges: string[] | null } | null };
      }>(users.tokens[role], MY_PLATFORM_PRIVILEGES);
      const privileges = platform.authorization?.myPrivileges;
      // An unreadable list would hide the privilege as surely as a missing one.
      expect(privileges, role).toEqual(expect.any(Array));
      if (privileges?.includes('RECEIVE_NOTIFICATIONS_ADMIN')) {
        holding.push(role);
      }
    }
    expect(sorted(holding)).toEqual(sorted(ROUTED_ROLES));
  });

  describe.each(EVENTS)('%s', event => {
    const { recipients, excludesActor } = ROUTING[event];
    const routedTo = sorted(recipients);

    test.each(CHANNELS)(
      `%s: resolves ${recipients.join(' + ')} and no other role holder`,
      async channel => {
        const resolved = await resolveRecipients(event);
        expect(holdersIn(resolved[channel])).toEqual(routedTo);
      }
    );

    if (excludesActor) {
      test('the acting operator is left out on every channel, and nobody else is', async () => {
        for (const role of recipients) {
          const fixtureHolder = users.userIds[role];
          const poolHolder = secondHolder(role).id;
          // Both directions: whichever of the two holders acts, the other one
          // still resolves.
          for (const [actor, other] of [
            [fixtureHolder, poolHolder],
            [poolHolder, fixtureHolder],
          ] as const) {
            const acted = await resolveRecipients(event, actor);
            expect(acted.triggeredBy?.id).toBe(actor);
            const expected =
              actor === fixtureHolder
                ? sorted(recipients.filter(recipient => recipient !== role))
                : routedTo;
            for (const channel of CHANNELS) {
              const resolved = idsOf(acted[channel]);
              expect(resolved, `${channel}: the actor`).not.toContain(actor);
              expect(resolved, `${channel}: the other ${role}`).toContain(
                other
              );
              expect(holdersIn(acted[channel]), channel).toEqual(expected);
            }
          }
        }

        // Exclusion is by identity: an actor who is not a recipient removes no one.
        const bystander = await resolveRecipients(
          event,
          users.userIds.PLATFORM_SETTINGS_ADMIN
        );
        for (const channel of CHANNELS) {
          expect(holdersIn(bystander[channel]), channel).toEqual(routedTo);
          for (const role of recipients) {
            expect(idsOf(bystander[channel]), channel).toContain(
              secondHolder(role).id
            );
          }
        }
      });
    } else {
      test('the acting operator is NOT left out, on any channel', async () => {
        for (const role of recipients) {
          const actor = users.userIds[role];
          const acted = await resolveRecipients(event, actor);
          expect(acted.triggeredBy?.id).toBe(actor);
          for (const channel of CHANNELS) {
            expect(holdersIn(acted[channel]), channel).toEqual(routedTo);
          }
        }
      });
    }
  });
});
