import { TestUser } from '@test/utils';
import { calloutData } from '@test/utils/common-params';
import { graphqlRequestAuth } from '@test/utils/graphql.request';

import { CalloutState, CalloutType, CalloutVisibility } from './callouts-enum';
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

export const defaultPost = {
  profile: {
    displayName: 'default callout display name',
    description: 'callout description',
  },
  state: CalloutState.OPEN,
  type: CalloutType.POST,
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

export const createCalloutOnCollaboration = async (
  collaborationID: string,
  options?: {
    profile?: {
      displayName?: string;
      description?: string;
    };
    state?: CalloutState;
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
        ...defaultPost,
        ...options,
      },
    },
  };

  return await graphqlRequestAuth(requestParams, userRole);
};

export const updateCallout = async (
  ID: string,
  userRole: TestUser = TestUser.GLOBAL_ADMIN,
  options?: {
    profileData?: {
      displayName?: string;
      description?: string;
    };
    state?: CalloutState;
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
