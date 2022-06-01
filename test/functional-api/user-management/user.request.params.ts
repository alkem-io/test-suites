import { registerInKratosOrFail } from '@test/utils/kratos/register-in-kratos-or-fail';
import { verifyInKratosOrFail } from '@test/utils/kratos/verify-in-kratos-or-fail';
import { registerInAlkemioOrFail } from '@test/utils/register-in-alkemio-or-fail';
import { membersData, userData } from '../../utils/common-params';
import { graphqlRequestAuth } from '../../utils/graphql.request';
import { TestUser } from '../../utils/token.helper';

const uniqueId = Math.random()
  .toString(12)
  .slice(-6);

export const registerVerifiedUser = async (
  email: string,
  firstName: string,
  lastName: string
) => {
  await registerInKratosOrFail(firstName, lastName, email);
  await verifyInKratosOrFail(email);
  await registerInAlkemioOrFail(firstName, lastName, email);
};

export const createUser = async (userName: string) => {
  const requestParams = {
    operationName: 'CreateUser',
    query: `mutation CreateUser($userData: CreateUserInput!) {createUser(userData: $userData) { ${userData} }}`,
    variables: {
      userData: {
        firstName: `fn${uniqueId}`,
        lastName: `ln${uniqueId}`,
        displayName: userName,
        nameID: userName,
        email: `${userName}@test.com`,
        profileData: {
          description: 'x',
          tagsetsData: { tags: ['x1', 'x2'], name: 'x' },
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

export const createUserInit = async (
  firstName: string,
  lastName: string,
  email: string
) => {
  const requestParams = {
    operationName: 'CreateUser',
    query: `mutation CreateUser($userData: CreateUserInput!) {createUser(userData: $userData) { ${userData}  }}`,
    variables: {
      userData: {
        firstName,
        lastName,
        email,
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
        displayName: userName,
        nameID: userName,
        email: `${userEmail}`,
        profileData: {
          description: 'x',
          tagsetsData: { tags: ['x1', 'x2'], name: 'x' },
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
        displayName: userName,
        nameID: userName,
        firstName: firstName,
        lastName: lastName,
        email: email,
        phone: phone,
        gender: 'testGender',
      },
    },
  };

  return await graphqlRequestAuth(requestParams, TestUser.GLOBAL_ADMIN);
};

export const updateUser = async (
  updateUserId: string,
  nameUser: string,
  phoneUser: string,
  profileData?: {
    ID: string;
    location?: { country?: string; city?: string };
    description?: string;
  }
) => {
  const requestParams = {
    operationName: null,
    query: `mutation updateUser($userData: UpdateUserInput!) {
      updateUser(userData: $userData) {
          ${userData}
        }
      }`,
    variables: {
      userData: {
        ID: updateUserId,
        displayName: nameUser,
        phone: phoneUser,
        profileData,
      },
    },
  };

  return await graphqlRequestAuth(requestParams, TestUser.GLOBAL_ADMIN);
};

export const removeUser = async (removeUserID: string) => {
  const requestParams = {
    operationName: null,
    query: `mutation deleteUser($deleteData: DeleteUserInput!) {
      deleteUser(deleteData: $deleteData) {
          id
          nameID
        }}`,
    variables: {
      deleteData: {
        ID: removeUserID,
      },
    },
  };

  return await graphqlRequestAuth(requestParams, TestUser.GLOBAL_ADMIN);
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

export const getUsers = async () => {
  const requestParams = {
    operationName: null,
    variables: {},
    query: `query{users {${userData}}}`,
  };

  return await graphqlRequestAuth(requestParams, TestUser.GLOBAL_ADMIN);
};

export const getUser = async (nameId: string) => {
  const requestParams = {
    operationName: null,
    variables: {},
    query: `query{user(ID: "${nameId}") {${userData}}}`,
  };

  return await graphqlRequestAuth(requestParams, TestUser.GLOBAL_ADMIN);
};

export const getUsersFromChallengeCommunity = async (
  hubId: string,
  communityGroupId: string
) => {
  const requestParams = {
    operationName: null,
    variables: {},
    query: `query {
      hub(ID: "${hubId}" ) {
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

export const updateProfile = async (profileId: string, descritpion: string) => {
  const requestParams = {
    operationName: null,
    query: `mutation updateProfile($profileData: UpdateProfileInput!) {
      updateProfile(profileData: $profileData){id}}`,
    variables: {
      profileData: {
        ID: profileId,
        description: descritpion,
      },
    },
  };

  return await graphqlRequestAuth(requestParams, TestUser.GLOBAL_ADMIN);
};

export const getUsersProfile = async (userId: string) => {
  const requestParams = {
    operationName: null,
    variables: {},
    query: `query {
      user(ID: "${userId}") {
        ${userData}
      }
    }`,
  };

  return await graphqlRequestAuth(requestParams, TestUser.GLOBAL_ADMIN);
};

export const getUpdatedUserData = async (userId: string) => {
  const requestParams = {
    operationName: null,
    variables: {},
    query: `query {
      user(ID: "${userId}") {
        ${userData}
      }
    }`,
  };

  return await graphqlRequestAuth(requestParams, TestUser.GLOBAL_ADMIN);
};
