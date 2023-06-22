import { entitiesId } from '@test/functional-api/zcommunications/communications-helper';
import {
  createOrgAndSpace,
  createChallengeForOrgSpace,
  createOpportunityForChallenge,
  getDefaultSpaceTemplateByType,
} from '@test/functional-api/zcommunications/create-entities-with-users-helper';
import { mutation } from '@test/utils/graphql.request';
import {
  assignUserAsCommunityLeadFunc,
  assignUserAsCommunityMemberFunc,
  assignUserToOrganization,
  assignUserToOrganizationVariablesData,
} from '@test/utils/mutations/assign-mutation';
import { uniqueId } from '@test/utils/mutations/create-mutation';
import { users } from '@test/utils/queries/users-data';
import {
  createChallengeNoTemplate,
  removeChallenge,
} from '../integration/challenge/challenge.request.params';
import {
  createTestSpace,
  removeSpace,
} from '../integration/space/space.request.params';
import {
  createOpportunityNoTemplate,
  removeOpportunity,
} from '../integration/opportunity/opportunity.request.params';
import {
  createOrganization,
  deleteOrganization,
} from '../integration/organization/organization.request.params';
import { getUserRole } from './roles-query';

const organizationName = 'urole-org-name' + uniqueId;
const hostNameId = 'urole-org-nameid' + uniqueId;
const spaceName = '111' + uniqueId;
const spaceNameId = '111' + uniqueId;
const spaceName2 = '222' + uniqueId;
const spaceNameId2 = '222' + uniqueId;
const opportunityName = 'urole-opp';
const challengeName = 'urole-chal';
const spaceRoles = ['host', 'member'];
const availableRoles = ['member', 'lead'];

beforeAll(async () => {
  await removeSpace('eco1');

  await createOrgAndSpace(organizationName, hostNameId, spaceName, spaceNameId);
  await createChallengeForOrgSpace(challengeName);
  await createOpportunityForChallenge(opportunityName);

  await assignUserAsCommunityMemberFunc(
    entitiesId.spaceCommunityId,
    users.nonSpaceMemberEmail
  );
  await assignUserAsCommunityMemberFunc(
    entitiesId.challengeCommunityId,
    users.nonSpaceMemberEmail
  );
  await assignUserAsCommunityMemberFunc(
    entitiesId.opportunityCommunityId,
    users.nonSpaceMemberEmail
  );
  await assignUserAsCommunityLeadFunc(
    entitiesId.spaceCommunityId,
    users.nonSpaceMemberEmail
  );
  await assignUserAsCommunityLeadFunc(
    entitiesId.challengeCommunityId,
    users.nonSpaceMemberEmail
  );
  await assignUserAsCommunityLeadFunc(
    entitiesId.opportunityCommunityId,
    users.nonSpaceMemberEmail
  );

  await mutation(
    assignUserToOrganization,
    assignUserToOrganizationVariablesData(
      entitiesId.organizationId,
      users.nonSpaceMemberId
    )
  );
});

afterAll(async () => {
  await removeOpportunity(entitiesId.opportunityId);
  await removeChallenge(entitiesId.challengeId);
  await removeSpace(entitiesId.spaceId);
  await deleteOrganization(entitiesId.organizationId);
});

describe('User roles', () => {
  test('user role - assignment to 1 Organization, Space, Challenge, Opportunity', async () => {
    // Act
    const res = await getUserRole(users.nonSpaceMemberId);
    const spacesData = res.body.data.rolesUser.spaces;
    const orgData = res.body.data.rolesUser.organizations;

    // Assert
    expect(spacesData).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          nameID: spaceNameId,
          roles: expect.arrayContaining(spaceRoles),
        }),
      ])
    );

    expect(spacesData[0].challenges).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          nameID: entitiesId.challengeNameId,
          roles: expect.arrayContaining(availableRoles),
        }),
      ])
    );
    expect(spacesData[0].opportunities).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          nameID: entitiesId.opportunityNameId,
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
      const orgRes = await createOrganization(
        organizationName + '1',
        hostNameId + '1'
      );
      orgId = orgRes.body.data.createOrganization.id;

      const spaceRes = await createTestSpace(spaceName2, spaceNameId2, orgId);
      spaceId = spaceRes.body.data.createSpace.id;
      spaceComId = spaceRes.body.data.createSpace.community.id;
      const spaceTempLateChallenge = await getDefaultSpaceTemplateByType(
        spaceId,
        'CHALLENGE'
      );

      const spaceInnovationFlowTemplateChId = spaceTempLateChallenge[0].id;
      const spaceTempLateOpportunity = await getDefaultSpaceTemplateByType(
        spaceId,
        'OPPORTUNITY'
      );
      const spaceInnovationFlowTemplateCOppId = spaceTempLateOpportunity[0].id;

      const chRes = await createChallengeNoTemplate(
        challengeName + '1',
        challengeName + '1',
        spaceId,
        spaceInnovationFlowTemplateChId
      );
      chId = chRes.body.data.createChallenge.id;
      chComId = chRes.body.data.createChallenge.community.id;

      const chRes2 = await createChallengeNoTemplate(
        challengeName + '2',
        challengeName + '2',
        spaceId,
        spaceInnovationFlowTemplateChId
      );
      chId2 = chRes2.body.data.createChallenge.id;
      chComId2 = chRes2.body.data.createChallenge.community.id;

      const oppRes = await createOpportunityNoTemplate(
        chId,
        opportunityName + '1',
        opportunityName + '1',
        spaceInnovationFlowTemplateCOppId
      );
      oppId = oppRes.body.data.createOpportunity.id;
      oppComId = oppRes.body.data.createOpportunity.community.id;

      const oppRes2 = await createOpportunityNoTemplate(
        chId2,
        opportunityName + '2',
        opportunityName + '2',
        spaceInnovationFlowTemplateCOppId
      );
      oppId2 = oppRes2.body.data.createOpportunity.id;
      oppComId2 = oppRes2.body.data.createOpportunity.community.id;

      const oppRes3 = await createOpportunityNoTemplate(
        chId2,
        opportunityName + '3',
        opportunityName + '3',
        spaceInnovationFlowTemplateCOppId
      );
      oppId3 = oppRes3.body.data.createOpportunity.id;
      oppComId3 = oppRes3.body.data.createOpportunity.community.id;

      await assignUserAsCommunityMemberFunc(
        spaceComId,
        users.nonSpaceMemberEmail
      );
      await assignUserAsCommunityMemberFunc(chComId, users.nonSpaceMemberEmail);
      await assignUserAsCommunityMemberFunc(
        oppComId,
        users.nonSpaceMemberEmail
      );
      await assignUserAsCommunityMemberFunc(
        chComId2,
        users.nonSpaceMemberEmail
      );
      await assignUserAsCommunityMemberFunc(
        oppComId2,
        users.nonSpaceMemberEmail
      );
      await assignUserAsCommunityMemberFunc(
        oppComId3,
        users.nonSpaceMemberEmail
      );
      await assignUserAsCommunityLeadFunc(
        spaceComId,
        users.nonSpaceMemberEmail
      );
      await assignUserAsCommunityLeadFunc(chComId, users.nonSpaceMemberEmail);
      await assignUserAsCommunityLeadFunc(oppComId, users.nonSpaceMemberEmail);
      await assignUserAsCommunityLeadFunc(chComId2, users.nonSpaceMemberEmail);
      await assignUserAsCommunityLeadFunc(oppComId2, users.nonSpaceMemberEmail);
      await assignUserAsCommunityLeadFunc(oppComId3, users.nonSpaceMemberEmail);

      await mutation(
        assignUserToOrganization,
        assignUserToOrganizationVariablesData(orgId, users.nonSpaceMemberId)
      );
    });
    afterAll(async () => {
      await removeOpportunity(oppId);
      await removeOpportunity(oppId2);
      await removeOpportunity(oppId3);
      await removeChallenge(chId);
      await removeChallenge(chId2);
      await removeSpace(spaceId);
      await deleteOrganization(orgId);
    });
    test('user role - assignment to 2 Organizations, Spaces, Challenges, Opportunities', async () => {
      // Act
      const res = await getUserRole(users.nonSpaceMemberId);
      const spacesData = res.body.data.rolesUser.spaces;
      let spaceData1 = res.body.data.rolesUser.spaces[0];
      let spaceData2 = res.body.data.rolesUser.spaces[1];
      const orgData = res.body.data.rolesUser.organizations;

      if (spaceData2.challenges.length === 1) {
        spaceData1 = res.body.data.rolesUser.spaces[1];
        spaceData2 = res.body.data.rolesUser.spaces[0];
      }

      // Assert
      expect(spacesData).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            nameID: spaceNameId,
            roles: expect.arrayContaining(spaceRoles),
          }),
          expect.objectContaining({
            nameID: spaceNameId2,
            roles: expect.arrayContaining(spaceRoles),
          }),
        ])
      );

      expect(spaceData1.challenges).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            nameID: entitiesId.challengeNameId,
            roles: expect.arrayContaining(availableRoles),
          }),
        ])
      );
      expect(spaceData1.opportunities).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            nameID: entitiesId.opportunityNameId,
            roles: expect.arrayContaining(availableRoles),
          }),
        ])
      );

      expect(spaceData2.challenges).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            nameID: challengeName + '1',
            roles: expect.arrayContaining(availableRoles),
          }),
        ])
      );
      expect(spaceData2.opportunities).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            nameID: opportunityName + '1',
            roles: expect.arrayContaining(availableRoles),
          }),
        ])
      );

      expect(spaceData2.challenges).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            nameID: challengeName + '2',
            roles: expect.arrayContaining(availableRoles),
          }),
        ])
      );
      expect(spaceData2.opportunities).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            nameID: opportunityName + '2',
            roles: expect.arrayContaining(availableRoles),
          }),
        ])
      );

      expect(spaceData2.opportunities).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            nameID: opportunityName + '3',
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
