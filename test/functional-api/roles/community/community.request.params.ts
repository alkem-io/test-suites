import { TestUser } from '@test/utils/token.helper';
import { graphqlRequestAuth } from '@test/utils/graphql.request';
import { membersAndLeadsData } from '@test/utils/common-params';
import { entitiesId } from '@test/functional-api/zcommunications/communications-helper';
import {
  getChallengeData,
  getChallengeCommunityAvailableMemberUsersData,
  getChallengeCommunityAvailableLeadUsersData,
} from '../../integration/challenge/challenge.request.params';
import {
  getHubCommunityAvailableMemberUsersData,
  getHubCommunityAvailableLeadUsersData,
  getHubData,
} from '../../integration/hub/hub.request.params';
import {
  getOpportunityData,
  getOpportunityCommunityAvailableMemberUsersData,
  getOpportunityCommunityAvailableLeadUsersData,
} from '../../integration/opportunity/opportunity.request.params';

export const createGroupOnCommunity = async (
  communityId: any,
  groupNameText: string
) => {
  const requestParams = {
    operationName: null,
    query: `mutation createGroupOnCommunity($groupData: CreateUserGroupInput!) {
      createGroupOnCommunity(groupData: $groupData) {
        name,
        id
        members {
          nameID
        }
        profile{
          id
        }
      }
    }`,
    variables: {
      groupData: {
        name: groupNameText,
        parentID: communityId,
        // profileData: {
        //   description: 'some description',
        // },
      },
    },
  };

  return await graphqlRequestAuth(requestParams, TestUser.GLOBAL_ADMIN);
};

export const getCommunityData = async (hubId: string) => {
  const requestParams = {
    operationName: null,
    query: `query {hub(ID: "${hubId}") {
              id
              community {id  ${membersAndLeadsData}}
              challenges {community{id ${membersAndLeadsData}}}
            }
          }`,
    variables: null,
  };

  return await graphqlRequestAuth(requestParams, TestUser.GLOBAL_ADMIN);
};

export const dataHubMemberTypes = async (
  hubId: string
): Promise<[
  string | undefined,
  string | undefined,
  string | undefined,
  string | undefined
]> => {
  const responseQuery = await getHubData(entitiesId.hubId);

  const hubUesrsMembers = responseQuery.body.data.hub.community.memberUsers;
  const hubOrganizationMembers =
    responseQuery.body.data.hub.community.memberOrganizations;
  const hubLeadUsers = responseQuery.body.data.hub.community.leadUsers;
  const hubLeadOrganizations =
    responseQuery.body.data.hub.community.leadOrganizations;

  return [
    hubUesrsMembers,
    hubOrganizationMembers,
    hubLeadUsers,
    hubLeadOrganizations,
  ];
};

export const dataChallengeMemberTypes = async (
  hubId: string,
  challengeId: string
): Promise<[
  string | undefined,
  string | undefined,
  string | undefined,
  string | undefined
]> => {
  const responseQuery = await getChallengeData(
    entitiesId.hubId,
    entitiesId.challengeId
  );

  const challengeUesrsMembers =
    responseQuery.body.data.hub.challenge.community.memberUsers;
  const challengeOrganizationMembers =
    responseQuery.body.data.hub.challenge.community.memberOrganizations;
  const challengeLeadUsers =
    responseQuery.body.data.hub.challenge.community.leadUsers;
  const challengeLeadOrganizations =
    responseQuery.body.data.hub.challenge.community.leadOrganizations;

  return [
    challengeUesrsMembers,
    challengeOrganizationMembers,
    challengeLeadUsers,
    challengeLeadOrganizations,
  ];
};

export const dataOpportunityMemberTypes = async (
  hubId: string,
  opportunityId: string
): Promise<[
  string | undefined,
  string | undefined,
  string | undefined,
  string | undefined
]> => {
  const responseQuery = await getOpportunityData(
    entitiesId.hubId,
    entitiesId.opportunityId
  );

  const opportunityUsersMembers =
    responseQuery.body.data.hub.opportunity.community.memberUsers;
  const opportunityOrganizationMembers =
    responseQuery.body.data.hub.opportunity.community.memberOrganizations;
  const opportunityLeadUsers =
    responseQuery.body.data.hub.opportunity.community.leadUsers;
  const opportunityLeadOrganizations =
    responseQuery.body.data.hub.opportunity.community.leadOrganizations;

  return [
    opportunityUsersMembers,
    opportunityOrganizationMembers,
    opportunityLeadUsers,
    opportunityLeadOrganizations,
  ];
};

export const dataHubAvailableMemberUsers = async (
  hubId: string
): Promise<Array<{ id: string; nameId: string }>> => {
  const responseQuery = await getHubCommunityAvailableMemberUsersData(hubId);

  const hubCommunityAvailableMemberUsers =
    responseQuery.body.data.hub.community.availableMemberUsers.users;

  return hubCommunityAvailableMemberUsers;
};

export const dataHubAvailableLeadUsers = async (
  hubId: string
): Promise<Array<{ id: string; nameId: string }>> => {
  const responseQuery = await getHubCommunityAvailableLeadUsersData(hubId);

  const hubCommunityAvailableLeadUsers =
    responseQuery.body.data.hub.community.availableLeadUsers.users;

  return hubCommunityAvailableLeadUsers;
};

export const dataChallengeAvailableMemberUsers = async (
  hubId: string,
  challengeId: string
): Promise<Array<{ id: string; nameId: string }>> => {
  const responseQuery = await getChallengeCommunityAvailableMemberUsersData(
    hubId,
    challengeId
  );

  const hubCommunityAvailableMemberUsers =
    responseQuery.body.data.hub.challenge.community.availableMemberUsers.users;

  return hubCommunityAvailableMemberUsers;
};

export const dataChallengeAvailableLeadUsers = async (
  hubId: string,
  challengeId: string
): Promise<Array<{ id: string; nameId: string }>> => {
  const responseQuery = await getChallengeCommunityAvailableLeadUsersData(
    hubId,
    challengeId
  );

  const hubCommunityAvailableLeadUsers =
    responseQuery.body.data.hub.challenge.community.availableLeadUsers.users;

  return hubCommunityAvailableLeadUsers;
};

export const dataOpportunityAvailableMemberUsers = async (
  hubId: string,
  opportunityId: string
): Promise<Array<{ id: string; nameId: string }>> => {
  const responseQuery = await getOpportunityCommunityAvailableMemberUsersData(
    hubId,
    opportunityId
  );

  const hubCommunityAvailableMemberUsers =
    responseQuery.body.data.hub.opportunity.community.availableMemberUsers
      .users;

  return hubCommunityAvailableMemberUsers;
};

export const dataOpportunityAvailableLeadUsers = async (
  hubId: string,
  opportunityId: string
): Promise<Array<{ id: string; nameId: string }>> => {
  const responseQuery = await getOpportunityCommunityAvailableLeadUsersData(
    hubId,
    opportunityId
  );

  const hubCommunityAvailableLeadUsers =
    responseQuery.body.data.hub.opportunity.community.availableLeadUsers.users;

  return hubCommunityAvailableLeadUsers;
};
