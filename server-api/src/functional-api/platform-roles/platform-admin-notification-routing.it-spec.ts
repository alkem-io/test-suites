import { afterAll, beforeAll, describe, expect, inject, test } from 'vitest';
import { getGraphqlClient, NotificationEvent } from '@alkemio/tests-lib';
import { PLATFORM_ROLES } from './capabilities.data';
import type { PlatformRole } from './capabilities.data';
import { bearer } from './_support/types';
import {
  PLATFORM_ADMIN_ROWS,
  restorePlatformAdminRows,
  setPlatformAdminEmail,
  snapshotPlatformAdminRows,
} from './_support/platform-admin-settings';
import type { PlatformAdminSnapshot } from './_support/platform-admin-settings';

/**
 * Who the server resolves as the recipients of each of the five platform-admin
 * notification events (workspace#065), asked of its own recipient resolution —
 * `notificationRecipients`, the same code path a real event goes through, read
 * against the STORED platform authorization policy.
 *
 * The routing below is written out by hand from the operator-approved matrix.
 * It is never imported from, or derived from, the server's routing table: a
 * divergence between the two is exactly what this file exists to catch.
 *
 * Holders are the 14 single-role users of the run (`inject('platformRoles')`),
 * each holding exactly its one role. Other holders may exist on a shared stack,
 * so every assertion is about THESE users: recipients outside them are ignored,
 * never counted.
 *
 * A holder whose email row is off is invisible to the resolution whatever the
 * routing, so `beforeAll` switches the EMAIL channel of all five platform-admin
 * rows on for all 14 — after snapshotting them — and `afterAll` writes the
 * snapshot back. In-app and push stay as found: they can only be checked for
 * not naming a holder the event is not routed to.
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
    { recipients: readonly PlatformRole[]; excludesActor: boolean }
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
const NEVER_RECIPIENTS: readonly PlatformRole[] = [
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

const ctx = inject('platformRoles');
const OWNERS = PLATFORM_ROLES.map(role => ({
  id: ctx.userIds[role],
  token: ctx.tokens[role],
}));
const ROLE_OF = new Map(PLATFORM_ROLES.map(role => [ctx.userIds[role], role]));

/** The single-role holders among `recipients`, sorted; anyone else is ignored. */
const holdersIn = (recipients: readonly { id: string }[]): PlatformRole[] =>
  recipients.flatMap(({ id }) => ROLE_OF.get(id) ?? []).sort();

const sorted = (roles: readonly PlatformRole[]): PlatformRole[] =>
  [...roles].sort();

/** The query is gated on PLATFORM_SETTINGS_ADMIN — its holder is the caller. */
const resolveRecipients = async (event: RoutedEvent, triggeredBy?: string) =>
  (
    await getGraphqlClient().notificationRecipients(
      { eventData: { eventType: event, triggeredBy } },
      bearer(ctx.tokens.PLATFORM_SETTINGS_ADMIN)
    )
  ).data.notificationRecipients;

let snapshot: PlatformAdminSnapshot | undefined;

beforeAll(async () => {
  snapshot = await snapshotPlatformAdminRows(OWNERS);
  await setPlatformAdminEmail(OWNERS, PLATFORM_ADMIN_ROWS, true);
});

afterAll(async () => {
  if (snapshot) await restorePlatformAdminRows(snapshot);
});

describe('platform-admin notification routing', () => {
  test('the matrix accounts for every role exactly once — routed to some event, or never a recipient', () => {
    const routed = new Set(EVENTS.flatMap(event => ROUTING[event].recipients));
    expect(sorted([...routed, ...NEVER_RECIPIENTS])).toEqual(
      sorted(PLATFORM_ROLES)
    );
  });

  describe.each(EVENTS)('%s', event => {
    const { recipients, excludesActor } = ROUTING[event];

    test(`email: resolves ${recipients.join(' + ')} and no other role holder`, async () => {
      const resolved = await resolveRecipients(event);
      expect(holdersIn(resolved.emailRecipients)).toEqual(sorted(recipients));
    });

    test('in-app and push: never name a holder the event is not routed to', async () => {
      const resolved = await resolveRecipients(event);
      for (const channel of ['inAppRecipients', 'pushRecipients'] as const) {
        const outside = holdersIn(resolved[channel]).filter(
          role => !recipients.includes(role)
        );
        expect(outside, channel).toEqual([]);
      }
    });

    if (excludesActor) {
      test('the acting operator is left out on every channel, and nobody else is', async () => {
        for (const actor of recipients) {
          const actorId = ctx.userIds[actor];
          expect(
            holdersIn((await resolveRecipients(event)).emailRecipients)
          ).toContain(actor);

          const acted = await resolveRecipients(event, actorId);
          expect(acted.triggeredBy?.id).toBe(actorId);
          for (const channel of CHANNELS) {
            expect(
              acted[channel].map(r => r.id),
              channel
            ).not.toContain(actorId);
          }
          expect(holdersIn(acted.emailRecipients)).toEqual(
            sorted(recipients.filter(role => role !== actor))
          );
        }

        // Exclusion is by identity: an actor who is not a recipient removes no one.
        const bystander = await resolveRecipients(
          event,
          ctx.userIds.PLATFORM_SETTINGS_ADMIN
        );
        expect(holdersIn(bystander.emailRecipients)).toEqual(
          sorted(recipients)
        );
      });
    } else {
      test('the acting operator is NOT left out', async () => {
        for (const actor of recipients) {
          const actorId = ctx.userIds[actor];
          const acted = await resolveRecipients(event, actorId);
          expect(acted.triggeredBy?.id).toBe(actorId);
          expect(holdersIn(acted.emailRecipients)).toEqual(sorted(recipients));
        }
      });
    }
  });
});
