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
        displayName
        nameID
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
        displayName,
      },
    },
  };

  return await graphqlRequestAuth(requestParams, userRole);
};
