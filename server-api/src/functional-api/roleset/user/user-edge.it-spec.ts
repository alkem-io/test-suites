import { getRoleSetMembersList } from '../roleset.request.params';
import { removeRoleFromUser, assignRoleToUser } from '../roles-request.params';
import {
  TestScenarioConfig,
  TestScenarioFactory,
  TestUserManager,
} from '@alkemio/tests-lib';
import { OrganizationWithSpaceModel } from '@alkemio/tests-lib/dist/scenario/models/OrganizationWithSpaceModel';
import { RoleName } from '@alkemio/tests-lib/dist/core/generated/alkemio-schema';
let baseScenario: OrganizationWithSpaceModel;

const scenarioConfig: TestScenarioConfig = {
  name: 'assign-remove-members-to-community',
  space: {
    subspace: {
      subspace: {},
    },
  },
};

beforeAll(async () => {
  baseScenario = await TestScenarioFactory.createBaseScenario(scenarioConfig);

  await removeRoleFromUser(
    TestUserManager.users.globalAdmin.id,
    baseScenario.subsubspace.community.roleSetId,
    RoleName.Lead
  );

  await removeRoleFromUser(
    TestUserManager.users.globalAdmin.id,
    baseScenario.subspace.community.roleSetId,
    RoleName.Lead
  );

  await removeRoleFromUser(
    TestUserManager.users.globalAdmin.id,
    baseScenario.space.community.roleSetId,
    RoleName.Lead
  );
});

afterAll(async () => {
  await TestScenarioFactory.cleanUpBaseScenario(baseScenario);
});

describe('Assign / Remove users to community', () => {
  describe('Assign users', () => {
    beforeAll(async () => {
      await assignRoleToUser(
        TestUserManager.users.nonSpaceMember.id,
        baseScenario.space.community.roleSetId,
        RoleName.Member
      );

      await assignRoleToUser(
        TestUserManager.users.nonSpaceMember.id,
        baseScenario.subspace.community.roleSetId,
        RoleName.Member
      );

      await assignRoleToUser(
        TestUserManager.users.nonSpaceMember.id,
        baseScenario.subsubspace.community.roleSetId,
        RoleName.Member
      );

      await assignRoleToUser(
        TestUserManager.users.nonSpaceMember.id,
        baseScenario.subsubspace.community.roleSetId,
        RoleName.Lead
      );

      await assignRoleToUser(
        TestUserManager.users.nonSpaceMember.id,
        baseScenario.subspace.community.roleSetId,
        RoleName.Lead
      );

      await assignRoleToUser(
        TestUserManager.users.nonSpaceMember.id,
        baseScenario.space.community.roleSetId,
        RoleName.Lead
      );
    });
    afterAll(async () => {
      await removeRoleFromUser(
        TestUserManager.users.nonSpaceMember.id,
        baseScenario.subsubspace.community.roleSetId,
        RoleName.Lead
      );

      await removeRoleFromUser(
        TestUserManager.users.nonSpaceMember.id,
        baseScenario.subspace.community.roleSetId,
        RoleName.Lead
      );

      await removeRoleFromUser(
        TestUserManager.users.nonSpaceMember.id,
        baseScenario.space.community.roleSetId,
        RoleName.Lead
      );

      await removeRoleFromUser(
        TestUserManager.users.nonSpaceMember.id,
        baseScenario.subsubspace.community.roleSetId,
        RoleName.Member
      );

      await removeRoleFromUser(
        TestUserManager.users.nonSpaceMember.id,
        baseScenario.subspace.community.roleSetId,
        RoleName.Member
      );

      await removeRoleFromUser(
        TestUserManager.users.nonSpaceMember.id,
        baseScenario.space.community.roleSetId,
        RoleName.Member
      );
    });

    describe('Assign same user as member to same community', () => {
      test('Does not have any effect in Space', async () => {
        // Act
        await assignRoleToUser(
          TestUserManager.users.nonSpaceMember.id,
          baseScenario.space.community.roleSetId,
          RoleName.Member
        );

        const roleSetMembers = await getRoleSetMembersList(
          baseScenario.space.community.roleSetId
        );
        const data = roleSetMembers.data?.lookup.roleSet?.memberUsers;

        // Assert
        expect(data).toHaveLength(2);
        expect(data).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              email: TestUserManager.users.nonSpaceMember.email,
            }),
          ])
        );
      });

      test('Does not have any effect in Subspace', async () => {
        // Act
        await assignRoleToUser(
          TestUserManager.users.nonSpaceMember.id,
          baseScenario.subspace.community.roleSetId,
          RoleName.Member
        );

        const roleSetMembers = await getRoleSetMembersList(
          baseScenario.subspace.community.roleSetId
        );
        const data = roleSetMembers.data?.lookup.roleSet?.memberUsers;

        // Assert
        expect(data).toHaveLength(2);
        expect(data).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              email: TestUserManager.users.nonSpaceMember.email,
            }),
          ])
        );
      });

      test('Does not have any effect in Subsubspace', async () => {
        // Act
        await assignRoleToUser(
          TestUserManager.users.nonSpaceMember.id,
          baseScenario.subsubspace.community.roleSetId,
          RoleName.Member
        );

        const roleSetMembers = await getRoleSetMembersList(
          baseScenario.subsubspace.community.roleSetId
        );
        const data = roleSetMembers.data?.lookup.roleSet?.memberUsers;

        // Assert
        expect(data).toHaveLength(2);
        expect(data).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              email: TestUserManager.users.nonSpaceMember.email,
            }),
          ])
        );
      });
    });

    describe('Assign different users as member to same community', () => {
      test('Successfully assigned to Space', async () => {
        // Act
        await assignRoleToUser(
          TestUserManager.users.spaceMember.id,
          baseScenario.space.community.roleSetId,
          RoleName.Member
        );

        const roleSetMembers = await getRoleSetMembersList(
          baseScenario.space.community.roleSetId
        );
        const data = roleSetMembers.data?.lookup.roleSet?.memberUsers;

        // Assert
        expect(data).toHaveLength(3);
        expect(data).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              email: TestUserManager.users.spaceMember.email,
            }),
          ])
        );
      });

      test('Successfully assigned to Subspace', async () => {
        // Act
        await assignRoleToUser(
          TestUserManager.users.spaceMember.id,
          baseScenario.subspace.community.roleSetId,
          RoleName.Member
        );

        const roleSetMembers = await getRoleSetMembersList(
          baseScenario.subspace.community.roleSetId
        );
        const data = roleSetMembers.data?.lookup.roleSet?.memberUsers;

        // Assert
        expect(data).toHaveLength(3);
        expect(data).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              email: TestUserManager.users.spaceMember.email,
            }),
          ])
        );
      });

      test('Successfully assigned to Subsubspace', async () => {
        // Act
        await assignRoleToUser(
          TestUserManager.users.spaceMember.id,
          baseScenario.subsubspace.community.roleSetId,
          RoleName.Member
        );

        const roleSetMembers = await getRoleSetMembersList(
          baseScenario.subsubspace.community.roleSetId
        );
        const data = roleSetMembers.data?.lookup.roleSet?.memberUsers;

        // Assert
        expect(data).toHaveLength(3);
        expect(data).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              email: TestUserManager.users.spaceMember.email,
            }),
          ])
        );
      });
    });

    describe('Assign same user as lead to same community', () => {
      test('Does not have any effect in Space', async () => {
        // Act
        await assignRoleToUser(
          TestUserManager.users.nonSpaceMember.id,
          baseScenario.space.community.roleSetId,
          RoleName.Lead
        );

        const roleSetMembers = await getRoleSetMembersList(
          baseScenario.space.community.roleSetId
        );
        const data = roleSetMembers.data?.lookup.roleSet?.leadUsers;

        // Assert
        expect(data).toHaveLength(1);
        expect(data).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              email: TestUserManager.users.nonSpaceMember.email,
            }),
          ])
        );
      });

      test('Does not have any effect in Subspace', async () => {
        // Act
        await assignRoleToUser(
          TestUserManager.users.nonSpaceMember.id,
          baseScenario.subspace.community.roleSetId,
          RoleName.Lead
        );

        const roleSetMembers = await getRoleSetMembersList(
          baseScenario.subspace.community.roleSetId
        );
        const data = roleSetMembers.data?.lookup.roleSet?.leadUsers;

        // Assert
        expect(data).toHaveLength(1);
        expect(data).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              email: TestUserManager.users.nonSpaceMember.email,
            }),
          ])
        );
      });

      test('Does not have any effect in Subsubspace', async () => {
        // Act
        await assignRoleToUser(
          TestUserManager.users.nonSpaceMember.id,
          baseScenario.subsubspace.community.roleSetId,
          RoleName.Lead
        );

        const roleSetMembers = await getRoleSetMembersList(
          baseScenario.subsubspace.community.roleSetId
        );
        const data = roleSetMembers.data?.lookup.roleSet?.leadUsers;

        // Assert
        expect(data).toHaveLength(1);
        expect(data).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              email: TestUserManager.users.nonSpaceMember.email,
            }),
          ])
        );
      });
    });
  });
});
