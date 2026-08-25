import { TestUser, testConfiguration } from '@alkemio/tests-lib';
import { graphqlErrorWrapper } from '@alkemio/tests-lib/utils/graphql.wrapper';
import { GraphQLClient } from 'graphql-request';

// These helpers select `settings { sidebar }` inline on top of the existing
// InnovationFlowState / template read paths, using a raw GraphQL client instead of the
// generated `@alkemio/tests-lib` SDK. That keeps the shared InnovationFlowStateData
// fragment (and everything built from it) untouched, and avoids depending on a
// codegen run against a live server just to type-check this suite.
const graphqlClient = new GraphQLClient(
  testConfiguration.endPoints.graphql.private
);

// The sidebar widget codenames as they serialize on the wire: uppercase GraphQL enum
// names, matching the server's SidebarWidget enum.
export type SidebarWidgetWire =
  | 'INTENT'
  | 'ABOUT'
  | 'CREATE_POST'
  | 'APPLICATION_BUTTON'
  | 'SUBSPACE_LINKS'
  | 'EVENTS'
  | 'UPDATES'
  | 'CONTACT_LEADS'
  | 'ADD_USER'
  | 'VIRTUAL_CONTRIBUTORS'
  | 'GUIDELINES'
  | 'INDEX';

export interface FlowStateSidebar {
  id: string;
  sortOrder: number;
  settings: { sidebar: SidebarWidgetWire[] };
}

const UPDATE_INNOVATION_FLOW_STATE_SIDEBAR = /* GraphQL */ `
  mutation UpdateInnovationFlowStateSidebar(
    $stateData: UpdateInnovationFlowStateInput!
  ) {
    updateInnovationFlowState(stateData: $stateData) {
      id
      settings {
        sidebar
      }
    }
  }
`;

interface UpdateInnovationFlowStateSidebarResponse {
  updateInnovationFlowState: {
    id: string;
    settings: { sidebar: SidebarWidgetWire[] };
  };
}

/**
 * Sets (wholesale-replaces) the sidebar widget list on one InnovationFlow state and
 * reads it back from the mutation response, so a single call proves both the write
 * and the immediate NonNull read.
 */
export const updateInnovationFlowStateSidebar = async (
  innovationFlowStateID: string,
  sidebar: SidebarWidgetWire[],
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const callback = (authToken: string | undefined) =>
    graphqlClient.rawRequest<UpdateInnovationFlowStateSidebarResponse>(
      UPDATE_INNOVATION_FLOW_STATE_SIDEBAR,
      {
        stateData: {
          innovationFlowStateID,
          settings: { sidebar },
        },
      },
      authToken ? { authorization: `Bearer ${authToken}` } : undefined
    );

  return graphqlErrorWrapper(callback, userRole);
};

const GET_SPACE_FLOW_STATES_SIDEBAR = /* GraphQL */ `
  query GetSpaceFlowStatesSidebar($spaceId: UUID!) {
    lookup {
      space(ID: $spaceId) {
        collaboration {
          innovationFlow {
            id
            states {
              id
              sortOrder
              settings {
                sidebar
              }
            }
          }
        }
      }
    }
  }
`;

interface GetSpaceFlowStatesSidebarResponse {
  lookup: {
    space: {
      collaboration: {
        innovationFlow: {
          id: string;
          states: FlowStateSidebar[];
        };
      };
    };
  };
}

/**
 * Reads a Space's innovation flow states with `settings { sidebar }`, in the same
 * sortOrder-ascending order the API always returns them in. Every level (base space
 * and subspace alike) is addressable this way, so this doubles as the
 * collaboration-scoped read used against the template-application target.
 */
export const getCollaborationFlowStates = async (
  spaceID: string,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const callback = (authToken: string | undefined) =>
    graphqlClient.rawRequest<GetSpaceFlowStatesSidebarResponse>(
      GET_SPACE_FLOW_STATES_SIDEBAR,
      { spaceId: spaceID },
      authToken ? { authorization: `Bearer ${authToken}` } : undefined
    );

  return graphqlErrorWrapper(callback, userRole);
};

const GET_TEMPLATE_CONTENT_SPACE_FLOW_STATES_SIDEBAR = /* GraphQL */ `
  query GetTemplateContentSpaceFlowStatesSidebar($templateId: UUID!) {
    lookup {
      template(ID: $templateId) {
        id
        contentSpace {
          id
          collaboration {
            innovationFlow {
              id
              states {
                id
                sortOrder
                settings {
                  sidebar
                }
              }
            }
          }
        }
      }
    }
  }
`;

interface GetTemplateContentSpaceFlowStatesSidebarResponse {
  lookup: {
    template: {
      id: string;
      contentSpace: {
        id: string;
        collaboration: {
          innovationFlow: {
            id: string;
            states: FlowStateSidebar[];
          };
        };
      };
    };
  };
}

/**
 * Reads a Template's content-space innovation flow states with `settings { sidebar }`
 * — the save-fidelity read used right after `createTemplateFromSpace`.
 */
export const getTemplateContentSpaceFlowStates = async (
  templateId: string,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const callback = (authToken: string | undefined) =>
    graphqlClient.rawRequest<GetTemplateContentSpaceFlowStatesSidebarResponse>(
      GET_TEMPLATE_CONTENT_SPACE_FLOW_STATES_SIDEBAR,
      { templateId },
      authToken ? { authorization: `Bearer ${authToken}` } : undefined
    );

  return graphqlErrorWrapper(callback, userRole);
};
