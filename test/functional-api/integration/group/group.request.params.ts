import { TestUser } from '@test/utils/token.helper';
import { graphqlRequestAuth } from '@test/utils/graphql.request';
import { hubId } from '../hub/hub.request.params';

export const createGroupOnOrganization = async (
  testGroup: string,
  organizationId: string
) => {
  const requestParams = {
    operationName: null,
    query: `mutation createGroupOnOrganization($groupData: CreateUserGroupInput!) {
      createGroupOnOrganization(groupData: $groupData) {
        id
        name
      }
    }`,
    variables: {
      groupData: {
        name: testGroup,
        parentID: organizationId,
      },
    },
  };

  return await graphqlRequestAuth(requestParams, TestUser.GLOBAL_ADMIN);
};

export const updateGroup = async (
  groupId: string,
  nameGroup: string,
  profileId?: string,
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
          ID: `${profileId}`,
          description: descriptionText,
          avatar: avatarUrl,
        },
      },
    },
  };

  return await graphqlRequestAuth(requestParams, TestUser.GLOBAL_ADMIN);
};

export const getGroups = async () => {
  const requestParams = {
    operationName: null,
    variables: {},
    query: `query{hub(ID: "${await hubId()}") { groups {id name}}}`,
  };

  return await graphqlRequestAuth(requestParams, TestUser.GLOBAL_ADMIN);
};

export const getGroup = async (groupId: string) => {
  const requestParams = {
    operationName: null,
    variables: {},
    query: `query {
      hub(ID: "${await hubId()}") {
      group(ID: "${groupId}") {
        id
        name
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

export const getGroupParent = async (groupId: string) => {
  const requestParams = {
    operationName: null,
    variables: {},
    query: `query { hub(ID: "${await hubId()}") {group (ID: "${groupId}")
    { id name
      parent { __typename ... on Community {id }},
      parent { __typename ... on Organization {id }},
    },
  }}`,
  };

  return await graphqlRequestAuth(requestParams, TestUser.GLOBAL_ADMIN);
};
