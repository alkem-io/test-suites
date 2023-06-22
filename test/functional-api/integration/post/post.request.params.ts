import { TestUser } from '@test/utils/token.helper';
import { graphqlRequestAuth } from '@test/utils/graphql.request';
import {
  postData,
  postTemplateData,
  calloutData,
  opportunityData,
} from '@test/utils/common-params';
import { getHubData } from '../hub/hub.request.params';
import { entitiesId } from '@test/functional-api/zcommunications/communications-helper';

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
  hubId?: string,
  challengeId?: string,
  opportunityId?: string
) => {
  const requestParams = {
    operationName: null,
    query: `query {
      hub(ID: "${hubId}") {
        collaboration {callouts(ID:"${entitiesId.hubCalloutId}") {
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

export const getPostTemplateForHubByPostType = async (
  hubId: string,
  postType: string
) => {
  const templatesPerHub = await getHubData(hubId);
  const allTemplates = templatesPerHub.body.data.hub.templates.postTemplates;
  const filteredTemplate = allTemplates.filter((obj: { type: string }) => {
    return obj.type === postType;
  });

  return filteredTemplate;
};

export const getPostTemplatesCountForHub = async (hubId: string) => {
  const template = await getHubData(hubId);
  const hubPostTemplates = template.body.data.hub.templates.postTemplates;

  return hubPostTemplates.length;
};

export const postDataPerCallout = async (
  hubId: string,
  challengeId?: string,
  opportunityId?: string
) => {
  const responseQuery = await getPostPerEntity(
    hubId,
    challengeId,
    opportunityId
  );
  const hubPost = responseQuery.body.data.hub.collaboration.callouts.posts;
  const challengePost =
    responseQuery.body.data.hub.challenge.collaboration.callouts.posts;
  const opportunityPost =
    responseQuery.body.data.hub.opportunity.collaboration.callouts.posts;
  return { hubPost, challengePost, opportunityPost };
};

export const getDataPerHubCallout = async (
  hubNameId: string,
  calloutId: string,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const requestParams = {
    operationName: null,
    query: `query HubCallout(\$hubNameId: UUID_NAMEID\!, \$calloutId: UUID_NAMEID\!) {
      hub(ID: $hubNameId) {
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
      hubNameId,
      calloutId,
    },
  };

  return await graphqlRequestAuth(requestParams, userRole);
};

export const getDataPerChallengeCallout = async (
  hubNameId: string,
  challengeNameId: string,
  calloutId: string,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const requestParams = {
    operationName: null,
    query: `query HubCallout(\$hubNameId: UUID_NAMEID\!, \$challengeNameId: UUID_NAMEID\!, \$calloutId: UUID_NAMEID\!) {
      hub(ID: $hubNameId) {
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
      hubNameId,
      challengeNameId,
      calloutId,
    },
  };

  return await graphqlRequestAuth(requestParams, userRole);
};

export const getDataPerOpportunityCallout = async (
  hubNameId: string,
  opportunityNameId: string,
  calloutId: string,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const requestParams = {
    operationName: null,
    query: `query HubCallout($hubNameId: UUID_NAMEID!, $opportunityNameId: UUID_NAMEID!, $calloutId: UUID_NAMEID!) {
      hub(ID: $hubNameId) {
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
      hubNameId,
      opportunityNameId,
      calloutId,
    },
  };

  return await graphqlRequestAuth(requestParams, userRole);
};

export const postDataPerHubCalloutCount = async (
  hubId: string,
  hubCalloutId: string
): Promise<[string | undefined]> => {
  const responseQuery = await getDataPerHubCallout(hubId, hubCalloutId);
  const hubPost = responseQuery.body.data.hub.collaboration.callouts[0].posts;
  return hubPost;
};

export const postDataPerChallengeCalloutCount = async (
  hubId: string,
  challengeId: string,
  challangeCalloutId: string
): Promise<[string | undefined]> => {
  const responseQuery = await getDataPerChallengeCallout(
    hubId,
    challengeId,
    challangeCalloutId
  );
  const challengePost =
    responseQuery.body.data.hub.challenge.collaboration.callouts[0].posts;
  return challengePost;
};

export const postDataPerOpportunityCalloutCount = async (
  hubId: string,
  opportunityId: string,
  opportunityCalloutId: string
): Promise<[string | undefined]> => {
  const responseQuery = await getDataPerOpportunityCallout(
    hubId,
    opportunityId,
    opportunityCalloutId
  );

  const opportunityPost =
    responseQuery.body.data.hub.opportunity.collaboration.callouts[0].posts;
  return opportunityPost;
};
