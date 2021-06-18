import { ecoverseData } from '@test/utils/common-params';
import { graphqlRequestAuth } from '@test/utils/graphql.request';
import { TestUser } from '@test/utils/token.helper';
import { createOrganisationMutation } from '../organisation/organisation.request.params';

//let ecoverseNameId = 'TestEco';
let ecoverseNameId2 = 'Eco1';
let uniqueId = Math.random()
  .toString(12)
  .slice(-6);

export const ecoverseName = `testOrgHost${uniqueId}`;
export const ecoverseNameId = `testOrgHost${uniqueId}`;



// export const testHostId = async (): Promise<any> => {
//   const responseQuery = await createOrganisationMutation(
//     organisationName,
//     hostNameId
//   );
//   let response = responseQuery.body.data.createOrganisation.id;
//   return response;
// };

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

export const getEcoverseData = async () => {
  const requestParams = {
    operationName: null,
    query: `query{ecoverse(ID: "${ecoverseNameId}") {${ecoverseData}}}`,
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
