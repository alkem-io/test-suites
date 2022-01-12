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
import { deleteMailSlurperMails } from '@test/utils/rest.request';
import {
  updateUserPreferenceVariablesData,
  PreferenceType,
  updateUserPreference,
} from '@test/utils/mutations/user-preferences-mutation';
import {
  assignChallengeAdmin,
  assignEcoverseAdmin,
  assignUserAsOpportunityAdmin,
  userAsChallengeAdminVariablesData,
  userAsEcoverseAdminVariablesData,
  userAsOpportunityAdminVariablesData,
} from '@test/utils/mutations/authorization-mutation';
import {
  challengeVariablesData,
  createChallenge,
  createOpportunity,
  opportunityVariablesData,
  uniqueId,
} from '@test/utils/mutations/create-mutation';
import {
  assignUserToCommunity,
  assignUserToCommunityVariablesData,
} from '@test/utils/mutations/assign-mutation';
import { removeChallenge } from '../integration/challenge/challenge.request.params';
import { TestUser } from '@test/utils/token.helper';
import {
  sendCommunityUpdate,
  sendCommunityUpdateVariablesData,
} from '@test/utils/mutations/update-mutation';
import { delay, getMailsData } from './communications-helper';
import { removeOpportunity } from '../integration/opportunity/opportunity.request.params';

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
let ecoverseUpdatesId = '';
let challengeId = '';
let challengeCommunityId = '';
let challengeUpdatesId = '';
let opportunityId = '';
let opportunityCommunityId = '';
let opportunityUpdatesId = '';
let ecoName = ecoverseName;
let challengeName = `chName${uniqueId}`;
let opportunityName = `opName${uniqueId}`;

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
  ecoverseUpdatesId =
    responseEco.body.data.createEcoverse.community.communication.updates.id;

  const responseChallenge = await mutation(
    createChallenge,
    challengeVariablesData(challengeName, `chnameid${uniqueId}`, ecoverseId)
  );
  challengeId = responseChallenge.body.data.createChallenge.id;
  challengeCommunityId =
    responseChallenge.body.data.createChallenge.community.id;
  challengeUpdatesId =
    responseChallenge.body.data.createChallenge.community.communication.updates
      .id;

  const responseOpportunity = await mutation(
    createOpportunity,
    opportunityVariablesData(
      opportunityName,
      `opnameid${uniqueId}`,
      challengeId
    )
  );
  opportunityId = responseOpportunity.body.data.createOpportunity.id;
  opportunityCommunityId =
    responseOpportunity.body.data.createOpportunity.community.id;
  opportunityUpdatesId =
    responseOpportunity.body.data.createOpportunity.community.communication
      .updates.id;

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
    assignUserToCommunity,
    assignUserToCommunityVariablesData(ecoverseCommunityId, ecoAdmin)
  );

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
    assignUserToCommunityVariablesData(ecoverseCommunityId, emailQAUser)
  );
  await mutation(
    assignUserToCommunity,
    assignUserToCommunityVariablesData(challengeCommunityId, challengeAdmin)
  );

  await mutation(
    assignUserToCommunity,
    assignUserToCommunityVariablesData(challengeCommunityId, emailQAUser)
  );

  await mutation(
    assignChallengeAdmin,
    userAsChallengeAdminVariablesData(challengeAdmin, challengeId)
  );

  await mutation(
    assignUserToCommunity,
    assignUserToCommunityVariablesData(opportunityCommunityId, challengeAdmin)
  );

  await mutation(
    assignUserToCommunity,
    assignUserToCommunityVariablesData(opportunityCommunityId, emailQAUser)
  );

  await mutation(
    assignUserAsOpportunityAdmin,
    userAsOpportunityAdminVariablesData(challengeAdmin, opportunityId)
  );
});

afterAll(async () => {
  await removeOpportunity(opportunityId);
  await removeChallenge(challengeId);
  await removeEcoverse(ecoverseId);
  await deleteOrganization(organizationId);
});

describe('Notifications - updates', () => {
  beforeAll(async () => {
    await mutation(
      updateUserPreference,
      updateUserPreferenceVariablesData(
        globalAdmin,
        PreferenceType.UPDATES,
        'true'
      )
    );

    await mutation(
      updateUserPreference,
      updateUserPreferenceVariablesData(
        globalAdmin,
        PreferenceType.UPDATE_SENT_ADMIN,
        'true'
      )
    );

    await mutation(
      updateUserPreference,
      updateUserPreferenceVariablesData(
        ecoAdmin,
        PreferenceType.UPDATES,
        'true'
      )
    );

    await mutation(
      updateUserPreference,
      updateUserPreferenceVariablesData(
        ecoAdmin,
        PreferenceType.UPDATE_SENT_ADMIN,
        'true'
      )
    );

    await mutation(
      updateUserPreference,
      updateUserPreferenceVariablesData(
        challengeAdmin,
        PreferenceType.UPDATES,
        'true'
      )
    );

    await mutation(
      updateUserPreference,
      updateUserPreferenceVariablesData(
        challengeAdmin,
        PreferenceType.UPDATE_SENT_ADMIN,
        'true'
      )
    );

    await mutation(
      updateUserPreference,
      updateUserPreferenceVariablesData(qaUser, PreferenceType.UPDATES, 'true')
    );

    await mutation(
      updateUserPreference,
      updateUserPreferenceVariablesData(
        qaUser,
        PreferenceType.UPDATE_SENT_ADMIN,
        'true'
      )
    );

    await mutation(
      updateUserPreference,
      updateUserPreferenceVariablesData(nonEco, PreferenceType.UPDATES, 'true')
    );

    await mutation(
      updateUserPreference,
      updateUserPreferenceVariablesData(
        nonEco,
        PreferenceType.UPDATE_SENT_ADMIN,
        'true'
      )
    );
  });

  beforeEach(async () => {
    await deleteMailSlurperMails();
  });

  test('GA create hub update - GA(1), EA (1), EM(1), CA(1) get notifications', async () => {
    // Act
    await mutation(
      sendCommunityUpdate,
      sendCommunityUpdateVariablesData(ecoverseUpdatesId, 'GA hub update ')
    );

    await delay(1000);
    var mails = await getMailsData();

    expect(mails[0]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          subject: `New update shared with community ${ecoName}!`,
          toAddresses: [email],
        }),
      ])
    );

    expect(mails[0]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          subject: `New update shared with community ${ecoName}`,
          toAddresses: [emailEcoAdmin],
        }),
      ])
    );
    expect(mails[0]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          subject: `New update shared with community ${ecoName}`,
          toAddresses: [emailQAUser],
        }),
      ])
    );
    expect(mails[0]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          subject: `New update shared with community ${ecoName}`,
          toAddresses: [emailChallengeAdmin],
        }),
      ])
    );

    expect(mails[1]).toEqual(4);
  });

  test('EA create hub update - GA(1), EA (1), EM(1), CA(1) get notifications', async () => {
    // Act
    await mutation(
      sendCommunityUpdate,
      sendCommunityUpdateVariablesData(ecoverseUpdatesId, 'EA hub update '),
      TestUser.ECOVERSE_ADMIN
    );

    // Assert
    await delay(1000);
    var mails = await getMailsData();

    expect(mails[0]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          subject: `New update shared with community ${ecoName}!`,
          toAddresses: [email],
        }),
      ])
    );

    expect(mails[0]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          subject: `New update shared with community ${ecoName}`,
          toAddresses: [emailEcoAdmin],
        }),
      ])
    );
    expect(mails[0]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          subject: `New update shared with community ${ecoName}`,
          toAddresses: [emailQAUser],
        }),
      ])
    );
    expect(mails[0]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          subject: `New update shared with community ${ecoName}`,
          toAddresses: [emailChallengeAdmin],
        }),
      ])
    );

    expect(mails[1]).toEqual(4);
  });

  test('CA create challenge update - GA(1), EA (1), EM(1), CA(1) get notifications', async () => {
    // Act
    await mutation(
      sendCommunityUpdate,
      sendCommunityUpdateVariablesData(
        challengeUpdatesId,
        'CA challenge update '
      ),
      TestUser.ECOVERSE_MEMBER
    );

    // Assert
    await delay(1500);
    var mails = await getMailsData();

    expect(mails[0]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          subject: `New update shared with community ${challengeName}!`,
          toAddresses: [email],
        }),
      ])
    );

    expect(mails[0]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          subject: `New update shared with community ${challengeName}`,
          toAddresses: [emailEcoAdmin],
        }),
      ])
    );
    expect(mails[0]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          subject: `New update shared with community ${challengeName}`,
          toAddresses: [emailQAUser],
        }),
      ])
    );
    expect(mails[0]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          subject: `New update shared with community ${challengeName}`,
          toAddresses: [emailChallengeAdmin],
        }),
      ])
    );

    expect(mails[1]).toEqual(4);
  });

  test('OA create opportunity update - GA(1), EA (1), EM(1), CA(1) get notifications', async () => {
    // Act
    await mutation(
      sendCommunityUpdate,
      sendCommunityUpdateVariablesData(
        opportunityUpdatesId,
        'OA opportunity update '
      ),
      TestUser.ECOVERSE_MEMBER
    );

    // Assert
    await delay(1500);
    var mails = await getMailsData();

    expect(mails[0]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          subject: `New update shared with community ${opportunityName}!`,
          toAddresses: [email],
        }),
      ])
    );

    expect(mails[0]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          subject: `New update shared with community ${opportunityName}`,
          toAddresses: [emailEcoAdmin],
        }),
      ])
    );
    expect(mails[0]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          subject: `New update shared with community ${opportunityName}`,
          toAddresses: [emailQAUser],
        }),
      ])
    );
    expect(mails[0]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          subject: `New update shared with community ${opportunityName}`,
          toAddresses: [emailChallengeAdmin],
        }),
      ])
    );

    expect(mails[1]).toEqual(4);
  });

  test('OA create opportunity update - 0 notifications - all roles with notifications disabled', async () => {
    // Arrange
    await mutation(
      updateUserPreference,
      updateUserPreferenceVariablesData(
        globalAdmin,
        PreferenceType.UPDATES,
        'false'
      )
    );

    await mutation(
      updateUserPreference,
      updateUserPreferenceVariablesData(
        globalAdmin,
        PreferenceType.UPDATE_SENT_ADMIN,
        'false'
      )
    );

    await mutation(
      updateUserPreference,
      updateUserPreferenceVariablesData(
        ecoAdmin,
        PreferenceType.UPDATES,
        'false'
      )
    );

    await mutation(
      updateUserPreference,
      updateUserPreferenceVariablesData(
        ecoAdmin,
        PreferenceType.UPDATE_SENT_ADMIN,
        'false'
      )
    );

    await mutation(
      updateUserPreference,
      updateUserPreferenceVariablesData(
        challengeAdmin,
        PreferenceType.UPDATES,
        'false'
      )
    );

    await mutation(
      updateUserPreference,
      updateUserPreferenceVariablesData(
        challengeAdmin,
        PreferenceType.UPDATE_SENT_ADMIN,
        'false'
      )
    );

    await mutation(
      updateUserPreference,
      updateUserPreferenceVariablesData(qaUser, PreferenceType.UPDATES, 'false')
    );

    await mutation(
      updateUserPreference,
      updateUserPreferenceVariablesData(
        qaUser,
        PreferenceType.UPDATE_SENT_ADMIN,
        'false'
      )
    );

    await mutation(
      updateUserPreference,
      updateUserPreferenceVariablesData(nonEco, PreferenceType.UPDATES, 'false')
    );

    await mutation(
      updateUserPreference,
      updateUserPreferenceVariablesData(
        nonEco,
        PreferenceType.UPDATE_SENT_ADMIN,
        'false'
      )
    );
    // Act
    await mutation(
      sendCommunityUpdate,
      sendCommunityUpdateVariablesData(
        opportunityUpdatesId,
        'OA opportunity update 2'
      ),
      TestUser.ECOVERSE_MEMBER
    );

    // Assert
    await delay(1500);
    var mails = await getMailsData();

    expect(mails[1]).toEqual(0);
  });
});
