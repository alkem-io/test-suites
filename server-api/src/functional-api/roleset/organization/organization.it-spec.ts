import { TestScenarioConfig, TestScenarioFactory } from '@alkemio/tests-lib';
import { OrganizationWithSpaceModel } from '@alkemio/tests-lib/scenario/models/OrganizationWithSpaceModel';
import {
  removeRoleFromOrganization,
  assignRoleToOrganization,
} from '../roles-request.params';
import { getRoleSetMembersList } from '../roleset.request.params';
import { RoleName } from '@alkemio/tests-lib/core/generated/alkemio-schema';

let baseScenario: OrganizationWithSpaceModel;
const scenarioConfig: TestScenarioConfig = {
  name: 'organization',
  space: {
    collaboration: {
      addTutorialCallouts: false,
    },
    subspace: {
      subspace: {},
    },
  },
};

beforeAll(async () => {
  baseScenario = await TestScenarioFactory.createBaseScenario(scenarioConfig);
});

afterAll(async () => {
  await TestScenarioFactory.cleanUpBaseScenario(baseScenario);
});

describe('Assign / Remove organization to community', () => {
  describe('Assign organization', () => {
    afterAll(async () => {
      await removeRoleFromOrganization(
        baseScenario.organization.id,
        baseScenario.subsubspace.community.roleSetId,
        RoleName.Lead
      );
      await removeRoleFromOrganization(
        baseScenario.organization.id,
        baseScenario.subspace.community.roleSetId,
        RoleName.Lead
      );

      await removeRoleFromOrganization(
        baseScenario.organization.id,
        baseScenario.space.community.roleSetId,
        RoleName.Lead
      );

      await removeRoleFromOrganization(
        baseScenario.organization.id,
        baseScenario.subsubspace.community.roleSetId,
        RoleName.Member
      );
      await removeRoleFromOrganization(
        baseScenario.organization.id,
        baseScenario.subspace.community.roleSetId,
        RoleName.Member
      );

      await removeRoleFromOrganization(
        baseScenario.organization.id,
        baseScenario.space.community.roleSetId,
        RoleName.Member
      );
    });
    test('Assign organization as member to space', async () => {
      // Act
      await assignRoleToOrganization(
        baseScenario.organization.id,
        baseScenario.space.community.roleSetId,
        RoleName.Member
      );

      const roleSetMembers = await getRoleSetMembersList(
        baseScenario.space.community.roleSetId
      );
      const data = roleSetMembers.data?.lookup.roleSet?.memberOrganizations;

      // Assert
      expect(data).toHaveLength(1);
      expect(data).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            nameID: baseScenario.organization.nameId,
          }),
        ])
      );
    });
    test('Assign organization as member to subspace', async () => {
      // Act
      await assignRoleToOrganization(
        baseScenario.organization.id,
        baseScenario.subspace.community.roleSetId,
        RoleName.Member
      );

      const roleSetMembers = await getRoleSetMembersList(
        baseScenario.subspace.community.roleSetId
      );
      const data = roleSetMembers.data?.lookup.roleSet?.memberOrganizations;

      // Assert
      expect(data).toHaveLength(1);
      expect(data).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            nameID: baseScenario.organization.nameId,
          }),
        ])
      );
    });
    test('Assign organization as member to subsubspace', async () => {
      // Act
      await assignRoleToOrganization(
        baseScenario.organization.id,
        baseScenario.subsubspace.community.roleSetId,
        RoleName.Member
      );

      const roleSetMembers = await getRoleSetMembersList(
        baseScenario.subsubspace.community.roleSetId
      );
      const data = roleSetMembers.data?.lookup.roleSet?.memberOrganizations;

      // Assert
      expect(data).toHaveLength(1);
      expect(data).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            nameID: baseScenario.organization.nameId,
          }),
        ])
      );
    });

    test('Assign organization as lead to space', async () => {
      // Act
      await assignRoleToOrganization(
        baseScenario.organization.id,
        baseScenario.space.community.roleSetId,
        RoleName.Lead
      );

      const roleSetMembers = await getRoleSetMembersList(
        baseScenario.space.community.roleSetId
      );
      const data = roleSetMembers.data?.lookup.roleSet?.leadOrganizations;

      // Assert
      expect(data).toHaveLength(1);

      expect(data).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            nameID: baseScenario.organization.nameId,
          }),
        ])
      );
    });
    test('Assign organization as lead to subspace', async () => {
      // Act
      await assignRoleToOrganization(
        baseScenario.organization.id,
        baseScenario.subspace.community.roleSetId,
        RoleName.Lead
      );

      const roleSetMembers = await getRoleSetMembersList(
        baseScenario.subspace.community.roleSetId
      );
      const data = roleSetMembers.data?.lookup.roleSet?.leadOrganizations;

      // Assert
      expect(data).toHaveLength(1);
      expect(data).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            nameID: baseScenario.organization.nameId,
          }),
        ])
      );
    });
    test('Assign organization as lead to subsubspace', async () => {
      // Act
      await assignRoleToOrganization(
        baseScenario.organization.id,
        baseScenario.subsubspace.community.roleSetId,
        RoleName.Lead
      );

      const roleSetMembers = await getRoleSetMembersList(
        baseScenario.subsubspace.community.roleSetId
      );
      const data = roleSetMembers.data?.lookup.roleSet?.leadOrganizations;

      // Assert
      expect(data).toHaveLength(1);
      expect(data).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            nameID: baseScenario.organization.nameId,
          }),
        ])
      );
    });
  });

  describe('Remove organization', () => {
    beforeAll(async () => {
      await assignRoleToOrganization(
        baseScenario.organization.id,
        baseScenario.subsubspace.community.roleSetId,
        RoleName.Member
      );
      await assignRoleToOrganization(
        baseScenario.organization.id,
        baseScenario.subspace.community.roleSetId,
        RoleName.Member
      );

      await assignRoleToOrganization(
        baseScenario.organization.id,
        baseScenario.space.community.roleSetId,
        RoleName.Member
      );

      await assignRoleToOrganization(
        baseScenario.organization.id,
        baseScenario.subsubspace.community.roleSetId,
        RoleName.Lead
      );
      await assignRoleToOrganization(
        baseScenario.organization.id,
        baseScenario.subspace.community.roleSetId,
        RoleName.Lead
      );

      await assignRoleToOrganization(
        baseScenario.organization.id,
        baseScenario.space.community.roleSetId,
        RoleName.Lead
      );
    });
    test('Remove organization as member from subsubspace', async () => {
      // Act
      await removeRoleFromOrganization(
        baseScenario.organization.id,
        baseScenario.subsubspace.community.roleSetId,
        RoleName.Member
      );

      const roleSetMembers = await getRoleSetMembersList(
        baseScenario.subsubspace.community.roleSetId
      );
      const data = roleSetMembers.data?.lookup.roleSet?.memberOrganizations;

      // Assert
      expect(data).toHaveLength(0);
    });
    test('Remove organization as member from subspace', async () => {
      // Act
      await removeRoleFromOrganization(
        baseScenario.organization.id,
        baseScenario.subspace.community.roleSetId,
        RoleName.Member
      );

      const roleSetMembers = await getRoleSetMembersList(
        baseScenario.subspace.community.roleSetId
      );
      const data = roleSetMembers.data?.lookup.roleSet?.memberOrganizations;

      // Assert
      expect(data).toHaveLength(0);
    });
    test('Remove organization as member from space', async () => {
      // Act
      await removeRoleFromOrganization(
        baseScenario.organization.id,
        baseScenario.space.community.roleSetId,
        RoleName.Member
      );

      const roleSetMembers = await getRoleSetMembersList(
        baseScenario.space.community.roleSetId
      );
      const data = roleSetMembers.data?.lookup.roleSet?.memberOrganizations;

      // Assert
      expect(data).toHaveLength(0);
    });

    test('Remove organization as lead from subsubspace', async () => {
      // Act
      await removeRoleFromOrganization(
        baseScenario.organization.id,
        baseScenario.subsubspace.community.roleSetId,
        RoleName.Lead
      );

      const roleSetMembers = await getRoleSetMembersList(
        baseScenario.subsubspace.community.roleSetId
      );
      const data = roleSetMembers.data?.lookup.roleSet?.leadOrganizations;

      // Assert
      expect(data).toHaveLength(0);
    });
    test('Remove organization as lead from subspace', async () => {
      // Act
      await removeRoleFromOrganization(
        baseScenario.organization.id,
        baseScenario.subspace.community.roleSetId,
        RoleName.Lead
      );

      const roleSetMembers = await getRoleSetMembersList(
        baseScenario.subspace.community.roleSetId
      );
      const data = roleSetMembers.data?.lookup.roleSet?.leadOrganizations;

      // Assert
      expect(data).toHaveLength(0);
    });
    test('Remove organization as lead from space', async () => {
      // Act
      await removeRoleFromOrganization(
        baseScenario.organization.id,
        baseScenario.space.community.roleSetId,
        RoleName.Lead
      );

      const roleSetMembers = await getRoleSetMembersList(
        baseScenario.space.community.roleSetId
      );
      const data = roleSetMembers.data?.lookup.roleSet?.leadOrganizations;

      // Assert
      expect(data).toHaveLength(0);
    });
  });
});
