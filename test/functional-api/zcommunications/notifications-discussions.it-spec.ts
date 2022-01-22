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
  PreferenceType,
  changePreference,
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
import {
  delay,
  entitiesId,
  getMailsData,
  users,
} from './communications-helper';
import { deleteMailSlurperMails } from '@test/utils/mailslurper.rest.requests';

let ecoName = ecoverseName;
let challengeName = `chName${uniqueId}`;
let preferencesConfig: any[] = [];

beforeAll(async () => {
  await deleteMailSlurperMails();

  const responseOrg = await createOrganization(organizationName, hostNameId);
  entitiesId.organizationId = responseOrg.body.data.createOrganization.id;

  let responseEco = await createTestEcoverse(
    ecoverseName,
    ecoverseNameId,
    entitiesId.organizationId
  );
  entitiesId.ecoverseId = responseEco.body.data.createEcoverse.id;
  entitiesId.ecoverseCommunityId =
    responseEco.body.data.createEcoverse.community.id;
  entitiesId.ecoverseCommunicationId =
    responseEco.body.data.createEcoverse.community.communication.id;

  const responseChallenge = await mutation(
    createChallenge,
    challengeVariablesData(
      challengeName,
      `chnameid${uniqueId}`,
      entitiesId.ecoverseId
    )
  );
  entitiesId.challengeId = responseChallenge.body.data.createChallenge.id;
  entitiesId.challengeCommunityId =
    responseChallenge.body.data.createChallenge.community.id;
  entitiesId.challengeCommunicationId =
    responseChallenge.body.data.createChallenge.community.communication.id;

  const requestUserData = await getUser(users.globalAdminIdEmail);
  users.globalAdminId = requestUserData.body.data.user.id;

  const reqNonEco = await getUser(users.nonEcoverseMemberEmail);
  users.nonEcoverseMemberId = reqNonEco.body.data.user.id;

  const reqEcoAdmin = await getUser(users.ecoverseAdminEmail);
  users.ecoverseAdminId = reqEcoAdmin.body.data.user.id;

  const reqChallengeAdmin = await getUser(users.ecoverseMemberEmail);
  users.ecoverseMemberId = reqChallengeAdmin.body.data.user.id;

  const reqQaUser = await getUser(users.qaUserEmail);
  users.qaUserId = reqQaUser.body.data.user.id;

  await mutation(
    assignUserToCommunity,
    assignUserToCommunityVariablesData(
      entitiesId.ecoverseCommunityId,
      users.ecoverseAdminId
    )
  );

  await mutation(
    assignEcoverseAdmin,
    userAsEcoverseAdminVariablesData(
      users.ecoverseAdminId,
      entitiesId.ecoverseId
    )
  );

  await mutation(
    assignUserToCommunity,
    assignUserToCommunityVariablesData(
      entitiesId.ecoverseCommunityId,
      users.ecoverseMemberId
    )
  );

  await mutation(
    assignUserToCommunity,
    assignUserToCommunityVariablesData(
      entitiesId.ecoverseCommunityId,
      users.qaUserId
    )
  );

  await mutation(
    assignUserToCommunity,
    assignUserToCommunityVariablesData(
      entitiesId.challengeCommunityId,
      users.ecoverseMemberId
    )
  );

  await mutation(
    assignUserToCommunity,
    assignUserToCommunityVariablesData(
      entitiesId.challengeCommunityId,
      users.qaUserId
    )
  );

  await mutation(
    assignChallengeAdmin,
    userAsChallengeAdminVariablesData(
      users.ecoverseMemberId,
      entitiesId.challengeId
    )
  );

  preferencesConfig = [
    {
      userID: users.globalAdminId,
      type: PreferenceType.DISCUSSION_CREATED,
    },
    {
      userID: users.globalAdminId,
      type: PreferenceType.DISCUSSION_CREATED_ADMIN,
    },
    {
      userID: users.globalAdminId,
      type: PreferenceType.DISCUSSION_RESPONSE,
    },
    {
      userID: users.ecoverseAdminId,
      type: PreferenceType.DISCUSSION_CREATED,
    },
    {
      userID: users.ecoverseAdminId,
      type: PreferenceType.DISCUSSION_CREATED_ADMIN,
    },
    {
      userID: users.ecoverseAdminId,
      type: PreferenceType.DISCUSSION_RESPONSE,
    },
    {
      userID: users.ecoverseMemberId,
      type: PreferenceType.DISCUSSION_CREATED,
    },
    {
      userID: users.ecoverseMemberId,
      type: PreferenceType.DISCUSSION_CREATED_ADMIN,
    },

    {
      userID: users.ecoverseMemberId,
      type: PreferenceType.DISCUSSION_RESPONSE,
    },

    {
      userID: users.qaUserId,
      type: PreferenceType.DISCUSSION_CREATED,
    },

    {
      userID: users.qaUserId,
      type: PreferenceType.DISCUSSION_CREATED_ADMIN,
    },

    {
      userID: users.qaUserId,
      type: PreferenceType.DISCUSSION_RESPONSE,
    },

    {
      userID: users.nonEcoverseMemberId,
      type: PreferenceType.DISCUSSION_CREATED,
    },
    {
      userID: users.nonEcoverseMemberId,
      type: PreferenceType.DISCUSSION_CREATED_ADMIN,
    },
    {
      userID: users.nonEcoverseMemberId,
      type: PreferenceType.DISCUSSION_RESPONSE,
    },
  ];
});

afterAll(async () => {
  await removeChallenge(entitiesId.challengeId);
  await removeEcoverse(entitiesId.ecoverseId);
  await deleteOrganization(entitiesId.organizationId);
});

describe('Notifications - discussions', () => {
  beforeAll(async () => {
    preferencesConfig.forEach(
      async config => await changePreference(config.userID, config.type, 'true')
    );
  });

  beforeEach(async () => {
    await deleteMailSlurperMails();
  });

  test('GA create hub discussion and send message - GA(1), EA (1), EM(1), CA(1) get notifications', async () => {
    // Act
    let res = await mutation(
      createDiscussion,
      createDiscussionVariablesData(entitiesId.ecoverseCommunicationId)
    );
    entitiesId.discussionId = res.body.data.createDiscussion.id;

    await mutation(
      postDiscussionComment,
      postDiscussionCommentVariablesData(
        entitiesId.discussionId,
        'test message'
      )
    );

    await delay(2000);
    let getEmailsData = await getMailsData();

    // Assert
    expect(getEmailsData[1]).toEqual(4);
    expect(getEmailsData[0]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          subject: `New discussion created on ${ecoName}: Default title`,
          toAddresses: [users.globalAdminIdEmail],
        }),
        expect.objectContaining({
          subject: `New discussion created on ${ecoName}: Default title`,
          toAddresses: [users.ecoverseAdminEmail],
        }),
        expect.objectContaining({
          subject: `New discussion created on ${ecoName}: Default title`,
          toAddresses: [users.qaUserEmail],
        }),
        expect.objectContaining({
          subject: `New discussion created on ${ecoName}: Default title`,
          toAddresses: [users.ecoverseMemberEmail],
        }),
      ])
    );
  });

  test('EM create hub discussion and send message - GA(1), EA (1), EM(1), CA(1) get notifications', async () => {
    // Act
    let res = await mutation(
      createDiscussion,
      createDiscussionVariablesData(entitiesId.ecoverseCommunicationId),
      TestUser.QA_USER
    );
    entitiesId.discussionId = res.body.data.createDiscussion.id;

    await mutation(
      postDiscussionComment,
      postDiscussionCommentVariablesData(
        entitiesId.discussionId,
        'test message'
      )
    );

    await delay(2000);
    let getEmailsData = await getMailsData();

    // Assert
    expect(getEmailsData[1]).toEqual(4);
    expect(getEmailsData[0]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          subject: `New discussion created on ${ecoName}: Default title`,
          toAddresses: [users.globalAdminIdEmail],
        }),
        expect.objectContaining({
          subject: `New discussion created on ${ecoName}: Default title`,
          toAddresses: [users.ecoverseAdminEmail],
        }),
        expect.objectContaining({
          subject: `New discussion created on ${ecoName}: Default title`,
          toAddresses: [users.qaUserEmail],
        }),
        expect.objectContaining({
          subject: `New discussion created on ${ecoName}: Default title`,
          toAddresses: [users.ecoverseMemberEmail],
        }),
      ])
    );
  });

  test('GA create challenge discussion and send message - GA(1), EA (1), EM(1), CA(1) get notifications', async () => {
    // Act
    let res = await mutation(
      createDiscussion,
      createDiscussionVariablesData(entitiesId.challengeCommunicationId)
    );
    entitiesId.discussionId = res.body.data.createDiscussion.id;

    await mutation(
      postDiscussionComment,
      postDiscussionCommentVariablesData(
        entitiesId.discussionId,
        'test message'
      )
    );

    await delay(2000);
    let getEmailsData = await getMailsData();

    // Assert
    expect(getEmailsData[1]).toEqual(4);
    expect(getEmailsData[0]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          subject: `New discussion created on ${challengeName}: Default title`,
          toAddresses: [users.globalAdminIdEmail],
        }),
        expect.objectContaining({
          subject: `New discussion created on ${challengeName}: Default title`,
          toAddresses: [users.ecoverseAdminEmail],
        }),
        expect.objectContaining({
          subject: `New discussion created on ${challengeName}: Default title`,
          toAddresses: [users.qaUserEmail],
        }),
        expect.objectContaining({
          subject: `New discussion created on ${challengeName}: Default title`,
          toAddresses: [users.ecoverseMemberEmail],
        }),
      ])
    );
  });

  test('EM create challenge discussion and send message - GA(1), EA (1), EM(1), CA(1) get notifications', async () => {
    // Act
    let res = await mutation(
      createDiscussion,
      createDiscussionVariablesData(entitiesId.challengeCommunicationId),
      TestUser.QA_USER
    );
    entitiesId.discussionId = res.body.data.createDiscussion.id;

    await mutation(
      postDiscussionComment,
      postDiscussionCommentVariablesData(
        entitiesId.discussionId,
        'test message'
      )
    );

    await delay(2000);
    let getEmailsData = await getMailsData();

    // Assert
    expect(getEmailsData[1]).toEqual(4);
    expect(getEmailsData[0]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          subject: `New discussion created on ${challengeName}: Default title`,
          toAddresses: [users.globalAdminIdEmail],
        }),
        expect.objectContaining({
          subject: `New discussion created on ${challengeName}: Default title`,
          toAddresses: [users.ecoverseAdminEmail],
        }),
        expect.objectContaining({
          subject: `New discussion created on ${challengeName}: Default title`,
          toAddresses: [users.qaUserEmail],
        }),
        expect.objectContaining({
          subject: `New discussion created on ${challengeName}: Default title`,
          toAddresses: [users.ecoverseMemberEmail],
        }),
      ])
    );
  });

  test('EM create hub discussion and send message to hub - all roles with notifications disabled', async () => {
    // Arrange

    preferencesConfig.forEach(
      async config =>
        await changePreference(config.userID, config.type, 'false')
    );

    let res = await mutation(
      createDiscussion,
      createDiscussionVariablesData(entitiesId.ecoverseCommunicationId),
      TestUser.QA_USER
    );
    entitiesId.discussionId = res.body.data.createDiscussion.id;

    await mutation(
      postDiscussionComment,
      postDiscussionCommentVariablesData(
        entitiesId.discussionId,
        'test message'
      )
    );

    // Act
    await delay(1500);
    let getEmailsData = await getMailsData();

    // Assert
    expect(getEmailsData[1]).toEqual(0);
  });
});
