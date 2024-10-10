import { uniqueId } from '@test/utils/mutations/create-mutation';
import { users } from '@test/utils/queries/users-data';
import {
  createSpaceAndGetData,
  deleteSpace,
  getUserRoleSpacesVisibility,
} from '../../journey/space/space.request.params';
import { createOpportunity } from '../../journey/opportunity/opportunity.request.params';
import {
  createChallengeForOrgSpace,
  createOpportunityForChallenge,
  createOrgAndSpace,
} from '@test/utils/data-setup/entities';
import { SpaceVisibility } from '@alkemio/client-lib/dist/types/alkemio-schema';

import { createChallenge } from '@test/utils/mutations/journeys/challenge';
import { TestUser } from '@test/utils';
import {
  assignRoleToUser,
  assignUserToOrganization,
} from '../roles-request.params';
import { entitiesId } from '../../../types/entities-helper';
import { CommunityRoleType } from '@test/generated/graphql';
import {
  createOrganization,
  deleteOrganization,
} from '../../contributor-management/organization/organization.request.params';

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
  await deleteSpace('eco1');

  await createOrgAndSpace(organizationName, hostNameId, spaceName, spaceNameId);
  await createChallengeForOrgSpace(challengeName);
  console.log(entitiesId.challenge.nameId);
  await createOpportunityForChallenge(opportunityName);

  await assignRoleToUser(
    users.nonSpaceMember.id,
    entitiesId.space.roleSetId,
    CommunityRoleType.Member
  );

  await assignRoleToUser(
    users.nonSpaceMember.id,
    entitiesId.challenge.roleSetId,
    CommunityRoleType.Member
  );

  await assignRoleToUser(
    users.nonSpaceMember.id,
    entitiesId.opportunity.roleSetId,
    CommunityRoleType.Member
  );

  await assignRoleToUser(
    users.nonSpaceMember.id,
    entitiesId.space.roleSetId,
    CommunityRoleType.Lead
  );

  await assignRoleToUser(
    users.nonSpaceMember.id,
    entitiesId.challenge.roleSetId,
    CommunityRoleType.Lead
  );

  await assignRoleToUser(
    users.nonSpaceMember.id,
    entitiesId.opportunity.roleSetId,
    CommunityRoleType.Lead
  );

  await assignUserToOrganization(
    users.nonSpaceMember.id,
    entitiesId.organization.id
  );
});

afterAll(async () => {
  await deleteSpace(entitiesId.opportunity.id);
  await deleteSpace(entitiesId.challenge.id);
  await deleteSpace(entitiesId.spaceId);
  await deleteOrganization(entitiesId.organization.id);
});

describe('User roles', () => {
  test('user role - assignment to 1 Organization, Space, Challenge, Opportunity', async () => {
    // Act

    const res = await getUserRoleSpacesVisibility(
      users.nonSpaceMember.id,
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

    //toDo - Evgeni, review this. Maybe a bug.
    expect(spacesData?.[0].subspaces).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          nameID: entitiesId.challenge.nameId,
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
      ])
    );
  });

  describe('Extended scenario', () => {
    let orgId = '';
    let spaceId = '';
    let spaceRoleSetId = '';
    let chId = '';
    let subspaceRoleSetId = '';
    let chId2 = '';
    let subspaceRoleSetId2 = '';
    let oppId = '';
    let subsubspaceRoleSetId = '';
    let oppId2 = '';
    let subsubspaceRoleSetId2 = '';
    let oppId3 = '';
    let subsubspaceRoleSetId3 = '';

    beforeAll(async () => {
      const orgRes = await createOrganization(
        organizationName + '1',
        hostNameId + '1'
      );
      orgId = orgRes?.data?.createOrganization.id ?? '';
      const orgAccountId = orgRes?.data?.createOrganization.account?.id ?? '';

      const spaceRes = await createSpaceAndGetData(
        spaceName2,
        spaceNameId2,
        orgAccountId
      );
      const spaceData = spaceRes?.data?.space;
      spaceId = spaceData?.id ?? '';
      spaceRoleSetId = spaceData?.community?.roleSet.id ?? '';

      const chRes = await createChallenge(
        challengeName + '1',
        challengeName + '1',
        spaceId,
        TestUser.GLOBAL_ADMIN
      );

      const chResData = chRes?.data?.createSubspace;
      chId = chResData?.id ?? '';
      subspaceRoleSetId = chResData?.community?.roleSet.id ?? '';

      const chRes2 = await createChallenge(
        challengeName + '2',
        challengeName + '2',
        spaceId,
        TestUser.GLOBAL_ADMIN
      );
      const chRes2Data = chRes2?.data?.createSubspace;
      chId2 = chRes2Data?.id ?? '';
      subspaceRoleSetId2 = chRes2Data?.community?.roleSet.id ?? '';

      const oppRes = await createOpportunity(
        opportunityName + '1',
        opportunityName + '1',
        chId
      );

      const oppResData = oppRes?.data?.createSubspace;
      oppId = oppResData?.id ?? '';
      subsubspaceRoleSetId = oppResData?.community?.roleSet.id ?? '';

      const oppRes2 = await createOpportunity(
        opportunityName + '2',
        opportunityName + '2',
        chId2
      );
      const oppRes2Data = oppRes2?.data?.createSubspace;

      oppId2 = oppRes2Data?.id ?? '';
      subsubspaceRoleSetId2 = oppRes2Data?.community?.roleSet.id ?? '';

      const oppRes3 = await createOpportunity(
        opportunityName + '3',
        opportunityName + '3',
        chId2
      );

      const oppRes3Data = oppRes3?.data?.createSubspace;

      oppId3 = oppRes3Data?.id ?? '';
      subsubspaceRoleSetId3 = oppRes3Data?.community?.roleSet.id ?? '';

      await assignRoleToUser(
        users.nonSpaceMember.id,
        spaceRoleSetId,
        CommunityRoleType.Member
      );

      await assignRoleToUser(
        users.nonSpaceMember.id,
        subspaceRoleSetId,
        CommunityRoleType.Member
      );

      await assignRoleToUser(
        users.nonSpaceMember.id,
        subsubspaceRoleSetId,
        CommunityRoleType.Member
      );

      await assignRoleToUser(
        users.nonSpaceMember.id,
        subspaceRoleSetId2,
        CommunityRoleType.Member
      );

      await assignRoleToUser(
        users.nonSpaceMember.id,
        subsubspaceRoleSetId2,
        CommunityRoleType.Member
      );

      await assignRoleToUser(
        users.nonSpaceMember.id,
        subsubspaceRoleSetId3,
        CommunityRoleType.Member
      );

      await assignRoleToUser(
        users.nonSpaceMember.id,
        spaceRoleSetId,
        CommunityRoleType.Lead
      );

      await assignRoleToUser(
        users.nonSpaceMember.id,
        subspaceRoleSetId,
        CommunityRoleType.Lead
      );

      await assignRoleToUser(
        users.nonSpaceMember.id,
        subsubspaceRoleSetId,
        CommunityRoleType.Lead
      );

      await assignRoleToUser(
        users.nonSpaceMember.id,
        subspaceRoleSetId2,
        CommunityRoleType.Lead
      );

      await assignRoleToUser(
        users.nonSpaceMember.id,
        subsubspaceRoleSetId2,
        CommunityRoleType.Lead
      );

      await assignRoleToUser(
        users.nonSpaceMember.id,
        subsubspaceRoleSetId3,
        CommunityRoleType.Lead
      );

      await assignUserToOrganization(users.nonSpaceMember.id, orgId);
    });
    afterAll(async () => {
      await deleteSpace(oppId);
      await deleteSpace(oppId2);
      await deleteSpace(oppId3);
      await deleteSpace(chId);
      await deleteSpace(chId2);
      await deleteSpace(spaceId);
      await deleteOrganization(orgId);
    });
    test('user role - assignment to 2 Organizations, Spaces, Challenges, Opportunities', async () => {
      // Act
      const res = await getUserRoleSpacesVisibility(
        users.nonSpaceMember.id,
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
            nameID: entitiesId.challenge.nameId,
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
