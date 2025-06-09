import { TestUser } from '@alkemio/tests-lib';
import { getSpaceData } from '@functional-api/journey/space/space.request.params';
import { getGraphqlClient } from '@utils/graphqlClient';
import { graphqlErrorWrapper } from '@utils/graphql.wrapper';
import { TemplateType } from '@generated/alkemio-schema';

export const createPostTemplate = async (
  templatesSetID: string,
  defaultDescription = 'Default post template description',
  displayName = 'Default post template title',
  description = 'Default post template info description',
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.CreateTemplate(
      {
        type: TemplateType.Post,
        profileData: {
          displayName,
          description,
        },
        templatesSetId: templatesSetID,
        postDefaultDescription: defaultDescription,
      },
      {
        authorization: `Bearer ${authToken}`,
      }
    );

  return graphqlErrorWrapper(callback, userRole);
};

export const updatePostTemplate = async (
  ID: string,

  displayName: string,
  description: string,
  postDefaultDescription: string,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.UpdatePostTemplate(
      {
        profile: {
          displayName,
          description,
        },
        templateId: ID,
        postDefaultDescription,
      },
      {
        authorization: `Bearer ${authToken}`,
      }
    );

  return graphqlErrorWrapper(callback, userRole);
};

export const getPostTemplatesCountForSpace = async (spaceId: string) => {
  const template = await getSpaceData(spaceId);
  const spacePostTemplates =
    template?.data?.lookup?.space?.templatesManager?.templatesSet
      ?.postTemplates ?? [];

  return spacePostTemplates.length;
};
