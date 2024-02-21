import { TestUser } from '@test/utils/token.helper';
import { getGraphqlClient } from '@test/utils/graphqlClient';
import { graphqlErrorWrapper } from '@test/utils/graphql.wrapper';

export enum PostTypes {
  RELATED_INITIATIVE = 'related_initiative',
  KNOWLEDGE = 'knowledge',
  ACTOR = 'actor',
}

export const options = {
  profileData: {
    displayName: 'Default display name',
    description: 'Please share your contribution. The more details the better!',
  },
};

export const createPostOnCalloutCodegen = async (
  calloutID: string,
  profileData: {
    displayName: string;
    description?: string;
  },
  nameID?: string,
  type: string = PostTypes.KNOWLEDGE,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const graphqlClient = await getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.CreateContributionOnCallout(
      {
        contributionData: {
          calloutID,
          post: {
            nameID,
            type,
            profileData,
          },
        },
      },
      {
        authorization: `Bearer ${authToken}`,
      }
    );

  return graphqlErrorWrapper(callback, userRole);
};

export const updatePostCodegen = async (
  ID: string,
  nameID: string,
  options?: {
    profileData?: {
      displayName?: string;
      description?: string;
    };
  },
  type?: string,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const graphqlClient = await getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.UpdatePost(
      {
        postData: {
          ID,
          nameID,
          ...options,
          type,
        },
      },
      {
        authorization: `Bearer ${authToken}`,
      }
    );

  return graphqlErrorWrapper(callback, userRole);
};

export const deletePostCodegen = async (
  ID: string,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.DeletePost(
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

export const getDataPerSpaceCalloutCodegen = async (
  spaceNameId: string,
  calloutId: string,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.SpaceCallout(
      {
        spaceNameId,
        calloutId,
      },
      {
        authorization: `Bearer ${authToken}`,
      }
    );

  return graphqlErrorWrapper(callback, userRole);
};

export const getDataPerChallengeCalloutCodegen = async (
  challengeNameId: string,
  calloutId: string,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.ChallengeCallout(
      {
        challengeNameId,
        calloutId,
      },
      {
        authorization: `Bearer ${authToken}`,
      }
    );

  return graphqlErrorWrapper(callback, userRole);
};

export const getDataPerOpportunityCalloutCodegen = async (
  opportunityId: string,
  calloutId: string,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.OpportunityCallout(
      {
        opportunityId,
        calloutId,
      },
      {
        authorization: `Bearer ${authToken}`,
      }
    );

  return graphqlErrorWrapper(callback, userRole);
};

export const postDataPerSpaceCallout = async (
  spaceId: string,
  spaceCalloutId: string
): Promise<any[]> => {
  const responseQuery = await getDataPerSpaceCalloutCodegen(
    spaceId,
    spaceCalloutId
  );
  const spacePosts =
    responseQuery?.data?.space?.collaboration?.callouts?.[0]?.contributions?.filter(
      (c: { post?: any }) => c.post !== null
    ) ?? [];
  return spacePosts;
};

export const postDataPerChallengeCallout = async (
  // spaceId: string,
  challengeId: string,
  challangeCalloutId: string
): Promise<any[]> => {
  const responseQuery = await getDataPerChallengeCalloutCodegen(
    challengeId,
    challangeCalloutId
  );
  const challengePosts =
    responseQuery?.data?.lookup?.challenge?.collaboration?.callouts?.[0].contributions?.filter(
      (c: { post?: any }) => c.post !== null
    ) ?? [];
  return challengePosts;
};

export const postDataPerOpportunityCallout = async (
  // spaceId: string,
  opportunityId: string,
  opportunityCalloutId: string
): Promise<any[]> => {
  const responseQuery = await getDataPerOpportunityCalloutCodegen(
    opportunityId,
    opportunityCalloutId
  );

  const opportunityPosts =
    responseQuery?.data?.lookup?.opportunity?.collaboration?.callouts?.[0].contributions?.filter(
      (c: { post?: any }) => c.post !== null
    ) ?? [];
  return opportunityPosts;
};
