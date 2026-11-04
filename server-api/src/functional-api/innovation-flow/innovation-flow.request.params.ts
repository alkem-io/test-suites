import {
  getGraphqlClient,
  TestUser,
  testConfiguration,
} from '@alkemio/tests-lib';
import { GraphQLClient } from 'graphql-request';
import { graphqlErrorWrapper } from '@alkemio/tests-lib/utils/graphql.wrapper';
import {
  SidebarWidget,
  UpdateInnovationFlowStateSettingsInput,
} from '@alkemio/tests-lib/core/generated/alkemio-schema';

export const getInnovationFlowStatesWithIds = async (
  spaceId: string,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.GetInnovationFlowStatesWithIds(
      { spaceId },
      {
        authorization: `Bearer ${authToken}`,
      }
    );

  return graphqlErrorWrapper(callback, userRole);
};

export const updateInnovationFlowState = async (
  innovationFlowStateID: string,
  displayName?: string,
  description?: string,
  settings?: UpdateInnovationFlowStateSettingsInput,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.UpdateInnovationFlowState(
      {
        stateData: {
          innovationFlowStateID,
          ...(displayName !== undefined && { displayName }),
          ...(description !== undefined && { description }),
          ...(settings !== undefined && { settings }),
        },
      },
      {
        authorization: `Bearer ${authToken}`,
      }
    );

  return graphqlErrorWrapper(callback, userRole);
};

export const updateInnovationFlowCurrentState = async (
  innovationFlowId: string,
  currentStateID: string,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.updateInnovationFlowCurrentState(
      {
        innovationFlowId,
        currentStateID,
      },
      {
        authorization: `Bearer ${authToken}`,
      }
    );

  return graphqlErrorWrapper(callback, userRole);
};

// --- Flow-state structure operations ---
// The lib exposes no documents for reordering, creating or deleting flow states, nor for
// reading a flow by its collaboration, so these are raw documents on the private endpoint.
const flowStateClient = new GraphQLClient(
  testConfiguration.endPoints.graphql.private
);
const bearer = (authToken: string | undefined) =>
  authToken ? { authorization: `Bearer ${authToken}` } : undefined;

export type FlowStateWithSettings = {
  id: string;
  displayName: string;
  sortOrder: number;
  settings: { sidebar: SidebarWidget[]; visible: boolean };
};

/**
 * Reorders a flow's states to the given ID order. The response carries every state of the
 * flow in its new order, with the sidebar each state holds afterwards.
 */
export const updateInnovationFlowStatesSortOrder = async (
  innovationFlowID: string,
  stateIDs: string[],
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) =>
  graphqlErrorWrapper(
    (authToken: string | undefined) =>
      flowStateClient.rawRequest<{
        updateInnovationFlowStatesSortOrder: FlowStateWithSettings[];
      }>(
        `mutation UpdateInnovationFlowStatesSortOrder($sortOrderData: UpdateInnovationFlowStatesSortOrderInput!) {
          updateInnovationFlowStatesSortOrder(sortOrderData: $sortOrderData) {
            id displayName sortOrder settings { sidebar visible }
          }
        }`,
        { sortOrderData: { innovationFlowID, stateIDs } },
        bearer(authToken)
      ),
    userRole
  );

/** Deletes one state of a flow. */
export const deleteStateOnInnovationFlow = async (
  innovationFlowID: string,
  stateID: string,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) =>
  graphqlErrorWrapper(
    (authToken: string | undefined) =>
      flowStateClient.rawRequest<{
        deleteStateOnInnovationFlow: { id: string };
      }>(
        `mutation DeleteStateOnInnovationFlow($stateData: DeleteStateOnInnovationFlowInput!) {
          deleteStateOnInnovationFlow(stateData: $stateData) { id }
        }`,
        { stateData: { innovationFlowID, ID: stateID } },
        bearer(authToken)
      ),
    userRole
  );

/** Appends a new state to a flow. */
export const createStateOnInnovationFlow = async (
  innovationFlowID: string,
  displayName: string,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) =>
  graphqlErrorWrapper(
    (authToken: string | undefined) =>
      flowStateClient.rawRequest<{
        createStateOnInnovationFlow: FlowStateWithSettings;
      }>(
        `mutation CreateStateOnInnovationFlow($stateData: CreateStateOnInnovationFlowInput!) {
          createStateOnInnovationFlow(stateData: $stateData) {
            id displayName sortOrder settings { sidebar visible }
          }
        }`,
        { stateData: { innovationFlowID, displayName } },
        bearer(authToken)
      ),
    userRole
  );

/** A collaboration's flow with every state's sort order, sidebar and visibility. */
export const getFlowStatesByCollaboration = async (
  collaborationID: string,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) =>
  graphqlErrorWrapper(
    (authToken: string | undefined) =>
      flowStateClient.rawRequest<{
        lookup: {
          collaboration: {
            innovationFlow: { id: string; states: FlowStateWithSettings[] };
          };
        };
      }>(
        `query GetFlowStatesByCollaboration($collaborationID: UUID!) {
          lookup { collaboration(ID: $collaborationID) { innovationFlow {
            id states { id displayName sortOrder settings { sidebar visible } }
          } } }
        }`,
        { collaborationID },
        bearer(authToken)
      ),
    userRole
  );
