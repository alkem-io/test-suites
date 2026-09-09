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
import { notif, snapshotNotificationSettings } from '../../notification.helpers';

/**
 * Ruling **R31** / FR-020a(c) — the discriminating live test for the one
 * carve-out in the "no double notification on accept" suppression.
 *
 * `CommunityMembershipOrigin` suppresses the generic Space-admin
 * "a new member joined" notification when a membership came from **accepting
 * an invitation**, because FR-020's outcome notification replaces it for every
 * admin. R26 originally extended that to **approved applications** too, taken
 * literally from the product email. There is no application-approved event to
 * replace it (`SPACE_ADMIN_COMMUNITY_APPLICATION` fires at *submission*), so
 * that left every co-admin of the approving admin with nothing at all — a
 * silent, platform-wide regression.
 *
 * This spec pins the corrected behaviour from the outside: a Space with two
 * admins, one approves, the OTHER is still told. It fails against the
 * suppressed build and passes against `develop`'s behaviour, which is exactly
 * what makes it worth its runtime.
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
// muted so the approval's mails are the only ones in the box, and the member
// welcome is muted so the applicant does not add noise either.
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
      TestUserManager.users.qaUser.id,
    ].map(userId => updateUserSettings(userId, notificationsOff))
  );
});

afterAll(async () => {
  // Hand the shared personas back EXACTLY the way this file found them. All
  // five are GLOBALLY seeded and outlive this file; `nightly` runs
  // single-threaded against one database, so anything left changed here
  // silently changes the specs that run next — including
  // `organization-invitations.it-spec.ts`, which asserts exact per-recipient
  // mail counts and sets no notification preconditions of its own.
  await Promise.all(
    [...settingsBefore.entries()].map(([userId, settings]) =>
      updateUserSettings(userId, settings).catch(() => undefined)
    )
  );

  await TestScenarioFactory.cleanUpBaseScenario(baseScenario);
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

describe('Notifications - approving an application (R31)', () => {
  test('the admin who did NOT approve is still told "a new member joined"', async () => {
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

    const coAdminMails = (mails ?? []).filter((mail: any) =>
      mail.toAddresses?.includes(TestUserManager.users.subspaceAdmin.email)
    );

    // The co-admin performed no approval and receives no outcome notification
    // (there is no application-approved event), so the generic
    // "a new member joined" is the ONLY thing that can tell them. Suppressing
    // it here tells them nothing at all — the regression R31 reverses.
    expect(coAdminMails).toHaveLength(1);
    expect(coAdminMails[0].subject).toContain(
      `joined ${baseScenario.space.about.profile.displayName}`
    );
  });
});
