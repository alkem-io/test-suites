import { TestUser } from '@test/utils';
import { calloutData } from '@test/utils/common-params';
import { graphqlRequestAuth } from '@test/utils/graphql.request';
import { CalloutState, CalloutType, CalloutVisibility } from './callouts-enum';

export const createCalloutOnCollaboration = async (
  collaborationID: string,
  displayName: string,
  nameID: string,
  description = 'callout description',
  state: CalloutState = CalloutState.OPEN,
  type: CalloutType = CalloutType.CARD,
  visibility: CalloutVisibility = CalloutVisibility.DRAFT,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const requestParams = {
    operationName: null,
    query: `mutation createCalloutOnCollaboration($calloutData: CreateCalloutOnCollaborationInput!) {
      createCalloutOnCollaboration(calloutData: $calloutData) {
        ${calloutData}
      }
    }`,
    variables: {
      calloutData: {
        collaborationID,
        displayName,
        nameID,
        description,
        state,
        type,
        visibility,
      },
    },
  };

  return await graphqlRequestAuth(requestParams, userRole);
};

export const getCalloutPerEntity = async (
  hubId?: string,
  challengeId?: string,
  opportunityId?: string
) => {
  const requestParams = {
    operationName: null,
    query: `query {
      hub(ID: "${hubId}") {
        collaboration {callouts {
            ${calloutData}
          }
        }
        challenge(ID: "${challengeId}") {
          id
          nameID
          collaboration {callouts{
              ${calloutData}
            }
          }
        }
        opportunity(ID: "${opportunityId}") {
          id
          nameID
          collaboration {callouts {
              ${calloutData}
            }
          }
        }
      }
    }
    `,
  };

  return await graphqlRequestAuth(requestParams, TestUser.GLOBAL_ADMIN);
};

export const calloutDataPerCollaboration = async (
  hubId: string,
  challengeId?: string,
  opportunityId?: string
) => {
  const responseQuery = await getCalloutPerEntity(
    hubId,
    challengeId,
    opportunityId
  );
  const hubCallout = responseQuery.body.data.hub.collaboration.callouts;
  const challengeCallout =
    responseQuery.body.data.hub.challenge.collaboration.callouts;
  const opportunityCallout =
    responseQuery.body.data.hub.opportunity.collaboration.callouts;

  return { hubCallout, challengeCallout, opportunityCallout };
};
