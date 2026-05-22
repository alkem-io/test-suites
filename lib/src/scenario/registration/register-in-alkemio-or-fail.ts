/* eslint-disable @typescript-eslint/no-explicit-any */
import request from 'supertest';
import { getUserToken } from './get-user-token';
import { testConfiguration } from '../../config/test.configuration';
import { clearCachedNonInteractiveLoginToken } from '../../auth/non-interactive-login/get-bearer-via-non-interactive-login';

/**
 * Ensures the user exists in Alkemio by authenticating (which triggers
 * server-side auto-creation) and returns the Alkemio user ID.
 *
 * Resilient to a stale token cache: after a delete + re-register the cached
 * bearer still carries the OLD `alkemio_actor_id`, so `me.user.id` would come
 * back empty. On empty, we drop the cache, re-mint (which lazy-creates the
 * fresh User via IdentityResolveService), and retry once.
 */
export const registerInAlkemioOrFail = async (
  _firstName: string,
  _lastName: string,
  email: string
) => {
  const query = async (token: string) =>
    request(testConfiguration.endPoints.graphql.private)
      .post('')
      .send({ query: '{ me { user { id } } }' })
      .set('Accept', 'application/json')
      .set('Authorization', `Bearer ${token}`);

  let userToken = await getUserToken(email);
  let response = await query(userToken);

  if (response.body.errors) {
    const errText = response.body.errors
      .map((x: any) => x.message)
      .join('\n');
    throw new Error(
      `Unable to get Alkemio user ID for '${email}': ${errText}`
    );
  }

  let userId = response.body.data?.me?.user?.id;
  if (!userId) {
    clearCachedNonInteractiveLoginToken(email);
    userToken = await getUserToken(email);
    response = await query(userToken);
    userId = response.body.data?.me?.user?.id;
  }

  if (!userId) {
    throw new Error(
      `User profile not found for '${email}' after authentication`
    );
  }

  return userId;
};

