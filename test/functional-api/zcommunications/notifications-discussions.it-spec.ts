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
import {
  createDiscussion,
  createDiscussionVariablesData,
  postDiscussionComment,
  postDiscussionCommentVariablesData,
} from '@test/utils/mutations/communications-mutation';
import { TestUser } from '@test/utils/token.helper';
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
let ecoverseCommunicationID = '';
let challengeId = '';
let challengeCommunityId = '';
let challengeCommunicationID = '';
let discussionId = '';
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
  ecoverseCommunicationID =
    responseEco.body.data.createEcoverse.community.communication.id;

  const responseChallenge = await mutation(
    createChallenge,
    challengeVariablesData(challengeName, `chnameid${uniqueId}`, ecoverseId)
  );
  challengeId = responseChallenge.body.data.createChallenge.id;
  challengeCommunityId =
    responseChallenge.body.data.createChallenge.community.id;
  challengeCommunicationID =
    responseChallenge.body.data.createChallenge.community.communication.id;

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
});

afterAll(async () => {
  await removeChallenge(challengeId);
  await removeEcoverse(ecoverseId);
  await deleteOrganization(organizationId);
});

describe('Notifications - discussions', () => {
  beforeAll(async () => {
    await mutation(
      updateUserPreference,
      updateUserPreferenceVariablesData(
        globalAdmin,
        PreferenceType.DISCUSSION_CREATED,
        'true'
      )
    );

    await mutation(
      updateUserPreference,
      updateUserPreferenceVariablesData(
        globalAdmin,
        PreferenceType.DISCUSSION_CREATED_ADMIN,
        'true'
      )
    );

    await mutation(
      updateUserPreference,
      updateUserPreferenceVariablesData(
        globalAdmin,
        PreferenceType.DISCUSSION_RESPONSE,
        'true'
      )
    );

    await mutation(
      updateUserPreference,
      updateUserPreferenceVariablesData(
        ecoAdmin,
        PreferenceType.DISCUSSION_CREATED,
        'true'
      )
    );

    await mutation(
      updateUserPreference,
      updateUserPreferenceVariablesData(
        ecoAdmin,
        PreferenceType.DISCUSSION_CREATED_ADMIN,
        'true'
      )
    );

    await mutation(
      updateUserPreference,
      updateUserPreferenceVariablesData(
        ecoAdmin,
        PreferenceType.DISCUSSION_RESPONSE,
        'true'
      )
    );

    await mutation(
      updateUserPreference,
      updateUserPreferenceVariablesData(
        challengeAdmin,
        PreferenceType.DISCUSSION_CREATED,
        'true'
      )
    );

    await mutation(
      updateUserPreference,
      updateUserPreferenceVariablesData(
        challengeAdmin,
        PreferenceType.DISCUSSION_CREATED_ADMIN,
        'true'
      )
    );

    await mutation(
      updateUserPreference,
      updateUserPreferenceVariablesData(
        challengeAdmin,
        PreferenceType.DISCUSSION_RESPONSE,
        'true'
      )
    );

    await mutation(
      updateUserPreference,
      updateUserPreferenceVariablesData(
        qaUser,
        PreferenceType.DISCUSSION_CREATED,
        'true'
      )
    );

    await mutation(
      updateUserPreference,
      updateUserPreferenceVariablesData(
        qaUser,
        PreferenceType.DISCUSSION_CREATED_ADMIN,
        'true'
      )
    );

    await mutation(
      updateUserPreference,
      updateUserPreferenceVariablesData(
        qaUser,
        PreferenceType.DISCUSSION_RESPONSE,
        'true'
      )
    );
    await mutation(
      updateUserPreference,
      updateUserPreferenceVariablesData(
        nonEco,
        PreferenceType.DISCUSSION_CREATED,
        'true'
      )
    );

    await mutation(
      updateUserPreference,
      updateUserPreferenceVariablesData(
        nonEco,
        PreferenceType.DISCUSSION_CREATED_ADMIN,
        'true'
      )
    );

    await mutation(
      updateUserPreference,
      updateUserPreferenceVariablesData(
        nonEco,
        PreferenceType.DISCUSSION_RESPONSE,
        'true'
      )
    );
  });

  beforeEach(async () => {
    await deleteMailSlurperMails();
  });

  test('GA create hub discussion and send message - GA(1), EA (1), EM(1), CA(1) get notifications', async () => {
    // Act
    let res = await mutation(
      createDiscussion,
      createDiscussionVariablesData(ecoverseCommunicationID)
    );
    discussionId = res.body.data.createDiscussion.id;

    await mutation(
      postDiscussionComment,
      postDiscussionCommentVariablesData(discussionId, 'test message')
    );

    await delay(1500);
    let getEmailsData = await getMailsData();

    // Assert
    expect(getEmailsData[1]).toEqual(4);
    expect(getEmailsData[0]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          subject: `New discussion created on ${ecoName}: Default title`,
          toAddresses: [email],
        }),
        expect.objectContaining({
          subject: `New discussion created on ${ecoName}: Default title`,
          toAddresses: [emailEcoAdmin],
        }),
        expect.objectContaining({
          subject: `New discussion created on ${ecoName}: Default title`,
          toAddresses: [emailQAUser],
        }),
        expect.objectContaining({
          subject: `New discussion created on ${ecoName}: Default title`,
          toAddresses: [emailChallengeAdmin],
        }),
      ])
    );
  });

  test('EM create hub discussion and send message - GA(1), EA (1), EM(1), CA(1) get notifications', async () => {
    // Act
    let res = await mutation(
      createDiscussion,
      createDiscussionVariablesData(ecoverseCommunicationID),
      TestUser.QA_USER
    );
    discussionId = res.body.data.createDiscussion.id;

    await mutation(
      postDiscussionComment,
      postDiscussionCommentVariablesData(discussionId, 'test message')
    );

    await delay(1500);
    let getEmailsData = await getMailsData();

    // Assert
    expect(getEmailsData[1]).toEqual(4);
    expect(getEmailsData[0]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          subject: `New discussion created on ${ecoName}: Default title`,
          toAddresses: [email],
        }),
        expect.objectContaining({
          subject: `New discussion created on ${ecoName}: Default title`,
          toAddresses: [emailEcoAdmin],
        }),
        expect.objectContaining({
          subject: `New discussion created on ${ecoName}: Default title`,
          toAddresses: [emailQAUser],
        }),
        expect.objectContaining({
          subject: `New discussion created on ${ecoName}: Default title`,
          toAddresses: [emailChallengeAdmin],
        }),
      ])
    );
  });

  test('GA create challenge discussion and send message - GA(1), EA (1), EM(1), CA(1) get notifications', async () => {
    // Act
    let res = await mutation(
      createDiscussion,
      createDiscussionVariablesData(challengeCommunicationID)
    );
    discussionId = res.body.data.createDiscussion.id;

    await mutation(
      postDiscussionComment,
      postDiscussionCommentVariablesData(discussionId, 'test message')
    );

    await delay(1500);
    let getEmailsData = await getMailsData();

    // Assert
    expect(getEmailsData[1]).toEqual(4);
    expect(getEmailsData[0]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          subject: `New discussion created on ${challengeName}: Default title`,
          toAddresses: [email],
        }),
        expect.objectContaining({
          subject: `New discussion created on ${challengeName}: Default title`,
          toAddresses: [emailEcoAdmin],
        }),
        expect.objectContaining({
          subject: `New discussion created on ${challengeName}: Default title`,
          toAddresses: [emailQAUser],
        }),
        expect.objectContaining({
          subject: `New discussion created on ${challengeName}: Default title`,
          toAddresses: [emailChallengeAdmin],
        }),
      ])
    );
  });

  test('EM create challenge discussion and send message - GA(1), EA (1), EM(1), CA(1) get notifications', async () => {
    // Act
    let res = await mutation(
      createDiscussion,
      createDiscussionVariablesData(challengeCommunicationID),
      TestUser.QA_USER
    );
    discussionId = res.body.data.createDiscussion.id;

    await mutation(
      postDiscussionComment,
      postDiscussionCommentVariablesData(discussionId, 'test message')
    );

    await delay(1500);
    let getEmailsData = await getMailsData();

    // Assert
    expect(getEmailsData[1]).toEqual(4);
    expect(getEmailsData[0]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          subject: `New discussion created on ${challengeName}: Default title`,
          toAddresses: [email],
        }),
        expect.objectContaining({
          subject: `New discussion created on ${challengeName}: Default title`,
          toAddresses: [emailEcoAdmin],
        }),
        expect.objectContaining({
          subject: `New discussion created on ${challengeName}: Default title`,
          toAddresses: [emailQAUser],
        }),
        expect.objectContaining({
          subject: `New discussion created on ${challengeName}: Default title`,
          toAddresses: [emailChallengeAdmin],
        }),
      ])
    );
  });

  test('EM create hub discussion and send message to hub - all roles with notifications disabled', async () => {
    // Arrange

    await mutation(
      updateUserPreference,
      updateUserPreferenceVariablesData(
        globalAdmin,
        PreferenceType.DISCUSSION_CREATED,
        'false'
      )
    );

    await mutation(
      updateUserPreference,
      updateUserPreferenceVariablesData(
        globalAdmin,
        PreferenceType.DISCUSSION_CREATED_ADMIN,
        'false'
      )
    );

    await mutation(
      updateUserPreference,
      updateUserPreferenceVariablesData(
        globalAdmin,
        PreferenceType.DISCUSSION_RESPONSE,
        'false'
      )
    );

    await mutation(
      updateUserPreference,
      updateUserPreferenceVariablesData(
        ecoAdmin,
        PreferenceType.DISCUSSION_CREATED,
        'false'
      )
    );

    await mutation(
      updateUserPreference,
      updateUserPreferenceVariablesData(
        ecoAdmin,
        PreferenceType.DISCUSSION_CREATED_ADMIN,
        'false'
      )
    );

    await mutation(
      updateUserPreference,
      updateUserPreferenceVariablesData(
        ecoAdmin,
        PreferenceType.DISCUSSION_RESPONSE,
        'false'
      )
    );

    await mutation(
      updateUserPreference,
      updateUserPreferenceVariablesData(
        challengeAdmin,
        PreferenceType.DISCUSSION_CREATED,
        'false'
      )
    );

    await mutation(
      updateUserPreference,
      updateUserPreferenceVariablesData(
        challengeAdmin,
        PreferenceType.DISCUSSION_CREATED_ADMIN,
        'false'
      )
    );

    await mutation(
      updateUserPreference,
      updateUserPreferenceVariablesData(
        challengeAdmin,
        PreferenceType.DISCUSSION_RESPONSE,
        'false'
      )
    );

    await mutation(
      updateUserPreference,
      updateUserPreferenceVariablesData(
        qaUser,
        PreferenceType.DISCUSSION_CREATED,
        'false'
      )
    );

    await mutation(
      updateUserPreference,
      updateUserPreferenceVariablesData(
        qaUser,
        PreferenceType.DISCUSSION_CREATED_ADMIN,
        'false'
      )
    );

    await mutation(
      updateUserPreference,
      updateUserPreferenceVariablesData(
        qaUser,
        PreferenceType.DISCUSSION_RESPONSE,
        'false'
      )
    );
    await mutation(
      updateUserPreference,
      updateUserPreferenceVariablesData(
        nonEco,
        PreferenceType.DISCUSSION_CREATED,
        'false'
      )
    );

    await mutation(
      updateUserPreference,
      updateUserPreferenceVariablesData(
        nonEco,
        PreferenceType.DISCUSSION_CREATED_ADMIN,
        'false'
      )
    );

    await mutation(
      updateUserPreference,
      updateUserPreferenceVariablesData(
        nonEco,
        PreferenceType.DISCUSSION_RESPONSE,
        'false'
      )
    );

    let res = await mutation(
      createDiscussion,
      createDiscussionVariablesData(ecoverseCommunicationID),
      TestUser.QA_USER
    );
    discussionId = res.body.data.createDiscussion.id;

    await mutation(
      postDiscussionComment,
      postDiscussionCommentVariablesData(discussionId, 'test message')
    );

    // Act
    await delay(1500);
    let getEmailsData = await getMailsData();

    // Assert
    expect(getEmailsData[1]).toEqual(0);
  });
});
