import { getGraphqlClient } from '@test/utils/graphqlClient';
import { graphqlErrorWrapper } from '@test/utils/graphql.wrapper';
import { TestUser } from '@test/utils';
import { getOpportunityDataCodegen } from '../journey/opportunity/opportunity.request.params';
import { entitiesId } from '../roles/community/communications-helper';

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

export const relationCountPerOpportunity = async (): Promise<
  number | undefined
> => {
  const responseQuery = await getOpportunityDataCodegen(
    entitiesId.opportunityId
  );
  const response =
    responseQuery?.data?.lookup?.opportunity?.collaboration?.relations?.length;
  return response;
};

export const relationDataPerOpportunity = async (): Promise<Record<
  string,
  unknown
>> => {
  const responseQuery = await getOpportunityDataCodegen(
    entitiesId.opportunityId
  );
  const response =
    responseQuery?.data?.lookup?.opportunity?.collaboration?.relations?.[0] ??
    {};
  return response;
};
