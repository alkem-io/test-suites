import { communityData } from '../common-params';
import { mutation } from '../graphql.request';
import { TestUser } from '../token.helper';

export const removeUserFromCommunityMut = `
mutation removeUserFromCommunity($membershipData: RemoveCommunityMemberInput!) {
  removeUserFromCommunity(membershipData: $membershipData) {
      ${communityData}
    }
  }`;

export const removeUserFromCommunityVariablesData = (
  communityID: string,
  userID: string
) => {
  const variables = {
    membershipData: {
      communityID,
      userID,
    },
  };
  const responseData = JSON.stringify(variables);
  return responseData;
};

export const removeUserFromGroupMut = `
mutation removeUserFromGroup($membershipData: RemoveUserGroupMemberInput!) {
  removeUserFromGroup(membershipData: $membershipData) {
    name,
    id,
    members {
      id,
      nameID
    }
  }
}`;

export const removeUserFromGroupVariablesData = (
  groupID: string,
  userID: string
) => {
  const variables = {
    membershipData: {
      groupID,
      userID,
    },
  };
  const responseData = JSON.stringify(variables);
  return responseData;
};

// Execute function
/**
 * Removes user from an entity
 * @param mut name of remove mutation
 * @param variable name of function containing mutation vriables
 * @param role role type
 */
export const removeUserFromEntity = async (
  mut: string,
  variable: any,
  role: TestUser = TestUser.GLOBAL_ADMIN
) => {
  return await mutation(mut, variable, role);
};
