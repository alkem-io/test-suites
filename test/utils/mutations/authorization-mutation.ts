import { agentData } from '../common-params';
import { graphqlRequestAuth, mutation } from '../graphql.request';
import { TestUser } from '../token.helper';
import { getGraphqlClient } from '../graphqlClient';
import { graphqlErrorWrapper } from '../graphql.wrapper';

export const grantCredentialToUser = `
mutation grantCredentialToUser($grantCredentialData: GrantAuthorizationCredentialInput!) {
    grantCredentialToUser(grantCredentialData: $grantCredentialData) {
      email,
      id,
      agent {
        ${agentData}
      }
    }
  }`;

export const grantCredentialToUserVariablesData = (
  userID: string,
  type: string,
  resourceID?: string
) => {
  const variables = {
    grantCredentialData: {
      userID,
      type,
      resourceID,
    },
  };
  const responseData = JSON.stringify(variables);
  return responseData;
};

export const revokeCredentialFromUser = `
mutation revokeCredentialFromUser($revokeCredentialData: RevokeAuthorizationCredentialInput!) {
    revokeCredentialFromUser(revokeCredentialData: $revokeCredentialData) {
      email,
      id,
      agent {
        ${agentData}
      }
    }
  }`;

export const revokeCredentialFromUserVariablesData = (
  userID: string,
  type: string,
  resourceID?: string
) => {
  const variables = {
    revokeCredentialData: {
      userID,
      type,
      resourceID,
    },
  };
  const responseData = JSON.stringify(variables);
  return responseData;
};

export const grantCredentialsMutation = async (
  userID: string,
  type: string,
  resourceID?: string
) => {
  return await mutation(
    grantCredentialToUser,
    await grantCredentialToUserVariablesData(userID, type, resourceID)
  );
};

export const revokeCredentialsMutation = async (
  userID: string,
  type: string,
  resourceID?: string
) => {
  return await mutation(
    revokeCredentialFromUser,
    await revokeCredentialFromUserVariablesData(userID, type, resourceID)
  );
};

export const userAsOrganizationOwnerVariablesData = (
  userID: string,
  organizationID: string
) => {
  const variables = {
    membershipData: {
      userID,
      organizationID,
    },
  };
  const responseData = JSON.stringify(variables);
  return responseData;
};

export const assignUserAsOrganizationOwner = `
mutation assignUserAsOrganizationOwner(
  $membershipData: AssignOrganizationOwnerInput!
) {
  assignUserAsOrganizationOwner(membershipData: $membershipData) {
    id
    email
    agent {
      ${agentData}
    }
  }
}`;

export const assignUserAsOrganizationAdmin = `
mutation assignUserAsOrganizationAdmin(
  $membershipData: AssignOrganizationAdminInput!
  ) {
    assignUserAsOrganizationAdmin(membershipData: $membershipData) {
    id
    email
    agent {
      ${agentData}
    }
  }
}`;

export const removeUserAsOrganizationOwner = `
mutation removeUserAsOrganizationOwner(
  $membershipData: RemoveOrganizationOwnerInput!
) {
  removeUserAsOrganizationOwner(membershipData: $membershipData) {
    id
    email
    agent {
      ${agentData}
    }
  }
}`;

export const assignUserAsOpportunityAdmin = `
mutation assignUserAsOpportunityAdmin($roleData: AssignCommunityRoleToUserInput!) {
  assignCommunityRoleToUser(roleData: $roleData) {
    id
    email
    agent {
      ${agentData}
    }
  }
}`;

export const removeUserAsOpportunityAdmin = `
mutation removeUserAsOpportunityAdmin($roleData: RemoveCommunityRoleFromUserInput!) {
  removeCommunityRoleFromUser(roleData: $roleData) {
    id
    email
    agent {
      ${agentData}
    }
  }
}`;

export const userAsOpportunityAdminVariablesData = (
  userID: string,
  opportunityID: string
) => {
  const variables = {
    membershipData: {
      userID,
      opportunityID,
    },
  };
  const responseData = JSON.stringify(variables);
  return responseData;
};

export const assignChallengeAdmin = `
mutation assignUserAsChallengeAdmin($roleData: AssignCommunityRoleToUserInput!) {
  assignCommunityRoleToUser(roleData: $roleData) {
    id
    email
    agent {
      ${agentData}
    }
  }
}`;

export const removeUserAsChallengeAdmin = `
mutation removeUserAsChallengeAdmin($roleData: RemoveCommunityRoleFromUserInput!) {
  removeCommunityRoleFromUser(roleData: $roleData) {
    id
    email
    agent {
      ${agentData}
    }
  }
}`;

export const userAsChallengeAdminVariablesData = (
  userID: string,
  challengeID: string
) => {
  const variables = {
    membershipData: {
      userID,
      challengeID,
    },
  };
  const responseData = JSON.stringify(variables);
  return responseData;
};

export const assignSpaceAdmin = `
mutation assignUserAsSpaceAdmin($roleData: AssignCommunityRoleToUserInput!) {
  assignCommunityRoleToUser(roleData: $roleData) {
    id
    email
    agent {
      ${agentData}
    }
  }
}`;

export const removeUserAsSpaceAdmin = `
mutation removeUserAsSpaceAdmin($roleData: RemoveCommunityRoleFromUserInput!) {
  removeCommunityRoleFromUser(roleData: $roleData) {
    id
    email
    agent {
      ${agentData}
    }
  }
}`;

export const userAsSpaceAdminVariablesData = (
  userID: string,
  spaceID: string
) => {
  const variables = {
    membershipData: {
      userID,
      spaceID,
    },
  };
  const responseData = JSON.stringify(variables);
  return responseData;
};

export const setSpaceVisibility = `
mutation UpdateSpace($spaceData: UpdateSpaceInput!) {
  updateSpace(spaceData: $spaceData) {
    id
    authorization {
      anonymousReadAccess
    }
    community {
      authorization {
        anonymousReadAccess
      }
    }
    context {
      authorization {
        anonymousReadAccess
      }
    }
  }
}`;

export const setSpaceVisibilityVariableData = (ID: string, state: boolean) => {
  const variables = {
    spaceData: {
      ID,
      authorizationPolicy: {
        anonymousReadAccess: state,
      },
    },
  };
  const responseData = JSON.stringify(variables);
  return responseData;
};

export const assignUserAsGlobalSpacesAdmin = async (
  userID: string,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const requestParams = {
    operationName: null,
    query: `mutation assignUserAsGlobalSpacesAdmin($input: AssignGlobalSpacesAdminInput!) {
      assignUserAsGlobalSpacesAdmin(membershipData: $input) {
        id
        email
      }
    }`,
    variables: {
      input: {
        userID,
      },
    },
  };

  return await graphqlRequestAuth(requestParams, userRole);
};

export const removeUserAsGlobalSpacesAdmin = async (
  userID: string,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const requestParams = {
    operationName: null,
    query: `mutation removeUserAsGlobalSpacesAdmin($input: RemoveGlobalSpacesAdminInput!) {
      removeUserAsGlobalSpacesAdmin(membershipData: $input) {
        id
        email
      }
    }`,
    variables: {
      input: {
        userID,
      },
    },
  };

  return await graphqlRequestAuth(requestParams, userRole);
};

export const assignUserAsGlobalCommunityAdmin = async (
  userID: string,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string) =>
    graphqlClient.assignUserAsGlobalCommunityAdmin(
      {
        input: { userID },
      },
      {
        authorization: `Bearer ${authToken}`,
      }
    );

  return graphqlErrorWrapper(callback, userRole);
};

export const removeUserAsGlobalCommunityAdmin = async (
  userID: string,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string) =>
    graphqlClient.removeUserAsGlobalCommunityAdmin(
      {
        input: { userID },
      },
      {
        authorization: `Bearer ${authToken}`,
      }
    );

  return graphqlErrorWrapper(callback, userRole);
};

export const assignUserAsGlobalAdmin = async (
  userID: string,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string) =>
    graphqlClient.assignUserAsGlobalAdmin(
      {
        input: { userID },
      },
      {
        authorization: `Bearer ${authToken}`,
      }
    );

  return graphqlErrorWrapper(callback, userRole);
};

export const removeUserAsGlobalAdmin = async (
  userID: string,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string) =>
    graphqlClient.removeUserAsGlobalAdmin(
      {
        input: { userID },
      },
      {
        authorization: `Bearer ${authToken}`,
      }
    );

  return graphqlErrorWrapper(callback, userRole);
};

export const authorizationPolicyResetOnPlatform = async (
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const requestParams = {
    operationName: null,
    query: `mutation authorizationPolicyResetOnPlatform {
      authorizationPolicyResetOnPlatform {
        id
      }
    }`,
    variables: null,
  };

  return await graphqlRequestAuth(requestParams, userRole);
};
