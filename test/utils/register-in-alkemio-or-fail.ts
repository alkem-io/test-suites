import request from 'supertest';
import { AlkemioClient } from '@alkemio/client-lib';
import { userData } from './common-params';
import { TestUser } from './token.helper';

const PASSWORD = process.env.AUTH_TEST_HARNESS_PASSWORD || '';
const SERVER_URL = process.env.ALKEMIO_SERVER_URL;

export const registerInAlkemioOrFail = async (
  firstName: string,
  lastName: string,
  email: string
) => {
  const userResponse = await createUserInit(firstName, lastName, email);

  if (!userResponse.body.data.createUser.id) {
    throw new Error(`Unable to register user in Alkemio for user '${email}'`);
  }
};

const createUserInit = async (
  firstName: string,
  lastName: string,
  email: string
) => {
  const requestParams = {
    operationName: 'CreateUser',
    query: `mutation CreateUser($userData: CreateUserInput!) {createUser(userData: $userData) { ${userData}  }}`,
    variables: {
      userData: {
        firstName,
        lastName,
        email,
        nameID: firstName + lastName,
        displayName: firstName + lastName,
      },
    },
  };

  const adminToken = await getAdminToken();

  return await request(SERVER_URL)
    .post('')
    .send({ ...requestParams })
    .set('Accept', 'application/json')
    .set('Authorization', `Bearer ${adminToken}`);
};

const getAdminToken = async () => {
  const server = process.env.ALKEMIO_SERVER || '';

  if (!server) {
    throw new Error('server url not provided');
  }

  const identifier = `${TestUser.GLOBAL_ADMIN}@alkem.io`;

  const alkemioClientConfig = {
    apiEndpointPrivateGraphql: server,
    authInfo: {
      credentials: {
        email: identifier,
        password: PASSWORD,
      },
    },
  };

  const alkemioClient = new AlkemioClient(alkemioClientConfig);
  await alkemioClient.enableAuthentication();

  return alkemioClient.apiToken;
};
