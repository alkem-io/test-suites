import { TestUser } from '@test//utils/token.helper';
import { graphqlRequestAuth } from '@test//utils/graphql.request';

export const createWhiteboardTemplate = async (
  templatesSetID: string,
  displayName: string,
  value: string,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const requestParams = {
    operationName: null,
    query: `mutation createWhiteboardTemplate($whiteboardTemplateInput: CreateWhiteboardTemplateOnTemplatesSetInput!) {
      createWhiteboardTemplate(whiteboardTemplateInput: $whiteboardTemplateInput) {
        profile {
          id
          displayName
          description
        }
      }
    }`,
    variables: {
      whiteboardTemplateInput: {
        templatesSetID,
        profile: {
          displayName,
          description: 'Default whiteboard template to default innovation pack',
        },
        tags: ['Tag 1', 'Tag 2'],
        value,
      },
    },
  };

  return await graphqlRequestAuth(requestParams, userRole);
};
