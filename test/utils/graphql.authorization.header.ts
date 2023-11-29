export const setAuthHeader = (authToken: string | undefined) =>
  authToken
    ? {
        authorization: `Bearer ${authToken}`,
      }
    : undefined;
