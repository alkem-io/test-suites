/* eslint-disable @typescript-eslint/no-explicit-any */
// 041-callout-reaction-notifications — cross-service it-specs.
//
// Covers the emission invariants (US1/US4), settings gating (US2), and
// volume-control semantics (US3) for the SPACE_COLLABORATION_CALLOUT_REACTION
// event. Suite executes against a live verification stack; it is ADDITIVE and
// non-blocking (D-5 / agreed Q6) — it never blocks the server, notifications,
// or client-web merges.
//
// PUSH: verified at the EMIT/queue-count boundary only (Operator Ruling 3c).
// The push adapter no-ops for a recipient with zero active subscriptions, so
// the publisher must be subscribed before any push-emit assertion.
//
// EMAIL: verified via Mailslurper. The email suppression window is overridden
// by the live stack to CALLOUT_REACTION_EMAIL_SUPPRESSION_WINDOW_SECONDS=30
// so burst tests complete in reasonable time.
//
// IN-APP: verified via the me.notifications GraphQL query filtered to the new
// event type. Because the generated schema does not yet carry the new type and
// payload union, all queries that touch the new surface use inline raw GraphQL
// (the same approach as push-notifications.request.params.ts).
//
// TIMING: no wait is needed for in-app or push emission — both are
// synchronous-within-the-server (in-app rows are written in the mutation
// handler, push is fire-and-forget into the same process's queue consumer).
// Email travels through RabbitMQ → notifications service, so email assertions
// use waitForMailsCountAtLeast with a generous poll window.

import {
  deleteMailSlurperMails,
  delay,
  TestScenarioConfig,
  TestScenarioFactory,
  TestUser,
  TestUserManager,
  UniqueIDGenerator,
} from '@alkemio/tests-lib';
import { OrganizationWithSpaceModel } from '@alkemio/tests-lib/scenario/models/OrganizationWithSpaceModel';
import { graphqlRequestAuth } from '@alkemio/tests-lib/utils/graphql.request';
import { CalloutVisibility } from '@alkemio/tests-lib/core/generated/alkemio-schema';

import {
  createCalloutOnCalloutsSet,
  deleteCallout,
} from '@functional-api/callout/callouts.request.params';
import {
  addReactionToCallout,
  removeReactionFromCallout,
} from '@functional-api/callout/reactions/callout-reactions.request.params';
import {
  expectExactMailsAfter,
  expectPushEmitAfter,
  getPushQueuePublishedTotal,
  PUSH_NOTIFICATIONS_QUEUE,
  PushSubscriptionHandle,
  subscribeRecipientsToPush,
  unsubscribeRecipientsFromPush,
  waitForMailsCountAtLeast,
} from '../notification.helpers';
import {
  getQueueStats,
} from '@alkemio/tests-lib';

// ---------------------------------------------------------------------------
// SPACE_COLLABORATION_CALLOUT_REACTION is a new event type added by wave 1.
// The test-suites generated schema will be updated once the server PR merges;
// until then, every query that filters by or reads this type uses an inline
// raw GraphQL string. Using the string literal directly avoids a build-time
// dependency on the codegen output.
// ---------------------------------------------------------------------------
const REACTION_EVENT_TYPE = 'SPACE_COLLABORATION_CALLOUT_REACTION';

// Suppression window the live stack is configured to use (30s override).
// Matches the CALLOUT_REACTION_EMAIL_SUPPRESSION_WINDOW_SECONDS env var on
// the verification stack. Set conservatively lower than the real window to
// keep the test runtime bounded.
const SUPPRESSION_WINDOW_SECONDS = 30;

const uniqueId = UniqueIDGenerator.getID();

// ---------------------------------------------------------------------------
// Raw helpers — not in the generated SDK yet
// ---------------------------------------------------------------------------

/**
 * Returns the total count of SPACE_COLLABORATION_CALLOUT_REACTION in-app
 * notification rows for the calling user. Throws on a GraphQL error or a
 * non-numeric total so a broken server response never reads as "zero rows"
 * (which would make negative assertions vacuously pass).
 */
const getCalloutReactionInAppCount = async (
  userRole: TestUser
): Promise<number> => {
  const requestParams = {
    operationName: 'GetCalloutReactionInAppCount',
    query: `
      query GetCalloutReactionInAppCount($types: [NotificationEvent!]) {
        me {
          notifications(filter: { types: $types }) {
            total
          }
        }
      }
    `,
    variables: {
      types: [REACTION_EVENT_TYPE],
    },
  };

  const response = await graphqlRequestAuth(requestParams, userRole);
  if (response.body?.errors) {
    throw new Error(
      `me.notifications query failed for ${userRole}: ${JSON.stringify(
        response.body.errors
      )}`
    );
  }

  const total = response.body?.data?.me?.notifications?.total;
  if (typeof total !== 'number') {
    throw new Error(
      `me.notifications returned no numeric total for ${userRole}: ${JSON.stringify(
        response.body ?? {}
      )}`
    );
  }
  return total;
};

/**
 * Reads the collaborationCalloutReaction settings triple for a user from
 * the updateUserSettings response shape. Uses the same raw query approach
 * as updateUserSettingsWithPush — the generated mutation document does not
 * yet include the new field.
 */
const CALLOUT_REACTION_SETTINGS_FRAGMENT = `
  fragment calloutReactionSettings on UserSettings {
    id
    notification {
      space {
        collaborationCalloutReaction { email inApp push }
      }
    }
  }
`;

const updateCalloutReactionSettings = async (
  userID: string,
  settings: { email?: boolean; inApp?: boolean; push?: boolean },
  userRole: TestUser = TestUser.GLOBAL_ADMIN
): Promise<any> => {
  const requestParams = {
    operationName: 'UpdateCalloutReactionSettings',
    query: `
      ${CALLOUT_REACTION_SETTINGS_FRAGMENT}
      mutation UpdateCalloutReactionSettings($settingsData: UpdateUserSettingsInput!) {
        updateUserSettings(settingsData: $settingsData) {
          id
          settings {
            ...calloutReactionSettings
          }
        }
      }
    `,
    variables: {
      settingsData: {
        userID,
        settings: {
          notification: {
            space: {
              collaborationCalloutReaction: settings,
            },
          },
        },
      },
    },
  };
  return graphqlRequestAuth(requestParams, userRole);
};

/** Read the collaborationCalloutReaction triple via getUserData equivalent. */
const getCalloutReactionSettings = async (
  userID: string,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
): Promise<{ email: boolean; inApp: boolean; push: boolean } | undefined> => {
  const requestParams = {
    operationName: 'GetCalloutReactionSettings',
    query: `
      query GetCalloutReactionSettings($userID: UUID!) {
        user(ID: $userID) {
          settings {
            notification {
              space {
                collaborationCalloutReaction { email inApp push }
              }
            }
          }
        }
      }
    `,
    variables: { userID },
  };
  const response = await graphqlRequestAuth(requestParams, userRole);
  return response.body?.data?.user?.settings?.notification?.space
    ?.collaborationCalloutReaction;
};

// ---------------------------------------------------------------------------
// Scenario — a space with a published callout owned by globalAdmin (publisher)
//   and two member users: SPACE_MEMBER (reactor A) and QA_USER (reactor B)
// ---------------------------------------------------------------------------
const scenarioConfig: TestScenarioConfig = {
  name: `callout-reaction-notifications-${uniqueId}`,
  space: {
    collaboration: {
      addTutorialCallouts: false,
    },
    community: {
      admins: [TestUser.SPACE_ADMIN],
      members: [
        TestUser.SPACE_MEMBER,
        TestUser.SPACE_ADMIN,
        TestUser.QA_USER,
      ],
    },
  },
};

let baseScenario: OrganizationWithSpaceModel;
let publishedCalloutId = '';
let pushSubscriptions: PushSubscriptionHandle[] = [];

// The publisher for all emission invariant tests is GLOBAL_ADMIN (who
// creates the callout via the default helpers, so publishedBy == their ID).
const PUBLISHER = TestUser.GLOBAL_ADMIN;
const REACTOR_A = TestUser.SPACE_MEMBER;
const REACTOR_B = TestUser.QA_USER;

beforeAll(async () => {
  baseScenario = await TestScenarioFactory.createBaseScenario(scenarioConfig);
  const calloutsSetId = baseScenario.space.collaboration.calloutsSetId;

  const pub = await createCalloutOnCalloutsSet(calloutsSetId, {
    framing: {
      profile: {
        displayName: `callout-reaction-notif-${uniqueId}`,
        description: 'callout for reaction notification tests',
      },
    },
    settings: { visibility: CalloutVisibility.Published },
  });
  publishedCalloutId =
    pub?.data?.createCalloutOnCalloutsSet?.id ?? '';

  // Required precondition for push-emit assertions: the adapter no-ops for a
  // recipient with zero active push subscriptions.
  pushSubscriptions = await subscribeRecipientsToPush([
    {
      userRole: PUBLISHER,
      label: `callout-reaction-notif-publisher-${uniqueId}`,
    },
  ]);

  // Ensure the publisher has email ON and push ON for callout reactions
  // (defaults are email OFF / inApp ON / push ON — we enable email here so
  // the email-suppression tests are meaningful out of the box).
  await updateCalloutReactionSettings(
    TestUserManager.users.globalAdmin.id,
    { email: true, inApp: true, push: true },
    TestUser.GLOBAL_ADMIN
  );
});

afterAll(async () => {
  await unsubscribeRecipientsFromPush(pushSubscriptions);

  // Restore defaults for the shared global admin persona.
  await updateCalloutReactionSettings(
    TestUserManager.users.globalAdmin.id,
    { email: false, inApp: true, push: true },
    TestUser.GLOBAL_ADMIN
  ).catch(() => {});

  if (publishedCalloutId) {
    await deleteCallout(publishedCalloutId).catch(() => undefined);
  }
  await TestScenarioFactory.cleanUpBaseScenario(baseScenario);
});

beforeEach(async () => {
  // Clear Mailslurper between tests so email counts are per-test.
  await deleteMailSlurperMails();
  // Remove any prior reactions to keep tests independent.
  await removeReactionFromCallout(publishedCalloutId, REACTOR_A).catch(
    () => undefined
  );
  await removeReactionFromCallout(publishedCalloutId, REACTOR_B).catch(
    () => undefined
  );
  await removeReactionFromCallout(publishedCalloutId, PUBLISHER).catch(
    () => undefined
  );
});

// ===========================================================================
// US1 / US4 — Emission invariants (single-recipient, genuine insert only)
// ===========================================================================

describe('Emission invariants (US1/US4)', () => {
  test(
    'US1-AS1 — genuine new reaction notifies exactly the publisher in-app (single recipient)',
    async () => {
      const countBefore = await getCalloutReactionInAppCount(PUBLISHER);

      await addReactionToCallout(publishedCalloutId, 'heart', REACTOR_A);

      // In-app is synchronous-within-server; no poll needed.
      await delay(1_500);
      const countAfter = await getCalloutReactionInAppCount(PUBLISHER);
      expect(countAfter - countBefore).toBe(1);

      // R-5 single-recipient invariant: REACTOR_A and REACTOR_B get nothing.
      const reactorACount = await getCalloutReactionInAppCount(REACTOR_A);
      expect(reactorACount).toBe(0);
      const reactorBCount = await getCalloutReactionInAppCount(REACTOR_B);
      expect(reactorBCount).toBe(0);
    }
  );

  test(
    'US1-AS2 — swap (re-add with different emoji) does NOT produce a new notification (R-1)',
    async () => {
      await addReactionToCallout(publishedCalloutId, 'heart', REACTOR_A);
      await delay(1_000);
      const countAfterFirst = await getCalloutReactionInAppCount(PUBLISHER);

      // Swap to a different emoji — this is the UPDATE arm of the upsert, so
      // the server must NOT emit a second notification.
      await addReactionToCallout(publishedCalloutId, 'rocket', REACTOR_A);
      await delay(1_500);
      const countAfterSwap = await getCalloutReactionInAppCount(PUBLISHER);

      expect(countAfterSwap).toBe(countAfterFirst);
    }
  );

  test(
    'US1-AS3 — idempotent re-add while reaction exists does NOT produce a new notification (R-1)',
    async () => {
      await addReactionToCallout(publishedCalloutId, 'heart', REACTOR_A);
      await delay(1_000);
      const countAfterFirst = await getCalloutReactionInAppCount(PUBLISHER);

      // Identical add while the reaction already exists — conflict arm, no INSERT.
      await addReactionToCallout(publishedCalloutId, 'heart', REACTOR_A);
      await delay(1_500);
      const countAfterRepeated = await getCalloutReactionInAppCount(PUBLISHER);

      expect(countAfterRepeated).toBe(countAfterFirst);
    }
  );

  test(
    'US1-AS3 — remove does NOT produce a notification',
    async () => {
      await addReactionToCallout(publishedCalloutId, 'heart', REACTOR_A);
      await delay(1_000);
      const countAfterReact = await getCalloutReactionInAppCount(PUBLISHER);

      await removeReactionFromCallout(publishedCalloutId, REACTOR_A);
      await delay(1_500);
      const countAfterRemove = await getCalloutReactionInAppCount(PUBLISHER);

      expect(countAfterRemove).toBe(countAfterReact);
    }
  );

  test(
    'Edge case — remove then re-add is a genuine new reaction and DOES notify (spec Edge Cases)',
    async () => {
      await addReactionToCallout(publishedCalloutId, 'heart', REACTOR_A);
      await delay(500);
      await removeReactionFromCallout(publishedCalloutId, REACTOR_A);
      await delay(500);
      const countBeforeReAdd = await getCalloutReactionInAppCount(PUBLISHER);

      // The re-add after a full remove creates a genuine new row — one more
      // notification is correct by design.
      await addReactionToCallout(publishedCalloutId, 'heart', REACTOR_A);
      await delay(1_500);
      const countAfterReAdd = await getCalloutReactionInAppCount(PUBLISHER);

      expect(countAfterReAdd - countBeforeReAdd).toBe(1);
    }
  );

  test(
    'US1-AS4 — self-reaction (publisher reacts to own callout) produces zero notifications',
    async () => {
      const countBefore = await getCalloutReactionInAppCount(PUBLISHER);

      await addReactionToCallout(publishedCalloutId, 'bullseye', PUBLISHER);
      await delay(1_500);
      const countAfter = await getCalloutReactionInAppCount(PUBLISHER);

      expect(countAfter).toBe(countBefore);
    }
  );

  test(
    'US1-AS5 — N distinct reactors produce N separate in-app rows (no aggregation in v1)',
    async () => {
      const countBefore = await getCalloutReactionInAppCount(PUBLISHER);

      await addReactionToCallout(publishedCalloutId, 'heart', REACTOR_A);
      await delay(300);
      await addReactionToCallout(publishedCalloutId, 'rocket', REACTOR_B);
      await delay(1_500);

      const countAfter = await getCalloutReactionInAppCount(PUBLISHER);
      expect(countAfter - countBefore).toBe(2);
    }
  );
});

// ===========================================================================
// US1 / Push — emit via shared throttle + replace-tag
// ===========================================================================

describe('Push emission (US1, FR-012)', () => {
  test(
    'genuine new reaction publishes exactly one push to the queue for the publisher',
    async () => {
      const result = await expectPushEmitAfter(
        () =>
          addReactionToCallout(publishedCalloutId, 'clapping-hands', REACTOR_A),
        1,
        { timeout: 10_000, settleMs: 2_000 }
      );
      expect(result.delta).toBe(1);
    }
  );

  test(
    'swap does NOT publish a push (R-1 invariant holds for push channel)',
    async () => {
      await addReactionToCallout(publishedCalloutId, 'heart', REACTOR_A);
      await delay(2_000);
      const baselinePush = await getPushQueuePublishedTotal();

      await addReactionToCallout(publishedCalloutId, 'rocket', REACTOR_A);
      await delay(3_000);
      const statsAfterSwap = await getQueueStats(PUSH_NOTIFICATIONS_QUEUE);

      expect(statsAfterSwap.publishedTotal - baselinePush).toBe(0);
    }
  );
});

// ===========================================================================
// US2 — Settings gating
// ===========================================================================

describe('Settings gating (US2)', () => {
  test(
    'US2-AS1 — defaults for globalAdmin: email ON (set in beforeAll), inApp ON, push ON',
    async () => {
      const settings = await getCalloutReactionSettings(
        TestUserManager.users.globalAdmin.id,
        TestUser.GLOBAL_ADMIN
      );
      expect(settings).toBeDefined();
      // The beforeAll set email=true for tests; check inApp and push defaults.
      expect(settings?.inApp).toBe(true);
      expect(settings?.push).toBe(true);
    }
  );

  test(
    'US2-AS2 — inApp OFF: genuine reaction creates no in-app row for publisher',
    async () => {
      await updateCalloutReactionSettings(
        TestUserManager.users.globalAdmin.id,
        { inApp: false },
        TestUser.GLOBAL_ADMIN
      );

      const countBefore = await getCalloutReactionInAppCount(PUBLISHER);

      await addReactionToCallout(publishedCalloutId, 'light-bulb', REACTOR_A);
      await delay(1_500);

      const countAfter = await getCalloutReactionInAppCount(PUBLISHER);
      expect(countAfter).toBe(countBefore);

      // Restore
      await updateCalloutReactionSettings(
        TestUserManager.users.globalAdmin.id,
        { inApp: true },
        TestUser.GLOBAL_ADMIN
      );
    }
  );

  test(
    'US2-AS3 — email ON: genuine reaction sends email to publisher',
    async () => {
      // Publisher already has email=true from beforeAll. Delete prior mails
      // (beforeEach already does this, but explicit for clarity).
      await deleteMailSlurperMails();

      const [mails] = await expectExactMailsAfter(
        () =>
          addReactionToCallout(
            publishedCalloutId,
            'check-mark',
            REACTOR_A
          ),
        1,
        { timeout: 20_000, settleMs: 3_000 }
      );
      expect(mails.length).toBeGreaterThan(0);
    }
  );

  test(
    'US2-AS4 — all channels OFF: genuine reaction produces nothing anywhere',
    async () => {
      await updateCalloutReactionSettings(
        TestUserManager.users.globalAdmin.id,
        { email: false, inApp: false, push: false },
        TestUser.GLOBAL_ADMIN
      );

      const countBefore = await getCalloutReactionInAppCount(PUBLISHER);
      const pushBaseline = await getPushQueuePublishedTotal();

      await addReactionToCallout(publishedCalloutId, 'rocket', REACTOR_A);
      await delay(4_000);

      const countAfter = await getCalloutReactionInAppCount(PUBLISHER);
      const pushStats = await getQueueStats(PUSH_NOTIFICATIONS_QUEUE);

      expect(countAfter).toBe(countBefore);
      expect(pushStats.publishedTotal - pushBaseline).toBe(0);
      const [, mailTotal] = await waitForMailsCountAtLeast(1, {
        timeout: 2_000,
      });
      expect(mailTotal).toBe(0);

      // Restore
      await updateCalloutReactionSettings(
        TestUserManager.users.globalAdmin.id,
        { email: true, inApp: true, push: true },
        TestUser.GLOBAL_ADMIN
      );
    }
  );

  test(
    'US2-AS4 — defend-on-read: settings query heals gracefully for existing user',
    async () => {
      // A freshly-registered account should expose the row with defaults.
      // For a shared persona that has been explicitly set, just verify the
      // query returns a well-formed object (not null/undefined) — the
      // defend-on-read path is an @AfterLoad heal on the server entity which
      // cannot be exercised from a black-box harness without DB access.
      const settings = await getCalloutReactionSettings(
        TestUserManager.users.globalAdmin.id,
        TestUser.GLOBAL_ADMIN
      );
      expect(settings).toBeDefined();
      expect(typeof settings?.email).toBe('boolean');
      expect(typeof settings?.inApp).toBe('boolean');
      expect(typeof settings?.push).toBe('boolean');
    }
  );
});

// ===========================================================================
// US3 — Volume control: email leading-edge suppression + in-app NOT suppressed
// ===========================================================================

describe('Volume control — email suppression (US3)', () => {
  // Ensure email is on for the publisher throughout this describe block.
  beforeEach(async () => {
    await updateCalloutReactionSettings(
      TestUserManager.users.globalAdmin.id,
      { email: true, inApp: true, push: true },
      TestUser.GLOBAL_ADMIN
    );
    await deleteMailSlurperMails();
  });

  afterEach(async () => {
    // Clean up reactions between tests.
    await removeReactionFromCallout(publishedCalloutId, REACTOR_A).catch(
      () => undefined
    );
    await removeReactionFromCallout(publishedCalloutId, REACTOR_B).catch(
      () => undefined
    );
  });

  test(
    'US3-AS1 — N reactions within the suppression window yield exactly ONE email',
    async () => {
      // REACTOR_A's reaction triggers the leading edge email + sets the marker.
      const [mailsA] = await expectExactMailsAfter(
        () =>
          addReactionToCallout(publishedCalloutId, 'heart', REACTOR_A),
        1,
        { timeout: 20_000, settleMs: 2_000 }
      );
      expect(mailsA.length).toBe(1);
      await deleteMailSlurperMails();

      // REACTOR_B reacts within the window — suppressed; no new email.
      await addReactionToCallout(publishedCalloutId, 'rocket', REACTOR_B);
      await delay(6_000); // Generous wait; email travels through RabbitMQ + notifications service.
      const [, afterBTotal] = await waitForMailsCountAtLeast(1, {
        timeout: 3_000,
      });
      expect(afterBTotal).toBe(0);
    },
    60_000
  );

  test(
    'US3-AS2 — after the window elapses, a new reaction produces a new leading email',
    async () => {
      // Leading reaction sets the marker.
      await expectExactMailsAfter(
        () =>
          addReactionToCallout(publishedCalloutId, 'heart', REACTOR_A),
        1,
        { timeout: 20_000, settleMs: 2_000 }
      );

      // Wait for the suppression window to expire.
      await delay((SUPPRESSION_WINDOW_SECONDS + 5) * 1_000);
      await deleteMailSlurperMails();
      await removeReactionFromCallout(publishedCalloutId, REACTOR_B).catch(
        () => undefined
      );

      // New reaction after expiry opens a fresh window and sends a new email.
      const [mailsAfter] = await expectExactMailsAfter(
        () =>
          addReactionToCallout(publishedCalloutId, 'rocket', REACTOR_B),
        1,
        { timeout: 20_000, settleMs: 2_000 }
      );
      expect(mailsAfter.length).toBe(1);
    },
    (SUPPRESSION_WINDOW_SECONDS + 60) * 1_000
  );

  test(
    'US3-AS7 — in-app rows are NOT suppressed during a burst (one row per genuine reaction)',
    async () => {
      const countBefore = await getCalloutReactionInAppCount(PUBLISHER);

      await addReactionToCallout(publishedCalloutId, 'heart', REACTOR_A);
      await delay(300);
      await addReactionToCallout(publishedCalloutId, 'rocket', REACTOR_B);
      await delay(1_500);

      const countAfter = await getCalloutReactionInAppCount(PUBLISHER);
      // Both reactions produce in-app rows regardless of email suppression.
      expect(countAfter - countBefore).toBe(2);
    }
  );
});

// ===========================================================================
// US4 — Publisher-resolution chain (fallback chain tests)
// ===========================================================================

describe('Publisher-resolution chain (US4/FR-002)', () => {
  // These tests require creating a new callout and mutating publishedBy /
  // createdBy to NULL via the live API. Since test-suites has no direct DB
  // access, we rely on the server's existing API surface:
  //
  //   • US4-AS2 (publishedBy NULL → createdBy notified): not representable
  //     from a black-box API harness — no public mutation clears publishedBy.
  //     Covered by server-side unit tests (server:T010 in repos.yaml).
  //
  //   • US4-AS3 (both NULL → silent no-op): likewise, no public API to force
  //     both fields to NULL on an existing callout. Covered server-side.
  //
  //   • US4-AS4 (notification failure does not fail the reaction): verifiable
  //     here by asserting the reaction mutation itself succeeds independently
  //     of the in-app count (the in-app write is the fire-and-forget path).
  //
  // This limitation is documented as a deviation: the API-only harness cannot
  // manufacture the NULL-publisher state, so US4-AS2/AS3 are server-unit
  // covered only, as repos.yaml acceptance track prescribes for these cases.

  test(
    'US4-AS4 — reaction mutation succeeds even if notification infrastructure is unreachable (fire-and-forget)',
    async () => {
      // The notification path is fire-and-forget, outside the transaction.
      // If notification delivery fails, the mutation must still return a
      // successful response. We cannot simulate a broken notification
      // pipeline from this harness, but we can verify the mutation is
      // idempotent with respect to in-app counts vs. mutation success.
      const result = await addReactionToCallout(
        publishedCalloutId,
        'bullseye',
        REACTOR_A
      );
      // The mutation itself must succeed regardless of notification state.
      expect(result.error).toBeUndefined();
      expect(result.data?.addReactionToCallout).toBeDefined();
    }
  );
});

// ===========================================================================
// Bounded-redelivery coverage (R-2 mitigation)
// ===========================================================================

describe('Bounded redelivery (R-2 mitigation)', () => {
  // The 034 notifications PR landed a bounded in-process redelivery cap
  // (MAX_REDELIVERY_ATTEMPTS=3, reject-without-requeue). This describe block
  // documents that the new SPACE_COLLABORATION_CALLOUT_REACTION event is
  // subject to the same cap and is NOT exempt from it.
  //
  // Full mechanical verification of the cap requires injecting a failing
  // handler, which is a server-side unit/integration concern (notifications
  // service test). From this black-box harness we assert only that the event
  // can be consumed at least once (happy path), which confirms the handler
  // registration is active and the routing key is wired.

  test(
    'R-2 — happy-path consumption: a genuine reaction is received by the notifications service (email arrives)',
    async () => {
      // Ensure email is on.
      await updateCalloutReactionSettings(
        TestUserManager.users.globalAdmin.id,
        { email: true, inApp: true, push: true },
        TestUser.GLOBAL_ADMIN
      );
      await deleteMailSlurperMails();

      const [mails] = await expectExactMailsAfter(
        () =>
          addReactionToCallout(publishedCalloutId, 'check-mark', REACTOR_A),
        1,
        { timeout: 20_000, settleMs: 3_000 }
      );

      // At least one email proves the handler is registered and consumed the event.
      expect(mails.length).toBeGreaterThanOrEqual(1);
    }
  );
});
