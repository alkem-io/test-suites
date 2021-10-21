import { lifecycleData } from '../common-params';

export const eventOnChallenge = `
mutation eventOnChallenge($challengeEventData: ChallengeEventInput!) {
  eventOnChallenge(challengeEventData: $challengeEventData) {
    id
    lifecycle {
      ${lifecycleData}
    }
  }
}`;

export const eventOnChallengeVariablesData = (
  challengeId: string,
  eventsName: string
) => {
  const variables = {
    challengeEventData: {
      ID: challengeId,
      eventName: `${eventsName}`,
    },
  };
  const responseData = JSON.stringify(variables);
  return responseData;
};

export const eventOnOpportunity = `
mutation eventOnOpportunity($opportunityEventData: OpportunityEventInput!) {
  eventOnOpportunity(opportunityEventData: $opportunityEventData) {
    id
    lifecycle {
      ${lifecycleData}
    }
  }
}`;

export const eventOnOpportunityVariablesData = (
  opportunityId: string,
  eventsName: string
) => {
  const variables = {
    opportunityEventData: {
      ID: opportunityId,
      eventName: `${eventsName}`,
    },
  };
  const responseData = JSON.stringify(variables);
  return responseData;
};

export const eventOnProject = `
mutation eventOnProject($projectEventData: ProjectEventInput!) {
  eventOnProject(projectEventData: $projectEventData) {
    id
    lifecycle {
      ${lifecycleData}
    }
  }
}`;

export const eventOnProjectVariablesData = (
  projectId: string,
  eventsName: string
) => {
  const variables = {
    projectEventData: {
      ID: projectId,
      eventName: `${eventsName}`,
    },
  };
  const responseData = JSON.stringify(variables);
  return responseData;
};

export const eventOnApplication = `
mutation eventOnApplication($applicationEventData: ApplicationEventInput!) {
  eventOnApplication(applicationEventData: $applicationEventData) {
    id
    lifecycle {
      ${lifecycleData}
    }
  }
}`;

export const eventOnApplicationVariablesData = (
  applicationId: string,
  eventsName: string
) => {
  const variables = {
    applicationEventData: {
      applicationID: applicationId,
      eventName: `${eventsName}`,
    },
  };
  const responseData = JSON.stringify(variables);
  return responseData;
};
