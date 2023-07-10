import { getAuthDocument, TestUser } from '@test/utils';

describe('Documents API', () => {
  test('Get document', async () => {
    const documentIdThatExists = 'afba9a16-6e54-47ed-a30e-ede8080c5e05';
    const document = await getAuthDocument(
      documentIdThatExists,
      TestUser.GLOBAL_ADMIN
    );

    expect(document).toBeDefined();
  });
});
