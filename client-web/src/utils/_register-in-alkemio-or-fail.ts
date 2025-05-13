import request from 'supertest';
import { TestUser } from '@alkemio/tests-lib';
import { getUserToken } from './get-user-token';

const SERVER_URL = process.env.ALKEMIO_SERVER_URL || 'not set';

export const registerInAlkemioOrFail = async (
  firstName: string,
  lastName: string,
  email: string
) => {
  const userResponse = await createUserNewRegistration(
    firstName,
    lastName,
    email
  );

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
      const extensionCode = userResponse.body.errors.map(
        (x: any) => x.extensions.code
      );
      throw new Error(
        `Unable to register user in Alkemio for user '${email}:: ${extensionCode}: ${errText}`
      );
    }
  }
  return userResponse.body.data.createUserNewRegistration.id;
};

export const createUserNewRegistration = async (
  firstName: string,
  lastName: string,
  userEmail: string
) => {
  const requestParams = {
    operationName: null,
    query: `mutation createUserNewRegistration { createUserNewRegistration { id }}`,
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

export const assignGA = async (userID: string) => {
  const requestParams = {
    operationName: null,
    query: `mutation assignUserAsGlobalAdmin($input: AssignGlobalAdminInput!) {
      assignUserAsGlobalAdmin(roleData: $input) {
        id
        displayName
      }
    }`,
    variables: {
      input: {
        userID,
      },
    },
  };

  const userToken = await getUserToken(TestUser.GLOBAL_ADMIN);

  return await request(SERVER_URL)
    .post('')
    .send({ ...requestParams })
    .set('Accept', 'application/json')
    .set('Authorization', `Bearer ${userToken}`);
};
