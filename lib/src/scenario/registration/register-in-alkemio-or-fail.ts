/* eslint-disable @typescript-eslint/no-explicit-any */
import request from 'supertest';
import { getUserToken } from './get-user-token';
import { testConfiguration } from '../../config/test.configuration';

/**
 * Ensures the user exists in Alkemio by authenticating (which triggers
 * server-side auto-creation) and returns the Alkemio user ID.
 */
export const registerInAlkemioOrFail = async (
  _firstName: string,
  _lastName: string,
  email: string
) => {
  const userToken = await getUserToken(email);

  const response = await request(testConfiguration.endPoints.graphql.private)
    .post('')
    .send({ query: '{ me { user { id } } }' })
    .set('Accept', 'application/json')
    .set('Authorization', `Bearer ${userToken}`);

  if (response.body.errors) {
    const errText = response.body.errors
      .map((x: any) => x.message)
      .join('\n');
    throw new Error(
      `Unable to get Alkemio user ID for '${email}': ${errText}`
    );
  }

  const userId = response.body.data?.me?.user?.id;
  if (!userId) {
    throw new Error(
      `User profile not found for '${email}' after authentication`
    );
  }

  return userId;
};

