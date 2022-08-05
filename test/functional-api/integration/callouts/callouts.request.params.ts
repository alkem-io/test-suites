import { TestUser } from '@test/utils';
import { calloutData } from '@test/utils/common-params';
import { graphqlRequestAuth } from '@test/utils/graphql.request';

export enum CalloutState {
  ARCHIVED = 'ARCHIVED',
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
}

export enum CalloutType {
  CANVAS = 'CANVAS',
  CARD = 'CARD',
  DISCUSSION = 'DISCUSSION',
}

export enum CalloutVisibility {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
}

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
