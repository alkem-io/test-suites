import { testConfiguration } from '@src/config/test.configuration';
import request from 'supertest';

/**
 * Returns 2 values:
 ** 1st: emails array
 ** 2nd: emails count
 */
 export const getMailsData = async () => {
  const response = await getMails();
  const emailsData = response.body.mailItems;
  const emailsCount = response.body.totalRecords;

  return [emailsData, emailsCount];
};

export const deleteMailSlurperMails = async () => {
  return await request(testConfiguration.endPoints.mailSlurper)
    .delete('')
    .send({
      pruneCode: 'all',
    })
    .set('Accept', 'application/json')
    .set('Content-Type', 'application/json')
    .set('Connection', 'keep-alive');
};

export const getMails = async () => {
  return await request(testConfiguration.endPoints.mailSlurper)
    .get('')
    .set('Accept', 'application/json')
    .set('Content-Type', 'application/json')
    .set('Connection', 'keep-alive')
    .set('Accept-Encoding', 'gzip, deflate, br');
};
