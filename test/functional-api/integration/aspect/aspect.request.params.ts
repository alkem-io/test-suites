import { TestUser } from '@test/utils/token.helper';
import { graphqlRequestAuth } from '@test/utils/graphql.request';
import {
  aspectData,
  aspectTemplateData,
  calloutData,
  opportunityData,
} from '@test/utils/common-params';
import { getHubData } from '../hub/hub.request.params';
import { entitiesId } from '@test/functional-api/zcommunications/communications-helper';

export enum AspectTypes {
  RELATED_INITIATIVE = 'related_initiative',
  KNOWLEDGE = 'knowledge',
  ACTOR = 'actor',
}

export const createAspectOnCallout = async (
  calloutID: string,
  displayName: string,
  nameID?: string,
  description = 'some description',
  type: AspectTypes = AspectTypes.ACTOR,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const requestParams = {
    operationName: null,
    query: `mutation createAspectOnCallout($aspectData: CreateAspectOnCalloutInput!) {
      createAspectOnCallout(aspectData: $aspectData) {
        ${aspectData}
      }
    }`,
    variables: {
      aspectData: {
        calloutID,
        displayName,
        nameID,
        description,
        type,
      },
    },
  };

  return await graphqlRequestAuth(requestParams, userRole);
};

export const createAspectNewType = async (
  calloutID: string,
  type: string,
  displayName: string,
  nameID?: string,
  description = 'some description',
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const requestParams = {
    operationName: null,
    query: `mutation createAspectOnCallout($aspectData: CreateAspectOnCalloutInput!) {
      createAspectOnCallout(aspectData: $aspectData) {
        ${aspectData}
      }
    }`,
    variables: {
      aspectData: {
        calloutID,
        displayName,
        nameID,
        description,
        type,
      },
    },
  };

  return await graphqlRequestAuth(requestParams, userRole);
};

export const updateAspect = async (
  ID: string,
  nameID: string,
  displayName?: string,
  description?: string,
  type?: string,
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
        type,
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
        collaboration {callouts(ID:"${entitiesId.hubCalloutId}") {
          aspects {
            ${aspectData}
          }}
        }
        challenge(ID: "${challengeId}") {
          id
          nameID
          collaboration {callouts(ID:"${entitiesId.challengeCalloutId}"){
            aspects {
              ${aspectData}
            }}
          }
        }
        opportunity(ID: "${opportunityId}") {
          id
          nameID
          collaboration {callouts (ID:"${entitiesId.opportunityCalloutId}"){
            aspects {
              ${aspectData}
            }
          }}
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

export const createAspectTemplate = async (
  templatesSetID: string,
  type = 'Aspect Template Type',
  defaultDescription = 'Default aspect template description',
  title = 'Default aspect template title',
  description = 'Default aspect template info description',
  tags = ['tag1', 'tag2'],
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const requestParams = {
    operationName: null,
    query: `mutation createAspectTemplate($aspectTemplateInput: CreateAspectTemplateOnTemplatesSetInput!) {
      createAspectTemplate(aspectTemplateInput: $aspectTemplateInput){
        ${aspectTemplateData}
      }
    }`,
    variables: {
      aspectTemplateInput: {
        templatesSetID,
        type,
        defaultDescription,
        info: {
          title,
          description,
          tags,
        },
      },
    },
  };

  return await graphqlRequestAuth(requestParams, userRole);
};

export const createAspectTemplateNoType = async (
  templatesSetID: string,
  type?: string,
  defaultDescription = 'Default aspect template description',
  title = 'Default aspect template title',
  description = 'Default aspect template info description',
  tags = ['tag1', 'tag2'],
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const requestParams = {
    operationName: null,
    query: `mutation createAspectTemplate($aspectTemplateInput: CreateAspectTemplateOnTemplatesSetInput!) {
      createAspectTemplate(aspectTemplateInput: $aspectTemplateInput){
        ${aspectTemplateData}
      }
    }`,
    variables: {
      aspectTemplateInput: {
        templatesSetID,
        type,
        defaultDescription,
        info: {
          title,
          description,
          tags,
        },
      },
    },
  };

  return await graphqlRequestAuth(requestParams, userRole);
};

export const updateAspectTemplate = async (
  ID: string,
  type = 'Aspect Template Type - Update',
  defaultDescription = 'Default aspect template description - Update',
  title = 'Default aspect template title - Update',
  description = 'Default aspect template info description - Update',
  tags = ['tag1U', 'tag2U'],
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const requestParams = {
    operationName: null,
    query: `mutation updateAspectTemplate($aspectTemplateInput: UpdateAspectTemplateInput!) {
      updateAspectTemplate(aspectTemplateInput: $aspectTemplateInput) {
        ${aspectTemplateData}
      }
    }`,
    variables: {
      aspectTemplateInput: {
        ID,
        type,
        defaultDescription,
        info: {
          title,
          description,
          tags,
        },
      },
    },
  };

  return await graphqlRequestAuth(requestParams, userRole);
};

export const deleteAspectTemplate = async (
  aspectTemplateId: string,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const requestParams = {
    operationName: null,
    query: `mutation deleteAspectTemplate($deleteData: DeleteAspectTemplateInput!) {
      deleteAspectTemplate(deleteData: $deleteData){
      type
    }
  }`,
    variables: {
      deleteData: {
        ID: aspectTemplateId,
      },
    },
  };

  return await graphqlRequestAuth(requestParams, userRole);
};

export const getAspectTemplateForHubByAspectType = async (
  hubId: string,
  aspectType: string
) => {
  const templatesPerHub = await getHubData(hubId);
  const allTemplates = templatesPerHub.body.data.hub.templates.aspectTemplates;
  const filteredTemplate = allTemplates.filter((obj: { type: string }) => {
    return obj.type === aspectType;
  });

  return filteredTemplate;
};

export const getAspectTemplatesCountForHub = async (hubId: string) => {
  const template = await getHubData(hubId);
  const hubAspectTemplates = template.body.data.hub.templates.aspectTemplates;

  return hubAspectTemplates.length;
};

export const aspectDataPerCallout = async (
  hubId: string,
  challengeId?: string,
  opportunityId?: string
) => {
  const responseQuery = await getAspectPerEntity(
    hubId,
    challengeId,
    opportunityId
  );
  const hubAspect = responseQuery.body.data.hub.collaboration.callouts.aspects;
  const challengeAspect =
    responseQuery.body.data.hub.challenge.collaboration.callouts.aspects;
  const opportunityAspect =
    responseQuery.body.data.hub.opportunity.collaboration.callouts.aspects;
  return { hubAspect, challengeAspect, opportunityAspect };
};

export const getDataPerHubCallout = async (
  hubNameId: string,
  calloutId: string
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

  return await graphqlRequestAuth(requestParams, TestUser.GLOBAL_ADMIN);
};

export const getDataPerChallengeCallout = async (
  hubNameId: string,
  challengeNameId: string,
  calloutId: string
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
      aspects {
        ${aspectData}
      }
    }`,
    variables: {
      hubNameId,
      challengeNameId,
      calloutId,
    },
  };

  return await graphqlRequestAuth(requestParams, TestUser.GLOBAL_ADMIN);
};

export const getDataPerOpportunityCallout = async (
  hubNameId: string,
  opportunityNameId: string,
  calloutId: string
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
      aspects {
        ${aspectData}
      }
    }`,
    variables: {
      hubNameId,
      opportunityNameId,
      calloutId,
    },
  };

  return await graphqlRequestAuth(requestParams, TestUser.GLOBAL_ADMIN);
};

export const cardDataPerHubCalloutCount = async (
  hubId: string,
  hubCalloutId: string
): Promise<[string | undefined]> => {
  const responseQuery = await getDataPerHubCallout(hubId, hubCalloutId);
  const hubCard = responseQuery.body.data.hub.collaboration.callouts[0].aspects;
  return hubCard;
};

export const cardDataPerChallengeCalloutCount = async (
  hubId: string,
  challengeId: string,
  challangeCalloutId: string
): Promise<[string | undefined]> => {
  const responseQuery = await getDataPerChallengeCallout(
    hubId,
    challengeId,
    challangeCalloutId
  );
  const challengeCard =
    responseQuery.body.data.hub.challenge.collaboration.callouts[0].aspects;
  return challengeCard;
};

export const cardDataPerOpportunityCalloutCount = async (
  hubId: string,
  opportunityId: string,
  opportunityCalloutId: string
): Promise<[string | undefined]> => {
  const responseQuery = await getDataPerOpportunityCallout(
    hubId,
    opportunityId,
    opportunityCalloutId
  );

  const opportunityCard =
    responseQuery.body.data.hub.opportunity.collaboration.callouts[0].aspects;
  return opportunityCard;
};
