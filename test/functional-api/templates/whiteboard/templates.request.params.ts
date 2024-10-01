import { TestUser } from '@test//utils/token.helper';
import { getGraphqlClient } from '@test/utils/graphqlClient';
import { graphqlErrorWrapper } from '@test/utils/graphql.wrapper';
import { TemplateType } from '@test/generated/alkemio-schema';

export const createWhiteboardTemplate = async (
  templatesSetID: string,
  displayName: string,
  content: string,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.createTemplate(
      {
        templatesSetId: templatesSetID,
        type: TemplateType.Whiteboard,
        profile: {
          displayName,
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
