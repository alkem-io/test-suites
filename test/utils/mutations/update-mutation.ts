import {
  actorData,
  aspectData,
  challengeDataTest,
  hubData,
  hostData,
  messagesData,
  opportunityData,
  organizationData,
  userData,
} from '../common-params';
import { mutation } from '../graphql.request';

export const updateActor = `
mutation updateActor($actorData: UpdateActorInput!) {
  updateActor(actorData: $actorData) {
    ${actorData}
    }
  }`;

export const updateActorVariablesData = (
  actorId: string,
  actorName: string,
  actorDescritpion?: string,
  actorValue?: string,
  actorImpact?: string
) => {
  const variables = {
    actorData: {
      ID: actorId,
      name: actorName,
      description: actorDescritpion,
      value: actorValue,
      impact: actorImpact,
    },
  };
  const responseData = JSON.stringify(variables);
  return responseData;
};

export const updateAspect = `
mutation updateAspect($aspectData: UpdateAspectInput!) {
  updateAspect(aspectData: $aspectData) {
    ${aspectData}
  }
}`;

export const updateAspectVariablesData = (
  aspectId: string,
  aspectTitle: string,
  aspectFraming?: string,
  aspectExplenation?: string
) => {
  const variables = {
    aspectData: {
      ID: aspectId,
      title: `${aspectTitle}`,
      framing: `${aspectFraming}`,
      explanation: `${aspectExplenation}`,
    },
  };
  const responseData = JSON.stringify(variables);
  return responseData;
};

export const updateChallenge = `
mutation updateChallenge($challengeData: UpdateChallengeInput!) {
  updateChallenge(challengeData: $challengeData)  {
    ${challengeDataTest}
  }
}`;

export const updateChallengeVariablesData = (
  challengeId: string,
  challengeName: string,
  taglineText?: string,
  background?: string,
  vision?: string,
  impact?: string,
  who?: string,
  tagsArrey?: any
) => {
  const variables = {
    challengeData: {
      ID: challengeId,
      displayName: challengeName,
      context: {
        tagline: taglineText,
        background: background,
        vision: vision,
        impact: impact,
        who: who,
      },
      tags: tagsArrey,
    },
  };
  const responseData = JSON.stringify(variables);
  return responseData;
};

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

export const updateOpportunityVariablesData = (
  opporunityId: string,
  opportunityName: string,
  taglineText?: string,
  background?: string,
  vision?: string,
  impact?: string,
  who?: string,
  tagsArrey?: any
) => {
  const variables = {
    opportunityData: {
      ID: opporunityId,
      displayName: opportunityName,
      context: {
        tagline: taglineText,
        background: background,
        vision: vision,
        impact: impact,
        who: who,
      },
      tags: tagsArrey,
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
  hubName: string,
  nameID?: string,
  template?: { aspectTemplates?: [{ type?: string; description?: string }] }
) => {
  const variables = {
    hubData: {
      ID: hubId,
      displayName: hubName,
      nameID,
      template,
    },
  };
  const responseData = JSON.stringify(variables);
  return responseData;
};

export const updateOrganization = `
mutation updateOrganization($organizationData: UpdateOrganizationInput!) {
  updateOrganization(organizationData: $organizationData) ${organizationData}
}`;

export const updateOrganizationVariablesData = (
  organizationId: string,
  hubName: string
) => {
  const variables = {
    organizationData: {
      ID: organizationId,
      displayName: hubName,
    },
  };
  const responseData = JSON.stringify(variables);
  return responseData;
};

export const updateProfile = `
mutation updateProfile($profileData: UpdateProfileInput!) {
  updateProfile(profileData: $profileData){id}}`;

export const updateProfileVariablesData = (
  profileId: string,
  descritpion: string,
  avatar?: string
) => {
  const variables = {
    profileData: {
      ID: profileId,
      description: descritpion,
      avatar: avatar,
    },
  };
  const responseData = JSON.stringify(variables);
  return responseData;
};

export const updateProject = `
mutation updateProject($projectData: UpdateProjectInput!) {
  updateProject(projectData: $projectData){id}}`;

export const updateProjectVariablesData = (
  projectId: string,
  descritpion: string,
  displayName?: string
) => {
  const variables = {
    projectData: {
      ID: projectId,
      description: descritpion,
      displayName: displayName,
    },
  };
  const responseData = JSON.stringify(variables);
  return responseData;
};

export const updateUser = `
mutation updateUser($userData: UpdateUserInput!) {
  updateUser(userData: $userData) {
      ${userData}
    }
  }`;

export const updateUserVariablesData = (
  updateUserId: string,
  phoneUser: string,
  nameUser?: string
) => {
  const variables = {
    userData: {
      ID: updateUserId,
      displayName: nameUser,
      nameID: nameUser,
      phone: phoneUser,
    },
  };
  const responseData = JSON.stringify(variables);
  return responseData;
};

export const updateUserGroup = `
mutation updateUserGroup($userGroupData: UpdateUserGroupInput!) {
  updateUserGroup(userGroupData: $userGroupData) {
    id
    name
  }
}`;

export const updateUserGroupVariablesData = (
  groupId: string,
  nameGroup: string
) => {
  const variables = {
    userGroupData: {
      ID: groupId,
      name: nameGroup,
    },
  };
  const responseData = JSON.stringify(variables);
  return responseData;
};

export const sendCommunityUpdate = `
mutation sendUpdate($messageData: UpdatesSendMessageInput!) {
  sendUpdate(messageData: $messageData){
    ${messagesData}
  }
}`;

export const sendCommunityUpdateVariablesData = (
  updatesID: string,
  message: string
) => {
  const variables = {
    messageData: {
      updatesID,
      message,
    },
  };
  const responseData = JSON.stringify(variables);
  return responseData;
};
