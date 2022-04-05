import request from 'supertest';
import { AlkemioClient } from '@alkemio/client-lib';
import { userData } from './common-params';
import { TestUser } from './token.helper';
import { verifyInKratosOrFail } from './kratos/verify-in-kratos-or-fail';
import { registerInKratosOrFail } from './kratos/register-in-kratos-or-fail';

const PASSWORD = process.env.AUTH_TEST_HARNESS_PASSWORD || '';
const SERVER_URL = process.env.ALKEMIO_SERVER_URL;

export const registerNewUserInAlkemioOrFail = async (
  firstName: string,
  lastName: string,
  email: string
) => {
  const userResponse = await createUserInit(firstName, lastName, email);

  if (userResponse.body.errors) {
    const errText = userResponse.body.errors
      .map((x: any) => x.message)
      .join('\n');

    if (
      errText.indexOf('nameID is already taken') > -1 ||
      errText.indexOf('User profile with the specified email') > -1
    ) {
      throw new Error('User already exists');
    } else {
      throw new Error(`Unable to register user in Alkemio for user '${email}'`);
    }
  }
};

const createUserInit = async (
  firstName: string,
  lastName: string,
  userEmail: string
) => {
  const requestParams = {
    operationName: null,
    query: `mutation createUserNewRegistration { createUserNewRegistration { ${userData}}}`,
    variables: {
      userData: {
        firstName,
        lastName,
        email: userEmail,
        nameID: firstName + lastName,
        displayName: firstName + ' ' + lastName,
      },
    },
  };

  const userToken = await getUserToken(userEmail);

  return await request(SERVER_URL)
    .post('')
    .send({ ...requestParams })
    .set('Accept', 'application/json')
    .set('Authorization', `Bearer ${userToken}`);
};

const getUserToken = async (userEmail: string) => {
  const server = process.env.ALKEMIO_SERVER || '';

  if (!server) {
    throw new Error('server url not provided');
  }

  const alkemioClientConfig = {
    apiEndpointPrivateGraphql: server,
    authInfo: {
      credentials: {
        email: userEmail,
        password: PASSWORD,
      },
    },
  };

  const alkemioClient = new AlkemioClient(alkemioClientConfig);
  await alkemioClient.enableAuthentication();

  return alkemioClient.apiToken;
};

export const registerVerifiedUser = async (
  email: string,
  firstName: string,
  lastName: string
) => {
  await registerInKratosOrFail(firstName, lastName, email);
  await verifyInKratosOrFail(email);
  await registerNewUserInAlkemioOrFail(firstName, lastName, email);
};
