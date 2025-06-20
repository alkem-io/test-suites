import { getGraphqlClient, TestUser } from '@alkemio/tests-lib';
import { UniqueIDGenerator } from '@alkemio/tests-lib';
import {
  CalloutState,
  CalloutType,
  CalloutVisibility,
  TagsetReservedName,
} from '@alkemio/tests-lib/dist/core/generated/alkemio-schema';
import { graphqlErrorWrapper } from '@alkemio/tests-lib/dist/utils/graphql.wrapper';

const uniqueId = UniqueIDGenerator.getID();

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
      displayName: `default Whiteboard callout display name ${uniqueId}`,
      description: 'callout Whiteboard description',
    },
  },
  contributionPolicy: {
    state: CalloutState.Open,
  },
  type: CalloutType.WhiteboardCollection,
  contributionDefaults: {
    whiteboardContent:
      '{"type":"excalidraw","version":2,"source":"https://excalidraw.com","elements":[],"appState":{"gridSize":null,"viewBackgroundColor":"#ffffff"}}',
  },
};

export const createCalloutOnCalloutsSet = async (
  calloutsSetID: string,
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
    visibility?: CalloutVisibility;
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
  const callback = (authToken: string | undefined) =>
    graphqlClient.CreateCalloutOnCalloutsSet(
      {
        calloutData: {
          calloutsSetID,
          ...defaultCallout,
          ...options,
          enableComments:
            defaultCallout.type === CalloutType.Post ? true : false,
        },
      },
      {
        authorization: `Bearer ${authToken}`,
      }
    );

  return graphqlErrorWrapper(callback, userRole);
};

export const getCalloutsData = async (
  calloutsSetId: string,
  tags?: string[] | undefined,
  role = TestUser.GLOBAL_ADMIN
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.GetCalloutsOnCalloutsSetUsingClassification(
      {
        calloutsSetId,
        classificationTagsets: [
          {
            name: TagsetReservedName.FlowState,
            tags,
          },
        ],
      },
      {
        authorization: `Bearer ${authToken}`,
      }
    );

  return graphqlErrorWrapper(callback, role);
};

export const getCalloutDetails = async (
  calloutId: string,
  role = TestUser.GLOBAL_ADMIN
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.CalloutDetails(
      {
        calloutId,
      },
      {
        authorization: `Bearer ${authToken}`,
      }
    );

  return graphqlErrorWrapper(callback, role);
};

export const createWhiteboardCalloutOnCalloutsSet = async (
  calloutsSetID: string,
  options?: {
    framing: {
      profile?: {
        displayName: string;
        description: string;
      };
    };
    contributionPolicy?: {
      state?: CalloutState;
    };
    type?: CalloutType;
    contributionDefaults?: {
      whiteboardContent?: string;
    };
  },
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.CreateCalloutOnCalloutsSet(
      {
        calloutData: {
          calloutsSetID,
          ...defaultWhiteboard,
          ...options,
          framing: {
            profile: {
              displayName: 'default callout display name',
              description: 'callout description',
            },
          },
        },
      },
      {
        authorization: `Bearer ${authToken}`,
      }
    );

  return graphqlErrorWrapper(callback, userRole);
};

export const updateCallout = async (
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
  const callback = (authToken: string | undefined) =>
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
  visibility: CalloutVisibility = CalloutVisibility.Draft,
  userRole: TestUser = TestUser.GLOBAL_ADMIN,
  sendNotification?: boolean
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
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
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
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
