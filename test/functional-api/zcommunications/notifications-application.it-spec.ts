import '../../utils/array.matcher';
import {
  createTestEcoverse,
  ecoverseName,
  ecoverseNameId,
  removeEcoverse,
} from '../integration/ecoverse/ecoverse.request.params';
import {
  createOrganization,
  deleteOrganization,
  hostNameId,
  organizationName,
} from '../integration/organization/organization.request.params';
import { mutation } from '@test/utils/graphql.request';
import { getUser } from '@test/functional-api/user-management/user.request.params';
import {
  deleteUserApplication,
  deleteVariablesData,
} from '@test/utils/mutations/delete-mutation';
import { createApplication } from '../user-management/application/application.request.params';
import { deleteMailSlurperMails } from '@test/utils/rest.request';
import {
  updateUserPreferenceVariablesData,
  PreferenceType,
  updateUserPreference,
} from '@test/utils/mutations/user-preferences-mutation';
import {
  assignChallengeAdmin,
  assignEcoverseAdmin,
  userAsChallengeAdminVariablesData,
  userAsEcoverseAdminVariablesData,
} from '@test/utils/mutations/authorization-mutation';
import {
  challengeVariablesData,
  createChallenge,
  uniqueId,
} from '@test/utils/mutations/create-mutation';
import {
  assignUserToCommunity,
  assignUserToCommunityVariablesData,
} from '@test/utils/mutations/assign-mutation';
import { removeChallenge } from '../integration/challenge/challenge.request.params';
import { delay, getMailsData } from './communications-helper';

let email = 'admin@alkem.io';
let emailNonEco = 'non.ecoverse@alkem.io';
let emailEcoAdmin = 'ecoverse.admin@alkem.io';
let emailChallengeAdmin = 'ecoverse.member@alkem.io';
let emailQAUser = 'qa.user@alkem.io';
let globalAdmin = '';
let nonEco = '';
let ecoAdmin = '';
let challengeAdmin = '';
let qaUser = '';
let ecoverseId = '';
let organizationId = '';
let ecoverseCommunityId = '';
let communicationID = '';
let challengeId = '';
let challengeCommunityId = '';
let applicationIdEcoverse = '';
let ecoName = ecoverseName;
let challengeName = `chName${uniqueId}`;

beforeAll(async () => {
  await deleteMailSlurperMails();

  const responseOrg = await createOrganization(organizationName, hostNameId);
  organizationId = responseOrg.body.data.createOrganization.id;

  let responseEco = await createTestEcoverse(
    ecoverseName,
    ecoverseNameId,
    organizationId
  );
  ecoverseId = responseEco.body.data.createEcoverse.id;
  ecoverseCommunityId = responseEco.body.data.createEcoverse.community.id;
  communicationID =
    responseEco.body.data.createEcoverse.community.communication.id;

  const responseChallenge = await mutation(
    createChallenge,
    challengeVariablesData(challengeName, `chnameid${uniqueId}`, ecoverseId)
  );
  challengeId = responseChallenge.body.data.createChallenge.id;
  challengeCommunityId =
    responseChallenge.body.data.createChallenge.community.id;

  const requestUserData = await getUser(email);
  globalAdmin = requestUserData.body.data.user.id;

  const reqNonEco = await getUser(emailNonEco);
  nonEco = reqNonEco.body.data.user.id;

  const reqEcoAdmin = await getUser(emailEcoAdmin);
  ecoAdmin = reqEcoAdmin.body.data.user.id;

  const reqChallengeAdmin = await getUser(emailChallengeAdmin);
  challengeAdmin = reqChallengeAdmin.body.data.user.id;

  const reqQaUser = await getUser(emailQAUser);
  qaUser = reqQaUser.body.data.user.id;

  await mutation(
    assignEcoverseAdmin,
    userAsEcoverseAdminVariablesData(ecoAdmin, ecoverseId)
  );

  await mutation(
    assignUserToCommunity,
    assignUserToCommunityVariablesData(ecoverseCommunityId, challengeAdmin)
  );

  await mutation(
    assignUserToCommunity,
    assignUserToCommunityVariablesData(challengeCommunityId, challengeAdmin)
  );

  await mutation(
    assignChallengeAdmin,
    userAsChallengeAdminVariablesData(challengeAdmin, challengeId)
  );
});

afterAll(async () => {
  await removeChallenge(challengeId);
  await removeEcoverse(ecoverseId);
  await deleteOrganization(organizationId);
});

describe('Notifications - applications', () => {
  beforeAll(async () => {
    await mutation(
      updateUserPreference,
      updateUserPreferenceVariablesData(
        globalAdmin,
        PreferenceType.APPLICATION_RECEIVED,
        'true'
      )
    );

    await mutation(
      updateUserPreference,
      updateUserPreferenceVariablesData(
        nonEco,
        PreferenceType.APPLICATION_SUBMITTED,
        'true'
      )
    );

    await mutation(
      updateUserPreference,
      updateUserPreferenceVariablesData(
        ecoAdmin,
        PreferenceType.APPLICATION_SUBMITTED,
        'true'
      )
    );
    await mutation(
      updateUserPreference,
      updateUserPreferenceVariablesData(
        ecoAdmin,
        PreferenceType.APPLICATION_RECEIVED,
        'true'
      )
    );

    await mutation(
      updateUserPreference,
      updateUserPreferenceVariablesData(
        challengeAdmin,
        PreferenceType.APPLICATION_SUBMITTED,
        'true'
      )
    );
    await mutation(
      updateUserPreference,
      updateUserPreferenceVariablesData(
        challengeAdmin,
        PreferenceType.APPLICATION_RECEIVED,
        'true'
      )
    );
  });

  beforeEach(async () => {
    await deleteMailSlurperMails();
  });

  test('receive notification for non ecoverse user application to hub- GA, EA and Applicant', async () => {
    // Act
    let applicatioData = await createApplication(ecoverseCommunityId, nonEco);
    applicationIdEcoverse = applicatioData.body.data.createApplication.id;

    await delay(1500);
    let getEmailsData = await getMailsData();

    // Assert
    expect(getEmailsData[1]).toEqual(3);
    expect(getEmailsData[0]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          subject: `Application from non ecoverse to ${ecoName} received!`,
          toAddresses: [email],
        }),
        expect.objectContaining({
          subject: `Application from non ecoverse to ${ecoName} received!`,
          toAddresses: [emailEcoAdmin],
        }),
        expect.objectContaining({
          subject: `Your application to ${ecoName} was received!`,
          toAddresses: [emailNonEco],
        }),
      ])
    );
  });

  test('receive notification for non ecoverse user application to challenge- GA, EA, CA and Applicant', async () => {
    // Act
    await createApplication(challengeCommunityId, nonEco);

    await delay(1500);
    let getEmailsData = await getMailsData();

    // Assert

    expect(getEmailsData[0]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          subject: `Application from non ecoverse to ${challengeName} received!`,
          toAddresses: [email],
        }),
        expect.objectContaining({
          subject: `Application from non ecoverse to ${challengeName} received!`,
          toAddresses: [emailEcoAdmin],
        }),
        expect.objectContaining({
          subject: `Application from non ecoverse to ${challengeName} received!`,
          toAddresses: [emailChallengeAdmin],
        }),
        expect.objectContaining({
          subject: `Your application to ${challengeName} was received!`,
          toAddresses: [emailNonEco],
        }),
      ])
    );
    expect(getEmailsData[1]).toEqual(4);
  });

  test('no notification for non ecoverse user application to hub- GA, EA and Applicant', async () => {
    // Arrange
    await mutation(
      updateUserPreference,
      updateUserPreferenceVariablesData(
        globalAdmin,
        PreferenceType.APPLICATION_RECEIVED,
        'false'
      )
    );

    await mutation(
      updateUserPreference,
      updateUserPreferenceVariablesData(
        nonEco,
        PreferenceType.APPLICATION_SUBMITTED,
        'false'
      )
    );

    await mutation(
      updateUserPreference,
      updateUserPreferenceVariablesData(
        ecoAdmin,
        PreferenceType.APPLICATION_SUBMITTED,
        'false'
      )
    );
    await mutation(
      updateUserPreference,
      updateUserPreferenceVariablesData(
        ecoAdmin,
        PreferenceType.APPLICATION_RECEIVED,
        'false'
      )
    );

    await mutation(
      updateUserPreference,
      updateUserPreferenceVariablesData(
        challengeAdmin,
        PreferenceType.APPLICATION_SUBMITTED,
        'false'
      )
    );
    await mutation(
      updateUserPreference,
      updateUserPreferenceVariablesData(
        challengeAdmin,
        PreferenceType.APPLICATION_RECEIVED,
        'false'
      )
    );

    await mutation(
      deleteUserApplication,
      deleteVariablesData(applicationIdEcoverse)
    );

    // Act
    await createApplication(challengeCommunityId, nonEco);

    await delay(1500);
    let getEmailsData = await getMailsData();

    // Assert
    expect(getEmailsData[1]).toEqual(0);
  });
});
