import { TestUser } from '@test/utils/token.helper';
import { graphqlRequestAuth } from '@test/utils/graphql.request';
import {
  postData,
  postTemplateData,
  calloutData,
  opportunityData,
} from '@test/utils/common-params';
import { getSpaceDataCodegen } from '@test/functional-api/journey/space/space.request.params';
import { entitiesId } from '@test/functional-api/zcommunications/communications-helper';
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

export const getPostPerEntity = async (
  spaceId?: string,
  challengeId?: string,
  opportunityId?: string
) => {
  const requestParams = {
    operationName: null,
    query: `query {
      space(ID: "${spaceId}") {
        collaboration {callouts(ID:"${entitiesId.spaceCalloutId}") {
          posts {
            ${postData}
          }}
        }
        challenge(ID: "${challengeId}") {
          id
          nameID
          collaboration {callouts(ID:"${entitiesId.challengeCalloutId}"){
            posts {
              ${postData}
            }}
          }
        }
        opportunity(ID: "${opportunityId}") {
          id
          nameID
          collaboration {callouts (ID:"${entitiesId.opportunityCalloutId}"){
            posts {
              ${postData}
            }
          }}
        }
      }
    }
    `,
  };

  return await graphqlRequestAuth(requestParams, TestUser.GLOBAL_ADMIN);
};

export const getPostPerOpportunity = async (
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

export const createPostTemplate = async (
  templatesSetID: string,
  type = 'Post Template Type',
  defaultDescription = 'Default post template description',
  displayName = 'Default post template title',
  description = 'Default post template info description',
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const requestParams = {
    operationName: null,
    query: `mutation createPostTemplate($postTemplateInput: CreatePostTemplateOnTemplatesSetInput!) {
      createPostTemplate(postTemplateInput: $postTemplateInput){
        ${postTemplateData}
      }
    }`,
    variables: {
      postTemplateInput: {
        templatesSetID,
        type,
        defaultDescription,
        profile: {
          displayName,
          description,
        },
      },
    },
  };

  return await graphqlRequestAuth(requestParams, userRole);
};

export const createPostTemplateNoType = async (
  templatesSetID: string,
  type?: string,
  defaultDescription = 'Default post template description',
  displayName = 'Default post template title',
  description = 'Default post template info description',
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const requestParams = {
    operationName: null,
    query: `mutation createPostTemplate($postTemplateInput: CreatePostTemplateOnTemplatesSetInput!) {
      createPostTemplate(postTemplateInput: $postTemplateInput){
        ${postTemplateData}
      }
    }`,
    variables: {
      postTemplateInput: {
        templatesSetID,
        type,
        defaultDescription,
        profile: {
          displayName,
          description,
        },
      },
    },
  };

  return await graphqlRequestAuth(requestParams, userRole);
};

export const updatePostTemplate = async (
  ID: string,
  type = 'Post Template Type - Update',
  defaultDescription = 'Default post template description - Update',
  displayName = 'Default post template title - Update',
  description = 'Default post template info description - Update',
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const requestParams = {
    operationName: null,
    query: `mutation updatePostTemplate($postTemplateInput: UpdatePostTemplateInput!) {
      updatePostTemplate(postTemplateInput: $postTemplateInput) {
        ${postTemplateData}
      }
    }`,
    variables: {
      postTemplateInput: {
        ID,
        type,
        defaultDescription,
        profile: {
          displayName,
          description,
        },
      },
    },
  };

  return await graphqlRequestAuth(requestParams, userRole);
};

export const deletePostTemplate = async (
  postTemplateId: string,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const requestParams = {
    operationName: null,
    query: `mutation deletePostTemplate($deleteData: DeletePostTemplateInput!) {
      deletePostTemplate(deleteData: $deleteData){
      type
    }
  }`,
    variables: {
      deleteData: {
        ID: postTemplateId,
      },
    },
  };

  return await graphqlRequestAuth(requestParams, userRole);
};

export const getPostTemplateForSpaceByPostType = async (
  spaceId: string,
  postType: string
) => {
  const templatesPerSpace = await getSpaceDataCodegen(spaceId);
  const allTemplates = templatesPerSpace?.data?.space?.templates?.postTemplates;
  const filteredTemplate = allTemplates?.filter((obj: { type: string }) => {
    return obj.type === postType;
  });
  console.log(filteredTemplate);
  return filteredTemplate;
};

export const getPostTemplatesCountForSpace = async (spaceId: string) => {
  const template = await getSpaceDataCodegen(spaceId);
  const spacePostTemplates =
    template?.data?.space?.templates?.postTemplates ?? [];

  return spacePostTemplates.length;
};

export const postDataPerCallout = async (
  spaceId: string,
  challengeId?: string,
  opportunityId?: string
) => {
  const responseQuery = await getPostPerEntity(
    spaceId,
    challengeId,
    opportunityId
  );
  const spacePost = responseQuery.body.data.space.collaboration.callouts.posts;
  const challengePost =
    responseQuery.body.data.space.challenge.collaboration.callouts.posts;
  const opportunityPost =
    responseQuery.body.data.space.opportunity.collaboration.callouts.posts;
  return { spacePost, challengePost, opportunityPost };
};

export const getDataPerSpaceCallout = async (
  spaceNameId: string,
  calloutId: string,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const requestParams = {
    operationName: null,
    query: `query SpaceCallout(\$spaceNameId: UUID_NAMEID\!, \$calloutId: UUID_NAMEID\!) {
      space(ID: $spaceNameId) {
        id
        collaboration {
          callouts(IDs: [\$calloutId]) {
            ...Callout
          }
        }
      }
    }

    fragment Callout on Callout {
      ${calloutData}
    }`,
    variables: {
      spaceNameId,
      calloutId,
    },
  };

  return await graphqlRequestAuth(requestParams, userRole);
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

export const getDataPerChallengeCallout = async (
  spaceNameId: string,
  challengeNameId: string,
  calloutId: string,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const requestParams = {
    operationName: null,
    query: `query SpaceCallout(\$spaceNameId: UUID_NAMEID\!, \$challengeNameId: UUID_NAMEID\!, \$calloutId: UUID_NAMEID\!) {
      space(ID: $spaceNameId) {
        id
        challenge(ID: $challengeNameId) {
        id
        collaboration {
          callouts(IDs: [\$calloutId]) {
            ...Callout
          }
        }
      }
    }
  }

    fragment Callout on Callout {
      contributions {
        post {
          ${postData}
        }
      }
    }`,
    variables: {
      spaceNameId,
      challengeNameId,
      calloutId,
    },
  };

  return await graphqlRequestAuth(requestParams, userRole);
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

export const getDataPerOpportunityCallout = async (
  spaceNameId: string,
  opportunityNameId: string,
  calloutId: string,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const requestParams = {
    operationName: null,
    query: `query SpaceCallout($spaceNameId: UUID_NAMEID!, $opportunityNameId: UUID_NAMEID!, $calloutId: UUID_NAMEID!) {
      space(ID: $spaceNameId) {
        id
        opportunity(ID: $opportunityNameId) {
        id
        collaboration {
          callouts(IDs: [$calloutId]) {
            ...Callout
          }
        }
      }
    }
  }

    fragment Callout on Callout {
      posts {
        ${postData}
      }
    }`,
    variables: {
      spaceNameId,
      opportunityNameId,
      calloutId,
    },
  };

  return await graphqlRequestAuth(requestParams, userRole);
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
): Promise<[any]> => {
  const responseQuery = await getDataPerSpaceCallout(spaceId, spaceCalloutId);
  const spacePosts =
    responseQuery.body.data.space.collaboration.callouts[0].contributions?.filter(
      (c: { post?: any }) => c.post !== null
    ) ?? [];
  return spacePosts;
};

export const postDataPerChallengeCallout = async (
  spaceId: string,
  challengeId: string,
  challangeCalloutId: string
): Promise<[any]> => {
  const responseQuery = await getDataPerChallengeCallout(
    spaceId,
    challengeId,
    challangeCalloutId
  );
  const challengePosts =
    responseQuery.body.data.space.challenge.collaboration.callouts[0].contributions?.filter(
      (c: { post?: any }) => c.post !== null
    ) ?? [];
  return challengePosts;
};

export const postDataPerOpportunityCallout = async (
  spaceId: string,
  opportunityId: string,
  opportunityCalloutId: string
): Promise<[any]> => {
  const responseQuery = await getDataPerOpportunityCallout(
    spaceId,
    opportunityId,
    opportunityCalloutId
  );

  const opportunityPosts =
    responseQuery.body.data.space.opportunity.collaboration.callouts[0].contributions?.filter(
      (c: { post?: any }) => c.post !== null
    ) ?? [];
  return opportunityPosts;
};
