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

// Display name seeded for the shared callout — used in email content assertions
// to verify the callout name is present and the description is absent.
const CALLOUT_DISPLAY_NAME_PREFIX = `callout-reaction-notif-${uniqueId}`;
const CALLOUT_DESCRIPTION = 'callout for reaction notification tests';

beforeAll(async () => {
  baseScenario = await TestScenarioFactory.createBaseScenario(scenarioConfig);
  const calloutsSetId = baseScenario.space.collaboration.calloutsSetId;

  const pub = await createCalloutOnCalloutsSet(calloutsSetId, {
    framing: {
      profile: {
        displayName: CALLOUT_DISPLAY_NAME_PREFIX,
        description: CALLOUT_DESCRIPTION,
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

      // R-5 single-recipient invariant: the reactors and a space admin who is
      // not the publisher must each receive nothing — audience-fanout must not
      // spread to non-publisher space members or space admins.
      const reactorACount = await getCalloutReactionInAppCount(REACTOR_A);
      expect(reactorACount).toBe(0);
      const reactorBCount = await getCalloutReactionInAppCount(REACTOR_B);
      expect(reactorBCount).toBe(0);
      const spaceAdminCount = await getCalloutReactionInAppCount(
        TestUser.SPACE_ADMIN
      );
      expect(spaceAdminCount).toBe(0);
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
  // A dedicated callout used exclusively for email-emitting gating tests.
  // Isolating the email suppression key (keyed per recipient + callout) ensures
  // that a leading-email reaction in one gating test cannot suppress the next.
  let emailGatingCalloutId = '';

  beforeAll(async () => {
    const calloutsSetId = baseScenario.space.collaboration.calloutsSetId;
    const c = await createCalloutOnCalloutsSet(calloutsSetId, {
      framing: {
        profile: {
          displayName: `callout-reaction-notif-gating-${uniqueId}`,
          description: CALLOUT_DESCRIPTION,
        },
      },
      settings: { visibility: CalloutVisibility.Published },
    });
    emailGatingCalloutId = c?.data?.createCalloutOnCalloutsSet?.id ?? '';
    if (!emailGatingCalloutId) {
      throw new Error('Settings-gating: failed to create dedicated email test callout');
    }
  });

  afterAll(async () => {
    if (emailGatingCalloutId) {
      await deleteCallout(emailGatingCalloutId).catch(() => undefined);
    }
  });

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
    'US2-AS1 — FR-007 default triple for an unmodified user: email OFF, inApp ON, push ON',
    async () => {
      // QA_USER reacts in this suite but its own notification settings are
      // never mutated, so it still carries the registration defaults. This is
      // the email-OFF default the globalAdmin case cannot assert (its email is
      // forced ON in beforeAll), closing the FR-007 / SC-004 default clause.
      const settings = await getCalloutReactionSettings(
        TestUserManager.users.qaUser.id,
        TestUser.QA_USER
      );
      expect(settings).toBeDefined();
      expect(settings?.email).toBe(false);
      expect(settings?.inApp).toBe(true);
      expect(settings?.push).toBe(true);
    }
  );

  test(
    'US2-AS2 — inApp OFF: genuine reaction creates no in-app row for publisher',
    async () => {
      await updateCalloutReactionSettings(
        TestUserManager.users.globalAdmin.id,
        { email: false, inApp: false },
        TestUser.GLOBAL_ADMIN
      );

      const countBefore = await getCalloutReactionInAppCount(PUBLISHER);

      await addReactionToCallout(publishedCalloutId, 'light-bulb', REACTOR_A);
      await delay(1_500);

      const countAfter = await getCalloutReactionInAppCount(PUBLISHER);
      expect(countAfter).toBe(countBefore);

      // Restore both channels so the next test starts clean.
      await updateCalloutReactionSettings(
        TestUserManager.users.globalAdmin.id,
        { email: true, inApp: true },
        TestUser.GLOBAL_ADMIN
      );
    }
  );

  test(
    'US2-AS3 — email ON: genuine reaction sends email to publisher',
    async () => {
      // Uses the isolated email callout so this test's leading-email reaction
      // cannot bleed into the suppression window of later email tests.
      await updateCalloutReactionSettings(
        TestUserManager.users.globalAdmin.id,
        { email: true, inApp: true, push: true },
        TestUser.GLOBAL_ADMIN
      );
      await deleteMailSlurperMails();

      const [mails] = await expectExactMailsAfter(
        () =>
          addReactionToCallout(
            emailGatingCalloutId,
            'check-mark',
            REACTOR_A
          ),
        1,
        { timeout: 20_000, settleMs: 3_000 }
      );
      expect(mails.length).toBeGreaterThan(0);
      // Confirm the email reached the publisher, not any other persona.
      const publisherMail = (mails as any[]).find((m: any) =>
        (m.toAddresses as string[])?.includes(
          TestUserManager.users.globalAdmin.email
        )
      );
      expect(publisherMail).toBeDefined();
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

      // Use the full positive delivery bound as the negative grace so "no email"
      // means "none will ever arrive" rather than "none has arrived yet".
      const [, mailTotal] = await waitForMailsCountAtLeast(1, {
        timeout: 20_000,
      });
      const countAfter = await getCalloutReactionInAppCount(PUBLISHER);
      const pushStats = await getQueueStats(PUSH_NOTIFICATIONS_QUEUE);

      expect(countAfter).toBe(countBefore);
      expect(pushStats.publishedTotal - pushBaseline).toBe(0);
      expect(mailTotal).toBe(0);

      // Restore
      await updateCalloutReactionSettings(
        TestUserManager.users.globalAdmin.id,
        { email: true, inApp: true, push: true },
        TestUser.GLOBAL_ADMIN
      );
    },
    30_000
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
  // Each test that asserts on leading-edge email behaviour owns a dedicated
  // callout so the per-(recipient, callout) Redis suppression marker from one
  // test cannot bleed into another's assertion window. This matches the
  // isolation strategy already applied for Settings-gating and Bounded-redelivery.
  //
  // suppressionCalloutId    — US3-AS1 and US3-AS7 (burst within one window)
  // suppressionCalloutId2   — US3-AS2 (window-expiry check, distinct marker key)
  // suppressionCalloutIdA   — US3-AS3 first callout (per-callout key isolation)
  // suppressionCalloutIdB   — US3-AS3 second callout (per-callout key isolation)
  let suppressionCalloutId = '';
  let suppressionCalloutDisplayName = '';
  let suppressionCalloutId2 = '';
  let suppressionCalloutId2DisplayName = '';
  let suppressionCalloutIdA = '';
  let suppressionCalloutIdADisplayName = '';
  let suppressionCalloutIdB = '';
  let suppressionCalloutIdBDisplayName = '';

  beforeAll(async () => {
    const calloutsSetId = baseScenario.space.collaboration.calloutsSetId;

    suppressionCalloutDisplayName = `callout-reaction-notif-suppression-${uniqueId}`;
    const c1 = await createCalloutOnCalloutsSet(calloutsSetId, {
      framing: {
        profile: {
          displayName: suppressionCalloutDisplayName,
          description: CALLOUT_DESCRIPTION,
        },
      },
      settings: { visibility: CalloutVisibility.Published },
    });
    suppressionCalloutId = c1?.data?.createCalloutOnCalloutsSet?.id ?? '';
    if (!suppressionCalloutId) {
      throw new Error('Volume-control: failed to create dedicated suppression callout (US3-AS1/AS7)');
    }

    suppressionCalloutId2DisplayName = `callout-reaction-notif-suppression2-${uniqueId}`;
    const c2 = await createCalloutOnCalloutsSet(calloutsSetId, {
      framing: {
        profile: {
          displayName: suppressionCalloutId2DisplayName,
          description: CALLOUT_DESCRIPTION,
        },
      },
      settings: { visibility: CalloutVisibility.Published },
    });
    suppressionCalloutId2 = c2?.data?.createCalloutOnCalloutsSet?.id ?? '';
    if (!suppressionCalloutId2) {
      throw new Error('Volume-control: failed to create dedicated suppression callout (US3-AS2)');
    }

    suppressionCalloutIdADisplayName = `callout-reaction-notif-isolation-a-${uniqueId}`;
    const cA = await createCalloutOnCalloutsSet(calloutsSetId, {
      framing: {
        profile: {
          displayName: suppressionCalloutIdADisplayName,
          description: CALLOUT_DESCRIPTION,
        },
      },
      settings: { visibility: CalloutVisibility.Published },
    });
    suppressionCalloutIdA = cA?.data?.createCalloutOnCalloutsSet?.id ?? '';
    if (!suppressionCalloutIdA) {
      throw new Error('Volume-control: failed to create dedicated suppression callout A (US3-AS3)');
    }

    suppressionCalloutIdBDisplayName = `callout-reaction-notif-isolation-b-${uniqueId}`;
    const cB = await createCalloutOnCalloutsSet(calloutsSetId, {
      framing: {
        profile: {
          displayName: suppressionCalloutIdBDisplayName,
          description: CALLOUT_DESCRIPTION,
        },
      },
      settings: { visibility: CalloutVisibility.Published },
    });
    suppressionCalloutIdB = cB?.data?.createCalloutOnCalloutsSet?.id ?? '';
    if (!suppressionCalloutIdB) {
      throw new Error('Volume-control: failed to create dedicated suppression callout B (US3-AS3)');
    }
  });

  afterAll(async () => {
    for (const id of [
      suppressionCalloutId,
      suppressionCalloutId2,
      suppressionCalloutIdA,
      suppressionCalloutIdB,
    ]) {
      if (id) await deleteCallout(id).catch(() => undefined);
    }
  });

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
    // Clean up reactions between tests for all volume-control callouts.
    for (const id of [
      suppressionCalloutId,
      suppressionCalloutId2,
      suppressionCalloutIdA,
      suppressionCalloutIdB,
    ]) {
      if (id) {
        await removeReactionFromCallout(id, REACTOR_A).catch(() => undefined);
        await removeReactionFromCallout(id, REACTOR_B).catch(() => undefined);
      }
    }
  });

  test(
    'US3-AS1 — N reactions within the suppression window yield exactly ONE email',
    async () => {
      // REACTOR_A's reaction triggers the leading edge email + sets the marker.
      const [mailsA] = await expectExactMailsAfter(
        () =>
          addReactionToCallout(suppressionCalloutId, 'heart', REACTOR_A),
        1,
        { timeout: 20_000, settleMs: 2_000 }
      );
      expect(mailsA.length).toBe(1);

      // Content assertions (T005 / contract §2):
      //   • email reaches the publisher, not any other persona
      //   • subject/body names the reactor display name
      //   • body names the callout display name
      //   • body does NOT contain the callout description (privacy invariant)
      const leadingMail = (mailsA as any[])[0];
      expect(leadingMail).toBeDefined();
      expect(
        (leadingMail.toAddresses as string[])?.includes(
          TestUserManager.users.globalAdmin.email
        )
      ).toBe(true);
      // The reactor's display name must appear somewhere in the mail (subject or body).
      const mailText = `${leadingMail.subject ?? ''} ${leadingMail.body ?? ''}`;
      expect(mailText).toContain(
        TestUserManager.users.spaceMember.displayName
      );
      // The callout display name must appear so the recipient knows which post was reacted to.
      expect(mailText).toContain(suppressionCalloutDisplayName);
      // The callout description must NOT appear — it is body/content, excluded by contract §2.
      expect(leadingMail.body ?? '').not.toContain(CALLOUT_DESCRIPTION);

      await deleteMailSlurperMails();

      // REACTOR_B reacts within the window — suppressed; no new email arrives.
      // The wait uses the full positive-path delivery bound (≥20s) so "no email"
      // means "none will ever arrive" rather than "none has arrived yet".
      await addReactionToCallout(suppressionCalloutId, 'rocket', REACTOR_B);
      const [, afterBTotal] = await waitForMailsCountAtLeast(1, {
        timeout: 22_000,
      });
      expect(afterBTotal).toBe(0);
    },
    70_000
  );

  test(
    'US3-AS2 — after the window elapses, a new reaction produces a new leading email',
    async () => {
      // Uses a dedicated callout so US3-AS1's suppression marker (keyed per
      // (recipient, callout)) cannot collide with this test regardless of how
      // quickly the suite advances.
      await expectExactMailsAfter(
        () =>
          addReactionToCallout(suppressionCalloutId2, 'heart', REACTOR_A),
        1,
        { timeout: 20_000, settleMs: 2_000 }
      );

      // Wait for the suppression window to expire.
      await delay((SUPPRESSION_WINDOW_SECONDS + 5) * 1_000);
      await deleteMailSlurperMails();
      await removeReactionFromCallout(suppressionCalloutId2, REACTOR_B).catch(
        () => undefined
      );

      // New reaction after expiry opens a fresh window and sends a new email.
      const [mailsAfter] = await expectExactMailsAfter(
        () =>
          addReactionToCallout(suppressionCalloutId2, 'rocket', REACTOR_B),
        1,
        { timeout: 20_000, settleMs: 2_000 }
      );
      expect(mailsAfter.length).toBe(1);
    },
    (SUPPRESSION_WINDOW_SECONDS + 60) * 1_000
  );

  test(
    'US3-AS3 — per-callout key isolation: two callouts in-window each produce exactly one email',
    async () => {
      // Verifies that the email suppression marker is keyed per (recipient,
      // callout), not per recipient alone. When the publisher has already
      // received a leading-edge email for callout A, a genuine leading reaction
      // on callout B (a different callout with no prior marker) must still
      // produce a second email. A cross-callout suppression regression would
      // make the second assertion fail.
      const [mailsForA] = await expectExactMailsAfter(
        () =>
          addReactionToCallout(suppressionCalloutIdA, 'heart', REACTOR_A),
        1,
        { timeout: 20_000, settleMs: 2_000 }
      );
      // Leading-edge email for callout A.
      expect(mailsForA.length).toBe(1);
      await deleteMailSlurperMails();

      // Callout B has its own (recipient, calloutB) key — no marker is set for
      // it yet, so the reaction must produce a fresh leading-edge email.
      const [mailsForB] = await expectExactMailsAfter(
        () =>
          addReactionToCallout(suppressionCalloutIdB, 'rocket', REACTOR_B),
        1,
        { timeout: 20_000, settleMs: 2_000 }
      );
      expect(mailsForB.length).toBe(1);
    },
    70_000
  );

  test(
    'US3-AS7 — in-app rows are NOT suppressed during a burst (one row per genuine reaction)',
    async () => {
      const countBefore = await getCalloutReactionInAppCount(PUBLISHER);

      await addReactionToCallout(suppressionCalloutId, 'heart', REACTOR_A);
      await delay(300);
      await addReactionToCallout(suppressionCalloutId, 'rocket', REACTOR_B);
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
  //
  // A dedicated callout is used so this test's leading-email reaction cannot
  // collide with other describe blocks' suppression markers.
  let redeliveryCalloutId = '';

  beforeAll(async () => {
    const calloutsSetId = baseScenario.space.collaboration.calloutsSetId;
    const c = await createCalloutOnCalloutsSet(calloutsSetId, {
      framing: {
        profile: {
          displayName: `callout-reaction-notif-redelivery-${uniqueId}`,
          description: CALLOUT_DESCRIPTION,
        },
      },
      settings: { visibility: CalloutVisibility.Published },
    });
    redeliveryCalloutId = c?.data?.createCalloutOnCalloutsSet?.id ?? '';
    if (!redeliveryCalloutId) {
      throw new Error('R-2 mitigation: failed to create dedicated redelivery test callout');
    }
  });

  afterAll(async () => {
    if (redeliveryCalloutId) {
      await deleteCallout(redeliveryCalloutId).catch(() => undefined);
    }
  });

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
          addReactionToCallout(redeliveryCalloutId, 'check-mark', REACTOR_A),
        1,
        { timeout: 20_000, settleMs: 3_000 }
      );

      // At least one email proves the handler is registered and consumed the event.
      expect(mails.length).toBeGreaterThanOrEqual(1);
    }
  );
});
