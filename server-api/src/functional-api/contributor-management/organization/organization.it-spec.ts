/**
 * This file contains integration tests for the organization management functionality.
 * It includes tests for creating and deleting organizations within the platform.
 * The tests cover scenarios such as:
 * - Creating an organization with specific details like name, domain, website, and contact email.
 * - Verifying the successful creation of an organization.
 * - Cleaning up by deleting the created organization after tests.
 *
 * The tests ensure that the organization creation and deletion processes work as expected,
 * and that the API responses match the expected values.
 */
import {
  TestScenarioFactory,
  TestScenarioNoPreCreationConfig,
  UniqueIDGenerator,
} from '@alkemio/tests-lib';
import {
  createOrganization,
  deleteOrganization,
  updateOrganization,
} from './organization.request.params';

const uniqueId = UniqueIDGenerator.getID();
const legalEntityName = 'Legal alkemio';
const domain = 'alkem.io';
const website = 'alkem.io';
const contactEmail = 'contact@alkem.io';
const organizationName = `org-name + ${uniqueId}`;
const hostNameId = 'org-nameid' + uniqueId;
let orgId = '';

const scenarioConfig: TestScenarioNoPreCreationConfig = {
  name: 'organization',
};
beforeAll(async () => {
  await TestScenarioFactory.createBaseScenarioEmpty(scenarioConfig);

  const res = await createOrganization(organizationName, hostNameId);

  orgId = res.data?.createOrganization?.id ?? '';
});
afterAll(async () => await deleteOrganization(orgId));

/** @testCase TC-1501 */
describe('Organization', () => {
  describe('create', () => {
    test('should create', async () => {
      const res = await createOrganization(
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

      await deleteOrganization(testOrgId);
    });

    test('should FAIL on breaking unique nameID', async () => {
      // we already created such with the same nameID
      const res = await createOrganization(organizationName + '1', hostNameId);

      expect(res.error?.errors[0].message).toBe(
        `Organization: the provided nameID is already taken: ${hostNameId}`
      );
    });

    test('should FAIL on breaking unique displayName', async () => {
      // we already created such with the same displayName
      const res = await createOrganization(organizationName, hostNameId + '1');

      expect(res.error?.errors[0].message).toEqual(
        `Organization: the provided displayName is already taken: ${organizationName}`
      );
    });
  });
  describe('update', () => {
    let updateOrganizationId = '';
    beforeAll(async () => {
      const res = await createOrganization(
        organizationName + '-update',
        hostNameId + '-update'
      );
      const orgData = res.data?.createOrganization;
      updateOrganizationId = orgData?.id ?? '';
    });
    afterAll(async () => await deleteOrganization(updateOrganizationId));

    test('should update', async () => {
      const res = await updateOrganization(updateOrganizationId, {
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
      const res = await updateOrganization(updateOrganizationId, {
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
      const res = await createOrganization(
        organizationName + '-delete',
        hostNameId + '-delete'
      );
      deleteOrganizationId = res.data?.createOrganization?.id ?? '';
    });
    test('should delete', async () => {
      const res = await deleteOrganization(deleteOrganizationId);
      const data = res.data?.deleteOrganization;

      expect(data).toMatchObject({ id: deleteOrganizationId });
    });

    test('should FAIL on unknown id', async () => {
      const mockId = '29d8b951-667e-429a-9e0e-89c6376ff08d';
      const res = await deleteOrganization(mockId);

      expect(res.error?.errors[0].message).toBe(
        `Unable to find Organization with ID: ${mockId}`
      );
    });
  });
});
