import { CalloutVisibility } from '@alkemio/client-lib';
import { TestUser } from '@test/utils';
import { graphqlRequestAuth } from '@test/utils/graphql.request';
import { graphqlErrorWrapper } from '@test/utils/graphql.wrapper';
import { getGraphqlClient } from '@test/utils/graphqlClient';

export const createWhiteboardOnCallout = async (
  calloutID: string,
  displayName: string,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const requestParams = {
    operationName: null,
    query: `mutation createWhiteboardOnCallout($contributionData: CreateContributionOnCalloutInput!) {
      createContributionOnCallout(contributionData: $contributionData) {
        whiteboard {
          id
          createdBy {id}
          nameID
          profile {displayName}
          checkout {
            lifecycle {
              nextEvents
              state
              stateIsFinal
              templateName
            }
          }
          content
        }
      }
    }`,
    variables: {
      contributionData: {
        calloutID,
        whiteboard: {
          profileData: {
            displayName,
          },
        },
      },
    },
  };

  return await graphqlRequestAuth(requestParams, userRole);
};

export const deleteWhiteboard = async (
  ID: string,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const requestParams = {
    operationName: null,
    query: `mutation deleteWhiteboard($input: DeleteWhiteboardInput!) {
      deleteWhiteboard(whiteboardData: $input) {
        id
      }
    }`,
    variables: {
      input: {
        ID,
      },
    },
  };

  return await graphqlRequestAuth(requestParams, userRole);
};

export const deleteWhiteboardCodegen = async (
  ID: string,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.DeleteWhiteboard(
      {
        input: {
          ID,
        },
      },
      {
        authorization: `Bearer ${authToken}`,
      }
    );

  return graphqlErrorWrapper(callback, userRole);
};
