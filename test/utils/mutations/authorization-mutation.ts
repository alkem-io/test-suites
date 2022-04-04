import { agentData } from '../common-params';
import { mutation } from '../graphql.request';
import { TestUser } from '../token.helper';

export const grantCredentialToUser = `
mutation grantCredentialToUser($grantCredentialData: GrantAuthorizationCredentialInput!) {
    grantCredentialToUser(grantCredentialData: $grantCredentialData) {
      displayName,
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
      displayName,
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
    displayName
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
    displayName
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
    displayName
    agent {
      ${agentData}
    }
  }
}`;

export const assignUserAsOpportunityAdmin = `
mutation assignUserAsOpportunityAdmin($membershipData: AssignOpportunityAdminInput!) {
  assignUserAsOpportunityAdmin(membershipData: $membershipData) {
    id
    displayName
    agent {
      ${agentData}
    }
  }
}`;

export const removeUserAsOpportunity = `
mutation removeUserAsOpportunityAdmin($membershipData: RemoveOpportunityAdminInput!) {
  removeUserAsOpportunityAdmin(membershipData: $membershipData) {
    id
    displayName
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
mutation assignUserAsChallengeAdmin($membershipData: AssignChallengeAdminInput!) {
  assignUserAsChallengeAdmin(membershipData: $membershipData) {
    id
    displayName
    agent {
      ${agentData}
    }
  }
}`;

export const removeUserAsChallengeAdmin = `
mutation removeUserAsChallengeAdmin($membershipData: RemoveChallengeAdminInput!) {
  removeUserAsChallengeAdmin(membershipData: $membershipData) {
    id
    displayName
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

export const assignHubAdmin = `
mutation assignUserAsHubAdmin($membershipData: AssignHubAdminInput!) {
  assignUserAsHubAdmin(membershipData: $membershipData) {
    id
    displayName
    agent {
      ${agentData}
    }
  }
}`;

export const removeUserAsHubAdmin = `
mutation removeUserAsHubAdmin($membershipData: RemoveHubAdminInput!) {
  removeUserAsHubAdmin(membershipData: $membershipData) {
    id
    displayName
    agent {
      ${agentData}
    }
  }
}`;

export const userAsHubAdminVariablesData = (userID: string, hubID: string) => {
  const variables = {
    membershipData: {
      userID,
      hubID,
    },
  };
  const responseData = JSON.stringify(variables);
  return responseData;
};

export const setHubVisibility = `
mutation UpdateHub($hubData: UpdateHubInput!) {
  updateHub(hubData: $hubData) {
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

export const setHubVisibilityVariableData = (ID: string, state: boolean) => {
  const variables = {
    hubData: {
      ID,
      authorizationPolicy: {
        anonymousReadAccess: state,
      },
    },
  };
  const responseData = JSON.stringify(variables);
  return responseData;
};
