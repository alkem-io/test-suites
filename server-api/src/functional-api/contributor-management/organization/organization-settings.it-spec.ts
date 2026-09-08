import {
  getOrganizationData,
  updateOrganization,
} from './organization.request.params';
import { updateOrganizationSettings } from './organization.request.params';
import {
  TestScenarioConfig,
  TestScenarioFactory,
  TestUser,
  TestUserManager,
  UniqueIDGenerator,
  queryHarnessDb,
} from '@alkemio/tests-lib';
import {
  deleteUser,
  getUserSettings,
  registerVerifiedUser,
  updateUserSettings,
} from '../user/user.request.params';
import { allChannelsOn } from '@functional-api/notifications/notification.helpers';
import { eventOnOrganizationVerification } from './organization-verification.events.request.params';
import { assignRoleToUser } from '@functional-api/roleset/roles-request.params';
import { OrganizationWithSpaceModel } from '@alkemio/tests-lib/scenario/models/OrganizationWithSpaceModel';
import { RoleName } from '@alkemio/tests-lib/core/generated/alkemio-schema';
import { notifWithPush } from '@functional-api/notifications/notification.helpers';

const uniqueId = UniqueIDGenerator.getID();
let userId: string;
const domain = `alkem${uniqueId}.io`;

let baseScenario: OrganizationWithSpaceModel;
// Note: no space, just the org to make this test suite much faster
const scenarioConfig: TestScenarioConfig = {
  name: 'organization-settings',
};

beforeAll(async () => {
  baseScenario = await TestScenarioFactory.createBaseScenario(scenarioConfig);

  await updateOrganization(baseScenario.organization.id, {
    domain: domain,
    website: domain,
  });

  await assignRoleToUser(
    TestUserManager.users.spaceMember.id,
    baseScenario.organization.roleSetId,
    RoleName.Admin
  );

  // A plain associate — no manager credential — for the US5-AS3 rejection case.
  await assignRoleToUser(
    TestUserManager.users.nonSpaceMember.id,
    baseScenario.organization.roleSetId,
    RoleName.Associate
  );
});

afterAll(async () => {
  await TestScenarioFactory.cleanUpBaseScenario(baseScenario);
});

describe('Organization settings', () => {
  describe('DDT user WITH privileges to update organization settings', () => {
    // Arrange
    test.each`
      userRole
      ${TestUser.GLOBAL_ADMIN}
      ${TestUser.SPACE_MEMBER}
      ${TestUser.ORGANIZATION_ADMIN}
    `(
      'User: "$userRole" is able to update organization settings ',
      async ({ userRole }) => {
        // Act
        const res = await updateOrganizationSettings(
          baseScenario.organization.id,
          {
            membership: {
              allowUsersMatchingDomainToJoin: true,
            },
          },
          userRole
        );

        // Assert
        expect(
          res?.data?.updateOrganizationSettings.settings.membership
            .allowUsersMatchingDomainToJoin
        ).toEqual(true);
      }
    );
  });

  describe('DDT user WITHOUT privileges to update organization settings', () => {
    // Arrange
    test.each`
      userRole                     | message
      ${TestUser.NON_SPACE_MEMBER} | ${"Authorization: unable to grant 'update' privilege: organization settings update:"}
    `(
      'User: "$userRole" get message: "$message", when intend to update organization settings ',
      async ({ userRole, message }) => {
        // Act
        const res = await updateOrganizationSettings(
          baseScenario.organization.id,
          {
            membership: {
              allowUsersMatchingDomainToJoin: false,
            },
          },
          userRole
        );

        // Assert
        expect(res?.error?.errors[0].message).toContain(message);
      }
    );
  });

  describe('Unverified organization - domain match', () => {
    afterEach(async () => {
      await deleteUser(userId);
    });
    test("don't assign new user to organization,domain setting enabled", async () => {
      // Arrange
      await updateOrganizationSettings(baseScenario.organization.id, {
        membership: {
          allowUsersMatchingDomainToJoin: true,
        },
      });

      // Act
      const email = `enm${uniqueId}@${domain}`;
      const testId = UniqueIDGenerator.getID();
      userId = await registerVerifiedUser(email, `fn${testId}`, `ln${testId}`);

      const organizationData = await getOrganizationData(
        baseScenario.organization.id
      );
      const organizationMembers =
        organizationData?.data?.organization.roleSet.usersInRole;

      // Assert
      // The org has 3 members after setup: the creator (auto-associate), the
      // explicit Admin, and the explicit Associate assigned in beforeAll.
      expect(organizationMembers).toHaveLength(3);
      expect(organizationMembers).not.toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            email: email,
          }),
        ])
      );
    });

    test("don't assign new user to organization, domain setting disabled", async () => {
      // Arrange
      await updateOrganizationSettings(baseScenario.organization.id, {
        membership: {
          allowUsersMatchingDomainToJoin: false,
        },
      });

      // Act
      const email = `dism${uniqueId}@${domain}`;
      const testId = UniqueIDGenerator.getID();
      userId = await registerVerifiedUser(email, `fn${testId}`, `ln${testId}`);

      const organizationData = await getOrganizationData(
        baseScenario.organization.id
      );
      const organizationMembers =
        organizationData?.data?.organization.roleSet.usersInRole;

      // Assert
      // The org has 3 members after setup: the creator (auto-associate), the
      // explicit Admin, and the explicit Associate assigned in beforeAll.
      expect(organizationMembers).toHaveLength(3);
      expect(organizationMembers).not.toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            email: email,
          }),
        ])
      );
    });

    test("don't assign new user with different domain to organization,domain setting enabled", async () => {
      // Arrange
      await updateOrganizationSettings(baseScenario.organization.id, {
        membership: {
          allowUsersMatchingDomainToJoin: true,
        },
      });

      // Act
      const email = `enms${uniqueId}@a${domain}`;
      const testId = UniqueIDGenerator.getID();
      userId = await registerVerifiedUser(email, `fn${testId}`, `ln${testId}`);

      const organizationData = await getOrganizationData(
        baseScenario.organization.id
      );
      const organizationMembers =
        organizationData?.data?.organization.roleSet.usersInRole;

      // Assert
      // The org has 3 members after setup: the creator (auto-associate), the
      // explicit Admin, and the explicit Associate assigned in beforeAll.
      expect(organizationMembers).toHaveLength(3);
      expect(organizationMembers).not.toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            email: email,
          }),
        ])
      );
    });
  });

  describe('Verified organization - domain match', () => {
    beforeAll(async () => {
      await eventOnOrganizationVerification(
        baseScenario.organization.verificationId,
        'VERIFICATION_REQUEST'
      );

      await eventOnOrganizationVerification(
        baseScenario.organization.verificationId,
        'MANUALLY_VERIFY'
      );
    });

    afterEach(async () => {
      await deleteUser(userId);
    });
    test('assign new user to organization,domain setting enabled', async () => {
      // Arrange
      await updateOrganizationSettings(baseScenario.organization.id, {
        membership: {
          allowUsersMatchingDomainToJoin: true,
        },
      });

      const origOrgData = await getOrganizationData(
        baseScenario.organization.id
      );
      const origOrganizationMembers =
        origOrgData?.data?.organization.roleSet.usersInRole;
      const origMembersCount = origOrganizationMembers?.length ?? -999;

      // Act
      const email = `en${uniqueId}@${domain}`;
      const testId = UniqueIDGenerator.getID();
      userId = await registerVerifiedUser(email, `fn${testId}`, `ln${testId}`);

      const organizationData = await getOrganizationData(
        baseScenario.organization.id
      );
      const organizationMembers =
        organizationData?.data?.organization.roleSet.usersInRole;
      const associates =
        organizationMembers?.map((m: { email: string }) => m.email) || [];

      // Assert
      expect(associates).toHaveLength(origMembersCount + 1);
      expect(organizationMembers).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            email: email,
          }),
        ])
      );
    });

    test("don't assign new user to organization, domain setting disabled", async () => {
      // Arrange
      await updateOrganizationSettings(baseScenario.organization.id, {
        membership: {
          allowUsersMatchingDomainToJoin: false,
        },
      });

      // Act
      const email = `dis${uniqueId}@${domain}`;
      const testId = UniqueIDGenerator.getID();
      userId = await registerVerifiedUser(email, `fn${testId}`, `ln${testId}`);

      const organizationData = await getOrganizationData(
        baseScenario.organization.id
      );
      const organizationMembers =
        organizationData?.data?.organization.roleSet.usersInRole;

      // Assert
      // The org has 3 members after setup: the creator (auto-associate), the
      // explicit Admin, and the explicit Associate assigned in beforeAll.
      expect(organizationMembers).toHaveLength(3);
      expect(organizationMembers).not.toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            email: email,
          }),
        ])
      );
    });

    test("don't assign new user with different domain to organization,domain setting enabled", async () => {
      // Arrange
      await updateOrganizationSettings(baseScenario.organization.id, {
        membership: {
          allowUsersMatchingDomainToJoin: true,
        },
      });

      // Act
      const email = `en${uniqueId}@a${domain}`;
      const testId = UniqueIDGenerator.getID();
      userId = await registerVerifiedUser(email, `fn${testId}`, `ln${testId}`);

      const organizationData = await getOrganizationData(
        baseScenario.organization.id
      );
      const organizationMembers =
        organizationData?.data?.organization.roleSet.usersInRole;

      // Assert
      // The org has 3 members after setup: the creator (auto-associate), the
      // explicit Admin, and the explicit Associate assigned in beforeAll.
      expect(organizationMembers).toHaveLength(3);
      expect(organizationMembers).not.toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            email: email,
          }),
        ])
      );
    });
  });
});

describe('Organization settings — allowSpaceInvitations (061)', () => {
  test('a fresh organization reads allowSpaceInvitations as true by default', async () => {
    const organizationData = await getOrganizationData(
      baseScenario.organization.id
    );
    expect(
      organizationData?.data?.organization.settings.membership
        .allowSpaceInvitations
    ).toEqual(true);
  });

  test('allowSpaceInvitations round-trips false then true', async () => {
    const off = await updateOrganizationSettings(
      baseScenario.organization.id,
      {
        membership: {
          allowUsersMatchingDomainToJoin: false,
          allowSpaceInvitations: false,
        },
      }
    );
    expect(
      off?.data?.updateOrganizationSettings.settings.membership
        .allowSpaceInvitations
    ).toEqual(false);

    const on = await updateOrganizationSettings(baseScenario.organization.id, {
      membership: {
        allowUsersMatchingDomainToJoin: false,
        allowSpaceInvitations: true,
      },
    });
    expect(
      on?.data?.updateOrganizationSettings.settings.membership
        .allowSpaceInvitations
    ).toEqual(true);
  });

  test('an update carrying only allowUsersMatchingDomainToJoin leaves allowSpaceInvitations unchanged', async () => {
    await updateOrganizationSettings(baseScenario.organization.id, {
      membership: {
        allowUsersMatchingDomainToJoin: false,
        allowSpaceInvitations: false,
      },
    });

    const res = await updateOrganizationSettings(baseScenario.organization.id, {
      membership: {
        allowUsersMatchingDomainToJoin: true,
      },
    });

    expect(
      res?.data?.updateOrganizationSettings.settings.membership
        .allowUsersMatchingDomainToJoin
    ).toEqual(true);
    expect(
      res?.data?.updateOrganizationSettings.settings.membership
        .allowSpaceInvitations
    ).toEqual(false);

    // Restore defaults for later tests in this file.
    await updateOrganizationSettings(baseScenario.organization.id, {
      membership: {
        allowUsersMatchingDomainToJoin: false,
        allowSpaceInvitations: true,
      },
    });
  });

  test('an ASSOCIATE with no manager credential cannot update organization settings', async () => {
    const res = await updateOrganizationSettings(
      baseScenario.organization.id,
      {
        membership: {
          allowUsersMatchingDomainToJoin: false,
          allowSpaceInvitations: false,
        },
      },
      TestUser.NON_SPACE_MEMBER
    );

    expect(res?.error?.errors?.[0]?.message).toContain(
      "Authorization: unable to grant 'update' privilege: organization settings update:"
    );
  });
});

describe('User notification settings — organisation invited to a Space (US2-AS6)', () => {
  test('adminSpaceCommunityInvitation round-trips off then on', async () => {
    const off = await updateUserSettings(
      TestUserManager.users.spaceMember.id,
      {
        notification: {
          organization: {
            adminSpaceCommunityInvitation: notifWithPush(false),
          },
        },
      }
    );
    // Restore in `finally`, never after the assertion: `spaceMember` is a
    // globally seeded persona and `nightly` runs single-threaded against one
    // database, so a failure here — a `push` regression is precisely what this
    // test exists to catch — would otherwise skip the restore and leave the
    // persona muted for every spec that runs next. The restore itself does not
    // assert, so it can never mask the failure that triggered it.
    let on: Awaited<ReturnType<typeof updateUserSettings>> | undefined;
    try {
      expect(
        off?.data?.updateUserSettings.settings.notification.organization
          .adminSpaceCommunityInvitation
      ).toEqual(
        expect.objectContaining({ email: false, inApp: false, push: false })
      );
    } finally {
      on = await updateUserSettings(TestUserManager.users.spaceMember.id, {
        notification: {
          organization: { adminSpaceCommunityInvitation: notifWithPush(true) },
        },
      }).catch(() => undefined);
    }

    expect(
      on?.data?.updateUserSettings.settings.notification.organization
        .adminSpaceCommunityInvitation
    ).toEqual(
      expect.objectContaining({ email: true, inApp: true, push: true })
    );
  });
});

describe('Organization settings — allowApplications (062, US5-AS4/US6-AS1)', () => {
  test('a fresh organization reads allowApplications as true by default', async () => {
    const organizationData = await getOrganizationData(
      baseScenario.organization.id
    );
    expect(
      organizationData?.data?.organization.settings.membership
        .allowApplications
    ).toEqual(true);
  });

  test('allowApplications round-trips false then true', async () => {
    const off = await updateOrganizationSettings(
      baseScenario.organization.id,
      {
        membership: {
          allowUsersMatchingDomainToJoin: false,
          allowApplications: false,
        },
      }
    );
    expect(
      off?.data?.updateOrganizationSettings.settings.membership
        .allowApplications
    ).toEqual(false);

    const on = await updateOrganizationSettings(baseScenario.organization.id, {
      membership: {
        allowUsersMatchingDomainToJoin: false,
        allowApplications: true,
      },
    });
    expect(
      on?.data?.updateOrganizationSettings.settings.membership
        .allowApplications
    ).toEqual(true);
  });

  test('an update carrying only allowUsersMatchingDomainToJoin leaves allowApplications unchanged (nullable input)', async () => {
    await updateOrganizationSettings(baseScenario.organization.id, {
      membership: {
        allowUsersMatchingDomainToJoin: false,
        allowApplications: false,
      },
    });

    const res = await updateOrganizationSettings(baseScenario.organization.id, {
      membership: {
        allowUsersMatchingDomainToJoin: true,
      },
    });

    expect(
      res?.data?.updateOrganizationSettings.settings.membership
        .allowUsersMatchingDomainToJoin
    ).toEqual(true);
    expect(
      res?.data?.updateOrganizationSettings.settings.membership
        .allowApplications
    ).toEqual(false);

    // Restore defaults for later tests in this file.
    await updateOrganizationSettings(baseScenario.organization.id, {
      membership: {
        allowUsersMatchingDomainToJoin: false,
        allowApplications: true,
      },
    });
  });

  test('an ASSOCIATE with no manager credential cannot update allowApplications (US5-AS4 API half)', async () => {
    const res = await updateOrganizationSettings(
      baseScenario.organization.id,
      {
        membership: {
          allowUsersMatchingDomainToJoin: false,
          allowApplications: false,
        },
      },
      TestUser.NON_SPACE_MEMBER
    );

    expect(res?.error?.errors?.[0]?.message).toContain(
      "Authorization: unable to grant 'update' privilege: organization settings update:"
    );
  });
});

describe('User notification settings — the five new associate rows (062, US6-AS1/AS3)', () => {
  const fiveRowsAllOn = {
    notification: {
      user: {
        membership: {
          organizationAssociateInvitationReceived: notifWithPush(true),
          organizationAssociateApplicationDecided: notifWithPush(true),
        },
      },
      organization: {
        adminAssociateInvitationResponse: notifWithPush(true),
        adminAssociateApplicationReceived: notifWithPush(true),
        adminAssociateJoined: notifWithPush(true),
      },
    },
  };

  test('the five rows read on by default and round-trip off then on', async () => {
    const before = await getUserSettings(TestUserManager.users.spaceMember.id);
    const beforeNotification = before?.data?.user.settings.notification;
    expect(
      beforeNotification?.user.membership.organizationAssociateInvitationReceived
    ).toEqual(expect.objectContaining({ email: true, inApp: true, push: true }));
    expect(
      beforeNotification?.organization.adminAssociateJoined
    ).toEqual(expect.objectContaining({ email: true, inApp: true, push: true }));

    const off = {
      notification: {
        user: {
          membership: {
            organizationAssociateInvitationReceived: notifWithPush(false),
            organizationAssociateApplicationDecided: notifWithPush(false),
          },
        },
        organization: {
          adminAssociateInvitationResponse: notifWithPush(false),
          adminAssociateApplicationReceived: notifWithPush(false),
          adminAssociateJoined: notifWithPush(false),
        },
      },
    };

    try {
      const offRes = await updateUserSettings(
        TestUserManager.users.spaceMember.id,
        off
      );
      const offNotification =
        offRes?.data?.updateUserSettings.settings.notification;
      expect(
        offNotification?.user.membership
          .organizationAssociateInvitationReceived
      ).toEqual(
        expect.objectContaining({ email: false, inApp: false, push: false })
      );
      expect(offNotification?.organization.adminAssociateJoined).toEqual(
        expect.objectContaining({ email: false, inApp: false, push: false })
      );
    } finally {
      const onRes = await updateUserSettings(
        TestUserManager.users.spaceMember.id,
        fiveRowsAllOn
      ).catch(() => undefined);
      expect(
        onRes?.data?.updateUserSettings.settings.notification.organization
          .adminAssociateJoined
      ).toEqual(
        expect.objectContaining({ email: true, inApp: true, push: true })
      );
    }
  });

  test('a user row SQL-stripped of the five keys reads all-on (@AfterLoad backstop, US6-AS3)', async () => {
    await queryHarnessDb(
      `UPDATE user_settings
         SET notification = notification
           #- '{user,membership,organizationAssociateInvitationReceived}'
           #- '{user,membership,organizationAssociateApplicationDecided}'
           #- '{organization,adminAssociateInvitationResponse}'
           #- '{organization,adminAssociateApplicationReceived}'
           #- '{organization,adminAssociateJoined}'
       WHERE id = (SELECT "settingsId" FROM "user" WHERE id = $1)`,
      [TestUserManager.users.subspaceAdmin.id]
    );

    const after = await getUserSettings(TestUserManager.users.subspaceAdmin.id);
    const notification = after?.data?.user.settings.notification;
    expect(
      notification?.user.membership.organizationAssociateInvitationReceived
    ).toEqual(expect.objectContaining({ email: true, inApp: true, push: true }));
    expect(
      notification?.user.membership.organizationAssociateApplicationDecided
    ).toEqual(expect.objectContaining({ email: true, inApp: true, push: true }));
    expect(notification?.organization.adminAssociateInvitationResponse).toEqual(
      expect.objectContaining({ email: true, inApp: true, push: true })
    );
    expect(notification?.organization.adminAssociateApplicationReceived).toEqual(
      expect.objectContaining({ email: true, inApp: true, push: true })
    );
    expect(notification?.organization.adminAssociateJoined).toEqual(
      expect.objectContaining({ email: true, inApp: true, push: true })
    );

    await updateUserSettings(
      TestUserManager.users.subspaceAdmin.id,
      allChannelsOn(fiveRowsAllOn)
    ).catch(() => undefined);
  });
});
