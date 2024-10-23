import { TestUser } from '@test/utils/token.helper';
import { getSpaceData } from '../../journey/space/space.request.params';
import { getGraphqlClient } from '@test/utils/graphqlClient';
import { graphqlErrorWrapper } from '@test/utils/graphql.wrapper';

export const getLifeCycleTemplateForSpaceByLifecycleTitle = async (
  spaceId: string,
  displayName: string
) => {
  const templatesPerSpace = await getSpaceData(spaceId);
  const allTemplates =
    templatesPerSpace?.data?.space?.templatesManager?.templatesSet
      ?.innovationFlowTemplates ?? [];

  const filteredTemplate = allTemplates?.filter(item => {
    return item.profile.displayName === displayName;
  });

  return filteredTemplate;
};

export const getCollaborationTemplatesCountForSpace = async (
  spaceId: string
) => {
  const template = await getSpaceData(spaceId);
  const spaceCollaborationTemplates =
    template?.data?.space?.templatesManager?.templatesSet
      ?.innovationFlowTemplates.length;

  return spaceCollaborationTemplates;
};
