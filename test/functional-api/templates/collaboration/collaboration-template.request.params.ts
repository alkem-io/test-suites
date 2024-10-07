import { TestUser } from '@test/utils/token.helper';

import { getGraphqlClient } from '@test/utils/graphqlClient';
import { graphqlErrorWrapper } from '@test/utils/graphql.wrapper';
import { TemplateType } from '@test/generated/alkemio-schema';
import {
  lifecycleDefaultDefinition,
  templateDefaultInfo,
} from './collaboration-template-testdata';

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
