import { AlkemioClient } from '@alkemio/client-lib';
import { challengeId } from '@test/non-functional/auth/common-auth-variables';
import { TestUser } from '@test/utils';
import { setAuthHeader } from '@test/utils/graphql.authorization.header';
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

export const uploadFileOnStorageBucket = async (
  path: PathLike,
  storageBucketId: string,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const alkemioClient = new AlkemioClient(generateClientConfig(userRole));
  await alkemioClient.enableAuthentication();

  const res = await alkemioClient.uploadFileOnStorageBucket(
    path,
    storageBucketId
  );

  return res;
};

export const deleteDocumentCodegen = async (
  ID: string,
  userRole?: TestUser
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.DeleteDocument(
      {
        deleteData: {
          ID,
        },
      },
      setAuthHeader(authToken)
    );
  return graphqlErrorWrapper(callback, userRole);
};

export const getUserReferenceUriCodegen = async (
  userId: string,
  userRole?: TestUser
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.GetUserReferenceUri(
      {
        userId,
      },
      setAuthHeader(authToken)
    );
  return graphqlErrorWrapper(callback, userRole);
};

export const getOrgReferenceUriCodegen = async (
  organizationId: string,
  userRole?: TestUser
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.GetOrgReferenceUri(
      {
        organizationId,
      },
      setAuthHeader(authToken)
    );
  return graphqlErrorWrapper(callback, userRole);
};

export const getOrgVisualUriCodegen = async (
  organizationId: string,
  userRole?: TestUser
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.GetOrgVisualUri(
      {
        organizationId,
      },
      setAuthHeader(authToken)
    );
  return graphqlErrorWrapper(callback, userRole);
};

export const getOrgVisualUriInnovationHubCodegen = async (
  ID: string,
  userRole?: TestUser
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.GetOrgVisualUriInnovationHub(
      {
        ID,
      },
      setAuthHeader(authToken)
    );
  return graphqlErrorWrapper(callback, userRole);
};

export const getSpaceProfileDocuments = async (
  spaceId: string,
  userRole?: TestUser
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.getSpaceDocumentAndStorageData(
      {
        ID: spaceId,
      },
      setAuthHeader(authToken)
    );
  return graphqlErrorWrapper(callback, userRole);
};

export const getChallengeProfileDocuments = async (
  spaceId: string,
  challengeId: string,
  userRole?: TestUser
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.GetChallengeDocumentAndStorageData(
      {
        ID: spaceId,
        challengeID: challengeId,
      },
      setAuthHeader(authToken)
    );
  return graphqlErrorWrapper(callback, userRole);
};

export const getOrganizationProfileDocuments = async (
  organizationId: string,
  userRole?: TestUser
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.GetOrganizationDocumentAndStorageData(
      {
        ID: organizationId,
      },
      setAuthHeader(authToken)
    );
  return graphqlErrorWrapper(callback, userRole);
};

export const getUserProfileDocuments = async (
  userId: string,
  userRole?: TestUser
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.GetUserDocumentAndStorageData(
      {
        ID: userId,
      },
      setAuthHeader(authToken)
    );
  return graphqlErrorWrapper(callback, userRole);
};
