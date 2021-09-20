import { getUsers } from '../user.request.params';
import '@test/utils/array.matcher';

import {
  createApplicationMutation,
  getApplication,
  removeApplicationMutation,
} from './application.request.params';
import { getCommunityData } from '../../integration/community/community.request.params';
import { createTestEcoverse, ecoverseName, ecoverseNameId, removeEcoverseMutation } from '../../integration/ecoverse/ecoverse.request.params';
import { createOrganizationMutation, organizationName, hostNameId, deleteOrganizationMutation } from '../../integration/organization/organization.request.params';



let applicationId = '';
let applicationData:any;
let userId = '';
let userEmail = '';
let ecoverseCommunityId = '';
let ecoverseId = '';
let organizationId = '';

beforeAll(async () => {
  const responseOrg = await createOrganizationMutation(
    organizationName,
    hostNameId
  );
  organizationId = responseOrg.body.data.createOrganization.id;
  let responseEco = await createTestEcoverse(
    ecoverseName,
    ecoverseNameId,
    organizationId
  );
  ecoverseId = responseEco.body.data.createEcoverse.id;
  ecoverseCommunityId = responseEco.body.data.createEcoverse.community.id;
});

afterAll(async () => {
  await removeEcoverseMutation(ecoverseId);
  await deleteOrganizationMutation(organizationId);
});

beforeEach(async () => {
  let users = await getUsers();
  let usersArray = users.body.data.users;
  function usersData(entity: { email: string }) {
    return entity.email === 'non.ecoverse@alkem.io';
  }
  userId = usersArray.find(usersData).id;
  userEmail = usersArray.find(usersData).email;

});

describe('Application', () => {
  afterEach(async () => {
    await removeApplicationMutation(applicationId);
  });

  test('should create application', async () => {
    // Act
    applicationData = await createApplicationMutation(
      ecoverseCommunityId,
      userId
    );

    applicationId = applicationData.body.data.createApplication.id;
    const getApp = await getApplication(applicationId);

    // Assert
    expect(applicationData.status).toBe(200);
    expect(applicationData.body.data.createApplication.lifecycle.state).toEqual(
      'new'
    );
    expect(applicationData.body.data.createApplication).toEqual(
      getApp.body.data.ecoverse.application
    );
  });

  test('should throw error for creating the same application twice', async () => {
    // Act
    let applicationDataOne = await createApplicationMutation(
      ecoverseCommunityId,
      userId
    );
    applicationId = applicationDataOne.body.data.createApplication.id;
    let applicationDataTwo = await createApplicationMutation(
      ecoverseCommunityId,
      userId
    );

    // Assert
    expect(applicationDataTwo.text).toContain(
      `An application for user ${userEmail} already exists for Community: ${ecoverseCommunityId}.`
    );
  });

  test('should throw error for quering not existing application', async () => {
    // Act
    let appId = '8bf7752d-59bf-404a-97c8-e906d8377c37';
    const getApp = await getApplication(appId);

    // Assert
    expect(getApp.status).toBe(200);
    expect(getApp.text).toContain(
      `Application with ID ${appId} can not be found!`
    );
  });

  test('should remove application', async () => {
    // Arrange
    applicationData = await createApplicationMutation(
      ecoverseCommunityId,
      userId
    );
    applicationId = applicationData.body.data.createApplication.id;

    // Act
    let removeApp = await removeApplicationMutation(applicationId);
    const getApp = await getApplication(applicationId);

    // Assert
    expect(removeApp.status).toBe(200);
    expect(getApp.text).toContain(
      `Application with ID ${applicationId} can not be found!`
    );
  });
});
