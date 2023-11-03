import { registerInKratosOrFail } from '@test/utils/kratos/register-in-kratos-or-fail';
import { verifyInKratosOrFail } from '@test/utils/kratos/verify-in-kratos-or-fail';
import { registerInAlkemioOrFail } from '@test/utils/register-in-alkemio-or-fail';
import { membersData, userData } from '../../utils/common-params';
import { graphqlRequestAuth } from '../../utils/graphql.request';
import { TestUser } from '../../utils/token.helper';
import { getGraphqlClient } from '@test/utils/graphqlClient';
import { graphqlErrorWrapper } from '@test/utils/graphql.wrapper';

export const uniqueId = Math.random()
  .toString(12)
  .slice(-6);

export const registerVerifiedUser = async (
  email: string,
  firstName: string,
  lastName: string
) => {
  await registerInKratosOrFail(firstName, lastName, email);
  await verifyInKratosOrFail(email);
  const userId = await registerInAlkemioOrFail(firstName, lastName, email);
  return userId;
};

export const getDefaultUserData = () => {
  const uniqueId = Math.random()
    .toString(12)
    .slice(-6);
  return {
    firstName: `fn${uniqueId}`,
    lastName: `ln${uniqueId}`,
    nameID: `user-nameid-${uniqueId}`,
    email: `user-email-${uniqueId}@alkem.io`,
    profileData: {
      displayName: `FNLN${uniqueId}`,
      description: 'User description',
    },
  };
};

export const defaultUserData = {
  firstName: `fn${uniqueId}`,
  lastName: `ln${uniqueId}`,
  nameID: `user-nameid-${uniqueId}`,
  email: `user-email-${uniqueId}@alkem.io`,
  phone: '003597111111',
  profileData: {
    displayName: `FNLN${uniqueId}`,
    description: 'User description',
  },
};

export const createUserCodegen = async (
  options?: {
    firstName?: string;
    lastName?: string;
    nameID?: string;
    email?: string;
    phone?: string;
    profileData?: {
      displayName: string;
      description?: string;
    };
  },
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string) =>
    graphqlClient.CreateUser(
      {
        userData: {
          ...getDefaultUserData(),
          ...options,
        },
      },
      {
        authorization: `Bearer ${authToken}`,
      }
    );
  return graphqlErrorWrapper(callback, userRole);
};

export const createUserInitSimple = async (
  firstName: string,
  lastName: string,
  email: string
) => {
  const requestParams = {
    operationName: 'CreateUser',
    query: `mutation CreateUser($userData: CreateUserInput!) {createUser(userData: $userData) { ${userData} }}`,
    variables: {
      userData: {
        firstName,
        lastName,
        nameID: firstName + lastName,
        email,
        profileData: {
          displayName: firstName + lastName,
          description: 'x',
          //tagsetsData: { tags: ['x1', 'x2'], name: 'x' },
          referencesData: {
            name: 'x',
            description: 'x',
            uri: 'https://xRef.com',
          },
        },
      },
    },
  };

  return await graphqlRequestAuth(requestParams, TestUser.GLOBAL_ADMIN);
};

export const createUserWithParams = async (
  userName: string,
  userEmail: string
) => {
  const requestParams = {
    operationName: 'CreateUser',
    query: `mutation CreateUser($userData: CreateUserInput!) {createUser(userData: $userData) { ${userData}  }}`,
    variables: {
      userData: {
        firstName: `fN${uniqueId}`,
        lastName: `lN${uniqueId}`,
        nameID: userName,
        email: `${userEmail}`,
        profileData: {
          displayName: userName,
          description: 'x',
          //tagsetsData: { tags: ['x1', 'x2'], name: 'x' },
          referencesData: {
            name: 'x',
            description: 'x',
            uri: 'https://xRef.com',
          },
        },
      },
    },
  };

  return await graphqlRequestAuth(requestParams, TestUser.GLOBAL_ADMIN);
};

export const createUserDetails = async (
  userName: string,
  firstName: string,
  lastName: string,
  phone: string,
  email: string
) => {
  const requestParams = {
    operationName: 'CreateUser',
    query: `mutation CreateUser($userData: CreateUserInput!) {
        createUser(userData: $userData) {
          ${userData}
          }
        }`,
    variables: {
      userData: {
        nameID: userName,
        firstName: firstName,
        lastName: lastName,
        email: email,
        phone: phone,
        gender: 'testGender',
        profileData: {
          displayName: userName,
        },
      },
    },
  };

  return await graphqlRequestAuth(requestParams, TestUser.GLOBAL_ADMIN);
};

export const updateUserCodegen = async (
  updateUserId: string,
  phoneUser: string,
  profileData?: {
    location?: { country?: string; city?: string };
    description?: string;
  }
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string) =>
    graphqlClient.updateUser(
      {
        userData: {
          ID: updateUserId,
          phone: phoneUser,
          profileData,
        },
      },
      {
        authorization: `Bearer ${authToken}`,
      }
    );

  return graphqlErrorWrapper(callback, TestUser.GLOBAL_ADMIN);
};

export const removeUser = async (removeUserID: string) => {
  const requestParams = {
    operationName: null,
    query: `mutation deleteUser($deleteData: DeleteUserInput!) {
      deleteUser(deleteData: $deleteData) {
          id
        }}`,
    variables: {
      deleteData: {
        ID: removeUserID,
      },
    },
  };

  return await graphqlRequestAuth(requestParams, TestUser.GLOBAL_ADMIN);
};

export const deleteUserCodegen = async (
  userId: string,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string) =>
    graphqlClient.deleteUser(
      {
        deleteData: {
          ID: userId,
        },
      },
      {
        authorization: `Bearer ${authToken}`,
      }
    );

  return graphqlErrorWrapper(callback, userRole);
};

export const addUserToGroup = async (userId: any, groupId: string) => {
  const requestParams = {
    operationName: null,
    query: `mutation assignUserToGroup($membershipData: AssignUserGroupMemberInput!) {
      assignUserToGroup(membershipData: $membershipData){id name}
    }`,
    variables: {
      membershipData: {
        userID: userId,
        groupID: groupId,
      },
    },
  };

  return await graphqlRequestAuth(requestParams, TestUser.GLOBAL_ADMIN);
};

export const removeUserFromGroup = async (userId: any, groupId: string) => {
  const requestParams = {
    operationName: 'removeUserFromGroup',
    query: `mutation removeUserFromGroup($membershipData: RemoveUserGroupMemberInput!) {
      removeUserFromGroup(membershipData: $membershipData) {
        name,
        id,
        members {
          id,
          nameID
        }
      }
    }`,
    variables: {
      membershipData: {
        userID: userId,
        groupID: groupId,
      },
    },
  };

  return await graphqlRequestAuth(requestParams, TestUser.GLOBAL_ADMIN);
};

export const addUserToOrganization = async (
  userId: any,
  organizationId: string
) => {
  const requestParams = {
    operationName: null,
    query: `mutation addUserToOrganization($userID: Float!, $groupID: Float!) {
      addUserToOrganization(groupID: $groupID, userID: $userID)
    }`,
    variables: {
      userID: parseFloat(userId),
      organizationID: parseFloat(organizationId),
    },
  };

  return await graphqlRequestAuth(requestParams, TestUser.GLOBAL_ADMIN);
};

export const getUserMemberships = async () => {
  const requestParams = {
    operationName: null,
    query: `query {
      users {
        nameID
        agent {
          id
          credentials {
            id
            resourceID
            type
          }
        }
      }
    }`,
  };

  return await graphqlRequestAuth(requestParams, TestUser.GLOBAL_ADMIN);
};

export const getUser = async (
  nameId: string,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const requestParams = {
    operationName: null,
    variables: {},
    query: `query{user(ID: "${nameId}") {${userData}}}`,
  };

  return await graphqlRequestAuth(requestParams, userRole);
};

export const getUsersDataCodegen = async (
  userId: string,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string) =>
    graphqlClient.getUsersData(
      {},
      {
        authorization: `Bearer ${authToken}`,
      }
    );
  return graphqlErrorWrapper(callback, userRole);
};

export const getUserDataCodegen = async (
  userId: string,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string) =>
    graphqlClient.getUserData(
      {
        userId,
      },
      {
        authorization: `Bearer ${authToken}`,
      }
    );
  return graphqlErrorWrapper(callback, userRole);
};

export const getUsersFromChallengeCommunity = async (
  spaceId: string,
  communityGroupId: string
) => {
  const requestParams = {
    operationName: null,
    variables: {},
    query: `query {
      space(ID: "${spaceId}" ) {
        group(ID: "${communityGroupId}") {
          name
          id
          members {
            ${membersData}
          }
        }
      }
    }
    `,
  };

  return await graphqlRequestAuth(requestParams, TestUser.GLOBAL_ADMIN);
};

export const getUserPendingMembershipsCodegen = async (
  fetchDetails: boolean,
  spaceId: string,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string) =>
    graphqlClient.PendingMembershipsSpace(
      { fetchDetails, spaceId },
      {
        authorization: `Bearer ${authToken}`,
      }
    );
  return graphqlErrorWrapper(callback, userRole);
};
