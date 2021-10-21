import { TestUser } from '@test/utils/token.helper';
import { graphqlRequestAuth } from '@test/utils/graphql.request';
import { aspectData, collaborationData, contextData, opportunityData, projectData } from '@test/utils/common-params';
import { ecoverseId } from '../ecoverse/ecoverse.request.params';

export const createAspectOnProject = async (
  projectId: string,
  aspectTitle: string,
  aspectFraming?: string,
  aspectExplenation?: string
) => {
  const requestParams = {
    operationName: null,
    query: `mutation CreateAspectOnProject($aspectData: CreateAspectInput!) {
      createAspectOnProject(aspectData: $aspectData) {
        ${aspectData}
      }
    }`,
    variables: {
      aspectData: {
        parentID: projectId,
        title: `${aspectTitle}`,
        framing: `${aspectFraming}`,
        explanation: `${aspectExplenation}`,
      },
    },
  };

  return await graphqlRequestAuth(requestParams, TestUser.GLOBAL_ADMIN);
};

export const createAspectOnOpportunity = async (
  opportunityContextId: string,
  aspectTitle: string,
  aspectFraming?: string,
  aspectExplenation?: string
) => {
  const requestParams = {
    operationName: null,
    query: `mutation CreateAspect($aspectData: CreateAspectInput!) {
      createAspect(aspectData: $aspectData)  {
        ${aspectData}
      }
    }`,
    variables: {
      aspectData: {
        parentID: opportunityContextId,
        title: `${aspectTitle}`,
        framing: `${aspectFraming}`,
        explanation: `${aspectExplenation}`,
      },
    },
  };

  return await graphqlRequestAuth(requestParams, TestUser.GLOBAL_ADMIN);
};

export const updateAspect = async (
  aspectId: string,
  aspectTitle: string,
  aspectFraming?: string,
  aspectExplenation?: string
) => {
  const requestParams = {
    operationName: null,
    query: `mutation updateAspect($aspectData: UpdateAspectInput!) {
      updateAspect(aspectData: $aspectData) {
        ${aspectData}
      }
    }`,
    variables: {
      aspectData: {
        ID: aspectId,
        title: `${aspectTitle}`,
        framing: `${aspectFraming}`,
        explanation: `${aspectExplenation}`,
      },
    },
  };

  return await graphqlRequestAuth(requestParams, TestUser.GLOBAL_ADMIN);
};

export const removeAspect = async (aspectId: string) => {
  const requestParams = {
    operationName: null,
    query: `mutation deleteAspect($deleteData: DeleteAspectInput!) {
      deleteAspect(deleteData: $deleteData) {
        id
      }}`,
    variables: {
      deleteData: {
        ID: aspectId,
      },
    },
  };

  return await graphqlRequestAuth(requestParams, TestUser.GLOBAL_ADMIN);
};

export const getAspectPerOpportunity = async (opportunityId: string) => {
  const requestParams = {
    operationName: null,
    query: `query {ecoverse(ID: "${await ecoverseId()}") { opportunity(ID: "${opportunityId}") {
            ${opportunityData}
        }
      }
    }`,
  };

  return await graphqlRequestAuth(requestParams, TestUser.GLOBAL_ADMIN);
};

export const getAspectPerProject = async (projectId: string) => {
  const requestParams = {
    operationName: null,
    query: `query {ecoverse(ID: "${await ecoverseId()}") { project(ID: "${projectId}") {
        aspects{
          ${aspectData}
        }
      }
    }
  }`,
  };

  return await graphqlRequestAuth(requestParams, TestUser.GLOBAL_ADMIN);
};
