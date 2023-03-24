import { TestUser } from '@test//utils/token.helper';
import { graphqlRequestAuth } from '@test//utils/graphql.request';

export const createCanvasTemplate = async (
  templatesSetID: string,
  displayName: string,
  value: string,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const requestParams = {
    operationName: null,
    query: `mutation createCanvasTemplate($canvasTemplateInput: CreateCanvasTemplateOnTemplatesSetInput!) {
      createCanvasTemplate(canvasTemplateInput: $canvasTemplateInput) {
        profile {
          id
          displayName
          description
        }
      }
    }`,
    variables: {
      canvasTemplateInput: {
        templatesSetID,
        profile: {
          displayName,
          description: 'Default canvas template to default innovation pack',
        },
        tags: ['Tag 1', 'Tag 2'],
        value,
      },
    },
  };

  return await graphqlRequestAuth(requestParams, userRole);
};
