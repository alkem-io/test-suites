import { TestUser } from '@test//utils/token.helper';
import { graphqlRequestAuth } from '@test//utils/graphql.request';

export const createCanvasTemplate = async (
  templatesSetID: string,
  title: string,
  value: string,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const requestParams = {
    operationName: null,
    query: `mutation createCanvasTemplate($canvasTemplateInput: CreateCanvasTemplateOnTemplatesSetInput!) {
      createCanvasTemplate(canvasTemplateInput: $canvasTemplateInput) {
        info {
          id
          title
          description
        }
      }
    }`,
    variables: {
      canvasTemplateInput: {
        templatesSetID,
        info: {
          title,
          description: 'Default canvas template to default innovation pack',
          tags: ['Tag 1', 'Tag 2'],
        },
        value,
      },
    },
  };

  return await graphqlRequestAuth(requestParams, userRole);
};
