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

export const userAsOrganisationOwnerVariablesData = (
  userID: string,
  organisationID: string
) => {
  const variables = {
    membershipData: {
      userID,
      organisationID,
    },
  };
  const responseData = JSON.stringify(variables);
  return responseData;
};

export const assignUserAsOrganisationOwnerMut = `
mutation assignUserAsOrganisationOwner(
  $membershipData: AssignOrganisationOwnerInput!
) {
  assignUserAsOrganisationOwner(membershipData: $membershipData) {
    id
    displayName
    agent {
      ${agentData}
    }
  }
}`;

export const assignUserAsOrganisationOwnerMutation = async (
  userID: string,
  organisationID: string
) => {
  return await mutation(
    assignUserAsOrganisationOwnerMut,
    await userAsOrganisationOwnerVariablesData(userID, organisationID)
  );
};

export const removeUserAsOrganisationOwnerMut = `
mutation removeUserAsOrganisationOwner(
  $membershipData: RemoveOrganisationOwnerInput!
) {
  removeUserAsOrganisationOwner(membershipData: $membershipData) {
    id
    displayName
    agent {
      ${agentData}
    }
  }
}`;

export const executeOrganisationAuthorization = async (
  mut: string,
  variable: any
) => {
  return await mutation(mut, variable);
};
