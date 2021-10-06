import { agentData } from '../common-params';
import { mutation } from '../graphql.request';
import { TestUser } from '../token.helper';

export const grantCredentialToUserMut = `
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

export const revokeCredentialFromUserMut = `
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
    grantCredentialToUserMut,
    await grantCredentialToUserVariablesData(userID, type, resourceID)
  );
};

export const revokeCredentialsMutation = async (
  userID: string,
  type: string,
  resourceID?: string
) => {
  return await mutation(
    revokeCredentialFromUserMut,
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

export const assignUserAsOrganizationOwnerMut = `
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

export const assignUserAsOrganizationOwnerMutation = async (
  userID: string,
  organizationID: string
) => {
  return await mutation(
    assignUserAsOrganizationOwnerMut,
    await userAsOrganizationOwnerVariablesData(userID, organizationID)
  );
};

export const removeUserAsOrganizationOwnerMut = `
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

export const assignUserAsOpportunityAdminMut = `
mutation assignUserAsOpportunityAdmin($membershipData: AssignOpportunityAdminInput!) {
  assignUserAsOpportunityAdmin(membershipData: $membershipData) {
    id
    displayName
    agent {
      ${agentData}
    }
  }
}`;

export const removeUserAsOpportunityMut = `
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

export const assignChallengeAdminMut = `
mutation assignUserAsChallengeAdmin($membershipData: AssignChallengeAdminInput!) {
  assignUserAsChallengeAdmin(membershipData: $membershipData) {
    id
    displayName
    agent {
      ${agentData}
    }
  }
}`;

export const removeUserAsChallengeAdminMut = `
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

export const assignEcoverseAdminMut = `
mutation assignUserAsEcoverseAdmin($membershipData: AssignEcoverseAdminInput!) {
  assignUserAsEcoverseAdmin(membershipData: $membershipData) {
    id
    displayName
    agent {
      ${agentData}
    }
  }
}`;

export const removeUserAsEcoverseAdminMut = `
mutation removeUserAsEcoverseAdmin($membershipData: RemoveEcoverseAdminInput!) {
  removeUserAsEcoverseAdmin(membershipData: $membershipData) {
    id
    displayName
    agent {
      ${agentData}
    }
  }
}`;

export const userAsEcoverseAdminVariablesData = (
  userID: string,
  ecoverseID: string
) => {
  const variables = {
    membershipData: {
      userID,
      ecoverseID,
    },
  };
  const responseData = JSON.stringify(variables);
  return responseData;
};



// Execute function
export const executeAuthorization = async (
  mut: string,
  variable: any,
  role: TestUser = TestUser.GLOBAL_ADMIN
) => {
  return await mutation(mut, variable, role);
};
