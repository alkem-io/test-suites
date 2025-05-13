import request from 'supertest';

export const sendKratosFlow = async (
  actionUrl: string,
  params: Record<string, unknown>
) =>
  request(actionUrl)
    .post('')
    .set('Accept', 'application/json')
    .send(params);
