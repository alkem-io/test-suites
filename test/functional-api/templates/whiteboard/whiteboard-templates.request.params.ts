import { TestUser } from '@test//utils/token.helper';
import { getGraphqlClient } from '@test/utils/graphqlClient';
import { graphqlErrorWrapper } from '@test/utils/graphql.wrapper';
import { TemplateType } from '@test/generated/alkemio-schema';
import { whiteboardTemplateValuesEmpty } from './whiteboard-values-empty';

export const getWhiteboardTemplatesCountByTemplateSetId = async (
  templateSetId: string,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.GetWhiteboardTemplatesCountByTemplateSetId(
      {
        templateSetId,
      },
      {
        authorization: `Bearer ${authToken}`,
      }
    );

  return graphqlErrorWrapper(callback, userRole);
};

export const getWhiteboardTemplatesCount = async (templateSetId: string) => {
  const templates = await getWhiteboardTemplatesCountByTemplateSetId(
    templateSetId
  );
  const whiteboardTemplatesCount =
    templates?.data?.lookup?.templatesSet?.whiteboardTemplatesCount ?? '';

  return whiteboardTemplatesCount;
};

export const createWhiteboardTemplate = async (
  templatesSetId: string,
  content: string = whiteboardTemplateValuesEmpty,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.CreateWhiteboardTemplate(
      {
        templatesSetId,
        type: TemplateType.Whiteboard,
        profile: {
          displayName: 'Default WHITEBOARD template title',
          description: 'Default whiteboard template to default innovation pack',
        },
        tags: ['Tag 1', 'Tag 2'],
        whiteboard: {
          profileData: {
            displayName: 'Whiteboard Template',
          },
          content,
        },
      },
      {
        authorization: `Bearer ${authToken}`,
      }
    );

  return graphqlErrorWrapper(callback, userRole);
};

export const updateTemplate = async (
  templateId: string,
  defaultDescription = 'Default post template description - Update',
  displayName = 'Default post template title - Update',
  description = 'Default post template info description - Update',
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.UpdateWhiteboardTemplate(
      {
        templateId,
        profile: {
          displayName,
          description,
        },
        },
      {
        authorization: `Bearer ${authToken}`,
      }
    );

  return graphqlErrorWrapper(callback, userRole);
};
