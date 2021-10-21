import { TestUser } from '@test/utils/token.helper';
import { graphqlRequestAuth } from '@test/utils/graphql.request';
import { lifecycleData } from '@test/utils/common-params';

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
