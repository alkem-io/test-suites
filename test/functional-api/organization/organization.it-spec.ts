import {
  createOrganizationCodegen,
  deleteOrganizationCodegen,
  updateOrganizationCodegen,
} from '@test/functional-api/organization/organization.request.params';
import { uniqueId } from '@test/utils/mutations/create-mutation';

const legalEntityName = 'Legal alkemio';
const domain = 'alkem.io';
const website = 'alkem.io';
const contactEmail = 'contact@alkem.io';
const organizationName = `org-name + ${uniqueId}`;
const hostNameId = 'org-nameid' + uniqueId;
let orgId = '';
beforeAll(async () => {
  const res = await createOrganizationCodegen(organizationName, hostNameId);

  orgId = res.data?.createOrganization?.id ?? '';
});
afterAll(async () => await deleteOrganizationCodegen(orgId));

describe('Organization', () => {
  describe('create', () => {
    test('should create', async () => {
      const res = await createOrganizationCodegen(
        organizationName + '1',
        hostNameId + '2',
        legalEntityName,
        domain,
        website,
        contactEmail
      );

      const data = res.data?.createOrganization;
      const testOrgId = data?.id ?? '';

      expect(res.status).toBe(200);
      expect(data).toMatchObject({
        id: testOrgId,
        nameID: hostNameId + '2',
        legalEntityName: legalEntityName,
        domain: domain,
        website: website,
        contactEmail: contactEmail,
      });

      await deleteOrganizationCodegen(testOrgId);
    });

    test('should FAIL on breaking unique nameID', async () => {
      // we already created such with the same nameID
      const res = await createOrganizationCodegen(
        organizationName + '1',
        hostNameId
      );

      expect(res.error?.errors[0].message).toBe(
        `Organization: the provided nameID is already taken: ${hostNameId}`
      );
    });

    test('should FAIL on breaking unique displayName', async () => {
      // we already created such with the same displayName
      const res = await createOrganizationCodegen(
        organizationName,
        hostNameId + '1'
      );

      expect(res.error?.errors[0].message).toEqual(
        `Organization: the provided displayName is already taken: ${organizationName}`
      );
    });
  });
  describe('update', () => {
    let updateOrganizationId = '';
    beforeAll(async () => {
      const res = await createOrganizationCodegen(
        organizationName + '-update',
        hostNameId + '-update'
      );
      const orgData = res.data?.createOrganization;
      updateOrganizationId = orgData?.id ?? '';
    });
    afterAll(async () => await deleteOrganizationCodegen(updateOrganizationId));

    test('should update', async () => {
      const res = await updateOrganizationCodegen(updateOrganizationId, {
        legalEntityName: legalEntityName + '2',
        domain: domain + '3',
        website: website + '4',
        contactEmail: '5' + contactEmail,
        profileData: {
          displayName: organizationName + '1',
          tagline: 'Org tagline',
          location: { country: 'test country', city: 'test city' },
          description: 'test description',
        },
      });

      const data = res.data?.updateOrganization;

      expect(data).toMatchObject({
        id: updateOrganizationId,
        nameID: hostNameId + '-update',
        legalEntityName: legalEntityName + '2',
        domain: domain + '3',
        website: website + '4',
        contactEmail: '5' + contactEmail,
        profile: {
          displayName: organizationName + '1',
          tagline: 'Org tagline',
          location: { country: 'test country', city: 'test city' },
          description: 'test description',
        },
      });
    });

    test('should FAIL on breaking unique displayName', async () => {
      const res = await updateOrganizationCodegen(updateOrganizationId, {
        profileData: {
          displayName: organizationName,
        },
      });

      expect(res.error?.errors[0].message).toEqual(
        `Organization: the provided displayName is already taken: ${organizationName}`
      );
    });
  });
  describe('delete', () => {
    let deleteOrganizationId = '';
    beforeAll(async () => {
      const res = await createOrganizationCodegen(
        organizationName + '-delete',
        hostNameId + '-delete'
      );
      deleteOrganizationId = res.data?.createOrganization?.id ?? '';
    });
    test('should delete', async () => {
      const res = await deleteOrganizationCodegen(deleteOrganizationId);
      const data = res.data?.deleteOrganization;

      expect(data).toMatchObject({ id: deleteOrganizationId });
    });

    test('should FAIL on unknown id', async () => {
      const mockId = 'mockid';
      const res = await deleteOrganizationCodegen(mockId);

      expect(res.error?.errors[0].message).toBe(
        `Unable to find Organization with ID: ${mockId}`
      );
    });
  });
});
