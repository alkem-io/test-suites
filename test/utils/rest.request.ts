import request from 'supertest';
import { TestUtil } from './test.util';
import { TestUser } from './token.helper';

const environment =
  process.env.MAIL_SLURPER_ENDPOINT || 'localhost:4436/mailslurper-api/mail';

/**
 * Rest request wrapper for unauthenticated scenarios.
 * @api public
 */
export const restRequest = async () => {
  return await request(environment)
    .get('')
    .set('Accept', 'application/json');
};

/**
 * Rest request wrapper for authenticated scenarios.
 * @param {TestUser} user impersonated user in the authentication scenario
 * @api public
 */
export const restRequestAuth = async (user?: TestUser) => {
  let auth_token = '';

  if (!user) {
    return await restRequest();
  } else {
    await TestUtil.Instance.bootstrap();
    const res = TestUtil.Instance.userTokenMap.get(user);
    if (!res) throw console.error(`Could not authenticate user ${user}`);
    else auth_token = res as string;
  }

  return await request(environment)
    .get('')
    .set('Accept', 'application/json')
    .set('Authorization', `Bearer ${auth_token}`);
};

export const deleteMailSlurperMails = async (user?: TestUser) => {
  return await request(environment)
    .delete('')
    .send({
      pruneCode: 'all',
    })
    .set('Accept', 'application/json')
    .set('Content-Type', 'application/json')
    .set('Connection', 'keep-alive');
};

export const getMails = async () => {
  return await request(environment)
    .get('')
    .set('Accept', 'application/json')
    .set('Content-Type', 'application/json')
    .set('Connection', 'keep-alive')
    .set('Accept-Encoding', 'gzip, deflate, br');
};
