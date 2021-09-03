import {
  createOrganisationMutation,
  deleteOrganisationMutation,
  hostNameId,
  organisationName,
  updateOrganisationMutation,
} from '@test/functional-api/integration/organisation/organisation.request.params';

const legalEntityName = 'Legal alkemio';
const domain = 'alkem.io';
const website = 'alkem.io';
const contactEmail = 'contact@alkem.io';

describe('Organisation', () => {
  let orgId = '';
  beforeAll(async () => {
    const res = await createOrganisationMutation(organisationName, hostNameId);
    orgId = res.body.data.createOrganisation.id;
  });
  afterAll(async () => await deleteOrganisationMutation(orgId));

  describe('create', () => {
    test('should create', async () => {
      const res = await createOrganisationMutation(
        organisationName + '1',
        hostNameId + '2',
        legalEntityName,
        domain,
        website,
        contactEmail
      );

      const data = res.body.data.createOrganisation;
      const testOrgId = data.id;

      expect(res.status).toBe(200);
      expect(data).toMatchObject({
        id: testOrgId,
        displayName: organisationName + '1',
        nameID: hostNameId + '2',
        legalEntityName: legalEntityName,
        domain: domain,
        website: website,
        contactEmail: contactEmail,
      });

      await deleteOrganisationMutation(testOrgId);
    });

    test('should FAIL on breaking unique nameID', async () => {
      // we already created such with the same nameID
      const res = await createOrganisationMutation(
        organisationName + '1',
        hostNameId
      );

      expect(res.status).toBe(200);
      expect(res.body.errors[0].message).toBe(`Organisation: the provided nameID is already taken: ${hostNameId}`);
    });

    test('should FAIL on breaking unique displayName', async () => {
      // we already created such with the same displayName
      const res = await createOrganisationMutation(
        organisationName,
        hostNameId + '1'
      );

      expect(res.status).toBe(200);
      expect(res.body.errors[0].message).toBe(`Organisation: the provided displayName is already taken: ${organisationName}`);
    });
  });

  describe('update', () => {
    let updateOrganisationId = '';
    beforeAll(async () => {
      const res = await createOrganisationMutation(
        organisationName + '-update',
        hostNameId + '-update'
      );
      updateOrganisationId = res.body.data.createOrganisation.id;
    });
    afterAll(
      async () => await deleteOrganisationMutation(updateOrganisationId));

    test('should update', async () => {
      const res = await updateOrganisationMutation(
        updateOrganisationId,
        organisationName + '1',
        legalEntityName + '2',
        domain + '3',
        website + '4',
        contactEmail + '5'
      );

      const data = res.body.data.updateOrganisation;

      expect(data).toMatchObject({
        id: updateOrganisationId,
        nameID: hostNameId + '-update',
        displayName: organisationName + '1',
        legalEntityName: legalEntityName + '2',
        domain: domain + '3',
        website: website + '4',
        contactEmail: contactEmail + '5',
      });
    });

    test('should FAIL on breaking unique displayName', async () => {
      const res = await updateOrganisationMutation(
        updateOrganisationId,
        organisationName
      );

      expect(res.statusCode).toBe(200);
      expect(res.body.errors[0].message).toBe(`Organisation: the provided displayName is already taken: ${organisationName}`);
    });
  });

  describe('delete', () => {
    let deleteOrganisationId = '';
    beforeAll(async () => {
      const res = await createOrganisationMutation(
        organisationName + '-delete',
        hostNameId + '-delete'
      );
      deleteOrganisationId = res.body.data.createOrganisation.id;
    });
    test('should delete', async () => {
      const res = await deleteOrganisationMutation(deleteOrganisationId);
      const data = res.body.data.deleteOrganisation;

      expect(data).toMatchObject({ id: deleteOrganisationId });
    });

    test('should FAIL on unknown id', async () => {
      const mockId = 'mockid';
      const res = await deleteOrganisationMutation(mockId);

      expect(res.statusCode).toBe(200);
      expect(res.body.errors[0].message).toBe(`Unable to find Organisation with ID: ${mockId}`);
    });
  });
});
