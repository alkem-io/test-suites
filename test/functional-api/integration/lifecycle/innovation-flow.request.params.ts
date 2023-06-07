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
import { getHubData } from '../hub/hub.request.params';

export const eventOnOrganizationVerification = async (
  organizationVerificationID: string,
  eventName: string
) => {
  const requestParams = {
    operationName: null,
    query: `mutation eventOnOrganizationVerification($organizationVerificationEventData: OrganizationVerificationEventInput!) {
      eventOnOrganizationVerification(organizationVerificationEventData: $organizationVerificationEventData) {
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

export const eventOnChallenge = async (ID: string, eventName: string) => {
  const requestParams = {
    operationName: null,
    query: `mutation eventOnChallenge($challengeEventData: ChallengeEventInput!) {
      eventOnChallenge(challengeEventData: $challengeEventData) {
        id
        lifecycle {
          ${lifecycleData}
        }
      }
    }`,
    variables: {
      challengeEventData: {
        ID,
        eventName,
      },
    },
  };

  return await graphqlRequestAuth(requestParams, TestUser.GLOBAL_ADMIN);
};

export const eventOnOpportunity = async (ID: string, eventName: string) => {
  const requestParams = {
    operationName: null,
    query: `mutation eventOnOpportunity($opportunityEventData: OpportunityEventInput!) {
      eventOnOpportunity(opportunityEventData: $opportunityEventData) {
        id
        lifecycle {
          ${lifecycleData}
        }
      }
    }`,
    variables: {
      opportunityEventData: {
        ID,
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
        lifecycle {
          ${lifecycleData}
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
    query: `mutation eventOnApplication($applicationEventData: ApplicationEventInput!) {
      eventOnApplication(applicationEventData: $applicationEventData) {
        id
        lifecycle {
          ${lifecycleData}
        }
      }
    }`,
    variables: {
      applicationEventData: {
        applicationID,
        eventName,
      },
    },
  };

  return await graphqlRequestAuth(requestParams, TestUser.GLOBAL_ADMIN);
};

export const eventOnCommunityInvitation = async (
  invitationID: string,
  eventName: string,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const requestParams = {
    operationName: null,
    query: `mutation eventOnCommunityInvitation($invitationEventData: InvitationEventInput!) {
      eventOnCommunityInvitation(invitationEventData: $invitationEventData) {
        id
        lifecycle {
          ${lifecycleData}
        }
      }
    }`,
    variables: {
      invitationEventData: {
        invitationID,
        eventName,
      },
    },
  };

  return await graphqlRequestAuth(requestParams, userRole);
};

export const createInnovationFlowTemplate = async (
  templatesSetID: string,
  type = 'CHALLENGE',
  definition: string = lifecycleDefaultDefinition,
  profile: any = templateDefaultInfo,
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
        profile,
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
      hub(ID: "${templateSetId}") {
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

export const getLifeCycleTemplateForHubByLifecycleTitle = async (
  hubId: string,
  displayName: string
) => {
  const templatesPerHub = await getHubData(hubId);
  const allTemplates =
    templatesPerHub.body.data.hub.templates.innovationFlowTemplates;
  const filteredTemplate = allTemplates.filter(
    (profile: { displayName: string }) => {
      return profile.displayName === displayName;
    }
  );

  return filteredTemplate;
};

export const getInnovationFlowTemplatesCountForHub = async (hubId: string) => {
  const template = await getHubData(hubId);
  const hubInnovationFlowTemplates =
    template.body.data.hub.templates.innovationFlowTemplates;

  return hubInnovationFlowTemplates.length;
};
