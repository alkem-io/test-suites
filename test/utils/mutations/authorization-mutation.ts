import { agentData } from '../common-params';
import { mutation } from '../graphql.request';

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

export const executeOrganizationAuthorization = async (
  mut: string,
  variable: any
) => {
  return await mutation(mut, variable);
};
