import { invitationData, lifecycleData } from '../../../utils/common-params';
import { graphqlRequestAuth } from '../../../utils/graphql.request';
import { TestUser } from '../../../utils/token.helper';

export const appData = `{
      id
      lifecycle {
        ${lifecycleData}
      }
      createdBy {
        id
      }
      user {
        id
      }
    }`;

export const inviteExistingUser = async (
  communityID: string,
  invitedUser: string,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const requestParams = {
    operationName: null,
    query: `mutation inviteExistingUserForCommunityMembership($invitationData: CreateInvitationExistingUserOnCommunityInput!) {
      inviteExistingUserForCommunityMembership(invitationData: $invitationData) {${invitationData}}
          }`,
    variables: {
      invitationData: {
        communityID,
        invitedUser,
      },
    },
  };

  return await graphqlRequestAuth(requestParams, userRole);
};

export const removeInvitation = async (appId: string) => {
  const requestParams = {
    operationName: null,
    query: `mutation deleteInvitation($deleteData: DeleteInvitationInput!) {
      deleteInvitation(deleteData: $deleteData) {
        ${invitationData}}}`,
    variables: {
      deleteData: {
        ID: appId,
      },
    },
  };

  return await graphqlRequestAuth(requestParams, TestUser.GLOBAL_ADMIN);
};

export const getInvitation = async (
  hubNameId: string,
  userRole: TestUser = TestUser.NON_HUB_MEMBER
) => {
  const requestParams = {
    operationName: null,
    variables: {},
    query: `query{hub(ID: "${hubNameId}" ) {community{
      invitations{${invitationData}}}}}`,
  };

  return await graphqlRequestAuth(requestParams, userRole);
};

export const getChallengeInvitations = async (
  ecoNameId: string,
  challengeNameId: string,
  userRole: TestUser = TestUser.NON_HUB_MEMBER
) => {
  const requestParams = {
    operationName: null,
    variables: {},
    query: `query{hub(ID: "${ecoNameId}" ) {challenge(ID: "${challengeNameId}"){community{
      invitations{${invitationData}}}}}}`,
  };

  return await graphqlRequestAuth(requestParams, userRole);
};

export const getInvitations = async (hubId: string) => {
  const requestParams = {
    operationName: null,
    variables: {},
    query: `query{hub(ID: "${hubId}" ) {
        community{invitations{${invitationData}}}
        challenges{
          community{invitations{${invitationData}}}
        }
      }
    }`,
  };

  return await graphqlRequestAuth(requestParams, TestUser.GLOBAL_ADMIN);
};
