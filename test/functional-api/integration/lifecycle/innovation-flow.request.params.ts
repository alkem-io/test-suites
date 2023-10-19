import { TestUser } from '@test/utils/token.helper';
import { graphqlRequestAuth } from '@test/utils/graphql.request';
import {
  lifecycleData,
  innovationFlowTemplateData,
} from '@test/utils/common-params';
import {
  lifecycleDefaultDefinition,
  templateDefaultInfo,
} from './innovation-flow-template-testdata';
import { getSpaceData } from '../space/space.request.params';
import { getGraphqlClient } from '@test/utils/graphqlClient';
import { graphqlErrorWrapper } from '@test/utils/graphql.wrapper';

export const eventOnOrganizationVerification = async (
  organizationVerificationID: string,
  eventName: string
) => {
  const requestParams = {
    operationName: null,
    query: `mutation eventOnOrganizationVerification($organizationVerificationEventData: OrganizationVerificationEventInput!) {
      eventOnOrganizationVerification(organizationVerificationEventData: $organizationVerificationEventData) {
        id
          id
          lifecycle {
            ${lifecycleData}
          }
      }
    }`,
    variables: {
      organizationVerificationEventData: {
        organizationVerificationID,
        eventName,
      },
    },
  };

  return await graphqlRequestAuth(requestParams, TestUser.GLOBAL_ADMIN);
};

export const eventOnOrganizationVerificationCodegen = async (
  organizationVerificationID: string,
  eventName: string,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string) =>
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

export const eventOnChallenge = async (
  innovationFlowID: string,
  eventName: string
) => {
  const requestParams = {
    operationName: null,
    query: `mutation eventOnChallenge($input: InnovationFlowEvent!) {
      eventOnChallenge(innovationFlowEventData: $input)  {
        id
          id
          lifecycle {
            ${lifecycleData}
          }
        }
    }`,
    variables: {
      input: {
        innovationFlowID,
        eventName,
      },
    },
  };

  return await graphqlRequestAuth(requestParams, TestUser.GLOBAL_ADMIN);
};

export const eventOnOpportunity = async (
  innovationFlowID: string,
  eventName: string
) => {
  const requestParams = {
    operationName: null,
    query: `mutation eventOnOpportunity($input: InnovationFlowEvent!) {
      eventOnOpportunity(innovationFlowEventData: $input){
        id
          id
          lifecycle {
            ${lifecycleData}
          }
        }
    }`,
    variables: {
      input: {
        innovationFlowID,
        eventName,
      },
    },
  };

  return await graphqlRequestAuth(requestParams, TestUser.GLOBAL_ADMIN);
};

export const eventOnProject = async (ID: string, eventName: string) => {
  const requestParams = {
    operationName: null,
    query: `mutation eventOnProject($projectEventData: ProjectEventInput!) {
      eventOnProject(projectEventData: $projectEventData) {
        id
        innovationFlow {
          id
          lifecycle {
            ${lifecycleData}
          }
        }
      }
    }`,
    variables: {
      projectEventData: {
        ID,
        eventName,
      },
    },
  };

  return await graphqlRequestAuth(requestParams, TestUser.GLOBAL_ADMIN);
};

export const eventOnApplication = async (
  applicationID: string,
  eventName: string
) => {
  const requestParams = {
    operationName: null,
    query: `mutation eventOnApplication($input: ApplicationEventInput!) {
      eventOnApplication(applicationEventData: $input) {
        id
          id
          lifecycle {
            ${lifecycleData}
          }
        }
    }`,
    variables: {
      input: {
        applicationID,
        eventName,
      },
    },
  };

  return await graphqlRequestAuth(requestParams, TestUser.GLOBAL_ADMIN);
};

export const eventOnApplicationCodegen = async (
  applicationID: string,
  eventName: string,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string) =>
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

// mutation InvitationStateEvent($eventName: String!, $invitationId: UUID!) {
//   eventOnCommunityInvitation( invitationEventData: { eventName: $eventName, invitationID: $invitationId })

export const eventOnCommunityInvitation = async (
  invitationID: string,
  eventName: string,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const requestParams = {
    operationName: null,
    query: `
    mutation InvitationStateEvent($input: InvitationEventInput!) {
      eventOnCommunityInvitation(invitationEventData: $input) {
        id
        authorization{myPrivileges}
          id
          lifecycle {
            ${lifecycleData}
          }
        }
      }`,
    variables: {
      input: {
        invitationID,
        eventName,
      },
    },
  };

  return await graphqlRequestAuth(requestParams, userRole);
};

export const eventOnCommunityInvitationCodegen = async (
  invitationID: string,
  eventName: string,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string) =>
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

export const createInnovationFlowTemplate = async (
  templatesSetID: string,
  type?: string | 'CHALLENGE',
  options?: {
    profile?: {
      displayName?: string | 'Innovation flow - Display Name';
      description?: 'Template description';
    };
  },
  definition: string = lifecycleDefaultDefinition,
  role = TestUser.GLOBAL_ADMIN
) => {
  const requestParams = {
    operationName: null,
    query: `mutation createInnovationFlowTemplate($innovationFlowTemplateInput: CreateInnovationFlowTemplateOnTemplatesSetInput!) {
      createInnovationFlowTemplate(innovationFlowTemplateInput: $innovationFlowTemplateInput) {
          ${innovationFlowTemplateData}
      }
    }`,
    variables: {
      innovationFlowTemplateInput: {
        templatesSetID,
        type,
        definition,
        ...options,
      },
    },
  };

  return await graphqlRequestAuth(requestParams, role);
};

export const updateInnovationFlowTemplate = async (
  ID: string,
  definition: string = lifecycleDefaultDefinition,
  profile: any = templateDefaultInfo,
  role = TestUser.GLOBAL_ADMIN
) => {
  const requestParams = {
    operationName: null,
    query: `mutation updateInnovationFlowTemplate($innovationFlowTemplateInput: UpdateInnovationFlowTemplateInput!) {
      updateInnovationFlowTemplate(innovationFlowTemplateInput: $innovationFlowTemplateInput) {
        ${innovationFlowTemplateData}
      }
    }`,
    variables: {
      innovationFlowTemplateInput: {
        ID,
        definition,
        profile,
      },
    },
  };

  return await graphqlRequestAuth(requestParams, role);
};

export const deleteInnovationFlowTemplate = async (
  ID: string,
  role = TestUser.GLOBAL_ADMIN
) => {
  const requestParams = {
    operationName: null,
    query: `mutation deleteInnovationFlowTemplate($deleteData: DeleteInnovationFlowTemplateInput!) {
      deleteInnovationFlowTemplate(deleteData: $deleteData) {
        ${innovationFlowTemplateData}
      }
    }`,
    variables: {
      deleteData: {
        ID,
      },
    },
  };

  return await graphqlRequestAuth(requestParams, role);
};

export const queryInnovationFlowTemplates = async (
  templateSetId: string,
  role = TestUser.GLOBAL_ADMIN
) => {
  const requestParams = {
    operationName: null,
    query: `query {
      space(ID: "${templateSetId}") {
        templates {
          id
          innovationFlowTemplates{
            ${innovationFlowTemplateData}
          }
        }
      }
    }`,
    variables: null,
  };

  return await graphqlRequestAuth(requestParams, role);
};

export const getLifeCycleTemplateForSpaceByLifecycleTitle = async (
  spaceId: string,
  displayName: string
) => {
  const templatesPerSpace = await getSpaceData(spaceId);
  const allTemplates =
    templatesPerSpace.body.data.space.templates.innovationFlowTemplates;
  const filteredTemplate = allTemplates.filter(
    (profile: { displayName: string }) => {
      return profile.displayName === displayName;
    }
  );

  return filteredTemplate;
};

export const getInnovationFlowTemplatesCountForSpace = async (
  spaceId: string
) => {
  const template = await getSpaceData(spaceId);
  const spaceInnovationFlowTemplates =
    template.body.data.space.templates.innovationFlowTemplates;

  return spaceInnovationFlowTemplates.length;
};
