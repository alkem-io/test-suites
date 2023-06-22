import {
  actorData,
  postData,
  challengeDataTest,
  hubData,
  hostData,
  messagesData,
  opportunityData,
  organizationData,
  userData,
} from '../common-params';
import { mutation } from '../graphql.request';

export const updateChallenge = `
mutation updateChallenge($challengeData: UpdateChallengeInput!) {
  updateChallenge(challengeData: $challengeData)  {
    ${challengeDataTest}
  }
}`;

export const updateChallengeLeadVariablesData = (
  challengeId: string,
  organizationId: any
) => {
  const variables = {
    challengeData: {
      ID: challengeId,
      leadOrganizations: organizationId,
    },
  };
  const responseData = JSON.stringify(variables);
  return responseData;
};

export const updateChallengeLocationVariablesData = (
  challengeId: string,
  country?: string,
  city?: string
) => {
  const variables = {
    challengeData: {
      ID: challengeId,
      profileData: {
        location: { country, city },
      },
    },
  };
  const responseData = JSON.stringify(variables);
  return responseData;
};

export const updateChallengeLead = async (
  challengeId: string,
  organizationId: any
) => {
  return await mutation(
    updateChallenge,
    updateChallengeLeadVariablesData(challengeId, organizationId)
  );
};

export const updateOpportunity = `
mutation updateOpportunity($opportunityData: UpdateOpportunityInput!) {
  updateOpportunity(opportunityData: $opportunityData)  {
    ${opportunityData}
  }
}`;

export const updateOpportunityLocationVariablesData = (
  opporunityId: string,
  country?: string,
  city?: string
) => {
  const variables = {
    opportunityData: {
      ID: opporunityId,
      profileData: {
        location: { country, city },
      },
    },
  };
  const responseData = JSON.stringify(variables);
  return responseData;
};

export const updateHub = `
mutation updateHub($hubData: UpdateHubInput!) {
  updateHub(hubData: $hubData) {${hubData}}
}`;

export const updateHubVariablesData = (
  hubId: string,
  displayName: string,
  nameID?: string,
  template?: {
    postTemplates?: [
      { type?: string; typeDescription?: string; defaultDescription?: string }
    ];
  },
  profile?: { location?: { country?: string; city?: string } }
) => {
  const variables = {
    hubData: {
      ID: hubId,
      nameID,
      template,
      profileData: { displayName, profile },
    },
  };
  const responseData = JSON.stringify(variables);
  return responseData;
};

export const updateHubLocationVariablesData = (
  hubId: string,
  country?: string,
  city?: string
) => {
  const variables = {
    hubData: {
      ID: hubId,
      profileData: { location: { country, city } },
    },
  };
  const responseData = JSON.stringify(variables);
  return responseData;
};

export const sendCommunityUpdate = `
mutation sendMessageToRoom($messageData: RoomSendMessageInput!) {
  sendMessageToRoom(messageData: $messageData) {
    ${messagesData}
  }
}`;

export const sendCommunityUpdateVariablesData = (
  roomID: string,
  message: string
) => {
  const variables = {
    messageData: {
      roomID,
      message,
    },
  };
  const responseData = JSON.stringify(variables);
  return responseData;
};
