import { TestUser } from '@test/utils';
import { setAuthHeader } from '@test/utils/graphql.authorization.header';
import { graphqlErrorWrapper } from '@test/utils/graphql.wrapper';
import { getGraphqlClient } from '@test/utils/graphqlClient';

export const calloutStorageConfigCodegen = async (
  calloutId: string,
  userRole?: TestUser
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.CalloutStorageConfig(
      {
        calloutId,
      },

      setAuthHeader(authToken)
    );

  return graphqlErrorWrapper(callback, userRole);
};

export const calloutPostCardStorageConfigCodegen = async (
  postId: string,
  calloutId: string,
  userRole?: TestUser
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.CalloutPostStorageConfig(
      {
        postId,
        calloutId,
      },

      setAuthHeader(authToken)
    );

  return graphqlErrorWrapper(callback, userRole);
};
export const calloutLinkContributionStorageConfigCodegen = async (
  linkId: string,
  calloutId: string,
  userRole?: TestUser
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.CalloutLinkContributionStorageConfig(
      {
        linkId,
        calloutId,
      },

      setAuthHeader(authToken)
    );

  return graphqlErrorWrapper(callback, userRole);
};

export const calloutWhiteboardStorageConfigCodegen = async (
  whiteboardId: string,
  calloutId: string,
  //spaceNameId: string,
  userRole?: TestUser
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.CalloutWhiateboardStorageConfig(
      {
        whiteboardId,
        calloutId,
      },

      setAuthHeader(authToken)
    );

  return graphqlErrorWrapper(callback, userRole);
};

export const whiteboardCalloutStorageConfigCodegen = async (
  calloutId: string,
  userRole?: TestUser
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.WhiteboardCalloutStorageConfig(
      {
        calloutId,
      },
      setAuthHeader(authToken)
    );

  return graphqlErrorWrapper(callback, userRole);
};
