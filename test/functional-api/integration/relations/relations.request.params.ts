import { TestUser } from '../../../utils/token.helper';
import {
  graphqlRequest,
  graphqlRequestAuth,
} from '../../../utils/graphql.request';
import { opportunityData, relationsData } from '@test/utils/common-params';
import { entitiesId } from '@test/functional-api/zcommunications/communications-helper';

export const createRelation = async (
  collaborationID: string,
  relationType: string,
  relationDescription?: string,
  relationActorName?: string,
  relationActorType?: string,
  relationActorRole?: string,
  user?: TestUser
) => {
  const requestParams = {
    operationName: null,
    query: `mutation createRelationOnCollaboration($data: CreateRelationOnCollaborationInput!){
      createRelationOnCollaboration(relationData: $data){
        ${relationsData}
      }
    }`,
    variables: {
      data: {
        collaborationID,
        type: `${relationType}`,
        description: `${relationDescription}`,
        actorName: `${relationActorName}`,
        actorType: `${relationActorType}`,
        actorRole: `${relationActorRole}`,
      },
    },
  };

  if (!user) return await graphqlRequest(requestParams);

  return await graphqlRequestAuth(requestParams, user);
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

export const getRelationsPerOpportunity = async (
  spaceId: string,
  opportunityId: string
) => {
  const requestParams = {
    operationName: null,
    query: `query {space(ID: "${spaceId}") { opportunity(ID: "${opportunityId}") {
            ${opportunityData}
        }
      }
    }`,
  };

  return await graphqlRequestAuth(requestParams, TestUser.GLOBAL_ADMIN);
};

export const relationCountPerOpportunity = async (): Promise<number> => {
  const responseQuery = await getRelationsPerOpportunity(
    entitiesId.spaceId,
    entitiesId.opportunityId
  );
  const response =
    responseQuery.body.data.space.opportunity.collaboration.relations;
  return response;
};

export const relationDataPerOpportunity = async (): Promise<string> => {
  const responseQuery = await getRelationsPerOpportunity(
    entitiesId.spaceId,
    entitiesId.opportunityId
  );
  const response =
    responseQuery.body.data.space.opportunity.collaboration.relations[0];
  return response;
};
