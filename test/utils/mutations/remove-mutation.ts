import { communityData } from '../common-params';
import { graphqlRequestAuth } from '../graphql.request';
import { TestUser } from '../token.helper';

export const removeUserFromCommunity = `
mutation removeUserFromCommunity($membershipData: RemoveCommunityMemberInput!) {
  removeUserFromCommunity(membershipData: $membershipData) {
      ${communityData}
    }
  }`;

export const removeUserAsCommunityMemberFunc = async (
  communityID: string,
  userID: string
) => {
  const requestParams = {
    operationName: null,
    query: `mutation removeUserAsCommunityMember($membershipData: RemoveCommunityMemberUserInput!) {
      removeUserAsCommunityMember(membershipData: $membershipData) {
        id,
        memberUsers {
          id,
          nameID
        }
      }
    }`,
    variables: {
      membershipData: {
        communityID,
        userID,
      },
    },
  };

  return await graphqlRequestAuth(requestParams, TestUser.GLOBAL_ADMIN);
};

export const removeUserAsCommunityLeadFunc = async (
  communityID: string,
  userID: string
) => {
  const requestParams = {
    operationName: null,
    query: `mutation removeUserAsCommunityLead($leadershipData: RemoveCommunityLeadUserInput!) {
      removeUserAsCommunityLead(leadershipData: $leadershipData) {
        id,
        leadUsers {
          id,
          nameID
        }
      }
    }`,
    variables: {
      leadershipData: {
        communityID,
        userID,
      },
    },
  };

  return await graphqlRequestAuth(requestParams, TestUser.GLOBAL_ADMIN);
};

export const removeOrganizationAsCommunityMemberFunc = async (
  communityID: string,
  organizationID: string
) => {
  const requestParams = {
    operationName: null,
    query: `mutation removeOrganizationAsCommunityMember($membershipData: RemoveCommunityMemberOrganizationInput!) {
      removeOrganizationAsCommunityMember(membershipData: $membershipData) {
        id,
        memberOrganizations {
          id,
          nameID
        }
      }
    }`,
    variables: {
      membershipData: {
        communityID,
        organizationID,
      },
    },
  };

  return await graphqlRequestAuth(requestParams, TestUser.GLOBAL_ADMIN);
};

export const removeOrganizationAsCommunityLeadFunc = async (
  communityID: string,
  organizationID: string
) => {
  const requestParams = {
    operationName: null,
    query: `mutation removeOrganizationAsCommunityLead($leadershipData: RemoveCommunityLeadOrganizationInput!) {
      removeOrganizationAsCommunityLead(leadershipData: $leadershipData) {
        id,
        leadOrganizations {
          id,
          nameID
        }
      }
    }`,
    variables: {
      leadershipData: {
        communityID,
        organizationID,
      },
    },
  };

  return await graphqlRequestAuth(requestParams, TestUser.GLOBAL_ADMIN);
};

export const removeUserAsCommunityMember = `
mutation removeUserAsCommunityMember($membershipData: RemoveCommunityMemberUserInput!) {
  removeUserAsCommunityMember(membershipData: $membershipData) {
    id,
    memberUsers {
      id,
      nameID
    }
  }
}`;

export const removeUserMemberFromCommunityVariablesData = (
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

export const removeUserAsCommunityLead = `
mutation removeUserAsCommunityLead($leadershipData: RemoveCommunityLeadUserInput!) {
  removeUserAsCommunityLead(leadershipData: $leadershipData) {
    id,
    leadUsers {
      id,
      nameID
    }
  }
}`;

export const removeUserLeadFromCommunityVariablesData = (
  communityID: string,
  userID: string
) => {
  const variables = {
    leadershipData: {
      communityID,
      userID,
    },
  };
  const responseData = JSON.stringify(variables);
  return responseData;
};

export const removeOrganizationAsCommunityMember = `
mutation removeOrganizationAsCommunityMember($membershipData: RemoveCommunityMemberOrganizationInput!) {
  removeOrganizationAsCommunityMember(membershipData: $membershipData) {
    id,
    memberOrganizations {
      id,
      nameID
    }
  }
}`;

export const removeOrganizationMemberFromCommunityVariablesData = (
  communityID: string,
  organizationID: string
) => {
  const variables = {
    membershipData: {
      communityID,
      organizationID,
    },
  };
  const responseData = JSON.stringify(variables);
  return responseData;
};

export const removeOrganizationAsCommunityLead = `
mutation removeOrganizationAsCommunityLead($leadershipData: RemoveCommunityLeadOrganizationInput!) {
  removeOrganizationAsCommunityLead(leadershipData: $leadershipData) {
    id,
    leadOrganizations {
      id,
      nameID
    }
  }
}`;

export const removeOrganizationLeadFromCommunityVariablesData = (
  communityID: string,
  organizationID: string
) => {
  const variables = {
    leadershipData: {
      communityID,
      organizationID,
    },
  };
  const responseData = JSON.stringify(variables);
  return responseData;
};

export const removeUserFromGroup = `
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

export const removeUpdateCommunity = `
mutation removeUpdateCommunity($msgData: UpdatesRemoveMessageInput!) {
  removeUpdate(messageData: $msgData)
}`;

export const removeUpdateCommunityVariablesData = (
  updatesID: string,
  messageID: string
) => {
  const variables = {
    msgData: {
      updatesID,
      messageID,
    },
  };
  const responseData = JSON.stringify(variables);
  return responseData;
};
