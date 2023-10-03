import { TestUser } from '@test/utils';
import { graphqlRequestAuth } from '@test/utils/graphql.request';

export const createWhiteboardOnCallout = async (
  calloutID: string,
  displayName: string,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const requestParams = {
    operationName: null,
    query: `mutation createWhiteboardOnCallout($input: CreateWhiteboardOnCalloutInput!) {
      createWhiteboardOnCallout(whiteboardData: $input) {
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
    }`,
    variables: {
      input: {
        calloutID,
        profileData: {
          displayName,
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
