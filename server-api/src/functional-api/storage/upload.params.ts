import { AlkemioClient } from '@alkemio/client-lib';
import {
  getGraphqlClient,
  setAuthHeader,
  testConfiguration,
  TestUser,
} from '@alkemio/tests-lib';
import { graphqlErrorWrapper } from '@alkemio/tests-lib/dist/utils/graphql.wrapper';

import { PathLike } from 'fs';

const generateClientConfig = (user: TestUser) => ({
  apiEndpointPrivateGraphql: testConfiguration.endPoints.graphql.private,
  authInfo: {
    credentials: {
      email: `${user}@alkem.io`,
      password: testConfiguration.identities.admin.password,
    },
    kratosPublicApiEndpoint: testConfiguration.endPoints.kratos.public,
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

export const uploadFileOnLink = async (
  path: PathLike,
  linkId: string,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const alkemioClient = new AlkemioClient(generateClientConfig(userRole));
  await alkemioClient.enableAuthentication();
  const res = await alkemioClient.uploadFileOnLink(path, linkId);
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

export const deleteDocument = async (ID: string, userRole?: TestUser) => {
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

export const getUserReferenceUri = async (
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

export const getOrgReferenceUri = async (
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

export const getOrgVisualUri = async (
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

export const getOrgVisualUriInnovationHub = async (
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

export const getProfileDocuments = async (
  profileID: string,
  userRole?: TestUser
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.GetProfileDocuments(
      {
        profileID,
      },
      setAuthHeader(authToken)
    );
  return graphqlErrorWrapper(callback, userRole);
};
