export const grantCredentialToUserMut = `
mutation grantCredentialToUser($grantCredentialData: GrantAuthorizationCredentialInput!) {
    grantCredentialToUser(grantCredentialData: $grantCredentialData) {
      displayName,
      id,
      agent {
        credentials {
            id,
            resourceID
            type
        }
      }
    }
  }`;

export const grantCredentialToUserVariablesData = (
  userID: string,
  resourceID: string,
  type: string
) => {
  const variables = {
    grantCredentialData: {
      userID,
      resourceID,
      type,
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
        credentials {
            id,
            resourceID
            type
        }
      }
    }
  }`;

export const revokeCredentialFromUserVariablesData = (
  userID: string,
  resourceID: string,
  type: string
) => {
  const variables = {
    revokeCredentialData: {
      userID,
      resourceID,
      type,
    },
  };
  const responseData = JSON.stringify(variables);
  return responseData;
};
