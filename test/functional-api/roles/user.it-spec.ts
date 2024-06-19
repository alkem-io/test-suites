import { uniqueId } from '@test/utils/mutations/create-mutation';
import { users } from '@test/utils/queries/users-data';
import {
  createSpaceAndGetData,
  deleteSpaceCodegen,
  getUserRoleSpacesVisibilityCodegen,
} from '../journey/space/space.request.params';
import { createOpportunityCodegen } from '../journey/opportunity/opportunity.request.params';
import {
  createChallengeForOrgSpaceCodegen,
  createOpportunityForChallengeCodegen,
  createOrgAndSpaceCodegen,
} from '@test/utils/data-setup/entities';
import { SpaceVisibility } from '@alkemio/client-lib/dist/types/alkemio-schema';
import {
  createOrganizationCodegen,
  deleteOrganizationCodegen,
} from '../organization/organization.request.params';
import { createChallengeCodegen } from '@test/utils/mutations/journeys/challenge';
import { TestUser } from '@test/utils';
import {
  assignCommunityRoleToUserCodegen,
  assignUserToOrganizationCodegen,
} from './roles-request.params';
import { entitiesId } from './community/communications-helper';
import { CommunityRole } from '@test/generated/alkemio-schema';

const organizationName = 'urole-org-name' + uniqueId;
const hostNameId = 'urole-org-nameid' + uniqueId;
const spaceName = '111' + uniqueId;
const spaceNameId = '111' + uniqueId;
const spaceName2 = '222' + uniqueId;
const spaceNameId2 = '222' + uniqueId;
const opportunityName = 'urole-opp';
const challengeName = 'urole-chal';
const availableRoles = ['member', 'lead'];

beforeAll(async () => {
  await deleteSpaceCodegen('eco1');

  await createOrgAndSpaceCodegen(
    organizationName,
    hostNameId,
    spaceName,
    spaceNameId
  );
  await createChallengeForOrgSpaceCodegen(challengeName);
  await createOpportunityForChallengeCodegen(opportunityName);

  await assignCommunityRoleToUserCodegen(
    users.nonSpaceMemberEmail,
    entitiesId.spaceCommunityId,
    CommunityRole.Member
  );

  await assignCommunityRoleToUserCodegen(
    users.nonSpaceMemberEmail,
    entitiesId.challengeCommunityId,
    CommunityRole.Member
  );

  await assignCommunityRoleToUserCodegen(
    users.nonSpaceMemberEmail,
    entitiesId.opportunityCommunityId,
    CommunityRole.Member
  );

  await assignCommunityRoleToUserCodegen(
    users.nonSpaceMemberEmail,
    entitiesId.spaceCommunityId,
    CommunityRole.Lead
  );

  await assignCommunityRoleToUserCodegen(
    users.nonSpaceMemberEmail,
    entitiesId.challengeCommunityId,
    CommunityRole.Lead
  );

  await assignCommunityRoleToUserCodegen(
    users.nonSpaceMemberEmail,
    entitiesId.opportunityCommunityId,
    CommunityRole.Lead
  );

  await assignUserToOrganizationCodegen(
    users.nonSpaceMemberId,
    entitiesId.organizationId
  );
});

afterAll(async () => {
  await deleteSpaceCodegen(entitiesId.opportunityId);
  await deleteSpaceCodegen(entitiesId.challengeId);
  await deleteSpaceCodegen(entitiesId.spaceId);
  await deleteOrganizationCodegen(entitiesId.organizationId);
});

describe('User roles', () => {
  test('user role - assignment to 1 Organization, Space, Challenge, Opportunity', async () => {
    // Act
    const res = await getUserRoleSpacesVisibilityCodegen(
      users.nonSpaceMemberId,
      SpaceVisibility.Active
    );
    const spacesData = res?.data?.rolesUser.spaces;
    const orgData = res?.data?.rolesUser.organizations;

    // Assert
    expect(spacesData).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          nameID: spaceNameId,
          roles: expect.arrayContaining(availableRoles),
        }),
      ])
    );

    expect(spacesData?.[0].subspaces).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          nameID: entitiesId.challengeNameId,
          roles: expect.arrayContaining(availableRoles),
        }),
      ])
    );
    // expect(spacesData?.[0].subspaces).toEqual(
    //   expect.arrayContaining([
    //     expect.objectContaining({
    //       nameID: entitiesId.opportunityNameId,
    //       roles: expect.arrayContaining(availableRoles),
    //     }),
    //   ])
    // );

    expect(orgData).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          nameID: hostNameId,
          roles: expect.arrayContaining(['associate']),
        }),
      ])
    );
  });

  describe('Extended scenario', () => {
    let orgId = '';
    let spaceId = '';
    let spaceComId = '';
    let chId = '';
    let chComId = '';
    let chId2 = '';
    let chComId2 = '';
    let oppId = '';
    let oppComId = '';
    let oppId2 = '';
    let oppComId2 = '';
    let oppId3 = '';
    let oppComId3 = '';

    beforeAll(async () => {
      const orgRes = await createOrganizationCodegen(
        organizationName + '1',
        hostNameId + '1'
      );
      orgId = orgRes?.data?.createOrganization.id ?? '';

      const spaceRes = await createSpaceAndGetData(
        spaceName2,
        spaceNameId2,
        orgId
      );
      const spaceData = spaceRes?.data?.space;
      spaceId = spaceData?.id ?? '';
      spaceComId = spaceData?.community?.id ?? '';

      const chRes = await createChallengeCodegen(
        challengeName + '1',
        challengeName + '1',
        spaceId,
        TestUser.GLOBAL_ADMIN,
        entitiesId.spaceInnovationFlowTemplateChId
      );

      const chResData = chRes?.data?.createSubspace;
      chId = chResData?.id ?? '';
      chComId = chResData?.community?.id ?? '';

      const chRes2 = await createChallengeCodegen(
        challengeName + '2',
        challengeName + '2',
        spaceId,
        TestUser.GLOBAL_ADMIN,
        entitiesId.spaceInnovationFlowTemplateChId
      );
      const chRes2Data = chRes2?.data?.createSubspace;
      chId2 = chRes2Data?.id ?? '';
      chComId2 = chRes2Data?.community?.id ?? '';

      const oppRes = await createOpportunityCodegen(
        opportunityName + '1',
        opportunityName + '1',
        chId
      );

      const oppResData = oppRes?.data?.createSubspace;
      oppId = oppResData?.id ?? '';
      oppComId = oppResData?.community?.id ?? '';

      const oppRes2 = await createOpportunityCodegen(
        opportunityName + '2',
        opportunityName + '2',
        chId2
      );
      const oppRes2Data = oppRes2?.data?.createSubspace;

      oppId2 = oppRes2Data?.id ?? '';
      oppComId2 = oppRes2Data?.community?.id ?? '';

      const oppRes3 = await createOpportunityCodegen(
        opportunityName + '3',
        opportunityName + '3',
        chId2
      );

      const oppRes3Data = oppRes3?.data?.createSubspace;

      oppId3 = oppRes3Data?.id ?? '';
      oppComId3 = oppRes3Data?.community?.id ?? '';

      await assignCommunityRoleToUserCodegen(
        users.nonSpaceMemberEmail,
        spaceComId,
        CommunityRole.Member
      );

      await assignCommunityRoleToUserCodegen(
        users.nonSpaceMemberEmail,
        chComId,
        CommunityRole.Member
      );

      await assignCommunityRoleToUserCodegen(
        users.nonSpaceMemberEmail,
        oppComId,
        CommunityRole.Member
      );

      await assignCommunityRoleToUserCodegen(
        users.nonSpaceMemberEmail,
        chComId2,
        CommunityRole.Member
      );

      await assignCommunityRoleToUserCodegen(
        users.nonSpaceMemberEmail,
        oppComId2,
        CommunityRole.Member
      );

      await assignCommunityRoleToUserCodegen(
        users.nonSpaceMemberEmail,
        oppComId3,
        CommunityRole.Member
      );

      await assignCommunityRoleToUserCodegen(
        users.nonSpaceMemberEmail,
        spaceComId,
        CommunityRole.Lead
      );

      await assignCommunityRoleToUserCodegen(
        users.nonSpaceMemberEmail,
        chComId,
        CommunityRole.Lead
      );

      await assignCommunityRoleToUserCodegen(
        users.nonSpaceMemberEmail,
        oppComId,
        CommunityRole.Lead
      );

      await assignCommunityRoleToUserCodegen(
        users.nonSpaceMemberEmail,
        chComId2,
        CommunityRole.Lead
      );

      await assignCommunityRoleToUserCodegen(
        users.nonSpaceMemberEmail,
        oppComId2,
        CommunityRole.Lead
      );

      await assignCommunityRoleToUserCodegen(
        users.nonSpaceMemberEmail,
        oppComId3,
        CommunityRole.Lead
      );

      await assignUserToOrganizationCodegen(users.nonSpaceMemberId, orgId);
    });
    afterAll(async () => {
      await deleteSpaceCodegen(oppId);
      await deleteSpaceCodegen(oppId2);
      await deleteSpaceCodegen(oppId3);
      await deleteSpaceCodegen(chId);
      await deleteSpaceCodegen(chId2);
      await deleteSpaceCodegen(spaceId);
      await deleteOrganizationCodegen(orgId);
    });
    test('user role - assignment to 2 Organizations, Spaces, Challenges, Opportunities', async () => {
      // Act
      const res = await getUserRoleSpacesVisibilityCodegen(
        users.nonSpaceMemberId,
        SpaceVisibility.Active
      );
      const spacesData = res?.data?.rolesUser.spaces;
      const spaceData1 = res?.data?.rolesUser.spaces.find(
        space => space.nameID === spaceNameId
      );
      const spaceData2 = res?.data?.rolesUser.spaces.find(
        space => space.nameID === spaceNameId2
      );

      const orgData = res?.data?.rolesUser?.organizations;

      // Assert
      expect(spacesData).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            nameID: spaceNameId,
            roles: expect.arrayContaining(availableRoles),
          }),
          expect.objectContaining({
            nameID: spaceNameId2,
            roles: expect.arrayContaining(availableRoles),
          }),
        ])
      );

      expect(spaceData1?.subspaces).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            nameID: entitiesId.challengeNameId,
            roles: expect.arrayContaining(availableRoles),
          }),
        ])
      );

      expect(spaceData2?.subspaces).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            nameID: challengeName + '1',
            roles: expect.arrayContaining(availableRoles),
          }),
        ])
      );

      expect(spaceData2?.subspaces).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            nameID: challengeName + '2',
            roles: expect.arrayContaining(availableRoles),
          }),
        ])
      );

      expect(orgData).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            nameID: hostNameId,
            roles: expect.arrayContaining(['associate']),
          }),
          expect.objectContaining({
            nameID: hostNameId + '1',
            roles: expect.arrayContaining(['associate']),
          }),
        ])
      );
    });
  });
});
