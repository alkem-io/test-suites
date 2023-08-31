import { TestUser } from '@test/utils/token.helper';
import { graphqlRequestAuth } from '@test/utils/graphql.request';
import {
  postData,
  postTemplateData,
  calloutData,
  opportunityData,
} from '@test/utils/common-params';
import { getSpaceData } from '../space/space.request.params';
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

export const createPostOnCallout = async (
  calloutID: string,
  nameID?: string,
  options?: {
    profileData?: {
      displayName?: string;
      description?: string;
    };
  },
  type: PostTypes = PostTypes.KNOWLEDGE,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const requestParams = {
    operationName: null,
    query: `mutation createPostOnCallout($postData: CreatePostOnCalloutInput!) {
      createPostOnCallout(postData: $postData) {
        ${postData}
      }
    }`,
    variables: {
      postData: {
        calloutID,
        nameID,
        type,
        ...options,
      },
    },
  };

  return await graphqlRequestAuth(requestParams, userRole);
};
export const createPostOnCalloutCodegen = async (
  calloutID: string,
  profileData: {
    displayName: string;
    description?: string;
  },
  nameID?: string,
  type: PostTypes = PostTypes.KNOWLEDGE,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const graphqlClient = await getGraphqlClient();
  const callback = async (authToken: string) =>
    await graphqlClient.createPostOnCallout(
      {
        postData: {
          calloutID,
          nameID,
          type,
          profileData,
        },
      },
      {
        authorization: `Bearer ${authToken}`,
      }
    );

  return graphqlErrorWrapper(callback, userRole);
};

export const createPostNewType = async (
  calloutID: string,
  type: string,
  nameID?: string,
  options?: {
    profileData?: {
      displayName?: string;
      description?: string;
    };
  },
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const requestParams = {
    operationName: null,
    query: `mutation createPostOnCallout($postData: CreatePostOnCalloutInput!) {
      createPostOnCallout(postData: $postData) {
        ${postData}
      }
    }`,
    variables: {
      postData: {
        calloutID,
        nameID,
        type,
        ...options,
      },
    },
  };

  return await graphqlRequestAuth(requestParams, userRole);
};

export const updatePost = async (
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
  const requestParams = {
    operationName: null,
    query: `mutation updatePost($postData: UpdatePostInput!) {
      updatePost(postData: $postData) {
        ${postData}
      }
    }`,
    variables: {
      postData: {
        ID,
        nameID,
        ...options,
        type,
      },
    },
  };

  return await graphqlRequestAuth(requestParams, userRole);
};

export const removePost = async (
  postId: string,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const requestParams = {
    operationName: null,
    query: `mutation deletePost($deleteData: DeletePostInput!) {
      deletePost(deleteData: $deleteData) {
        id
      }}`,
    variables: {
      deleteData: {
        ID: postId,
      },
    },
  };

  return await graphqlRequestAuth(requestParams, userRole);
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
  const templatesPerSpace = await getSpaceData(spaceId);
  const allTemplates =
    templatesPerSpace.body.data.space.templates.postTemplates;
  const filteredTemplate = allTemplates.filter((obj: { type: string }) => {
    return obj.type === postType;
  });

  return filteredTemplate;
};

export const getPostTemplatesCountForSpace = async (spaceId: string) => {
  const template = await getSpaceData(spaceId);
  const spacePostTemplates = template.body.data.space.templates.postTemplates;

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
      posts {
        ${postData}
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

export const postDataPerSpaceCalloutCount = async (
  spaceId: string,
  spaceCalloutId: string
): Promise<[string | undefined]> => {
  const responseQuery = await getDataPerSpaceCallout(spaceId, spaceCalloutId);
  const spacePost =
    responseQuery.body.data.space.collaboration.callouts[0].posts;
  return spacePost;
};

export const postDataPerChallengeCalloutCount = async (
  spaceId: string,
  challengeId: string,
  challangeCalloutId: string
): Promise<[string | undefined]> => {
  const responseQuery = await getDataPerChallengeCallout(
    spaceId,
    challengeId,
    challangeCalloutId
  );
  const challengePost =
    responseQuery.body.data.space.challenge.collaboration.callouts[0].posts;
  return challengePost;
};

export const postDataPerOpportunityCalloutCount = async (
  spaceId: string,
  opportunityId: string,
  opportunityCalloutId: string
): Promise<[string | undefined]> => {
  const responseQuery = await getDataPerOpportunityCallout(
    spaceId,
    opportunityId,
    opportunityCalloutId
  );

  const opportunityPost =
    responseQuery.body.data.space.opportunity.collaboration.callouts[0].posts;
  return opportunityPost;
};
