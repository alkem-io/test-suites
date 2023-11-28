import { AlkemioClient } from '@alkemio/client-lib';
import { TestUser } from '@test/utils';
import { graphqlRequestAuth } from '@test/utils/graphql.request';
import { graphqlErrorWrapper } from '@test/utils/graphql.wrapper';
import { getGraphqlClient } from '@test/utils/graphqlClient';
import { PathLike } from 'fs';

const server = process.env.ALKEMIO_SERVER || '';
const kratos = process.env.KRATOS_ENDPOINT || '';
const password = process.env.AUTH_TEST_HARNESS_PASSWORD || '';

const generateClientConfig = (user: TestUser) => ({
  apiEndpointPrivateGraphql: server,
  authInfo: {
    credentials: {
      email: `${user}@alkem.io`,
      password: password,
    },
    kratosPublicApiEndpoint: kratos,
  },
});

export const uploadFileOnRef = async (
  path: PathLike,
  refId: string,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const alkemioClient = new AlkemioClient(generateClientConfig(userRole));
  await alkemioClient.enableAuthentication();
  const res = await alkemioClient.uploadFileOnReference(path, refId);
  console.log(res);
  return res;
};

export const uploadImageOnVisual = async (
  path: PathLike,
  visualId: string,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const alkemioClient = new AlkemioClient(generateClientConfig(userRole));
  await alkemioClient.enableAuthentication();

  const res = await alkemioClient.uploadImageOnVisual(path, visualId);

  return res;
};

export const deleteDocument = async (ID: string) => {
  const requestParams = {
    operationName: null,
    query: `mutation deleteDocument($deleteData: DeleteDocumentInput!) {
      deleteDocument(deleteData: $deleteData) {
        id
      }
    }`,
    variables: {
      deleteData: {
        ID,
      },
    },
  };

  return await graphqlRequestAuth(requestParams, TestUser.GLOBAL_ADMIN);
};

export const getUserReferenceUri = async (nameId: string) => {
  const requestParams = {
    operationName: null,
    query: `query {
      user(ID: "${nameId}") {
        nameID
        profile {
          references {
            id
            description
            uri
            name
          }
        }
      }
    }`,
    variables: {},
  };

  return await graphqlRequestAuth(requestParams, TestUser.GLOBAL_ADMIN);
};

export const getOrgReferenceUri = async (nameId: string) => {
  const requestParams = {
    operationName: null,
    query: `query {
      organization(ID: "${nameId}") {
        nameID
        profile {
          references {
            id
            description
            uri
            name
          }
        }
      }
    }`,
    variables: {},
  };

  return await graphqlRequestAuth(requestParams, TestUser.GLOBAL_ADMIN);
};

export const getOrgVisualUri = async (nameId: string) => {
  const requestParams = {
    operationName: null,
    query: `query {
      organization(ID: "${nameId}") {
        nameID
        profile {
          visuals {
            id
            name
            uri
          }
        }
      }
    }`,
    variables: {},
  };

  return await graphqlRequestAuth(requestParams, TestUser.GLOBAL_ADMIN);
};

export const getOrgVisualUriInnovationHub = async (id: string) => {
  const requestParams = {
    operationName: null,
    query: `query{
      platform{
        innovationHub(id:"${id}"){
          profile{
            visuals{uri}
          }
        }
      }
    }`,
    variables: {},
  };

  return await graphqlRequestAuth(requestParams, TestUser.GLOBAL_ADMIN);
};

export const getSpaceProfileDocuments = async (
  spaceId: string,
  userRole?: TestUser
) => {
  if (userRole === undefined) {
    console.log(userRole);
  }
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string) =>
    graphqlClient.getSpaceDocumentAndStorageData(
      {
        ID: spaceId,
      },
      authToken
        ? {
            authorization: `Bearer ${authToken}`,
          }
        : undefined
    );
  return graphqlErrorWrapper(callback, userRole);
};
