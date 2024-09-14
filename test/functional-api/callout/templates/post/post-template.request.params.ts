import { TestUser } from '@test/utils/token.helper';
import { getSpaceDataCodegen } from '@test/functional-api/journey/space/space.request.params';
import { getGraphqlClient } from '@test/utils/graphqlClient';
import { graphqlErrorWrapper } from '@test/utils/graphql.wrapper';
import { TemplateType } from '@test/generated/alkemio-schema';

export const createPostTemplateCodegen = async (
  templatesSetID: string,
  type: string | 'Post Template Type',
  defaultDescription = 'Default post template description',
  displayName = 'Default post template title',
  description = 'Default post template info description',
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.createTemplate(
      {
        type: TemplateType.Post,
        profile: {
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

export const updatePostTemplateCodegen = async (
  ID: string,
  defaultDescription = 'Default post template description - Update',
  displayName = 'Default post template title - Update',
  description = 'Default post template info description - Update',
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.UpdateTemplate(
      {
        profile: {
          displayName,
          description,
        },
        templateId: ID,
        postDefaultDescription: defaultDescription,
      },
      {
        authorization: `Bearer ${authToken}`,
      }
    );

  return graphqlErrorWrapper(callback, userRole);
};

export const deletePostTemplateCodegen = async (
  postTemplateId: string,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.deleteTemplate(
      {
        templateId: postTemplateId,
      },
      {
        authorization: `Bearer ${authToken}`,
      }
    );

  return graphqlErrorWrapper(callback, userRole);
};

export const getPostTemplateForSpaceByPostType = async (
  spaceId: string,
  postType: string
) => {
  const templatesPerSpace = await getSpaceDataCodegen(spaceId);
  const allTemplates = templatesPerSpace?.data?.space?.library?.postTemplates;
  const filteredTemplate = allTemplates?.filter((obj: { type: string }) => {
    return obj.type === postType;
  });
  return filteredTemplate;
};

export const getPostTemplatesCountForSpace = async (spaceId: string) => {
  const template = await getSpaceDataCodegen(spaceId);
  const spacePostTemplates =
    template?.data?.space?.library?.postTemplates ?? [];

  return spacePostTemplates.length;
};
