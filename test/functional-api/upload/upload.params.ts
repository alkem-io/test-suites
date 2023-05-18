import { AlkemioClient } from '@alkemio/client-lib';
import { TestUser } from '@test/utils';
import { graphqlRequestAuth } from '@test/utils/graphql.request';
import { PathLike, ReadStream, createReadStream } from 'fs';

const server = process.env.ALKEMIO_SERVER || '';

const alkemioClientConfig = {
  apiEndpointPrivateGraphql: server,
  authInfo: {
    credentials: {
      email: 'admin@alkem.io',
      password: '@lk3m10!',
    },
    kratosPublicApiEndpoint:
      'http://localhost:3000/identity/ory/kratos/public/',
  },
};

export const getToken = async (userRole: TestUser = TestUser.GLOBAL_ADMIN) => {
  const requestParams = {
    operationName: null,
    query: 'query{platform{id }}',
    variables: null,
  };
  const a = await graphqlRequestAuth(requestParams, userRole);
  console.log(a.header.authorizayion);
  return a.header.authorization;
};

export const uploadFileOnRef = async (
  path: PathLike,
  refId: string
  //userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const alkemioClient = new AlkemioClient(alkemioClientConfig);

  //const a = await graphqlRequestAuth(
  const a = await alkemioClient.uploadFileOnReference(path, refId);
  //   TestUser.GLOBAL_ADMIN
  // );
  console.log(a);
};

export interface FileUpload {
  filename: string;
  mimetype: string;
  encoding: string;
  createReadStream(): ReadStream;
}

export interface StorageBucketUploadFileInput {
  referenceID: string;
}

export const uploadFileOnReff = async (
  path: PathLike,
  refId: string,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const file = (createReadStream(path) as unknown) as FileUpload;
  const uploadData = { referenceId: refId };

  const requestParams = {
    operationName: null,
    query: `mutation uploadFileOnReference($file: Upload!, $uploadData: StorageBucketUploadFileInput!) {
      uploadFileOnReference(file: ${file}, uploadData: ${uploadData}) {
        id
        description
        name
        uri
      }
    }`,
    variables: null,
  };

  return await graphqlRequestAuth(requestParams, userRole);
};
