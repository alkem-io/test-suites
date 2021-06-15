import { ecoverseData } from '@test/utils/common-params';
import { graphqlRequestAuth } from '@test/utils/graphql.request';
import { TestUser } from '@test/utils/token.helper';

let ecoverseNameId = 'TestEco';
let ecoverseNameId2 = 'Eco1';

export const getEcoverseData = async () => {
  const requestParams = {
    operationName: null,
    query: `query{ecoverse(ID: "${ecoverseNameId2}") {${ecoverseData}}}`,
    variables: null,
  };

  return await graphqlRequestAuth(requestParams, TestUser.GLOBAL_ADMIN);
};

export const ecoverseId = async (): Promise<any> => {
  const responseQuery = await getEcoverseData();
  let response = responseQuery.body.data.ecoverse.id;
  return response;
};

