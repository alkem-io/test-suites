import {
  entitiesId,
  users,
} from '@test/functional-api/zcommunications/communications-helper';
import {
  createOrgAndHub,
  createChallengeForOrgHub,
  createOpportunityForChallenge,
  getDefaultHubTemplateByType,
} from '@test/functional-api/zcommunications/create-entities-with-users-helper';
import { mutation } from '@test/utils/graphql.request';
import {
  assignUserAsCommunityLeadFunc,
  assignUserAsCommunityMemberFunc,
  assignUserToOrganization,
  assignUserToOrganizationVariablesData,
} from '@test/utils/mutations/assign-mutation';
import { uniqueId } from '@test/utils/mutations/create-mutation';
import {
  createChallengeNoTemplate,
  removeChallenge,
} from '../integration/challenge/challenge.request.params';
import {
  createTestHub,
  removeHub,
} from '../integration/hub/hub.request.params';
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
const hubName = '1urole-eco-name' + uniqueId;
const hubNameId = '1urole-eco-nameid' + uniqueId;
const hubName2 = '2zzz-eco-name' + uniqueId;
const hubNameId2 = '2zzz-eco-nameid' + uniqueId;
const opportunityName = 'urole-opp';
const challengeName = 'urole-chal';
const hubRoles = ['host', 'member'];
const availableRoles = ['member', 'lead'];

beforeAll(async () => {
  await removeHub('eco1');

  await createOrgAndHub(organizationName, hostNameId, hubName, hubNameId);
  await createChallengeForOrgHub(challengeName);
  await createOpportunityForChallenge(opportunityName);

  await assignUserAsCommunityMemberFunc(
    entitiesId.hubCommunityId,
    users.nonHubMemberEmail
  );
  await assignUserAsCommunityMemberFunc(
    entitiesId.challengeCommunityId,
    users.nonHubMemberEmail
  );
  await assignUserAsCommunityMemberFunc(
    entitiesId.opportunityCommunityId,
    users.nonHubMemberEmail
  );
  await assignUserAsCommunityLeadFunc(
    entitiesId.hubCommunityId,
    users.nonHubMemberEmail
  );
  await assignUserAsCommunityLeadFunc(
    entitiesId.challengeCommunityId,
    users.nonHubMemberEmail
  );
  await assignUserAsCommunityLeadFunc(
    entitiesId.opportunityCommunityId,
    users.nonHubMemberEmail
  );

  await mutation(
    assignUserToOrganization,
    assignUserToOrganizationVariablesData(
      entitiesId.organizationId,
      users.nonHubMemberId
    )
  );
});

afterAll(async () => {
  await removeOpportunity(entitiesId.opportunityId);
  await removeChallenge(entitiesId.challengeId);
  await removeHub(entitiesId.hubId);
  await deleteOrganization(entitiesId.organizationId);
});

describe('User roles', () => {
  test('user role - assignment to 1 Organization, Hub, Challenge, Opportunity', async () => {
    // Act
    const res = await getUserRole(users.nonHubMemberId);
    const hubsData = res.body.data.rolesUser.hubs;
    const orgData = res.body.data.rolesUser.organizations;

    // Assert
    expect(hubsData).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          nameID: hubNameId,
          roles: expect.arrayContaining(hubRoles),
        }),
      ])
    );

    expect(hubsData[0].challenges).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          nameID: entitiesId.challengeNameId,
          roles: expect.arrayContaining(availableRoles),
        }),
      ])
    );
    expect(hubsData[0].opportunities).toEqual(
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
    let hubId = '';
    let hubComId = '';
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

      const hubRes = await createTestHub(hubName2, hubNameId2, orgId);
      hubId = hubRes.body.data.createHub.id;
      hubComId = hubRes.body.data.createHub.community.id;
      const hubTempLateChallenge = await getDefaultHubTemplateByType(
        hubId,
        'CHALLENGE'
      );

      const hubLifecycleTemplateChId = hubTempLateChallenge[0].id;
      const hubTempLateOpportunity = await getDefaultHubTemplateByType(
        hubId,
        'OPPORTUNITY'
      );
      const hubLifecycleTemplateCOppId = hubTempLateOpportunity[0].id;

      const chRes = await createChallengeNoTemplate(
        challengeName + '1',
        challengeName + '1',
        hubId,
        hubLifecycleTemplateChId
      );
      chId = chRes.body.data.createChallenge.id;
      chComId = chRes.body.data.createChallenge.community.id;

      const chRes2 = await createChallengeNoTemplate(
        challengeName + '2',
        challengeName + '2',
        hubId,
        hubLifecycleTemplateChId
      );
      chId2 = chRes2.body.data.createChallenge.id;
      chComId2 = chRes2.body.data.createChallenge.community.id;

      const oppRes = await createOpportunityNoTemplate(
        chId,
        opportunityName + '1',
        opportunityName + '1',
        hubLifecycleTemplateCOppId
      );
      oppId = oppRes.body.data.createOpportunity.id;
      oppComId = oppRes.body.data.createOpportunity.community.id;

      const oppRes2 = await createOpportunityNoTemplate(
        chId2,
        opportunityName + '2',
        opportunityName + '2',
        hubLifecycleTemplateCOppId
      );
      oppId2 = oppRes2.body.data.createOpportunity.id;
      oppComId2 = oppRes2.body.data.createOpportunity.community.id;

      const oppRes3 = await createOpportunityNoTemplate(
        chId2,
        opportunityName + '3',
        opportunityName + '3',
        hubLifecycleTemplateCOppId
      );
      oppId3 = oppRes3.body.data.createOpportunity.id;
      oppComId3 = oppRes3.body.data.createOpportunity.community.id;

      await assignUserAsCommunityMemberFunc(hubComId, users.nonHubMemberEmail);
      await assignUserAsCommunityMemberFunc(chComId, users.nonHubMemberEmail);
      await assignUserAsCommunityMemberFunc(oppComId, users.nonHubMemberEmail);
      await assignUserAsCommunityMemberFunc(chComId2, users.nonHubMemberEmail);
      await assignUserAsCommunityMemberFunc(oppComId2, users.nonHubMemberEmail);
      await assignUserAsCommunityMemberFunc(oppComId3, users.nonHubMemberEmail);
      await assignUserAsCommunityLeadFunc(hubComId, users.nonHubMemberEmail);
      await assignUserAsCommunityLeadFunc(chComId, users.nonHubMemberEmail);
      await assignUserAsCommunityLeadFunc(oppComId, users.nonHubMemberEmail);
      await assignUserAsCommunityLeadFunc(chComId2, users.nonHubMemberEmail);
      await assignUserAsCommunityLeadFunc(oppComId2, users.nonHubMemberEmail);
      await assignUserAsCommunityLeadFunc(oppComId3, users.nonHubMemberEmail);

      await mutation(
        assignUserToOrganization,
        assignUserToOrganizationVariablesData(orgId, users.nonHubMemberId)
      );
    });
    afterAll(async () => {
      await removeOpportunity(oppId);
      await removeOpportunity(oppId2);
      await removeOpportunity(oppId3);
      await removeChallenge(chId);
      await removeChallenge(chId2);
      await removeHub(hubId);
      await deleteOrganization(orgId);
    });
    test('user role - assignment to 2 Organizations, Hubs, Challenges, Opportunities', async () => {
      // Act
      const res = await getUserRole(users.nonHubMemberId);
      const hubsData = res.body.data.rolesUser.hubs;
      const orgData = res.body.data.rolesUser.organizations;

      // Assert
      expect(hubsData).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            nameID: hubNameId,
            roles: expect.arrayContaining(hubRoles),
          }),
          expect.objectContaining({
            nameID: hubNameId2,
            roles: expect.arrayContaining(hubRoles),
          }),
        ])
      );

      expect(hubsData[1].challenges).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            nameID: entitiesId.challengeNameId,
            roles: expect.arrayContaining(availableRoles),
          }),
        ])
      );
      expect(hubsData[1].opportunities).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            nameID: entitiesId.opportunityNameId,
            roles: expect.arrayContaining(availableRoles),
          }),
        ])
      );

      expect(hubsData[0].challenges).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            nameID: challengeName + '1',
            roles: expect.arrayContaining(availableRoles),
          }),
        ])
      );
      expect(hubsData[0].opportunities).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            nameID: opportunityName + '1',
            roles: expect.arrayContaining(availableRoles),
          }),
        ])
      );

      expect(hubsData[0].challenges).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            nameID: challengeName + '2',
            roles: expect.arrayContaining(availableRoles),
          }),
        ])
      );
      expect(hubsData[0].opportunities).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            nameID: opportunityName + '2',
            roles: expect.arrayContaining(availableRoles),
          }),
        ])
      );

      expect(hubsData[0].opportunities).toEqual(
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
