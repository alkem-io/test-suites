/* eslint-disable @typescript-eslint/no-explicit-any */
import { getGraphqlClient, TestUser } from '@alkemio/tests-lib';
import { templateDefaultInfo } from './space-template-testdata';
import { getSpaceData } from '../../journey/space/space.request.params';
import { graphqlErrorWrapper } from '@alkemio/tests-lib/utils/graphql.wrapper';
import { GetTemplateById } from '../template.request.params';

export const getLifeCycleTemplateForSpaceByLifecycleTitle = async (
  spaceId: string,
  displayName: string
) => {
  const templatesPerSpace = await getSpaceData(spaceId);
  const allTemplates =
    templatesPerSpace?.data?.lookup?.space?.templatesManager?.templatesSet
      ?.spaceTemplates ?? [];

  const filteredTemplate = allTemplates?.filter(item => {
    return item.profile.displayName === displayName;
  });

  return filteredTemplate;
};

export const getSpaceTemplatesCountForSpace = async (spaceId: string) => {
  const template = await getSpaceData(spaceId);
  const spaceCollaborationTemplates =
    template?.data?.lookup?.space?.templatesManager?.templatesSet
      ?.spaceTemplates.length;

  return spaceCollaborationTemplates;
};

export const getSpaceTemplatesCountByTemplateSetId = async (
  templateSetId: string,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.GetSpaceTemplatesCountByTemplateSetId(
      {
        templateSetId,
      },
      {
        authorization: `Bearer ${authToken}`,
      }
    );

  return graphqlErrorWrapper(callback, userRole);
};

export const getSpaceTemplatesCount = async (templateSetId: string) => {
  const templates = await getSpaceTemplatesCountByTemplateSetId(templateSetId);
  const collaborationTemplatesCount =
    templates?.data?.lookup?.templatesSet?.spaceTemplatesCount ?? '';

  return collaborationTemplatesCount;
};

export const createTemplateFromSpace = async (
  spaceId: string,
  templatesSetId: string,
  displayName: string,
  recursive?: boolean,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.CreateTemplateFromSpace(
      {
        spaceId,
        templatesSetId,
        profileData: { displayName },
        recursive,
      },
      {
        authorization: `Bearer ${authToken}`,
      }
    );
  return graphqlErrorWrapper(callback, userRole);
};

export const updateSpaceTemplate = async (
  templateId: string,
  profile: any = templateDefaultInfo,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.UpdateSpaceTemplate(
      {
        templateId,
        profile,
      },
      {
        authorization: `Bearer ${authToken}`,
      }
    );
  return graphqlErrorWrapper(callback, userRole);
};

export const createSpaceFromTemplate = async (
  spaceTemplateId: string,
  accountId: string,
  displayName: string,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.createSpace(
      {
        spaceData: {
          spaceTemplateID: spaceTemplateId,
          accountID: accountId,
          about: {
            profileData: {
              displayName,
            },
          },
          collaborationData: {
            calloutsSetData: {},
            addTutorialCallouts: false,
          },
        },
      },
      {
        authorization: `Bearer ${authToken}`,
      }
    );
  return graphqlErrorWrapper(callback, userRole);
};

export const createSubSpaceFromTemplate = async (
  spaceTemplateID: string,
  spaceID: string,
  nameID: string,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.CreateSubspace(
      {
        subspaceData: {
          spaceTemplateID,
          spaceID,
          nameID,
          about: {
            profileData: {
              displayName: nameID,
            },
          },
          collaborationData: {
            calloutsSetData: {},
            addTutorialCallouts: false,
          },
        },
      },
      {
        authorization: `Bearer ${authToken}`,
      }
    );
  return graphqlErrorWrapper(callback, userRole);
};

export const getTemplateContentSpaceHierarchy = async (
  templateId: string,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const template = await GetTemplateById(templateId, userRole);
  return template?.data?.lookup?.template?.contentSpace;
};

export const getSpaceHierarchy = async (spaceId: string) => {
  const space = await getSpaceData(spaceId);
  return space?.data?.lookup?.space;
};
