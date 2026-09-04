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
} from '@alkemio/tests-lib';
import {
  deleteUser,
  registerVerifiedUser,
  updateUserSettings,
} from '../user/user.request.params';
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
    expect(
      off?.data?.updateUserSettings.settings.notification.organization
        .adminSpaceCommunityInvitation
    ).toEqual(
      expect.objectContaining({ email: false, inApp: false, push: false })
    );

    const on = await updateUserSettings(TestUserManager.users.spaceMember.id, {
      notification: {
        organization: { adminSpaceCommunityInvitation: notifWithPush(true) },
      },
    });
    expect(
      on?.data?.updateUserSettings.settings.notification.organization
        .adminSpaceCommunityInvitation
    ).toEqual(
      expect.objectContaining({ email: true, inApp: true, push: true })
    );
  });
});
