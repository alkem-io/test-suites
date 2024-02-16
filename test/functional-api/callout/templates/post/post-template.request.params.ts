import { TestUser } from '@test/utils/token.helper';
import { getSpaceDataCodegen } from '@test/functional-api/journey/space/space.request.params';
import { getGraphqlClient } from '@test/utils/graphqlClient';
import { graphqlErrorWrapper } from '@test/utils/graphql.wrapper';

export enum PostTypes {
  RELATED_INITIATIVE = 'related_initiative',
  KNOWLEDGE = 'knowledge',
  ACTOR = 'actor',
}

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
    graphqlClient.CreatePostTemplate(
      {
        postTemplateInput: {
          templatesSetID,
          type,
          defaultDescription,
          profile: {
            displayName,
            description,
          },
        },
      },
      {
        authorization: `Bearer ${authToken}`,
      }
    );

  return graphqlErrorWrapper(callback, userRole);
};

export const updatePostTemplateCodegen = async (
  ID: string,
  type = 'Post Template Type - Update',
  defaultDescription = 'Default post template description - Update',
  displayName = 'Default post template title - Update',
  description = 'Default post template info description - Update',
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.UpdatePostTemplate(
      {
        postTemplateInput: {
          ID,
          type,
          defaultDescription,
          profile: {
            displayName,
            description,
          },
        },
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
    graphqlClient.DeletePostTemplate(
      {
        deleteData: {
          ID: postTemplateId,
        },
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
  const allTemplates = templatesPerSpace?.data?.space?.templates?.postTemplates;
  const filteredTemplate = allTemplates?.filter((obj: { type: string }) => {
    return obj.type === postType;
  });
  return filteredTemplate;
};

export const getPostTemplatesCountForSpace = async (spaceId: string) => {
  const template = await getSpaceDataCodegen(spaceId);
  const spacePostTemplates =
    template?.data?.space?.templates?.postTemplates ?? [];

  return spacePostTemplates.length;
};
