import { TestUser } from '@test/utils/token.helper';
import { graphqlRequestAuth } from '@test/utils/graphql.request';
import { ecoverseId } from '../ecoverse/ecoverse.request.params';


export const createGroupOnOrganisationMutation = async (
  testGroup: string,
  organisationId: string
) => {
  const requestParams = {
    operationName: null,
    query: `mutation createGroupOnOrganisation($groupData: CreateUserGroupInput!) {
      createGroupOnOrganisation(groupData: $groupData) {
        id
        name
      }
    }`,
    variables: {
      groupData: {
        name: testGroup,
        parentID: organisationId,
      },
    },
  };

  return await graphqlRequestAuth(requestParams, TestUser.GLOBAL_ADMIN);
};

export const updateGroupMutation = async (
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
    query: `query{ecoverse(ID: "${await ecoverseId()}") { groups {id name}}}`,
  };

  return await graphqlRequestAuth(requestParams, TestUser.GLOBAL_ADMIN);
};

export const getGroup = async (groupId: string) => {
  const requestParams = {
    operationName: null,
    variables: {},
    query: `query {
      ecoverse(ID: "${await ecoverseId()}") {
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

export const removeUserGroupMutation = async (groupId: string) => {
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
    query: `query { ecoverse(ID: "${await ecoverseId()}") {group (ID: "${groupId}")
    { id name
      parent { __typename ... on Community {id }},
      parent { __typename ... on Organisation {id }},
    },
  }}`,
  };

  return await graphqlRequestAuth(requestParams, TestUser.GLOBAL_ADMIN);
};
