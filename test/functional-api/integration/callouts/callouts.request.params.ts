import { TestUser } from '@test/utils';
import { calloutData } from '@test/utils/common-params';
import { graphqlRequestAuth } from '@test/utils/graphql.request';

import { CalloutState, CalloutType, CalloutVisibility } from './callouts-enum';
export const defaultCardTemplate = {
  cardTemplate: {
    defaultDescription: 'Please describe the knowledge that is relevant.',
    type: 'knowledge',
    info: {
      description: 'To share relevant knowledge, building blocks etc.',
      title: 'knowledge',
      tags: [],
    },
  },
};

export const createCalloutOnCollaboration = async (
  collaborationID: string,
  displayName: string,
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
        description,
        state,
        type,
        ...defaultCardTemplate,
      },
    },
  };

  return await graphqlRequestAuth(requestParams, userRole);
};

export const updateCallout = async (
  ID: string,
  userRole: TestUser = TestUser.GLOBAL_ADMIN,
  options?: {
    displayName?: string;
    nameID?: string;
    description?: string;
    state?: CalloutState;
  }
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
        ...options,
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

export const getHubCalloutByNameId = async (
  hubNameId: string,
  calloutId: string,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const requestParams = {
    operationName: null,
    query: `query HubCallout($hubNameId: UUID_NAMEID!, $calloutId: UUID_NAMEID!) {
      hub(ID: $hubNameId) {
        id
        collaboration {
          authorization{myPrivileges}
          callouts(IDs: [$calloutId]) {
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
      calloutId,
    },
  };

  return await graphqlRequestAuth(requestParams, userRole);
};

export const getChallengeCalloutByNameId = async (
  hubNameId: string,
  challengeNameId: string,
  calloutId: string,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const requestParams = {
    operationName: null,
    query: `query ChallengeCallout(
            $hubNameId: UUID_NAMEID!
            $challengeNameId: UUID_NAMEID!
            $calloutId: UUID_NAMEID!
          ) {
            hub(ID: $hubNameId) {
              id
              challenge(ID: $challengeNameId) {
                id
                collaboration {
                  id
                  authorization {
                    id
                    myPrivileges
                  }
                  callouts(IDs: [$calloutId]) {
                    ...Callout
                  }
                }
              }
            }
          }

    fragment Callout on Callout {
      ${calloutData}
    }`,
    variables: {
      hubNameId,
      challengeNameId,
      calloutId,
    },
  };

  return await graphqlRequestAuth(requestParams, userRole);
};

export const getOpportunityCalloutByNameId = async (
  hubNameId: string,
  opportunityNameId: string,
  calloutId: string,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const requestParams = {
    operationName: null,
    query: `query ChallengeCallout(
            $hubNameId: UUID_NAMEID!
            $opportunityNameId: UUID_NAMEID!
            $calloutId: UUID_NAMEID!
          ) {
            hub(ID: $hubNameId) {
              id
              opportunity(ID: $opportunityNameId) {
                id
                collaboration {
                  id
                  authorization {
                    id
                    myPrivileges
                  }
                  callouts(IDs: [$calloutId]) {
                    ...Callout
                  }
                }
              }
            }
          }

    fragment Callout on Callout {
      ${calloutData}
    }`,
    variables: {
      hubNameId,
      opportunityNameId,
      calloutId,
    },
  };

  return await graphqlRequestAuth(requestParams, userRole);
};
