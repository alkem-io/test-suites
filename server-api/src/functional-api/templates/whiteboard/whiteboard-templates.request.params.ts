import { whiteboardTemplateValuesEmpty } from './whiteboard-values-empty';
import { getGraphqlClient, TestUser } from '@alkemio/tests-lib';
import { TemplateType } from '@alkemio/tests-lib/core/generated/alkemio-schema';
import { graphqlErrorWrapper } from '@alkemio/tests-lib/utils/graphql.wrapper';

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
  const templates =
    await getWhiteboardTemplatesCountByTemplateSetId(templateSetId);
  const whiteboardTemplatesCount =
    templates?.data?.lookup?.templatesSet?.whiteboardTemplatesCount ?? '';

  return whiteboardTemplatesCount;
};

export const createWhiteboardTemplate = async (
  templatesSetId: string,
  // Since server#6399 CreateWhiteboardInput has no inline content — the
  // template whiteboard is created empty (seed via sourceWhiteboardID).
  // Parameter kept so existing callers compile; it is no longer sent.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _content: string = whiteboardTemplateValuesEmpty,
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
          profile: {
            displayName: 'Whiteboard Template',
          },
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
