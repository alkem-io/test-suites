import { getGraphqlClient } from '@test/utils/graphqlClient';
import {
  invitationData,
  invitationDataExternal,
  lifecycleData,
} from '../../../utils/common-params';
import { graphqlRequestAuth } from '../../../utils/graphql.request';
import { TestUser } from '../../../utils/token.helper';
import { graphqlErrorWrapper } from '@test/utils/graphql.wrapper';

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

export const inviteExistingUserCodegen = async (
  communityID: string,
  invitedUsers: string[],
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.inviteExistingUserForCommunityMembership(
      {
        invitationData: {
          communityID,
          invitedUsers,
        },
      },
      {
        authorization: `Bearer ${authToken}`,
      }
    );
  return graphqlErrorWrapper(callback, userRole);
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

export const inviteExternalUserCodegen = async (
  communityID: string,
  email: string,
  welcomeMessage: string,
  firstName: string,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.InviteExternalUserForCommunityMembership(
      {
        invitationData: {
          communityID,
          email,
          welcomeMessage,
          firstName,
        },
      },
      {
        authorization: `Bearer ${authToken}`,
      }
    );
  return graphqlErrorWrapper(callback, userRole);
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

export const deleteInvitationCodegen = async (
  invitationId: string,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.deleteInvitation(
      {
        deleteData: {
          ID: invitationId,
        },
      },
      {
        authorization: `Bearer ${authToken}`,
      }
    );
  return graphqlErrorWrapper(callback, userRole);
};

export const deleteExternalInvitationCodegen = async (
  invitationId: string,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.DeleteExternalInvitation(
      {
        deleteData: {
          ID: invitationId,
        },
      },
      {
        authorization: `Bearer ${authToken}`,
      }
    );
  return graphqlErrorWrapper(callback, userRole);
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

export const getSpaceInvitationCodegen = async (
  spaceId: string,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.getSpaceInvitations(
      {
        spaceId,
      },
      {
        authorization: `Bearer ${authToken}`,
      }
    );
  return graphqlErrorWrapper(callback, userRole);
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
