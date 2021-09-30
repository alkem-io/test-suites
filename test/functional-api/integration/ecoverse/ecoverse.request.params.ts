import { ecoverseData } from '../../../utils/common-params';
import { graphqlRequestAuth, mutation } from '../../../utils/graphql.request';
import {
  createEcoverseMut,
  ecoverseVariablesData,
} from '../../../utils/mutations/create-mutation';
import { TestUser } from '../../../utils/token.helper';

let ecoverseNameId2 = 'Eco1';
let uniqueId = Math.random()
  .toString(12)
  .slice(-6);

export const ecoverseName = `testEcoName${uniqueId}`;
export const ecoverseNameId = `testecoeid${uniqueId}`;

export const createEcoverseMutation = async (
  ecoverseName: string,
  ecoverseNameID: string,
  hostID: string
) => {
  return await mutation(
    createEcoverseMut,
    ecoverseVariablesData(ecoverseName, ecoverseNameID, hostID)
  );
};

export const createTestEcoverse = async (
  ecoverseName: string,
  ecoverseNameId: string,
  hostId: string
) => {
  const requestParams = {
    operationName: null,
    query: `mutation createEcoverse($ecoverseData: CreateEcoverseInput!) {
      createEcoverse(ecoverseData: $ecoverseData) {${ecoverseData}}
    }`,
    variables: {
      ecoverseData: {
        displayName: ecoverseName,
        nameID: ecoverseNameId,
        hostID: hostId,
      },
    },
  };

  return await graphqlRequestAuth(requestParams, TestUser.GLOBAL_ADMIN);
};

export const getEcoversesData = async () => {
  const requestParams = {
    operationName: null,
    query: `query{ecoverses{id nameID}}`,
    variables: null,
  };
  let x = await graphqlRequestAuth(requestParams, TestUser.GLOBAL_ADMIN);

  return x;
};
export const getEcoverseDataId = async () => {
  let ecoverses = await getEcoversesData();
  let ecoversesArray = ecoverses.body.data.ecoverses;
  function ecoversesData(entity: { nameID: string }) {
    return entity.nameID === ecoverseNameId;
  }
  let ecoverseId = ecoversesArray.find(ecoversesData).id;
  return ecoverseId;
};

export const getEcoverseData = async (nameId = ecoverseNameId) => {
  const requestParams = {
    operationName: null,
    query: `query{ecoverse(ID: "${nameId}") {${ecoverseData}}}`,
    variables: null,
  };
  return await graphqlRequestAuth(requestParams, TestUser.GLOBAL_ADMIN);
};

export const ecoverseId = async (): Promise<any> => {
  const responseQuery = await getEcoverseData();

  let response = responseQuery.body.data.ecoverse.id;
  return response;
};

export const removeEcoverseMutation = async (ecoverseId: string) => {
  const requestParams = {
    operationName: null,
    query: `mutation deleteEcoverse($deleteData: DeleteEcoverseInput!) {
      deleteEcoverse(deleteData: $deleteData) {
        id
      }}`,
    variables: {
      deleteData: {
        ID: ecoverseId,
      },
    },
  };

  return await graphqlRequestAuth(requestParams, TestUser.GLOBAL_ADMIN);
};
