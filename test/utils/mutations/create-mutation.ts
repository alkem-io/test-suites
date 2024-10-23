import { entitiesId } from '@test/types/entities-helper';
import { challengeDataTest, spaceData, userData } from '../common-params';

export const uniqueId = Math.random()
  .toString(12)
  .slice(-6);

export const createUser = `
  mutation createUser($userData: CreateUserInput!) {
    createUser(userData: $userData) {
      ${userData}
    }
  }`;

// experiment

export const createSpace = `
mutation createSpace($spaceData: CreateSpaceInput!) {
  createSpace(spaceData: $spaceData) {${spaceData}}
}`;

export const spaceVariablesData = (
  spaceName: string,
  spaceNameId: string,
  hostId: string
) => {
  const variables = {
    spaceData: {
      displayName: spaceName,
      nameID: spaceNameId,
      hostID: hostId,
    },
  };
  const responseData = JSON.stringify(variables);
  return responseData;
};

export const createChallenge = `
mutation createChallenge($challengeData: CreateChallengeOnSpaceInput!) {
  createChallenge(challengeData: $challengeData) {
    ${challengeDataTest}
  }
}`;

export const challengeVariablesData = (
  displayName: string,
  nameId: string,
  parentId: string
) => {
  const variables = {
    challengeData: {
      nameID: nameId,
      spaceID: parentId,
      profileData: {
        displayName,
        tagline: 'test tagline' + uniqueId,
        description: 'test description' + uniqueId,
        referencesData: [
          {
            name: 'test video' + uniqueId,
            uri: 'https://youtu.be/-wGlzcjs',
            description: 'dest description' + uniqueId,
          },
        ],
      },
      context: {
        vision: 'test vision' + uniqueId,
        impact: 'test impact' + uniqueId,
        who: 'test who' + uniqueId,
      },
      innovationFlowTemplateID: entitiesId.space.subspaceCollaborationTemplateId,
    },
  };
  const responseData = JSON.stringify(variables);
  return responseData;
};
