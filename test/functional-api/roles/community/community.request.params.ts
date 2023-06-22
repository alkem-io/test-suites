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
  getSpaceCommunityAvailableMemberUsersData,
  getSpaceCommunityAvailableLeadUsersData,
  getSpaceData,
} from '../../integration/space/space.request.params';
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

export const getCommunityData = async (spaceId: string) => {
  const requestParams = {
    operationName: null,
    query: `query {space(ID: "${spaceId}") {
              id
              community {id  ${membersAndLeadsData}}
              challenges {community{id ${membersAndLeadsData}}}
            }
          }`,
    variables: null,
  };

  return await graphqlRequestAuth(requestParams, TestUser.GLOBAL_ADMIN);
};

export const dataSpaceMemberTypes = async (
  spaceId: string
): Promise<[
  string | undefined,
  string | undefined,
  string | undefined,
  string | undefined
]> => {
  const responseQuery = await getSpaceData(entitiesId.spaceId);

  const spaceUesrsMembers = responseQuery.body.data.space.community.memberUsers;
  const spaceOrganizationMembers =
    responseQuery.body.data.space.community.memberOrganizations;
  const spaceLeadUsers = responseQuery.body.data.space.community.leadUsers;
  const spaceLeadOrganizations =
    responseQuery.body.data.space.community.leadOrganizations;

  return [
    spaceUesrsMembers,
    spaceOrganizationMembers,
    spaceLeadUsers,
    spaceLeadOrganizations,
  ];
};

export const dataChallengeMemberTypes = async (
  spaceId: string,
  challengeId: string
): Promise<[
  string | undefined,
  string | undefined,
  string | undefined,
  string | undefined
]> => {
  const responseQuery = await getChallengeData(
    entitiesId.spaceId,
    entitiesId.challengeId
  );

  const challengeUesrsMembers =
    responseQuery.body.data.space.challenge.community.memberUsers;
  const challengeOrganizationMembers =
    responseQuery.body.data.space.challenge.community.memberOrganizations;
  const challengeLeadUsers =
    responseQuery.body.data.space.challenge.community.leadUsers;
  const challengeLeadOrganizations =
    responseQuery.body.data.space.challenge.community.leadOrganizations;

  return [
    challengeUesrsMembers,
    challengeOrganizationMembers,
    challengeLeadUsers,
    challengeLeadOrganizations,
  ];
};

export const dataOpportunityMemberTypes = async (
  spaceId: string,
  opportunityId: string
): Promise<[
  string | undefined,
  string | undefined,
  string | undefined,
  string | undefined
]> => {
  const responseQuery = await getOpportunityData(
    entitiesId.spaceId,
    entitiesId.opportunityId
  );

  const opportunityUsersMembers =
    responseQuery.body.data.space.opportunity.community.memberUsers;
  const opportunityOrganizationMembers =
    responseQuery.body.data.space.opportunity.community.memberOrganizations;
  const opportunityLeadUsers =
    responseQuery.body.data.space.opportunity.community.leadUsers;
  const opportunityLeadOrganizations =
    responseQuery.body.data.space.opportunity.community.leadOrganizations;

  return [
    opportunityUsersMembers,
    opportunityOrganizationMembers,
    opportunityLeadUsers,
    opportunityLeadOrganizations,
  ];
};

export const dataSpaceAvailableMemberUsers = async (
  spaceId: string
): Promise<Array<{ id: string; nameId: string }>> => {
  const responseQuery = await getSpaceCommunityAvailableMemberUsersData(
    spaceId
  );

  const spaceCommunityAvailableMemberUsers =
    responseQuery.body.data.space.community.availableMemberUsers.users;

  return spaceCommunityAvailableMemberUsers;
};

export const dataSpaceAvailableLeadUsers = async (
  spaceId: string
): Promise<Array<{ id: string; nameId: string }>> => {
  const responseQuery = await getSpaceCommunityAvailableLeadUsersData(spaceId);

  const spaceCommunityAvailableLeadUsers =
    responseQuery.body.data.space.community.availableLeadUsers.users;

  return spaceCommunityAvailableLeadUsers;
};

export const dataChallengeAvailableMemberUsers = async (
  spaceId: string,
  challengeId: string
): Promise<Array<{ id: string; nameId: string }>> => {
  const responseQuery = await getChallengeCommunityAvailableMemberUsersData(
    spaceId,
    challengeId
  );

  const spaceCommunityAvailableMemberUsers =
    responseQuery.body.data.space.challenge.community.availableMemberUsers
      .users;

  return spaceCommunityAvailableMemberUsers;
};

export const dataChallengeAvailableLeadUsers = async (
  spaceId: string,
  challengeId: string
): Promise<Array<{ id: string; nameId: string }>> => {
  const responseQuery = await getChallengeCommunityAvailableLeadUsersData(
    spaceId,
    challengeId
  );

  const spaceCommunityAvailableLeadUsers =
    responseQuery.body.data.space.challenge.community.availableLeadUsers.users;

  return spaceCommunityAvailableLeadUsers;
};

export const dataOpportunityAvailableMemberUsers = async (
  spaceId: string,
  opportunityId: string
): Promise<Array<{ id: string; nameId: string }>> => {
  const responseQuery = await getOpportunityCommunityAvailableMemberUsersData(
    spaceId,
    opportunityId
  );

  const spaceCommunityAvailableMemberUsers =
    responseQuery.body.data.space.opportunity.community.availableMemberUsers
      .users;

  return spaceCommunityAvailableMemberUsers;
};

export const dataOpportunityAvailableLeadUsers = async (
  spaceId: string,
  opportunityId: string
): Promise<Array<{ id: string; nameId: string }>> => {
  const responseQuery = await getOpportunityCommunityAvailableLeadUsersData(
    spaceId,
    opportunityId
  );

  const spaceCommunityAvailableLeadUsers =
    responseQuery.body.data.space.opportunity.community.availableLeadUsers
      .users;

  return spaceCommunityAvailableLeadUsers;
};
