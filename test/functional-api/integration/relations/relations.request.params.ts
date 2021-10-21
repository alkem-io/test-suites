import { TestUser } from '../../../utils/token.helper';
import { graphqlRequestAuth } from '../../../utils/graphql.request';
import { opportunityData, relationsData } from '@test/utils/common-params';
import { ecoverseId } from '../ecoverse/ecoverse.request.params';

export const createRelation = async (
  opportunityId: string,
  relationType: string,
  relationDescription?: string,
  relationActorName?: string,
  relationActorType?: string,
  relationActorRole?: string
) => {
  const requestParams = {
    operationName: null,
    query: `mutation createRelation($relationData: CreateRelationInput!) {
      createRelation(relationData: $relationData) {
          ${relationsData}
      }
    }`,
    variables: {
      relationData: {
        parentID: opportunityId,
        type: `${relationType}`,
        description: `${relationDescription}`,
        actorName: `${relationActorName}`,
        actorType: `${relationActorType}`,
        actorRole: `${relationActorRole}`,
      },
    },
  };

  return await graphqlRequestAuth(requestParams, TestUser.GLOBAL_ADMIN);
};

export const updateRelation = async (
  relationId: any,
  relationActorName: string,
  relationDescription?: string,
  relationType?: string,
  relationActorType?: string,
  relationActorRole?: string
) => {
  const requestParams = {
    operationName: null,
    query: `mutation updateRelation($relationData: RelationInput!, $ID: Float!) {
        updateRelation(relationData: $relationData, ID: $ID) {
          ${relationsData}
        }
      }`,
    variables: {
      ID: relationId,
      relationData: {
        type: `${relationType}`,
        description: `${relationDescription}`,
        actorName: `${relationActorName}`,
        actorType: `${relationActorType}`,
        actorRole: `${relationActorRole}`,
      },
    },
  };

  return await graphqlRequestAuth(requestParams, TestUser.GLOBAL_ADMIN);
};

export const removeRelation = async (relationId: any) => {
  const requestParams = {
    operationName: null,
    query: `mutation deleteRelation($deleteData: DeleteRelationInput!) {
      deleteRelation(deleteData: $deleteData) {
        id
      }}`,
    variables: {
      deleteData: {
        ID: relationId,
      },
    },
  };

  return await graphqlRequestAuth(requestParams, TestUser.GLOBAL_ADMIN);
};

export const getRelationsPerOpportunity = async (opportunityId: string) => {
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
