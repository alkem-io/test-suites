import { getRoleSetMembersList } from '../roleset.request.params';
import {
  assignRoleToOrganization,
  removeRoleFromOrganization,
} from '../roles-request.params';
import {
  createOrganization,
  deleteOrganization,
} from '@functional-api/contributor-management/organization/organization.request.params';
import { TestScenarioConfig, TestScenarioFactory } from '@alkemio/tests-lib';
import { OrganizationWithSpaceModel } from '@alkemio/tests-lib/scenario/models/OrganizationWithSpaceModel';
import { RoleName } from '@alkemio/tests-lib/core/generated/alkemio-schema';

let newOrgId = '';
const newOrgNameId = 'ha-new-org-nameid';

let baseScenario: OrganizationWithSpaceModel;
const scenarioConfig: TestScenarioConfig = {
  name: 'orgRolesOnSpace',
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

  const newOrgName = 'ha-new-org';
  const res = await createOrganization(newOrgName, newOrgNameId);
  newOrgId = res.data?.createOrganization?.id ?? '';
});

afterAll(async () => {
  await TestScenarioFactory.cleanUpBaseScenario(baseScenario);
  await deleteOrganization(newOrgId);
});

describe('Assign / Remove organization to community', () => {
  describe('Assign organizations', () => {
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
    afterAll(async () => {
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
    });
    describe('Assign same organization as member to same community', () => {
      test('Error is thrown for Space', async () => {
        // Act
        const res = await assignRoleToOrganization(
          baseScenario.organization.id,
          baseScenario.space.community.roleSetId,
          RoleName.Member
        );

        const getRoleSetMembers = await getRoleSetMembersList(
          baseScenario.space.community.roleSetId
        );
        const data =
          getRoleSetMembers.data?.lookup.roleSet?.memberOrganizations;

        // Assert
        expect(data).toHaveLength(1);
        expect(res.error?.errors[0].message).toContain(
          `Agent (${baseScenario.organization.agentId}) already has assigned credential: space-member`
        );
        expect(data).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              nameID: baseScenario.organization.nameId,
            }),
          ])
        );
      });
      test('Error is thrown for Subspace', async () => {
        // Act
        const res = await assignRoleToOrganization(
          baseScenario.organization.id,
          baseScenario.subspace.community.roleSetId,
          RoleName.Member
        );

        const roleSetMembersList = await getRoleSetMembersList(
          baseScenario.subspace.community.roleSetId
        );
        const data =
          roleSetMembersList.data?.lookup.roleSet?.memberOrganizations;

        // Assert
        expect(data).toHaveLength(1);
        expect(res.error?.errors[0].message).toContain(
          `Agent (${baseScenario.organization.agentId}) already has assigned credential: space-member`
        );
        expect(data).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              nameID: baseScenario.organization.nameId,
            }),
          ])
        );
      });
      test('Error is thrown for Subsubspace', async () => {
        // Act
        const res = await assignRoleToOrganization(
          baseScenario.organization.id,
          baseScenario.subsubspace.community.roleSetId,
          RoleName.Member
        );

        const roleSetMembersList = await getRoleSetMembersList(
          baseScenario.subsubspace.community.roleSetId
        );
        const data =
          roleSetMembersList.data?.lookup.roleSet?.memberOrganizations;

        // Assert
        expect(data).toHaveLength(1);
        expect(res.error?.errors[0].message).toContain(
          `Agent (${baseScenario.organization.agentId}) already has assigned credential: space-member`
        );
        expect(data).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              nameID: baseScenario.organization.nameId,
            }),
          ])
        );
      });
    });
    describe('Assign different organization as member to same community', () => {
      test('Successfully assigned to Space', async () => {
        // Act
        await assignRoleToOrganization(
          newOrgId,
          baseScenario.space.community.roleSetId,
          RoleName.Member
        );

        const roleSetMembersList = await getRoleSetMembersList(
          baseScenario.space.community.roleSetId
        );
        const data =
          roleSetMembersList.data?.lookup.roleSet?.memberOrganizations;

        // Assert
        expect(data).toHaveLength(2);
        expect(data).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              nameID: baseScenario.organization.nameId,
            }),
          ])
        );
      });
      test('Successfully assigned to Subspace', async () => {
        // Act
        await assignRoleToOrganization(
          newOrgId,
          baseScenario.subspace.community.roleSetId,
          RoleName.Member
        );

        const roleSetMembersList = await getRoleSetMembersList(
          baseScenario.subspace.community.roleSetId
        );
        const data =
          roleSetMembersList.data?.lookup.roleSet?.memberOrganizations;

        // Assert
        expect(data).toHaveLength(2);
        expect(data).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              nameID: baseScenario.organization.nameId,
            }),
          ])
        );
      });
      test('Successfully assigned to Subsubspace', async () => {
        // Act
        await assignRoleToOrganization(
          newOrgId,
          baseScenario.subsubspace.community.roleSetId,
          RoleName.Member
        );

        const roleSetMembersList = await getRoleSetMembersList(
          baseScenario.subsubspace.community.roleSetId
        );
        const data =
          roleSetMembersList.data?.lookup.roleSet?.memberOrganizations;

        // Assert
        expect(data).toHaveLength(2);
        expect(data).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              nameID: baseScenario.organization.nameId,
            }),
          ])
        );
      });
    });

    describe('Assign same organization as lead to same community', () => {
      test('Error is thrown for Space', async () => {
        // Act
        const res = await assignRoleToOrganization(
          baseScenario.organization.id,
          baseScenario.space.community.roleSetId,
          RoleName.Lead
        );

        const roleSetMembersList = await getRoleSetMembersList(
          baseScenario.space.community.roleSetId
        );
        const data = roleSetMembersList.data?.lookup.roleSet?.leadOrganizations;

        // Assert
        expect(data).toHaveLength(1);
        expect(res.error?.errors[0].message).toContain(
          `Agent (${baseScenario.organization.agentId}) already has assigned credential: space-lead`
        );
        expect(data).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              nameID: baseScenario.organization.nameId,
            }),
          ])
        );
      });
      test('Error is thrown for Subspace', async () => {
        // Act
        const res = await assignRoleToOrganization(
          baseScenario.organization.id,
          baseScenario.subspace.community.roleSetId,
          RoleName.Lead
        );

        const roleSetMembersList = await getRoleSetMembersList(
          baseScenario.subspace.community.roleSetId
        );
        const data = roleSetMembersList.data?.lookup.roleSet?.leadOrganizations;

        // Assert
        expect(data).toHaveLength(1);
        expect(res.error?.errors[0].message).toContain(
          `Agent (${baseScenario.organization.agentId}) already has assigned credential: space-lead`
        );
        expect(data).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              nameID: baseScenario.organization.nameId,
            }),
          ])
        );
      });
      test('Error is thrown for Subsubspace', async () => {
        // Act
        const res = await assignRoleToOrganization(
          baseScenario.organization.id,
          baseScenario.subsubspace.community.roleSetId,
          RoleName.Lead
        );

        const roleSetMembersList = await getRoleSetMembersList(
          baseScenario.subsubspace.community.roleSetId
        );
        const data = roleSetMembersList.data?.lookup.roleSet?.leadOrganizations;

        // Assert
        expect(data).toHaveLength(1);
        expect(res.error?.errors[0].message).toContain(
          `Agent (${baseScenario.organization.agentId}) already has assigned credential: space-lead`
        );
        expect(data).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              nameID: baseScenario.organization.nameId,
            }),
          ])
        );
      });
    });

    describe('Assign different organizations as lead to same community', () => {
      beforeAll(async () => {
        await assignRoleToOrganization(
          newOrgId,
          baseScenario.subsubspace.community.roleSetId,
          RoleName.Member
        );
        await assignRoleToOrganization(
          newOrgId,
          baseScenario.subspace.community.roleSetId,
          RoleName.Member
        );

        await assignRoleToOrganization(
          newOrgId,
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

      // to be verified
      test.skip('Error is thrown for Space', async () => {
        // Act
        const res = await assignRoleToOrganization(
          newOrgId,
          baseScenario.space.community.roleSetId,
          RoleName.Lead
        );

        const roleSetMembersList = await getRoleSetMembersList(
          baseScenario.space.community.roleSetId
        );
        const data = roleSetMembersList.data?.lookup.roleSet?.leadOrganizations;

        // Assert
        expect(data).toHaveLength(2);
        expect(res.error?.errors[0].message).toContain(
          "Max limit of organizations reached for role 'lead': 1, cannot assign new organization"
        );
        expect(data).not.toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              nameID: newOrgNameId,
            }),
          ])
        );
      });
      test('Two organizations assinged to Subspace', async () => {
        // Act
        await assignRoleToOrganization(
          newOrgId,
          baseScenario.subspace.community.roleSetId,
          RoleName.Lead
        );

        const roleSetMembersList = await getRoleSetMembersList(
          baseScenario.subspace.community.roleSetId
        );
        const data = roleSetMembersList.data?.lookup.roleSet?.leadOrganizations;

        // Assert
        expect(data).toHaveLength(2);
      });
      test('Two organizations assinged to Subsubspace', async () => {
        // Act
        await assignRoleToOrganization(
          newOrgId,
          baseScenario.subsubspace.community.roleSetId,
          RoleName.Lead
        );

        const roleSetMembersList = await getRoleSetMembersList(
          baseScenario.subsubspace.community.roleSetId
        );
        const data = roleSetMembersList.data?.lookup.roleSet?.leadOrganizations;

        // Assert
        expect(data).toHaveLength(2);
      });
    });
  });
});
