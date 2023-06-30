import request from 'supertest';
import { TestUtil } from './test.util';
import { TestUser } from './token.helper';

const SERVER_REST_URL = process.env.ALKEMIO_SERVER_REST;

export const getDocument = (documentId: string) => {
  return request(buildDocumentUrl(documentId)).get('');
};

export const getAuthDocument = async (documentId: string, user?: TestUser) => {
  if (!user) {
    return getDocument(documentId);
  }
  const bearerToken = (await TestUtil.Instance()).userTokenMap.get(user);

  if (!bearerToken) {
    throw console.error(`Could not authenticate user ${user}`);
  }

  return getDocument(documentId).set('Authorization', `Bearer ${bearerToken}`);
};

const buildDocumentUrl = (documentId: string) =>
  `${SERVER_REST_URL}/storage/document/${documentId}`;
