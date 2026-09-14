/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  delay,
  deleteMailSlurperMails,
  getMailsData,
  TestScenarioConfig,
  TestScenarioFactory,
  TestUser,
  TestUserManager,
} from '@alkemio/tests-lib';
import {
  CommunityMembershipPolicy,
  RoleName,
  UpdateUserSettingsEntityInput,
} from '@alkemio/tests-lib/core/generated/alkemio-schema';
import { OrganizationWithSpaceModel } from '@alkemio/tests-lib/scenario/models/OrganizationWithSpaceModel';
import {
  createApplication,
  deleteApplication,
} from '@functional-api/roleset/application/application.request.params';
import { eventOnRoleSetApplication } from '@functional-api/roleset/roleset-events.request.params';
import { removeRoleFromUser } from '@functional-api/roleset/roles-request.params';
import { updateUserSettings } from '@functional-api/contributor-management/user/user.request.params';
import {
  assertCleanupSucceeded,
  notif,
  snapshotNotificationSettings,
} from '../../notification.helpers';

/**
 * Ruling **R40** / FR-020a(c) — the discriminating live test for the boundary
 * of the "no double notification" suppression, on its application arm.
 *
 * `CommunityMembershipOrigin` suppresses the generic Space-admin "a new member
 * joined" notification **only where a replacement notification exists**. An
 * accepted invitation has one: "X accepted the invitation" reaches every admin
 * of the invited Space. An approved application does **not** —
 * `SPACE_ADMIN_COMMUNITY_APPLICATION` fires at *submission*, and there is no
 * application-approved event — so suppressing there would leave the approving
 * admin's co-admins told nothing at all, silently regressing a platform flow
 * `server#4100` does not otherwise touch.
 *
 * R35 had briefly suppressed applications too, on the literal reading of the
 * product email's *"no invitation or application step"*. **R40 restored R31**:
 * that sentence was the email pruning a *proposed* notification list for the
 * user → organization associates flow, and organizations cannot apply to a
 * Space at all (FR-014/R9), so within this feature the clause has nothing to
 * attach to. Adding the missing event is alkem-io/server#6476.
 *
 * This spec pins the boundary from the outside: a Space with two admins, one
 * approves, and the OTHER **is** told — while the new member still receives
 * their own welcome. It fails against a build that suppresses the application
 * arm, which is what makes it worth its runtime. When #6476 lands and the
 * replacement event exists, this expectation flips and this file is the place
 * that says so.
 */
const notificationsOff = {
  notification: {
    space: {
      admin: {
        communityApplicationReceived: notif(false),
        communityNewMember: notif(false),
        collaborationCalloutContributionCreated: notif(false),
        communicationMessageReceived: notif(false),
      },
      collaborationCalloutPublished: notif(false),
      communicationUpdates: notif(false),
      collaborationCalloutPostContributionComment: notif(false),
      collaborationCalloutContributionCreated: notif(false),
      collaborationCalloutComment: notif(false),
    },
    user: {
      commentReply: notif(false),
      mentioned: notif(false),
      messageReceived: notif(false),
      membership: {
        spaceCommunityInvitationReceived: notif(false),
        spaceCommunityJoined: notif(false),
      },
    },
  },
};

// Only `communityNewMember` is on: the application-received notification is
// muted so the approval's mails are the only ones in the box.
const newMemberOnly = {
  ...notificationsOff,
  notification: {
    ...notificationsOff.notification,
    space: {
      ...notificationsOff.notification.space,
      admin: {
        ...notificationsOff.notification.space.admin,
        communityNewMember: notif(true),
      },
    },
  },
};

// The APPLICANT keeps exactly one setting on: the member-side welcome.
// The suppression is admin-side only and never applies to the welcome; the
// welcome must arrive whatever the origin, or a joining member hears nothing
// about their own membership. Asserting it requires the applicant to be able to receive it —
// muting `spaceCommunityJoined` here (as `notificationsOff` does for everyone
// else) would make the assertion pass or fail on this file's own precondition
// rather than on the product, which is the failure mode this whole file exists
// to catch.
const welcomeOnly = {
  ...notificationsOff,
  notification: {
    ...notificationsOff.notification,
    user: {
      ...notificationsOff.notification.user,
      membership: {
        ...notificationsOff.notification.user.membership,
        spaceCommunityJoined: notif(true),
      },
    },
  },
};

let baseScenario: OrganizationWithSpaceModel;
const scenarioConfig: TestScenarioConfig = {
  name: 'notif-application-approval',
  space: {
    collaboration: { addTutorialCallouts: false },
    community: {
      // TWO Space admins: one approves, the other is the recipient under test.
      admins: [TestUser.SPACE_ADMIN, TestUser.SUBSPACE_ADMIN],
      members: [TestUser.SPACE_ADMIN, TestUser.SUBSPACE_ADMIN],
    },
    settings: {
      membership: { policy: CommunityMembershipPolicy.Applications },
    },
  },
};

let applicationId = '';

// Every globally seeded persona this file mutes, and the settings each had
// before it did. Restored verbatim in `afterAll` — see
// `snapshotNotificationSettings` for why an all-on restore is not equivalent.
const MUTED_PERSONA_IDS = (): string[] => [
  TestUserManager.users.spaceAdmin.id,
  TestUserManager.users.subspaceAdmin.id,
  TestUserManager.users.globalAdmin.id,
  TestUserManager.users.globalSupportAdmin.id,
  TestUserManager.users.qaUser.id,
];
const settingsBefore = new Map<string, UpdateUserSettingsEntityInput>();

beforeAll(async () => {
  baseScenario = await TestScenarioFactory.createBaseScenario(scenarioConfig);

  await Promise.all(
    MUTED_PERSONA_IDS().map(async userId =>
      settingsBefore.set(userId, await snapshotNotificationSettings(userId))
    )
  );

  // The two Space admins under test hear only about new members ...
  await Promise.all(
    [
      TestUserManager.users.spaceAdmin.id,
      TestUserManager.users.subspaceAdmin.id,
    ].map(userId => updateUserSettings(userId, newMemberOnly))
  );
  // ... and every other actor that would otherwise land in the same mailbox
  // (platform admins hold Space-admin notification rights everywhere) is
  // silenced, so the counts below mean what they say.
  await Promise.all(
    [
      TestUserManager.users.globalAdmin.id,
      TestUserManager.users.globalSupportAdmin.id,
    ].map(userId => updateUserSettings(userId, notificationsOff))
  );
  // The applicant is silenced on everything EXCEPT the welcome it must receive.
  await updateUserSettings(TestUserManager.users.qaUser.id, welcomeOnly);
});

afterAll(async () => {
  // Hand the shared personas back EXACTLY the way this file found them. All
  // five are GLOBALLY seeded and outlive this file; `nightly` runs
  // single-threaded against one database, so anything left changed here
  // silently changes the specs that run next — including
  // `organization-invitations.it-spec.ts`, which asserts exact per-recipient
  // mail counts and sets no notification preconditions of its own.
  // Restore EVERY persona before reporting: bailing on the first failure would
  // leave the rest muted, which is the corruption this hook exists to prevent.
  // Collect, finish, then fail loudly — a silent GraphQL error here re-opens
  // exactly what `snapshotNotificationSettings` was written to close.
  const restoreFailures: string[] = [];
  for (const [userId, settings] of settingsBefore.entries()) {
    try {
      const restored = await updateUserSettings(userId, settings);
      assertCleanupSucceeded(`updateUserSettings(${userId})`, restored);
    } catch (error) {
      restoreFailures.push(`${userId}: ${(error as Error).message}`);
    }
  }

  await TestScenarioFactory.cleanUpBaseScenario(baseScenario);

  if (restoreFailures.length > 0) {
    throw new Error(
      `Failed to restore notification settings for ${restoreFailures.length} persona(s); ` +
        `later specs in this run will see the wrong settings:\n${restoreFailures.join('\n')}`
    );
  }
});

afterEach(async () => {
  await removeRoleFromUser(
    TestUserManager.users.qaUser.id,
    baseScenario.space.community.roleSetId,
    RoleName.Member
  ).catch(() => undefined);
  if (applicationId) {
    await deleteApplication(applicationId).catch(() => undefined);
    applicationId = '';
  }
});

describe('Notifications - approving an application (R40)', () => {
  test('the admin who did NOT approve is still told; the new member gets their welcome', async () => {
    const application = await createApplication(
      baseScenario.space.community.roleSetId,
      TestUser.QA_USER
    );
    applicationId = application?.data?.applyForEntryRoleOnRoleSet?.id ?? '';
    expect(applicationId.length).toEqual(36);

    // Drop the submission mails; only the approval's are of interest.
    await deleteMailSlurperMails();

    const approval = await eventOnRoleSetApplication(
      applicationId,
      'APPROVE',
      TestUser.SPACE_ADMIN
    );
    expect(approval?.error).toBeUndefined();

    await delay(3000);
    const [mails] = await getMailsData();

    // R40: nothing replaces "a new member joined" for an approved application
    // — SPACE_ADMIN_COMMUNITY_APPLICATION fired at submission, not here — so
    // the co-admin who did not approve MUST still be told, exactly as on
    // `develop`. Matched on the template's own subject
    // (`space.admin.community.new.member.js`: '<type> "<name>" joined
    // <space>'), not merely on the recipient: a count of "any mail to the
    // co-admin" would be satisfied by an unrelated notification and would keep
    // passing if this one were suppressed — the failure this file exists to
    // catch. When #6476 adds the application-approved event, this expectation
    // flips to 0 and the new event is asserted in its place.
    const coAdminNewMemberMails = (mails ?? []).filter(
      (mail: any) =>
        mail.toAddresses?.includes(
          TestUserManager.users.subspaceAdmin.email
        ) &&
        mail.subject?.includes(
          `joined ${baseScenario.space.about.profile.displayName}`
        )
    );
    expect(coAdminNewMemberMails).toHaveLength(1);

    // ...but the suppression is admin-side ONLY. The member-side welcome is
    // untouched by CommunityMembershipOrigin and must still arrive, otherwise
    // an approved applicant joins in complete silence.
    // Matched on the welcome template's own subject
    // (`user.space.community.joined.js`: "<Space> - Welcome to the Community!"),
    // not merely on the recipient: a count of "any mail to the applicant" would
    // be satisfied by an unrelated notification and would keep passing if the
    // welcome itself were suppressed.
    const applicantWelcomeMails = (mails ?? []).filter(
      (mail: any) =>
        mail.toAddresses?.includes(TestUserManager.users.qaUser.email) &&
        mail.subject ===
          `${baseScenario.space.about.profile.displayName} - Welcome to the Community!`
    );
    expect(applicantWelcomeMails).toHaveLength(1);
  });
});
