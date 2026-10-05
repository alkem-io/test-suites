/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  getGraphqlClient,
  TestUser,
  testConfiguration,
} from '@alkemio/tests-lib';
import { GraphQLClient } from 'graphql-request';
import {
  InnovationFlowState,
  SidebarWidget,
} from '@alkemio/tests-lib/core/generated/alkemio-schema';
import { templateDefaultInfo } from './space-template-testdata';
import { getSpaceData } from '../../journey/space/space.request.params';
import { graphqlErrorWrapper } from '@alkemio/tests-lib/utils/graphql.wrapper';

export const getLifeCycleTemplateForSpaceByLifecycleTitle = async (
  spaceId: string,
  displayName: string
) => {
  const templatesPerSpace = await getSpaceData(spaceId);
  const allTemplates =
    templatesPerSpace?.data?.lookup?.space?.templatesManager?.templatesSet
      ?.spaceTemplates ?? [];

  const filteredTemplate = allTemplates?.filter(item => {
    return item.profile.displayName === displayName;
  });

  return filteredTemplate;
};

export const getSpaceTemplatesCountForSpace = async (spaceId: string) => {
  const template = await getSpaceData(spaceId);
  const spaceCollaborationTemplates =
    template?.data?.lookup?.space?.templatesManager?.templatesSet
      ?.spaceTemplates.length;

  return spaceCollaborationTemplates;
};

export const getSpaceTemplatesCountByTemplateSetId = async (
  templateSetId: string,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.GetSpaceTemplatesCountByTemplateSetId(
      {
        templateSetId,
      },
      {
        authorization: `Bearer ${authToken}`,
      }
    );

  return graphqlErrorWrapper(callback, userRole);
};

export const getSpaceTemplatesCount = async (templateSetId: string) => {
  const templates = await getSpaceTemplatesCountByTemplateSetId(templateSetId);
  const collaborationTemplatesCount =
    templates?.data?.lookup?.templatesSet?.spaceTemplatesCount ?? '';

  return collaborationTemplatesCount;
};

export const createTemplateFromSpace = async (
  spaceId: string,
  templatesSetId: string,
  displayName: string,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.CreateTemplateFromSpace(
      {
        spaceId,
        templatesSetId,
        profileData: { displayName },
      },
      {
        authorization: `Bearer ${authToken}`,
      }
    );
  return graphqlErrorWrapper(callback, userRole);
};

export const updateSpaceTemplate = async (
  templateId: string,
  profile: any = templateDefaultInfo,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.UpdateSpaceTemplate(
      {
        templateId,
        profile,
      },
      {
        authorization: `Bearer ${authToken}`,
      }
    );
  return graphqlErrorWrapper(callback, userRole);
};

export const updateCollaborationFromSpaceTemplate = async (
  collaborationID: string,
  spaceTemplateID: string,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.UpdateCollaborationFromSpaceTemplate(
      {
        updateData: {
          collaborationID,
          spaceTemplateID,
        },
      },
      {
        authorization: `Bearer ${authToken}`,
      }
    );
  return graphqlErrorWrapper(callback, userRole);
};

// --- Sidebar widget round-trip (workspace#040-sidebar-widget-config) ---
// The lib `UpdateInnovationFlowState` document selects only `id displayName`, and no lib
// document reads a template's content-space flow states or reorders states, so these three
// operations are raw documents. Everything else in the round-trip uses the shared helpers
// (`getInnovationFlowStatesWithIds`, `updateInnovationFlowState`).
const sidebarClient = new GraphQLClient(
  testConfiguration.endPoints.graphql.private
);
const bearer = (authToken: string | undefined) =>
  authToken ? { authorization: `Bearer ${authToken}` } : undefined;

export type FlowStateSidebar = Pick<
  InnovationFlowState,
  'id' | 'displayName' | 'sortOrder'
> & {
  settings: { sidebar: SidebarWidget[] };
};

/** Wholesale-replaces one state's sidebar and returns the state as the mutation serializes it (FR-003). */
export const updateInnovationFlowStateSidebar = async (
  innovationFlowStateID: string,
  sidebar: SidebarWidget[],
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) =>
  graphqlErrorWrapper(
    (authToken: string | undefined) =>
      sidebarClient.rawRequest<{ updateInnovationFlowState: FlowStateSidebar }>(
        `mutation UpdateInnovationFlowStateSidebar($stateData: UpdateInnovationFlowStateInput!) {
          updateInnovationFlowState(stateData: $stateData) { id displayName sortOrder settings { sidebar } }
        }`,
        { stateData: { innovationFlowStateID, settings: { sidebar } } },
        bearer(authToken)
      ),
    userRole
  );

/** A template's content-space flow states with their sidebars — the save-fidelity read. */
export const getTemplateContentSpaceFlowStates = async (
  templateId: string,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) =>
  graphqlErrorWrapper(
    (authToken: string | undefined) =>
      sidebarClient.rawRequest<{
        lookup: {
          template: {
            contentSpace: {
              collaboration: { innovationFlow: { states: FlowStateSidebar[] } };
            };
          };
        };
      }>(
        `query GetTemplateContentSpaceFlowStates($templateId: UUID!) {
          lookup { template(ID: $templateId) { contentSpace { collaboration { innovationFlow {
            states { id displayName sortOrder settings { sidebar } }
          } } } } }
        }`,
        { templateId },
        bearer(authToken)
      ),
    userRole
  );

/** Reorders a flow's states to the given ID order. */
export const updateInnovationFlowStatesSortOrder = async (
  innovationFlowID: string,
  stateIDs: string[],
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) =>
  graphqlErrorWrapper(
    (authToken: string | undefined) =>
      sidebarClient.rawRequest<{
        updateInnovationFlowStatesSortOrder: {
          id: string;
          sortOrder: number;
        }[];
      }>(
        `mutation UpdateInnovationFlowStatesSortOrder($sortOrderData: UpdateInnovationFlowStatesSortOrderInput!) {
          updateInnovationFlowStatesSortOrder(sortOrderData: $sortOrderData) { id sortOrder }
        }`,
        { sortOrderData: { innovationFlowID, stateIDs } },
        bearer(authToken)
      ),
    userRole
  );
