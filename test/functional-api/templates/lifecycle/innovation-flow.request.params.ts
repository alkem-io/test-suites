import { TestUser } from '@test/utils/token.helper';
import {
  lifecycleDefaultDefinition,
  templateDefaultInfo,
} from './innovation-flow-template-testdata';
import { getGraphqlClient } from '@test/utils/graphqlClient';
import { graphqlErrorWrapper } from '@test/utils/graphql.wrapper';
import { getSpaceData } from '../../journey/space/space.request.params';
import { TemplateType } from '@test/generated/alkemio-schema';

export const updateInnovationFlowState = async (
  innovationFlowId: string,
  selectedState: string,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.UpdateInnovationFlowSelectedState(
      {
        innovationFlowId,
        selectedState,
      },
      {
        authorization: `Bearer ${authToken}`,
      }
    );
  return graphqlErrorWrapper(callback, userRole);
};

export const updateInnovationFlowStatesFromTemplate = async (
  innovationFlowID: string,
  innovationFlowTemplateID: string,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.UpdateInnovationFlowStatesFromTemplate(
      {
        input: {
          innovationFlowID,
          innovationFlowTemplateID,
        },
      },
      {
        authorization: `Bearer ${authToken}`,
      }
    );
  return graphqlErrorWrapper(callback, userRole);
};

export const createInnovationFlowTemplate = async (
  templatesSetId: string,
  profile: any = templateDefaultInfo,
  states: {
    displayName: string;
    description: string;
  }[] = lifecycleDefaultDefinition,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.createTemplate(
      {
        templatesSetId,
        profile,
        type: TemplateType.InnovationFlow,
        innovationFlowData: {
          profile: {
            displayName: 'template',
          },
          states,
        },
      },
      {
        authorization: `Bearer ${authToken}`,
      }
    );
  return graphqlErrorWrapper(callback, userRole);
};

export const updateInnovationFlowTemplate = async (
  templateId: string,
  profile: any = templateDefaultInfo,
  states: {
    displayName: string;
    description: string;
  }[] = lifecycleDefaultDefinition,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.UpdateTemplate(
      {
        templateId,
        profile,
        innovationFlow: {
          states,
        },
      },
      {
        authorization: `Bearer ${authToken}`,
      }
    );
  return graphqlErrorWrapper(callback, userRole);
};

export const deleteInnovationFlowTemplate = async (
  ID: string,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.deleteTemplate(
      {
        templateId: ID,
      },
      {
        authorization: `Bearer ${authToken}`,
      }
    );
  return graphqlErrorWrapper(callback, userRole);
};

export const getLifeCycleTemplateForSpaceByLifecycleTitle = async (
  spaceId: string,
  displayName: string
) => {
  const templatesPerSpace = await getSpaceData(spaceId);
  const allTemplates =
    templatesPerSpace?.data?.space?.library?.innovationFlowTemplates ?? [];

  const filteredTemplate = allTemplates?.filter(item => {
    return item.profile.displayName === displayName;
  });

  return filteredTemplate;
};

export const getInnovationFlowTemplatesCountForSpace = async (
  spaceId: string
) => {
  const template = await getSpaceData(spaceId);
  const spaceInnovationFlowTemplates =
    template?.data?.space?.library?.innovationFlowTemplates.length;

  return spaceInnovationFlowTemplates;
};
