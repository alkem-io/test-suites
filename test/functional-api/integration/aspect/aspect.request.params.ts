import { TestUser } from '@test/utils/token.helper';
import { graphqlRequestAuth } from '@test/utils/graphql.request';
import { aspectData, opportunityData } from '@test/utils/common-params';

export enum AspectTypes {
  RELATED_INITIATIVE = 'related_initiative',
  KNOWLEDGE = 'knowledge',
  ACTOR = 'actor',
}

export const createAspectOnContext = async (
  contextID: string,
  displayName: string,
  nameID?: string,
  description: string = 'some description',
  type: AspectTypes = AspectTypes.ACTOR,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const requestParams = {
    operationName: null,
    query: `mutation CreateAspect($aspectData: CreateAspectOnContextInput!) {
      createAspectOnContext(aspectData: $aspectData) {
        ${aspectData}
      }
    }`,
    variables: {
      aspectData: {
        contextID,

        displayName,
        nameID,
        description,
        type,
      },
    },
  };

  return await graphqlRequestAuth(requestParams, userRole);
};

export const createAspectOnOpportunity = async (
  opportunityContextId: string,
  aspectTitle: string,
  aspectFraming?: string,
  aspectExplenation?: string
) => {
  const requestParams = {
    operationName: null,
    query: `mutation CreateAspect($aspectData: CreateAspectOnContextInput!) {
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
  ID: string,
  nameID: string,
  displayName?: string,
  description?: string,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
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
        ID,
        nameID,
        displayName,
        description,
      },
    },
  };

  return await graphqlRequestAuth(requestParams, userRole);
};

export const removeAspect = async (
  aspectId: string,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
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

  return await graphqlRequestAuth(requestParams, userRole);
};

export const getAspectPerEntity = async (
  hubId?: string,
  challengeId?: string,
  opportunityId?: string
) => {
  const requestParams = {
    operationName: null,
    query: `query {
      hub(ID: "${hubId}") {
        context {
          aspects {
            ${aspectData}
          }
        }
        challenge(ID: "${challengeId}") {
          id
          nameID
          context {
            aspects {
              ${aspectData}
            }
          }
        }
        opportunity(ID: "${opportunityId}") {
          id
          nameID
          context {
            aspects {
              ${aspectData}
            }
          }
        }
      }
    }
    `,
  };

  return await graphqlRequestAuth(requestParams, TestUser.GLOBAL_ADMIN);
};

export const getAspectPerOpportunity = async (
  hubId: string,
  opportunityId: string
) => {
  const requestParams = {
    operationName: null,
    query: `query {hub(ID: "${hubId}") { opportunity(ID: "${opportunityId}") {
            ${opportunityData}
        }
      }
    }`,
  };

  return await graphqlRequestAuth(requestParams, TestUser.GLOBAL_ADMIN);
};

export const getAspectPerProject = async (hubId: string, projectId: string) => {
  const requestParams = {
    operationName: null,
    query: `query {hub(ID: "${hubId}") { project(ID: "${projectId}") {
        aspects{
          ${aspectData}
        }
      }
    }
  }`,
  };

  return await graphqlRequestAuth(requestParams, TestUser.GLOBAL_ADMIN);
};
