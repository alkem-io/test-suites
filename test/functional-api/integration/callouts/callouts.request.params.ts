import { TestUser } from '@test/utils';
import { calloutData } from '@test/utils/common-params';
import { graphqlRequestAuth } from '@test/utils/graphql.request';

import {
  CalloutState as CalloutStateEnum,
  CalloutType as CalloutTypeEnum,
  CalloutVisibility as CalloutVisibilityEnum,
} from './callouts-enum';
import { getGraphqlClient } from '@test/utils/graphqlClient';
import { graphqlErrorWrapper } from '@test/utils/graphql.wrapper';
import { CalloutType, CalloutState } from '@test/generated/alkemio-schema';
import { CalloutVisibility } from '@alkemio/client-lib/dist/types/alkemio-schema';
export const defaultPostTemplate = {
  postTemplate: {
    defaultDescription: 'Please describe the knowledge that is relevant.',
    type: 'knowledge',
    profile: {
      displayName: 'Post template display name',
      tagline: 'Post template tagline',
      description: 'To share relevant knowledge, building blocks etc.',
    },
  },
};

export const defaultCallout = {
  framing: {
    profile: {
      displayName: 'default callout display name',
      description: 'callout description',
    },
  },
  contributionPolicy: {
    state: CalloutStateEnum.OPEN,
  },
  type: CalloutType.Post,
  contributionDefaults: {
    postDescription: 'Please describe the knowledge that is relevant.',
  },
};

export const defaultCalloutCodegen = {
  framing: {
    profile: {
      displayName: 'default callout display name',
      description: 'callout description',
    },
  },
  contributionPolicy: {
    state: CalloutState.Open,
  },
  type: CalloutType.Post,
  contributionDefaults: {
    postDescription: 'Please describe the knowledge that is relevant.',
  },
};

export const defaultWhiteboard = {
  framing: {
    profile: {
      displayName: 'default Whiteboard callout display name',
      description: 'callout Whiteboard description',
    },
  },
  contributionPolicy: {
    state: CalloutStateEnum.OPEN,
  },
  type: CalloutType.WhiteboardCollection,
  contributionDefaults: {
    whiteboardContent:
      '{"type":"excalidraw","version":2,"source":"https://excalidraw.com","elements":[],"appState":{"gridSize":null,"viewBackgroundColor":"#ffffff"}}',
  },
};

export const createCalloutOnCollaboration = async (
  collaborationID: string,
  options?: {
    framing: {
      profile?: {
        displayName?: string;
        description?: string;
      };
    };
    contributionPolicy?: {
      state?: CalloutStateEnum;
    };
    type?: CalloutTypeEnum;
    contributionDefaults?: {
      postDescription?: string;
      whiteboardContent?: string;
    };
  },
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
        ...defaultCallout,
        ...options,
      },
    },
  };

  return await graphqlRequestAuth(requestParams, userRole);
};

export const createCalloutOnCollaborationCodegen = async (
  collaborationID: string,
  options?: {
    framing?: {
      profile: {
        displayName: string;
        description?: string;
      };
    };
    contributionPolicy?: {
      state?: CalloutState;
    };
    type?: CalloutType;
    postTemplate?: {
      defaultDescription?: string;
      type?: string;
      profile?: {
        displayName?: string;
        description?: string;
        tagline?: string;
      };
    };
  },
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string) =>
    graphqlClient.createCalloutOnCollaboration(
      {
        calloutData: {
          collaborationID,
          ...defaultCalloutCodegen,
          ...options,
        },
      },
      {
        authorization: `Bearer ${authToken}`,
      }
    );

  return graphqlErrorWrapper(callback, userRole);
};

export const getCalloutsDataCodegen = async (
  spaceNameId: string,
  includeSpace: boolean,
  includeChallenge: boolean,
  includeOpportunity: boolean,
  challengeNameId?: string,
  opportunityNameId?: string,
  role = TestUser.GLOBAL_ADMIN
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string) =>
    graphqlClient.Callouts(
      {
        spaceNameId,
        includeSpace,
        includeChallenge,
        includeOpportunity,
        challengeNameId,
        opportunityNameId,
      },
      {
        authorization: `Bearer ${authToken}`,
      }
    );

  return graphqlErrorWrapper(callback, role);
};

// {
//   "includeSpace": true,
//   "includeChallenge": false,
//   "includeOpportunity": false,
//   "spaceNameId": "222",
//   "displayLocations": [
//     "COMMUNITY_LEFT",
//     "COMMUNITY_RIGHT"
//   ]
// }
export const createWhiteboardCalloutOnCollaboration = async (
  collaborationID: string,
  options?: {
    framing: {
      profile?: {
        displayName?: string;
        description?: string;
      };
    };
    contributionPolicy?: {
      state?: CalloutStateEnum;
    };
    type?: CalloutTypeEnum;
    contributionDefaults?: {
      whiteboardContent?: string;
    };
  },
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
        ...defaultWhiteboard,
        ...options,
      },
    },
  };

  return await graphqlRequestAuth(requestParams, userRole);
};

export const updateCalloutCodegen = async (
  ID: string,
  userRole: TestUser = TestUser.GLOBAL_ADMIN,
  options?: {
    framing?: {
      profile?: {
        displayName?: string;
        description?: string;
      };
    };
    contributionPolicy?: {
      state?: CalloutState;
    };
    type?: CalloutType;
    contributionDefaults?: {
      postDescription?: string;
      whiteboardContent?: string;
    };
  }
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string) =>
    graphqlClient.UpdateCallout(
      {
        calloutData: {
          ID,
          ...options,
        },
      },
      {
        authorization: `Bearer ${authToken}`,
      }
    );

  return graphqlErrorWrapper(callback, userRole);
};

export const updateCalloutVisibility = async (
  calloutID: string,
  visibility: CalloutVisibilityEnum = CalloutVisibilityEnum.DRAFT,
  userRole: TestUser = TestUser.GLOBAL_ADMIN,
  sendNotification?: boolean
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
        sendNotification,
      },
    },
  };

  return await graphqlRequestAuth(requestParams, userRole);
};

export const updateCalloutVisibilityCodegen = async (
  calloutID: string,
  visibility: CalloutVisibility = CalloutVisibility.Draft,
  userRole: TestUser = TestUser.GLOBAL_ADMIN,
  sendNotification?: boolean
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string) =>
    graphqlClient.UpdateCalloutVisibility(
      {
        calloutData: {
          calloutID,
          visibility,
          sendNotification,
        },
      },
      {
        authorization: `Bearer ${authToken}`,
      }
    );

  return graphqlErrorWrapper(callback, userRole);
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

export const deleteCalloutCodegen = async (
  calloutId: string,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string) =>
    graphqlClient.deleteCallout(
      {
        calloutId,
      },
      {
        authorization: `Bearer ${authToken}`,
      }
    );

  return graphqlErrorWrapper(callback, userRole);
};

export const getSpaceCallouts = async (
  spaceNameId: string,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const requestParams = {
    operationName: null,
    query: `query SpaceCallouts($spaceNameId: UUID_NAMEID!) {
      space(ID: $spaceNameId) {
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
      spaceNameId,
    },
  };

  return await graphqlRequestAuth(requestParams, userRole);
};

export const getSpaceCalloutsCodegen = async (
  spaceNameId: string,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string) =>
    graphqlClient.Callouts(
      {
        spaceNameId,
        includeSpace: true,
      },
      {
        authorization: `Bearer ${authToken}`,
      }
    );

  return graphqlErrorWrapper(callback, userRole);
};

export const getSpaceCalloutsFromGroups = async (
  spaceNameId: string,
  groups: string[],
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const requestParams = {
    operationName: null,
    query: `query SpaceCallouts($spaceNameId: UUID_NAMEID!, $groups: [String!]) {
      space(ID: $spaceNameId) {
        id
        collaboration {
          authorization{myPrivileges}
          callouts(groups: $groups) {
            ...Callout
          }
        }
      }
    }

    fragment Callout on Callout {
      ${calloutData}
    }`,
    variables: {
      spaceNameId,
      groups,
    },
  };

  return await graphqlRequestAuth(requestParams, userRole);
};

export const getSpaceCalloutByNameId = async (
  spaceNameId: string,
  calloutId: string,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const requestParams = {
    operationName: null,
    query: `query SpaceCallout($spaceNameId: UUID_NAMEID!, $calloutId: UUID_NAMEID!) {
      space(ID: $spaceNameId) {
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
      spaceNameId,
      calloutId,
    },
  };

  return await graphqlRequestAuth(requestParams, userRole);
};

export const getChallengeCalloutByNameId = async (
  spaceNameId: string,
  challengeNameId: string,
  calloutId: string,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const requestParams = {
    operationName: null,
    query: `query ChallengeCallout(
            $spaceNameId: UUID_NAMEID!
            $challengeNameId: UUID_NAMEID!
            $calloutId: UUID_NAMEID!
          ) {
            space(ID: $spaceNameId) {
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
      spaceNameId,
      challengeNameId,
      calloutId,
    },
  };

  return await graphqlRequestAuth(requestParams, userRole);
};

export const getOpportunityCalloutByNameId = async (
  spaceNameId: string,
  opportunityNameId: string,
  calloutId: string,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const requestParams = {
    operationName: null,
    query: `query ChallengeCallout(
            $spaceNameId: UUID_NAMEID!
            $opportunityNameId: UUID_NAMEID!
            $calloutId: UUID_NAMEID!
          ) {
            space(ID: $spaceNameId) {
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
      spaceNameId,
      opportunityNameId,
      calloutId,
    },
  };

  return await graphqlRequestAuth(requestParams, userRole);
};
