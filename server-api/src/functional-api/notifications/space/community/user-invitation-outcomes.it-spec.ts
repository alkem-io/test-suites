/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  delay,
  deleteMailSlurperMails,
  getMailsData,
  NotificationEvent,
  TestScenarioConfig,
  TestScenarioFactory,
  TestUser,
  TestUserManager,
} from '@alkemio/tests-lib';
import { OrganizationWithSpaceModel } from '@alkemio/tests-lib/scenario/models/OrganizationWithSpaceModel';
import {
  RoleName,
  RoleSetInvitationResultType,
  UpdateUserSettingsEntityInput,
} from '@alkemio/tests-lib/core/generated/alkemio-schema';
import { graphqlRequestAuth } from '@alkemio/tests-lib/utils/graphql.request';
import {
  deleteInvitation,
  inviteForEntryRoleOnRoleSet,
} from '@functional-api/roleset/invitations/invitation.request.params';
import { getSingleInvitationResult } from '@functional-api/roleset/roleset.request.params';
import { eventOnRoleSetInvitation } from '@functional-api/roleset/roleset-events.request.params';
import { removeRoleFromUser } from '@functional-api/roleset/roles-request.params';
import { updateUserSettings } from '@functional-api/contributor-management/user/user.request.params';
import {
  assertCleanupSucceeded,
  notif,
  snapshotNotificationSettings,
  waitForMailsWhere,
} from '../../notification.helpers';

/**
 * notifications#356 extension (server#4100) — the rows the organization arm
 * (`organization-invitations.it-spec.ts`) never exercised: a **user** who
 * accepts/declines a Space invitation. Two claims are pinned live, at API
 * level, email + in-app:
 *
 * - UO-1/UO-2: every Space admin hears the user's own outcome
 *   (`SPACE_ADMIN_USER_COMMUNITY_INVITATION_ACCEPTED`/`_DECLINED`), and an
 *   accept no longer ALSO fires the generic `SPACE_ADMIN_COMMUNITY_NEW_MEMBER`
 *   (R26/R28) — the same suppression `organization-invitations.it-spec.ts`
 *   pins on the organization arm.
 * - UO-3: the suppression stops at the invited (L1) Space. An
 *   `invitedToParent` accept still tells the L0 ancestor admins "joined" as
 *   normal (R26b) — this file's stack-level positive control for UO-1/UO-2's
 *   "joined" negative, proving the template still reaches admins on this
 *   stack when nothing suppresses it.
 *
 * Push emit and the bell's rendering stay unit/manual — see the plan's
 * "Not covered" table.
 */
let baseScenario: OrganizationWithSpaceModel;
let invitationId = '';

const scenarioConfig: TestScenarioConfig = {
  name: 'notif-user-invite-outcome',
  space: {
    collaboration: { addTutorialCallouts: false },
    community: {
      admins: [TestUser.SPACE_ADMIN, TestUser.SUBSPACE_ADMIN],
      members: [
        TestUser.SPACE_ADMIN,
        TestUser.SUBSPACE_ADMIN,
        TestUser.SUBSUBSPACE_ADMIN,
      ],
    },
    subspace: {
      collaboration: { addTutorialCallouts: false },
      community: {
        admins: [TestUser.SUBSUBSPACE_ADMIN],
        members: [TestUser.SUBSUBSPACE_ADMIN],
      },
    },
  },
};

// L0 admins: spaceAdmin (the inviter) and subspaceAdmin (co-admin, never
// acts). L1 (baseScenario.subspace) admin: subsubspaceAdmin. Invitee:
// nonSpaceMember. Every persona below is globally seeded and outlives this
// file — snapshot-and-restore, never force-all-on (`snapshotNotificationSettings`).
const SHAPED_PERSONA_IDS = (): string[] => [
  TestUserManager.users.spaceAdmin.id,
  TestUserManager.users.subspaceAdmin.id,
  TestUserManager.users.subsubspaceAdmin.id,
  TestUserManager.users.nonSpaceMember.id,
  TestUserManager.users.globalAdmin.id,
  TestUserManager.users.globalSupportAdmin.id,
];
const settingsBefore = new Map<string, UpdateUserSettingsEntityInput>();

beforeAll(async () => {
  baseScenario = await TestScenarioFactory.createBaseScenario(scenarioConfig);

  for (const userId of SHAPED_PERSONA_IDS()) {
    settingsBefore.set(userId, await snapshotNotificationSettings(userId));
  }

  // Every admin under test would ALSO receive the generic "joined" mail
  // absent the R26 suppression — the "no joined mail" negatives below are
  // only meaningful if the admin WOULD otherwise receive it.
  for (const userId of [
    TestUserManager.users.spaceAdmin.id,
    TestUserManager.users.subspaceAdmin.id,
    TestUserManager.users.subsubspaceAdmin.id,
  ]) {
    assertCleanupSucceeded(
      `updateUserSettings(${userId})`,
      await updateUserSettings(userId, {
        notification: {
          space: {
            admin: {
              communityInvitationResponse: notif(true),
              communityNewMember: notif(true),
            },
          },
        },
      })
    );
  }

  // The invitee: mute the invitation-received mail (removes the in-flight
  // race `organization-invitations.it-spec.ts:628-635` had to work around)
  // but keep the welcome on — the suppression this file pins is admin-side
  // only, so the welcome must stay reachable.
  assertCleanupSucceeded(
    `updateUserSettings(${TestUserManager.users.nonSpaceMember.id})`,
    await updateUserSettings(TestUserManager.users.nonSpaceMember.id, {
      notification: {
        user: {
          membership: {
            spaceCommunityInvitationReceived: notif(false),
            spaceCommunityJoined: notif(true),
          },
        },
      },
    })
  );

  // Platform admins hold Space-admin notification rights on EVERY Space, so
  // with their default (all-on) settings they would land in every exact-count
  // assertion below.
  for (const userId of [
    TestUserManager.users.globalAdmin.id,
    TestUserManager.users.globalSupportAdmin.id,
  ]) {
    assertCleanupSucceeded(
      `updateUserSettings(${userId})`,
      await updateUserSettings(userId, {
        notification: {
          space: {
            admin: {
              communityInvitationResponse: notif(false),
              communityNewMember: notif(false),
            },
          },
        },
      })
    );
  }
});

afterAll(async () => {
  // Restore every persona before reporting; these are globally seeded and
  // outlive this file, and `nightly` runs single-threaded against one
  // database — a setting left shaped here silently changes every spec that
  // runs after it (see `organization-invitations.it-spec.ts`'s own afterAll).
  const restoreFailures: string[] = [];
  for (const [userId, settings] of settingsBefore.entries()) {
    try {
      assertCleanupSucceeded(
        `updateUserSettings(${userId})`,
        await updateUserSettings(userId, settings)
      );
    } catch (error) {
      restoreFailures.push(`${userId}: ${(error as Error).message}`);
    }
  }

  await TestScenarioFactory.cleanUpBaseScenario(baseScenario);

  if (restoreFailures.length > 0) {
    throw new Error(
      `afterAll: ${restoreFailures.length} persona setting restore(s) failed:\n${restoreFailures.join('\n')}`
    );
  }
});

beforeEach(async () => {
  await deleteMailSlurperMails();
});

afterEach(async () => {
  // UO-3 grants the invitee Member on BOTH the L1 role set (invited) and the
  // L0 ancestor role set (joined via invitedToParent) — strip L1 before L0 so
  // a failed removal never leaves a role behind that turns the NEXT test's
  // invite into ALREADY_MEMBER_OF_ROLE_SET. Harmless no-ops for UO-1/UO-2.
  await removeRoleFromUser(
    TestUserManager.users.nonSpaceMember.id,
    baseScenario.subspace.community.roleSetId,
    RoleName.Member
  ).catch(() => undefined);
  await removeRoleFromUser(
    TestUserManager.users.nonSpaceMember.id,
    baseScenario.space.community.roleSetId,
    RoleName.Member
  ).catch(() => undefined);

  if (invitationId) {
    // Keep the id until the delete is PROVEN clean: a GraphQL failure
    // resolves rather than rejects, so clearing it unconditionally drops the
    // only handle on a leaked invitation (see assertCleanupSucceeded).
    const deletion = await deleteInvitation(invitationId);
    assertCleanupSucceeded(`deleteInvitation(${invitationId})`, deletion);
    invitationId = '';
  }
});

/** Raw query — the polymorphic in-app payload has no committed `lib` fragment (harness.md). */
const inAppNotificationsFor = async (
  userRole: TestUser,
  types: NotificationEvent[]
) => {
  const requestParams = {
    operationName: 'GetUserInvitationOutcomeInAppNotifications',
    query: `
      query GetUserInvitationOutcomeInAppNotifications($types: [NotificationEvent!]) {
        me {
          notifications(filter: { types: $types }) {
            total
            inAppNotifications {
              id
              type
              payload {
                type
                ... on InAppNotificationPayloadSpaceCommunityActor {
                  actor { id }
                  space { id }
                }
              }
            }
          }
        }
      }
    `,
    variables: { types },
  };
  const response = await graphqlRequestAuth(requestParams, userRole);
  return response.body?.data?.me?.notifications as
    | {
        total: number;
        inAppNotifications: Array<{
          id: string;
          type: string;
          payload?: {
            actor?: { id: string };
            space?: { id: string };
          };
        }>;
      }
    | undefined;
};

const inviteUserToRoleSet = async (
  roleSetId: string,
  userId: string,
  userRole: TestUser = TestUser.SPACE_ADMIN
) =>
  inviteForEntryRoleOnRoleSet(
    roleSetId,
    [userId],
    [],
    'welcome',
    [RoleName.Member],
    userRole
  );

describe('User Space invitations — the invitee is the actor (notifications#356)', () => {
  test('UO-1 — user accepts an L0 invitation: every Space admin hears "accepted", nobody hears "joined", the invitee is welcomed', async () => {
    const nonSpaceMember = TestUserManager.users.nonSpaceMember;
    const spaceAdmin = TestUserManager.users.spaceAdmin;
    const subspaceAdmin = TestUserManager.users.subspaceAdmin;
    const spaceDisplayName = baseScenario.space.about.profile.displayName;

    const invitationData = await inviteUserToRoleSet(
      baseScenario.space.community.roleSetId,
      nonSpaceMember.id
    );
    const result = getSingleInvitationResult(invitationData);
    invitationId = result?.invitation?.id ?? '';
    expect(result?.type).toEqual(RoleSetInvitationResultType.InvitedToRoleSet);
    expect(invitationId.length).toEqual(36);

    const accept = await eventOnRoleSetInvitation(
      invitationId,
      'ACCEPT',
      TestUser.NON_SPACE_MEMBER
    );
    expect(accept?.error).toBeUndefined();

    const acceptedSubject = `${nonSpaceMember.displayName} accepted the invitation to ${spaceDisplayName}`;
    const joinedSubject = `user &#34;${nonSpaceMember.displayName}&#34; joined ${spaceDisplayName}`;
    const welcomeSubject = `${spaceDisplayName} - Welcome to the Community!`;

    const isSpaceAdminAccepted = (m: any) =>
      m.toAddresses?.includes(spaceAdmin.email) && m.subject === acceptedSubject;
    const isSubspaceAdminAccepted = (m: any) =>
      m.toAddresses?.includes(subspaceAdmin.email) &&
      m.subject === acceptedSubject;
    const isInviteeWelcome = (m: any) =>
      m.toAddresses?.includes(nonSpaceMember.email) &&
      m.subject === welcomeSubject;

    // Wait for ALL three positives — the invitee's welcome is the causal
    // anchor for the "no joined mail" negative below (harness.md: the
    // server's spaceCommunityNewMember adapter awaits the welcome first and
    // only then decides the admin-side "joined").
    await waitForMailsWhere(
      items =>
        items.some(isSpaceAdminAccepted) &&
        items.some(isSubspaceAdminAccepted) &&
        items.some(isInviteeWelcome),
      { timeout: 18_000 }
    );
    await delay(5_000);
    const [mailItems] = await getMailsData();

    // "Every admin", not just the inviter (R26a) — both L0 admins are told.
    expect(mailItems.filter(isSpaceAdminAccepted)).toHaveLength(1);
    expect(mailItems.filter(isSubspaceAdminAccepted)).toHaveLength(1);
    // Suppression is admin-side only; the invitee's own welcome survives.
    expect(mailItems.filter(isInviteeWelcome)).toHaveLength(1);

    // R26/R28: neither admin ALSO gets the generic "joined" mail — the
    // replacement notification suppresses it, it does not add to it.
    const isSpaceAdminJoined = (m: any) =>
      m.toAddresses?.includes(spaceAdmin.email) && m.subject === joinedSubject;
    const isSubspaceAdminJoined = (m: any) =>
      m.toAddresses?.includes(subspaceAdmin.email) &&
      m.subject === joinedSubject;
    expect(mailItems.filter(isSpaceAdminJoined)).toHaveLength(0);
    expect(mailItems.filter(isSubspaceAdminJoined)).toHaveLength(0);

    // R33: the answerer is never told about their own click.
    const isInviteeAccepted = (m: any) =>
      m.toAddresses?.includes(nonSpaceMember.email) &&
      m.subject === acceptedSubject;
    expect(mailItems.filter(isInviteeAccepted)).toHaveLength(0);

    // In-app, on the co-admin who never acted (positive control for the
    // query shape AND proof this is not just the inviter's own read model).
    const acceptedRows = await inAppNotificationsFor(TestUser.SUBSPACE_ADMIN, [
      NotificationEvent.SpaceAdminUserCommunityInvitationAccepted,
    ]);
    const acceptedRow = acceptedRows?.inAppNotifications.find(
      n =>
        n.payload?.actor?.id === nonSpaceMember.id &&
        n.payload?.space?.id === baseScenario.space.id
    );
    expect(acceptedRow).toBeDefined();

    const newMemberRows = await inAppNotificationsFor(
      TestUser.SUBSPACE_ADMIN,
      [NotificationEvent.SpaceAdminCommunityNewMember]
    );
    const newMemberRow = newMemberRows?.inAppNotifications.find(
      n =>
        n.payload?.actor?.id === nonSpaceMember.id &&
        n.payload?.space?.id === baseScenario.space.id
    );
    expect(newMemberRow).toBeUndefined();
  });

  test('UO-2 — user declines an L0 invitation: every Space admin hears "declined"', async () => {
    const nonSpaceMember = TestUserManager.users.nonSpaceMember;
    const spaceAdmin = TestUserManager.users.spaceAdmin;
    const subspaceAdmin = TestUserManager.users.subspaceAdmin;
    const spaceDisplayName = baseScenario.space.about.profile.displayName;

    const invitationData = await inviteUserToRoleSet(
      baseScenario.space.community.roleSetId,
      nonSpaceMember.id
    );
    const result = getSingleInvitationResult(invitationData);
    invitationId = result?.invitation?.id ?? '';
    expect(result?.type).toEqual(RoleSetInvitationResultType.InvitedToRoleSet);
    expect(invitationId.length).toEqual(36);

    const decline = await eventOnRoleSetInvitation(
      invitationId,
      'REJECT',
      TestUser.NON_SPACE_MEMBER
    );
    expect(decline?.error).toBeUndefined();

    const declinedSubject = `${nonSpaceMember.displayName} declined the invitation to ${spaceDisplayName}`;
    const welcomeSubject = `${spaceDisplayName} - Welcome to the Community!`;

    const isSpaceAdminDeclined = (m: any) =>
      m.toAddresses?.includes(spaceAdmin.email) && m.subject === declinedSubject;
    const isSubspaceAdminDeclined = (m: any) =>
      m.toAddresses?.includes(subspaceAdmin.email) &&
      m.subject === declinedSubject;

    await waitForMailsWhere(
      items =>
        items.some(isSpaceAdminDeclined) && items.some(isSubspaceAdminDeclined),
      { timeout: 18_000 }
    );
    await delay(5_000);
    const [mailItems] = await getMailsData();

    // "Every admin" (R28), covering #356 row 4's "reject was not implemented"
    // claim (OQ-2) — the code demonstrably does implement it.
    expect(mailItems.filter(isSpaceAdminDeclined)).toHaveLength(1);
    expect(mailItems.filter(isSubspaceAdminDeclined)).toHaveLength(1);

    // Nothing joined: no welcome, and the answerer is not told about their
    // own click (R33).
    const isInviteeWelcome = (m: any) =>
      m.toAddresses?.includes(nonSpaceMember.email) &&
      m.subject === welcomeSubject;
    const isInviteeDeclined = (m: any) =>
      m.toAddresses?.includes(nonSpaceMember.email) &&
      m.subject === declinedSubject;
    expect(mailItems.filter(isInviteeWelcome)).toHaveLength(0);
    expect(mailItems.filter(isInviteeDeclined)).toHaveLength(0);

    const declinedRows = await inAppNotificationsFor(TestUser.SUBSPACE_ADMIN, [
      NotificationEvent.SpaceAdminUserCommunityInvitationDeclined,
    ]);
    const declinedRow = declinedRows?.inAppNotifications.find(
      n =>
        n.payload?.actor?.id === nonSpaceMember.id &&
        n.payload?.space?.id === baseScenario.space.id
    );
    expect(declinedRow).toBeDefined();
  });

  test('UO-3 — user accepts an L1 invitation via invitedToParent: the L1 admin hears "accepted" (not "joined"), the L0 ancestor admins hear "joined" as normal', async () => {
    const nonSpaceMember = TestUserManager.users.nonSpaceMember;
    const spaceAdmin = TestUserManager.users.spaceAdmin;
    const subspaceAdmin = TestUserManager.users.subspaceAdmin;
    const subsubspaceAdmin = TestUserManager.users.subsubspaceAdmin;
    const l0DisplayName = baseScenario.space.about.profile.displayName;
    const l1DisplayName = baseScenario.subspace.about.profile.displayName;

    let invitationData = await inviteUserToRoleSet(
      baseScenario.subspace.community.roleSetId,
      nonSpaceMember.id,
      TestUser.SPACE_ADMIN
    );
    let result = getSingleInvitationResult(invitationData);

    if (
      result?.type === RoleSetInvitationResultType.InvitationToParentNotAuthorized
    ) {
      // spaceAdmin (an L0 admin) is expected to be authorized on the parent
      // role set; if not, re-issue as GLOBAL_ADMIN (muted in this file's
      // fixture) rather than fail on an authorization gate this case is not
      // about, and say so.
      invitationData = await inviteUserToRoleSet(
        baseScenario.subspace.community.roleSetId,
        nonSpaceMember.id,
        TestUser.GLOBAL_ADMIN
      );
      result = getSingleInvitationResult(invitationData);
    }

    invitationId = result?.invitation?.id ?? '';
    expect(result?.type).toEqual(RoleSetInvitationResultType.InvitedToRoleSet);
    expect(invitationId.length).toEqual(36);
    if (!result?.invitation?.invitedToParent) {
      throw new Error(
        'Precondition failed: invitation.invitedToParent is false — the L0 ' +
          'ancestor-boundary path this case exists to test was never exercised.'
      );
    }

    const accept = await eventOnRoleSetInvitation(
      invitationId,
      'ACCEPT',
      TestUser.NON_SPACE_MEMBER
    );
    expect(accept?.error).toBeUndefined();

    // Exact subject equality throughout: the L1 display name can start with
    // the L0 display name, so `includes` would let an L1 mail satisfy an L0
    // assertion or vice versa.
    const l1AcceptedSubject = `${nonSpaceMember.displayName} accepted the invitation to ${l1DisplayName}`;
    const l1JoinedSubject = `user &#34;${nonSpaceMember.displayName}&#34; joined ${l1DisplayName}`;
    const l0JoinedSubject = `user &#34;${nonSpaceMember.displayName}&#34; joined ${l0DisplayName}`;
    const l1WelcomeSubject = `${l1DisplayName} - Welcome to the Community!`;

    const isL1AdminAccepted = (m: any) =>
      m.toAddresses?.includes(subsubspaceAdmin.email) &&
      m.subject === l1AcceptedSubject;
    const isL0SpaceAdminJoined = (m: any) =>
      m.toAddresses?.includes(spaceAdmin.email) && m.subject === l0JoinedSubject;
    const isL0SubspaceAdminJoined = (m: any) =>
      m.toAddresses?.includes(subspaceAdmin.email) &&
      m.subject === l0JoinedSubject;
    const isInviteeL1Welcome = (m: any) =>
      m.toAddresses?.includes(nonSpaceMember.email) &&
      m.subject === l1WelcomeSubject;

    await waitForMailsWhere(
      items =>
        items.some(isL1AdminAccepted) &&
        items.some(isL0SpaceAdminJoined) &&
        items.some(isL0SubspaceAdminJoined) &&
        items.some(isInviteeL1Welcome),
      { timeout: 18_000 }
    );
    await delay(5_000);
    const [mailItems] = await getMailsData();

    // L1 (invited, origin INVITATION): "accepted" reaches its admin, "joined"
    // is suppressed there.
    expect(mailItems.filter(isL1AdminAccepted)).toHaveLength(1);
    const isL1AdminJoined = (m: any) =>
      m.toAddresses?.includes(subsubspaceAdmin.email) &&
      m.subject === l1JoinedSubject;
    expect(mailItems.filter(isL1AdminJoined)).toHaveLength(0);

    // L0 (ancestor, origin DIRECT — R26b): the suppression does NOT leak
    // upward. Both L0 admins hear "joined" exactly as any other direct join
    // would produce. This is also this file's stack-level positive control
    // proving the "joined" template still reaches admins at all on this
    // stack (UO-1/UO-2's negative would otherwise be unfalsifiable).
    expect(mailItems.filter(isL0SpaceAdminJoined)).toHaveLength(1);
    expect(mailItems.filter(isL0SubspaceAdminJoined)).toHaveLength(1);

    // The invitee's welcome for the space they were actually invited to. The
    // exact NUMBER of welcome mails (one per joined Space, or only the
    // target) is deliberately unpinned (build sheet) — assert presence only.
    expect(mailItems.filter(isInviteeL1Welcome).length).toBeGreaterThanOrEqual(
      1
    );

    // Newly established fact (QA lead's manual verification run, 2026-09-28):
    // on a fixture where the L0 admins hold NO L1 admin credential (this
    // file's spaceAdmin/subspaceAdmin are not granted any role on
    // baseScenario.subspace), getSpaceAdminCredentialCriteria(L1) cannot
    // resolve either of them as an L1 recipient, so neither hears the L1
    // "accepted" mail. This is narrower than the general claim (an L0 admin
    // who ALSO holds the L1 admin credential, which this fixture does not
    // exercise and the plan leaves deliberately unpinned) — it is unambiguous
    // only because of that fixture shape.
    const isL0SpaceAdminL1Accepted = (m: any) =>
      m.toAddresses?.includes(spaceAdmin.email) &&
      m.subject === l1AcceptedSubject;
    const isL0SubspaceAdminL1Accepted = (m: any) =>
      m.toAddresses?.includes(subspaceAdmin.email) &&
      m.subject === l1AcceptedSubject;
    expect(mailItems.filter(isL0SpaceAdminL1Accepted)).toHaveLength(0);
    expect(mailItems.filter(isL0SubspaceAdminL1Accepted)).toHaveLength(0);
  });
});
