import { TestUser } from '@test/utils/token.helper';
import {
  lifecycleDefaultDefinition,
  templateDefaultInfo,
} from './innovation-flow-template-testdata';
import { getGraphqlClient } from '@test/utils/graphqlClient';
import { graphqlErrorWrapper } from '@test/utils/graphql.wrapper';
import { InnovationFlowType } from '@alkemio/client-lib';
import { getSpaceDataCodegen } from '../journey/space/space.request.params';

export const eventOnOrganizationVerificationCodegen = async (
  organizationVerificationID: string,
  eventName: string,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.eventOnOrganizationVerification(
      {
        organizationVerificationEventData: {
          organizationVerificationID,
          eventName,
        },
      },
      {
        authorization: `Bearer ${authToken}`,
      }
    );

  return graphqlErrorWrapper(callback, userRole);
};

export const eventOnChallengeCodegen = async (
  innovationFlowID: string,
  eventName: string,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.EventOnChallenge(
      {
        input: {
          innovationFlowID,
          eventName,
        },
      },
      {
        authorization: `Bearer ${authToken}`,
      }
    );
  return graphqlErrorWrapper(callback, userRole);
};

export const eventOnOpportunityCodegen = async (
  innovationFlowID: string,
  eventName: string,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.EventOnOpportunity(
      {
        input: {
          innovationFlowID,
          eventName,
        },
      },
      {
        authorization: `Bearer ${authToken}`,
      }
    );
  return graphqlErrorWrapper(callback, userRole);
};

export const eventOnApplicationCodegen = async (
  applicationID: string,
  eventName: string,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.eventOnApplication(
      {
        input: {
          applicationID,
          eventName,
        },
      },
      {
        authorization: `Bearer ${authToken}`,
      }
    );
  return graphqlErrorWrapper(callback, userRole);
};

export const eventOnCommunityInvitationCodegen = async (
  invitationID: string,
  eventName: string,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.InvitationStateEvent(
      {
        input: {
          invitationID,
          eventName,
        },
      },
      {
        authorization: `Bearer ${authToken}`,
      }
    );
  return graphqlErrorWrapper(callback, userRole);
};

export const createInnovationFlowTemplateCodegen = async (
  templatesSetID: string,
  type: InnovationFlowType = InnovationFlowType.Challenge,
  options?: {
    profile?: {
      displayName?: string;
      description?: 'Template description';
    };
  },
  definition: string = lifecycleDefaultDefinition,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.CreateInnovationFlowTemplate(
      {
        innovationFlowTemplateInput: {
          templatesSetID,
          type,
          definition,
          ...options,
          profile: {
            displayName:
              options?.profile?.displayName || 'Innovation flow - Display Name', // Ensure displayName is not undefined
            description:
              options?.profile?.description || 'Template description',
          },
        },
      },
      {
        authorization: `Bearer ${authToken}`,
      }
    );
  return graphqlErrorWrapper(callback, userRole);
};

export const updateInnovationFlowTemplateCodegen = async (
  ID: string,
  profile: any = templateDefaultInfo,
  definition: string = lifecycleDefaultDefinition,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.UpdateInnovationFlowTemplate(
      {
        innovationFlowTemplateInput: {
          ID,
          definition,
          profile: {
            displayName:
              profile?.displayName || 'Innovation flow - Display Name', // Ensure displayName is not undefined
            description: profile?.description || 'Template description',
          },
        },
      },
      {
        authorization: `Bearer ${authToken}`,
      }
    );
  return graphqlErrorWrapper(callback, userRole);
};

export const deleteInnovationFlowTemplateCodegen = async (
  ID: string,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.DeleteInnovationFlowTemplate(
      {
        deleteData: {
          ID,
        },
      },
      {
        authorization: `Bearer ${authToken}`,
      }
    );
  return graphqlErrorWrapper(callback, userRole);
};

export const getLifeCycleTemplateForSpaceByLifecycleTitle = async (
  spaceId: string,
  displayName: string
) => {
  const templatesPerSpace = await getSpaceDataCodegen(spaceId);
  const allTemplates =
    templatesPerSpace?.data?.space?.templates?.innovationFlowTemplates ?? [];

  const filteredTemplate = allTemplates?.filter(item => {
    return item.profile.displayName === displayName;
  });

  return filteredTemplate;
};

export const getInnovationFlowTemplatesCountForSpace = async (
  spaceId: string
) => {
  const template = await getSpaceDataCodegen(spaceId);
  const spaceInnovationFlowTemplates =
    template?.data?.space?.templates?.innovationFlowTemplates.length;

  return spaceInnovationFlowTemplates;
};
