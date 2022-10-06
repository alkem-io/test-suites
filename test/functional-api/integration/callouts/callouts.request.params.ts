import { TestUser } from '@test/utils';
import { calloutData } from '@test/utils/common-params';
import { graphqlRequestAuth } from '@test/utils/graphql.request';
import { getHubData } from '../hub/hub.request.params';
import { CalloutState, CalloutType, CalloutVisibility } from './callouts-enum';

export const createCalloutOnCollaboration = async (
  collaborationID: string,
  displayName: string,
  nameID: string,
  description = 'callout description',
  state: CalloutState = CalloutState.OPEN,
  type: CalloutType = CalloutType.CARD,
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
      },
    },
  };

  return await graphqlRequestAuth(requestParams, userRole);
};

export const updateCallout = async (
  ID: string,
  displayName: string,
  nameID: string,
  description = 'callout description',
  state: CalloutState = CalloutState.OPEN,
  type: CalloutType = CalloutType.CARD,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const requestParams = {
    operationName: null,
    query: `mutation UpdateCallout($calloutData: UpdateCalloutInput!) {
      updateCallout(calloutData: $calloutData) {
        ${calloutData}
      }
    }`,
    variables: {
      calloutData: {
        ID,
        displayName,
        nameID,
        description,
        state,
        type,
      },
    },
  };

  return await graphqlRequestAuth(requestParams, userRole);
};

export const updateCalloutVisibility = async (
  calloutID: string,
  visibility: CalloutVisibility = CalloutVisibility.DRAFT,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const requestParams = {
    operationName: null,
    query: `mutation UpdateCalloutVisibility($calloutData: UpdateCalloutVisibilityInput!) {
      updateCalloutVisibility(calloutData: $calloutData) {
        ${calloutData}
      }
    }`,
    variables: {
      calloutData: {
        calloutID,
        visibility,
      },
    },
  };

  return await graphqlRequestAuth(requestParams, userRole);
};

export const deleteCallout = async (
  calloutId: string,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const requestParams = {
    operationName: null,
    query: `mutation DeleteCallout($calloutId: UUID!) {
      deleteCallout(deleteData: { ID: $calloutId }) {
        id
      }
    }`,
    variables: {
      calloutId,
    },
  };

  return await graphqlRequestAuth(requestParams, userRole);
};

export const getHubCalloutByNameId = async (hubId: string, nameID: string) => {
  const calloutsPerHub = await getHubData(hubId);
  const allCallouts = calloutsPerHub.body.data.hub.collaboration.callouts;
  const filteredCallout = allCallouts.filter((obj: { nameID: string }) => {
    return obj.nameID === nameID;
  });
  return filteredCallout;
};

export const getHubCallouts = async (
  hubNameId: string,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const requestParams = {
    operationName: null,
    query: `query HubCallouts($hubNameId: UUID_NAMEID!) {
      hub(ID: $hubNameId) {
        id
        collaboration {
          authorization{myPrivileges}
          callouts {
            ...Callout
          }
        }
      }
    }

    fragment Callout on Callout {
      ${calloutData}
    }`,
    variables: {
      hubNameId,
    },
  };

  return await graphqlRequestAuth(requestParams, userRole);
};
