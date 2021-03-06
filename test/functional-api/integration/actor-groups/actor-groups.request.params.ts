import { TestUser } from '@test/utils/token.helper';
import { graphqlRequestAuth } from '@test/utils/graphql.request';
import { actorGrpupData, contextData } from '@test/utils/common-params';

export const createActorGroup = async (
  ecosystemModelId: string,
  actorGroupName: string,
  actorDescritpion?: string
) => {
  const requestParams = {
    operationName: null,
    query: `mutation createActorGroup($actorGroupData: CreateActorGroupInput!) {
      createActorGroup(actorGroupData: $actorGroupData){
          ${actorGrpupData}
        }
      }`,
    variables: {
      actorGroupData: {
        ecosystemModelID: ecosystemModelId,
        name: `${actorGroupName}`,
        description: `${actorDescritpion}`,
      },
    },
  };

  return await graphqlRequestAuth(requestParams, TestUser.GLOBAL_ADMIN);
};

export const removeActorGroup = async (actorGroupId: any) => {
  const requestParams = {
    operationName: null,
    query: `mutation deleteActorGroup($deleteData: DeleteActorGroupInput!) {
      deleteActorGroup(deleteData: $deleteData) {
        id
      }}`,
    variables: {
      deleteData: {
        ID: actorGroupId,
      },
    },
  };

  return await graphqlRequestAuth(requestParams, TestUser.GLOBAL_ADMIN);
};

export const getActorGroupsPerOpportunity = async (
  hubId: string,
  opportunityId: string
) => {
  const requestParams = {
    operationName: null,
    query: `query {hub(ID: "${hubId}" ) {opportunity(ID: "${opportunityId}") {
          context{
            ${contextData}
            }
          }
        }
      }`,
  };

  return await graphqlRequestAuth(requestParams, TestUser.GLOBAL_ADMIN);
};

export const getActorData = async (hubId: string, subChallengeId: any) => {
  const requestParams = {
    operationName: null,
    query: `query {hub(ID: "${hubId}" ) {challenge(ID: "${subChallengeId}") {
        context{
          ${contextData}
          }
        }
      }
    }`,
  };

  return await graphqlRequestAuth(requestParams, TestUser.GLOBAL_ADMIN);
};
