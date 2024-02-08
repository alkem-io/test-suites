import { opportunityData } from '@test/utils/common-params';
import { entitiesId } from '@test/functional-api/zcommunications/communications-helper';
import { getGraphqlClient } from '@test/utils/graphqlClient';
import { graphqlErrorWrapper } from '@test/utils/graphql.wrapper';
import { TestUser } from '@test/utils';
import { graphqlRequestAuth } from '@test/utils/graphql.request';

export const createRelationCodegen = async (
  collaborationID: string,
  relationType: string,
  relationDescription?: string,
  relationActorName?: string,
  relationActorType?: string,
  relationActorRole?: string,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.CreateRelationOnCollaboration(
      {
        data: {
          collaborationID,
          type: `${relationType}`,
          description: `${relationDescription}`,
          actorName: `${relationActorName}`,
          actorType: `${relationActorType}`,
          actorRole: `${relationActorRole}`,
        },
      },
      {
        authorization: `Bearer ${authToken}`,
      }
    );

  return graphqlErrorWrapper(callback, userRole);
};

export const deleteRelationCodegen = async (
  ID: string,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.DeleteRelation(
      {
        deleteData: {
          ID,
        },
      },
      {
        authorization: `Bearer ${authToken}`,
      }
    );

  return graphqlErrorWrapper(callback, userRole);
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
