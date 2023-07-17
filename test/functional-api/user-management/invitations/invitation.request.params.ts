import {
  invitationData,
  invitationDataExternal,
  lifecycleData,
} from '../../../utils/common-params';
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
  invitedUsers: string[],
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
        invitedUsers,
      },
    },
  };

  return await graphqlRequestAuth(requestParams, userRole);
};

export const inviteExternalUser = async (
  communityID: string,
  email: string,
  welcomeMessage: string,
  firstName: string,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const requestParams = {
    operationName: null,
    query: `mutation inviteExternalUserForCommunityMembership($invitationData: CreateInvitationExternalUserOnCommunityInput!) {
      inviteExternalUserForCommunityMembership(invitationData: $invitationData) {${invitationDataExternal}}
          }`,
    variables: {
      invitationData: {
        communityID,
        email,
        welcomeMessage,
        firstName,
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

export const removeExternalInvitation = async (appId: string) => {
  const requestParams = {
    operationName: null,
    query: `mutation deleteExternalInvitation($deleteData: DeleteInvitationExternalInput!) {
      deleteInvitationExternal(deleteData: $deleteData) {
        ${invitationDataExternal}}}`,
    variables: {
      deleteData: {
        ID: appId,
      },
    },
  };

  return await graphqlRequestAuth(requestParams, TestUser.GLOBAL_ADMIN);
};

export const getInvitation = async (
  spaceNameId: string,
  userRole: TestUser = TestUser.NON_HUB_MEMBER
) => {
  const requestParams = {
    operationName: null,
    variables: {},
    query: `query{space(ID: "${spaceNameId}" ) {community{
      invitations{${invitationData}}}}}`,
  };

  return await graphqlRequestAuth(requestParams, userRole);
};

export const getExternalInvitation = async (
  spaceNameId: string,
  userRole: TestUser = TestUser.NON_HUB_MEMBER
) => {
  const requestParams = {
    operationName: null,
    variables: {},
    query: `query{space(ID: "${spaceNameId}" ) {community{
      invitationsExternal{${invitationDataExternal}}}}}`,
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
    query: `query{space(ID: "${ecoNameId}" ) {challenge(ID: "${challengeNameId}"){community{
      invitations{${invitationData}}}}}}`,
  };

  return await graphqlRequestAuth(requestParams, userRole);
};

export const getInvitations = async (spaceId: string) => {
  const requestParams = {
    operationName: null,
    variables: {},
    query: `query{space(ID: "${spaceId}" ) {
        community{invitations{${invitationData}}}
        challenges{
          community{invitations{${invitationData}}}
        }
      }
    }`,
  };

  return await graphqlRequestAuth(requestParams, TestUser.GLOBAL_ADMIN);
};
