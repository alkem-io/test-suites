import request from 'supertest';
import { userData } from './common-params';
import { getUserToken } from './get-user-token';

const SERVER_URL = process.env.ALKEMIO_SERVER_URL;

export const registerInAlkemioOrFail = async (
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

export const createUserInit = async (
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