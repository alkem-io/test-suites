import {
  ecoverseId,
  ecoverseNameId,
  getEcoverseDataId,
} from '../../functional/integration/ecoverse/ecoverse.request.params';
import {
  challengeDataTest,
  ecoverseData,
  organisationData,
} from '../common-params';

//const uniqueId = (Date.now() + Math.random()).toString();
export let uniqueId = Math.random()
  .toString(12)
  .slice(-6);

export const createOrganisationMut = `
  mutation CreateOrganisation($organisationData: CreateOrganisationInput!) {
    createOrganisation(organisationData: $organisationData) ${organisationData}
  }`;

export const organisationVariablesData = async (
  displayName: string,
  nameID: string
) => {
  const variables = {
    organisationData: {
      displayName,
      nameID,
    },
  };
  const responseData = JSON.stringify(variables);
  return responseData;
};

export const createEcoverseMut = `
mutation createEcoverse($ecoverseData: CreateEcoverseInput!) {
  createEcoverse(ecoverseData: $ecoverseData) {${ecoverseData}}
}`;

export const ecoverseVariablesData = async (
  ecoverseName: string,
  ecoverseNameId: string,
  hostId: string
) => {
  const variables = {
    ecoverseData: {
      displayName: ecoverseName,
      nameID: ecoverseNameId,
      hostID: hostId,
    },
  };
  const responseData = JSON.stringify(variables);
  return responseData;
};

export const createChallengMut = `
mutation createChallenge($challengeData: CreateChallengeInput!) {
  createChallenge(challengeData: $challengeData) {
    ${challengeDataTest}
  }
}`;

export const createChildChallengeMut = `
mutation createChildChallenge($challengeData: CreateChallengeInput!) {
  createChildChallenge(challengeData: $challengeData) {
    ${challengeDataTest}
  }
}`;

export const challengeVariablesData = async (
  challengeName: string,
  uniqueTextId: string,
  parentId?: string
) => {
  const variables = {
    challengeData: {
      displayName: challengeName,
      nameID: uniqueTextId,
      parentID: parentId,
      tags: 'testTags',
      context: {
        tagline: 'test tagline' + uniqueId,
        background: 'test background' + uniqueId,
        vision: 'test vision' + uniqueId,
        impact: 'test impact' + uniqueId,
        who: 'test who' + uniqueId,
        references: [
          {
            name: 'test video' + uniqueId,
            uri: 'https://youtu.be/-wGlzcjs',
            description: 'dest description' + uniqueId,
          },
        ],
      },
    },
  };
  const responseData = JSON.stringify(variables);
  return responseData;
};
