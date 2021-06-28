import { ecoverseData } from '../../../utils/common-params';
import { graphqlRequestAuth, mutation } from '../../../utils/graphql.request';
import {
  createEcoverseMut,
  ecoverseVariablesData,
} from '../../../utils/mutations/create-mutation';
import { TestUser } from '../../../utils/token.helper';
import { createOrganisationMutation } from '../organisation/organisation.request.params';

//let ecoverseNameId = 'TestEco';
let ecoverseNameId2 = 'Eco1';
let uniqueId = Math.random()
  .toString(12)
  .slice(-6);

export const ecoverseName = `testEcoName${uniqueId}`;
export const ecoverseNameId = `testecoeid${uniqueId}`;

// export const testHostId = async (): Promise<any> => {
//   const responseQuery = await createOrganisationMutation(
//     organisationName,
//     hostNameId
//   );
//   let response = responseQuery.body.data.createOrganisation.id;
//   return response;
// };

export const createEcoverseMutation = async (
  ecoverseName: string,
  ecoverseNameID: string,
  hostID: string
) => {
  return await mutation(
    createEcoverseMut,
    await ecoverseVariablesData(ecoverseName, ecoverseNameID, hostID)
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

// export const testEcoverseId = async (): Promise<any> => {
//   const responseQuery = await createTestEcoverse(ecoverseName, ecoverseNameId);
//   let response = responseQuery.body.data.createOrganisation.id;
//   return response;
// };
// export const getEcoversesData = async () => {
//   const requestParams = {
//     operationName: null,
//     query: `query{ecoverses{${ecoverseData}}}`,
//     variables: null,
//   };
//   let x = await graphqlRequestAuth(requestParams, TestUser.GLOBAL_ADMIN);

//   return x;
// };

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
  console.log(ecoverses.body);
  let ecoverseId = ecoversesArray.find(ecoversesData).id;

  console.log(ecoverseId);
  return ecoverseId;
};

export const getEcoverseData = async () => {
  const requestParams = {
    operationName: null,
    query: `query{ecoverse(ID: "${ecoverseNameId}") {${ecoverseData}}}`,
    variables: null,
  };
  let x = await graphqlRequestAuth(requestParams, TestUser.GLOBAL_ADMIN);
  console.log(x.body);
  return x;
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
