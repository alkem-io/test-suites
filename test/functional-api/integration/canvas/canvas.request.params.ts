import { TestUser } from '@test/utils';
import { graphqlRequestAuth } from '@test/utils/graphql.request';

export const createCanvasOnCallout = async (
  calloutID: string,
  displayName: string,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const requestParams = {
    operationName: null,
    query: `mutation createCanvasOnCallout($input: CreateCanvasOnCalloutInput!) {
      createCanvasOnCallout(canvasData: $input) {
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
        value
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

export const deleteCanvas = async (
  ID: string,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const requestParams = {
    operationName: null,
    query: `mutation deleteCanvas($input: DeleteCanvasInput!) {
      deleteCanvas(canvasData: $input) {
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
