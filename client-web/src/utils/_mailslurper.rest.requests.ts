import request from 'supertest';
const environment = process.env.MAIL_SLURPER_ENDPOINT || 'localhost:4437/mail';

export const deleteMailSlurperMails = async () => {
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
