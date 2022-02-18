import { hubData } from '../../../utils/common-params';
import { graphqlRequestAuth, mutation } from '../../../utils/graphql.request';
import {
  createEcoverse,
  hubVariablesData,
} from '../../../utils/mutations/create-mutation';
import { TestUser } from '../../../utils/token.helper';

let hubNameId2 = 'Eco1';
let uniqueId = Math.random()
  .toString(12)
  .slice(-6);

export const hubName = `testEcoName${uniqueId}`;
export const hubNameId = `testecoeid${uniqueId}`;

export const createEcoverseMutation = async (
  hubName: string,
  hubNameID: string,
  hostID: string
) => {
  return await mutation(
    createEcoverse,
    hubVariablesData(hubName, hubNameID, hostID)
  );
};

export const createTestEcoverse = async (
  hubName: string,
  hubNameId: string,
  hostId: string
) => {
  const requestParams = {
    operationName: null,
    query: `mutation createEcoverse($hubData: CreateEcoverseInput!) {
      createEcoverse(hubData: $hubData) {${hubData}}
    }`,
    variables: {
      hubData: {
        displayName: hubName,
        nameID: hubNameId,
        hostID: hostId,
      },
    },
  };

  return await graphqlRequestAuth(requestParams, TestUser.GLOBAL_ADMIN);
};

export const getEcoversesData = async () => {
  const requestParams = {
    operationName: null,
    query: `query{hubs{id nameID}}`,
    variables: null,
  };
  let x = await graphqlRequestAuth(requestParams, TestUser.GLOBAL_ADMIN);

  return x;
};
export const getEcoverseDataId = async () => {
  let hubs = await getEcoversesData();
  let hubsArray = hubs.body.data.hubs;
  function hubsData(entity: { nameID: string }) {
    return entity.nameID === hubNameId;
  }
  let hubId = hubsArray.find(hubsData).id;
  return hubId;
};

export const getEcoverseData = async (
  nameId = hubNameId,
  role = TestUser.GLOBAL_ADMIN
) => {
  const requestParams = {
    operationName: null,
    query: `query{hub(ID: "${nameId}") {${hubData}}}`,
    variables: null,
  };
  return await graphqlRequestAuth(requestParams, role);
};

export const hubId = async (): Promise<any> => {
  const responseQuery = await getEcoverseData();

  let response = responseQuery.body.data.hub.id;
  return response;
};

export const removeEcoverse = async (hubId: string) => {
  const requestParams = {
    operationName: null,
    query: `mutation deleteEcoverse($deleteData: DeleteEcoverseInput!) {
      deleteEcoverse(deleteData: $deleteData) {
        id
      }}`,
    variables: {
      deleteData: {
        ID: hubId,
      },
    },
  };

  return await graphqlRequestAuth(requestParams, TestUser.GLOBAL_ADMIN);
};
