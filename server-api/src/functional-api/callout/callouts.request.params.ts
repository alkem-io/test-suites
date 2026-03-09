import { getGraphqlClient, TestUser } from '@alkemio/tests-lib';
import { UniqueIDGenerator } from '@alkemio/tests-lib';
import {
  CalloutAllowedActors,
  CalloutContributionType,
  CalloutFramingType,
  CalloutVisibility,
  TagsetReservedName,
} from '@alkemio/tests-lib/core/generated/alkemio-schema';
import { graphqlErrorWrapper } from '@alkemio/tests-lib/utils/graphql.wrapper';

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
    type: CalloutFramingType.None, // This is to allow for future extensions, e.g., whiteboard framing
  },

  settings: {
    visibility: CalloutVisibility.Draft,
    contribution: {
      enabled: true,
      allowedTypes: [CalloutContributionType.Post],
      canAddContributions: CalloutAllowedActors.Members,
      commentsEnabled: true,
    },
    framing: { commentsEnabled: true },
  },
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

  settings: {
    visibility: CalloutVisibility.Draft,
    contribution: {
      enabled: true,
      allowedTypes: [CalloutContributionType.Whiteboard],
      canAddContributions: CalloutAllowedActors.Members,
      commentsEnabled: true,
    },
    framing: { commentsEnabled: true },
  },
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
      type?: CalloutFramingType; // This is to allow for future extensions, e.g., whiteboard framing
    };

    settings?: {
      visibility?: CalloutVisibility;
      contribution?: {
        enabled?: boolean;
        allowedTypes?: CalloutContributionType[];
        canAddContributions?: CalloutAllowedActors;
        commentsEnabled?: boolean;
      };
      framing?: { commentsEnabled: boolean };
    };

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
      type?: CalloutFramingType.Whiteboard; // This is to allow for future extensions, e.g., whiteboard framing
    };

    settings?: {
      visibility?: CalloutVisibility.Published;
      contribution?: {
        enabled?: true;
        allowedTypes?: CalloutContributionType[];
        canAddContributions?: CalloutAllowedActors;
        commentsEnabled?: true;
      };
      framing?: { commentsEnabled: true };
    };
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
              displayName:
                options?.framing?.profile?.displayName ||
                'default callout display name',
              description:
                options?.framing?.profile?.description || 'callout description',
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
      type?: CalloutFramingType; // This is to allow for future extensions, e.g., whiteboard framing
    };

    settings?: {
      visibility?: CalloutVisibility;
      contribution?: {
        enabled?: boolean;
        allowedTypes?: CalloutContributionType[];
        canAddContributions?: CalloutAllowedActors;
        commentsEnabled?: boolean;
      };
      framing?: { commentsEnabled: boolean };
    };

    postTemplate?: {
      defaultDescription?: string;
      type?: string;
      profile?: {
        displayName?: string;
        description?: string;
        tagline?: string;
      };
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

export const transferCallout = async (
  calloutID: string,
  targetCalloutsSetID: string,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.transferCallout(
      {
        transferData: {
          calloutID,
          targetCalloutsSetID,
        },
      },
      {
        authorization: `Bearer ${authToken}`,
      }
    );

  return graphqlErrorWrapper(callback, userRole);
};
