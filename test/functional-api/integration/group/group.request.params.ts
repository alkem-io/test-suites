import { TestUser } from '@test/utils/token.helper';
import { graphqlRequestAuth } from '@test/utils/graphql.request';

export const createGroupOnOrganization = async (
  testGroup: string,
  organizationId: string
) => {
  const requestParams = {
    operationName: null,
    query: `mutation createGroupOnOrganization($groupData: CreateUserGroupInput!) {
      createGroupOnOrganization(groupData: $groupData) {
        id,
        profile {
         id
         displayName
        }
      }
    }`,
    variables: {
      groupData: {
        profileData: {
          displayName: testGroup,
          description: testGroup,
        },
        parentID: organizationId,
      },
    },
  };

  return await graphqlRequestAuth(requestParams, TestUser.GLOBAL_ADMIN);
};

export const updateGroup = async (
  groupId: string,
  nameGroup: string,
  displayName: string,
  descriptionText?: string,
  avatarUrl?: string
) => {
  const requestParams = {
    groupID: null,
    query: `mutation UpdateUserGroup($userGroupData: UpdateUserGroupInput!) {
      updateUserGroup(userGroupData: $userGroupData) {
        id
        name
      }
    }`,
    variables: {
      userGroupData: {
        ID: groupId,
        name: nameGroup,
        profileData: {
          displayName,
          description: descriptionText,
          avatar: avatarUrl,
        },
      },
    },
  };

  return await graphqlRequestAuth(requestParams, TestUser.GLOBAL_ADMIN);
};

export const getGroups = async (spaceId: string) => {
  const requestParams = {
    operationName: null,
    variables: {},
    query: `query{space(ID: "${spaceId}") { groups {id name profile{displayName description id}}}}`,
  };

  return await graphqlRequestAuth(requestParams, TestUser.GLOBAL_ADMIN);
};

export const getChallengeGroups = async (
  spaceId: string,
  challengeId: string
) => {
  const requestParams = {
    operationName: null,
    variables: {},
    query: `query{space(ID: "${spaceId}") { challenge (ID: "${challengeId}"){groups {id profile{displayName id}}}}}`,
  };

  return await graphqlRequestAuth(requestParams, TestUser.GLOBAL_ADMIN);
};

export const getGroup = async (spaceId: string, groupId: string) => {
  const requestParams = {
    operationName: null,
    variables: {},
    query: `query {
      space(ID: "${spaceId}") {
      group(ID: "${groupId}") {
        id
        profile{displayName id}
        members {
          nameID
          id
        }
      }
    }
  }`,
  };

  return await graphqlRequestAuth(requestParams, TestUser.GLOBAL_ADMIN);
};

export const removeUserGroup = async (groupId: string) => {
  const requestParams = {
    operationName: null,
    query: `mutation deleteUserGroup($deleteData: DeleteUserGroupInput!) {
      deleteUserGroup(deleteData: $deleteData) {
        id
      }}`,
    variables: {
      deleteData: {
        ID: groupId,
      },
    },
  };

  return await graphqlRequestAuth(requestParams, TestUser.GLOBAL_ADMIN);
};

export const getGroupParent = async (spaceId: string, groupId: string) => {
  const requestParams = {
    operationName: null,
    variables: {},
    query: `query { space(ID: "${spaceId}") {group (ID: "${groupId}")
    { id name
      parent { __typename ... on Community {id }},
      parent { __typename ... on Organization {id }},
    },
  }}`,
  };

  return await graphqlRequestAuth(requestParams, TestUser.GLOBAL_ADMIN);
};

export const getGroupParentOrganization = async (
  organizationId: string,
  groupId: string
) => {
  const requestParams = {
    operationName: null,
    variables: {},
    query: `query { organization(ID: "${organizationId}") {group (ID: "${groupId}")
    { id name
      parent { __typename ... on Community {id }},
      parent { __typename ... on Organization {id }},
    },
  }}`,
  };

  return await graphqlRequestAuth(requestParams, TestUser.GLOBAL_ADMIN);
};
