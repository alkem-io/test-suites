import { TestUser } from '@test/utils/token.helper';
import { graphqlRequestAuth } from '@test/utils/graphql.request';
import {
  lifecycleData,
  lifecycleTemplateData,
} from '@test/utils/common-params';
import {
  lifecycleDefaultDefinition,
  templateDefaultInfo,
} from './lifecycle-template-testdata';
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

export const createLifecycleTemplate = async (
  templatesSetID: string,
  type = 'CHALLENGE',
  definition: string = lifecycleDefaultDefinition,
  info: any = templateDefaultInfo,
  role = TestUser.GLOBAL_ADMIN
) => {
  const requestParams = {
    operationName: null,
    query: `mutation createLifecycleTemplate($lifecycleTemplateInput: CreateLifecycleTemplateOnTemplatesSetInput!) {
      createLifecycleTemplate(lifecycleTemplateInput: $lifecycleTemplateInput) {
          ${lifecycleTemplateData}
      }
    }`,
    variables: {
      lifecycleTemplateInput: {
        templatesSetID,
        type,
        definition,
        info,
      },
    },
  };

  return await graphqlRequestAuth(requestParams, role);
};

export const updateLifecycleTemplate = async (
  ID: string,
  definition: string = lifecycleDefaultDefinition,
  info: any = templateDefaultInfo,
  role = TestUser.GLOBAL_ADMIN
) => {
  const requestParams = {
    operationName: null,
    query: `mutation updateLifecycleTemplate($lifecycleTemplateInput: UpdateLifecycleTemplateInput!) {
      updateLifecycleTemplate(lifecycleTemplateInput: $lifecycleTemplateInput) {
        ${lifecycleTemplateData}
      }
    }`,
    variables: {
      lifecycleTemplateInput: {
        ID,
        definition,
        info,
      },
    },
  };

  return await graphqlRequestAuth(requestParams, role);
};

export const deleteLifecycleTemplate = async (
  ID: string,
  role = TestUser.GLOBAL_ADMIN
) => {
  const requestParams = {
    operationName: null,
    query: `mutation deleteLifecycleTemplate($deleteData: DeleteLifecycleTemplateInput!) {
      deleteLifecycleTemplate(deleteData: $deleteData) {
        ${lifecycleTemplateData}
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

export const queryLifecycleTemplates = async (
  templateSetId: string,
  role = TestUser.GLOBAL_ADMIN
) => {
  const requestParams = {
    operationName: null,
    query: `query {
      hub(ID: "${templateSetId}") {
        templates {
          id
          lifecycleTemplates{
            ${lifecycleTemplateData}
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
  titles: string
) => {
  const templatesPerHub = await getHubData(hubId);
  const allTemplates =
    templatesPerHub.body.data.hub.templates.lifecycleTemplates;
  const filteredTemplate = allTemplates.filter((info: { title: string }) => {
    return info.title === titles;
  });

  return filteredTemplate;
};

export const getLifecycleTemplatesCountForHub = async (hubId: string) => {
  const template = await getHubData(hubId);
  const hubLifecycleTemplates =
    template.body.data.hub.templates.lifecycleTemplates;

  return hubLifecycleTemplates.length;
};
