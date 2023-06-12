import {
  UserPreferenceType,
  changePreferenceUser,
} from '@test/utils/mutations/preferences-mutation';
import { uniqueId } from '@test/utils/mutations/create-mutation';
import { TestUser } from '@test/utils/token.helper';
import { deleteMailSlurperMails } from '@test/utils/mailslurper.rest.requests';
import {
  createChallengeWithUsers,
  createOpportunityWithUsers,
  createOrgAndHubWithUsers,
} from '../create-entities-with-users-helper';
import { entitiesId, getMailsData } from '../communications-helper';
import { removeOpportunity } from '@test/functional-api/integration/opportunity/opportunity.request.params';
import { removeChallenge } from '@test/functional-api/integration/challenge/challenge.request.params';
import { removeHub } from '@test/functional-api/integration/hub/hub.request.params';
import { deleteOrganization } from '@test/functional-api/integration/organization/organization.request.params';
import { delay } from '@test/utils/delay';
import {
  createAspectOnCallout,
  AspectTypes,
  removeAspect,
} from '@test/functional-api/integration/aspect/aspect.request.params';
import { mutation } from '@test/utils/graphql.request';
import {
  removeComment,
  removeCommentVariablesData,
  sendComment,
  sendCommentVariablesData,
} from '@test/utils/mutations/communications-mutation';
import { users } from '@test/utils/queries/users-data';

const organizationName = 'not-up-org-name' + uniqueId;
const hostNameId = 'not-up-org-nameid' + uniqueId;
const hubName = 'not-up-eco-name' + uniqueId;
const hubNameId = 'not-up-eco-nameid' + uniqueId;
const challengeName = `chName${uniqueId}`;
const opportunityName = `opName${uniqueId}`;
let hubAspectId = '';
let challengeAspectId = '';
let opportunityAspectId = '';
let aspectDisplayName = '';
let aspectCommentsIdHub = '';
let aspectCommentsIdChallenge = '';
let aspectCommentsIdOpportunity = '';
let msessageId = '';
let preferencesAspectConfig: any[] = [];
let preferencesAspectCommentsConfig: any[] = [];

beforeAll(async () => {
  await deleteMailSlurperMails();

  await createOrgAndHubWithUsers(
    organizationName,
    hostNameId,
    hubName,
    hubNameId
  );
  await createChallengeWithUsers(challengeName);
  await createOpportunityWithUsers(opportunityName);

  preferencesAspectConfig = [
    {
      userID: users.globalAdminId,
      type: UserPreferenceType.ASPECT_CREATED,
    },
    {
      userID: users.globalAdminId,
      type: UserPreferenceType.ASPECT_CREATED_ADMIN,
    },

    {
      userID: users.hubMemberId,
      type: UserPreferenceType.ASPECT_CREATED,
    },
    {
      userID: users.hubMemberId,
      type: UserPreferenceType.ASPECT_CREATED_ADMIN,
    },

    {
      userID: users.challengeMemberId,
      type: UserPreferenceType.ASPECT_CREATED,
    },
    {
      userID: users.challengeMemberId,
      type: UserPreferenceType.ASPECT_CREATED_ADMIN,
    },

    {
      userID: users.opportunityMemberId,
      type: UserPreferenceType.ASPECT_CREATED,
    },
    {
      userID: users.opportunityMemberId,
      type: UserPreferenceType.ASPECT_CREATED_ADMIN,
    },

    {
      userID: users.hubAdminId,
      type: UserPreferenceType.ASPECT_CREATED,
    },
    {
      userID: users.hubAdminId,
      type: UserPreferenceType.ASPECT_CREATED_ADMIN,
    },
    {
      userID: users.challengeAdminId,
      type: UserPreferenceType.ASPECT_CREATED,
    },
    {
      userID: users.challengeAdminId,
      type: UserPreferenceType.ASPECT_CREATED_ADMIN,
    },
    {
      userID: users.opportunityAdminId,
      type: UserPreferenceType.ASPECT_CREATED,
    },
    {
      userID: users.opportunityAdminId,
      type: UserPreferenceType.ASPECT_CREATED_ADMIN,
    },
    {
      userID: users.nonHubMemberId,
      type: UserPreferenceType.ASPECT_CREATED,
    },
    {
      userID: users.nonHubMemberId,
      type: UserPreferenceType.ASPECT_CREATED_ADMIN,
    },
  ];

  preferencesAspectCommentsConfig = [
    {
      userID: users.globalAdminId,
      type: UserPreferenceType.ASPECT_COMMENT_CREATED,
    },
    {
      userID: users.hubMemberId,
      type: UserPreferenceType.ASPECT_COMMENT_CREATED,
    },
    {
      userID: users.challengeMemberId,
      type: UserPreferenceType.ASPECT_COMMENT_CREATED,
    },
    {
      userID: users.opportunityMemberId,
      type: UserPreferenceType.ASPECT_COMMENT_CREATED,
    },
    {
      userID: users.hubAdminId,
      type: UserPreferenceType.ASPECT_COMMENT_CREATED,
    },
    {
      userID: users.challengeAdminId,
      type: UserPreferenceType.ASPECT_COMMENT_CREATED,
    },
    {
      userID: users.opportunityAdminId,
      type: UserPreferenceType.ASPECT_COMMENT_CREATED,
    },
    {
      userID: users.nonHubMemberId,
      type: UserPreferenceType.ASPECT_COMMENT_CREATED,
    },
  ];
});

afterAll(async () => {
  await removeOpportunity(entitiesId.opportunityId);
  await removeChallenge(entitiesId.challengeId);
  await removeHub(entitiesId.hubId);
  await deleteOrganization(entitiesId.organizationId);
});

describe('Notifications - aspect comments', () => {
  let aspectNameID = '';
  aspectNameID = `aspect-name-id-${uniqueId}`;
  aspectDisplayName = `aspect-d-name-${uniqueId}`;
  beforeEach(async () => {
    await deleteMailSlurperMails();

    aspectNameID = `aspect-name-id-${uniqueId}`;
    aspectDisplayName = `aspect-d-name-${uniqueId}`;
  });

  beforeAll(async () => {
    await changePreferenceUser(
      users.notificationsAdminId,
      UserPreferenceType.ASPECT_COMMENT_CREATED,
      'false'
    );
    await changePreferenceUser(
      users.notificationsAdminId,
      UserPreferenceType.ASPECT_CREATED,
      'false'
    );
    await changePreferenceUser(
      users.notificationsAdminId,
      UserPreferenceType.ASPECT_CREATED_ADMIN,
      'false'
    );

    await changePreferenceUser(
      users.globalCommunityAdminId,
      UserPreferenceType.ASPECT_COMMENT_CREATED,
      'false'
    );
    await changePreferenceUser(
      users.globalCommunityAdminId,
      UserPreferenceType.ASPECT_CREATED,
      'false'
    );
    await changePreferenceUser(
      users.globalCommunityAdminId,
      UserPreferenceType.ASPECT_CREATED_ADMIN,
      'false'
    );
    preferencesAspectConfig.forEach(
      async config =>
        await changePreferenceUser(config.userID, config.type, 'false')
    );

    preferencesAspectCommentsConfig.forEach(
      async config =>
        await changePreferenceUser(config.userID, config.type, 'true')
    );
  });

  afterEach(async () => {
    await delay(6000);
    await mutation(
      removeComment,
      removeCommentVariablesData(aspectCommentsIdHub, msessageId),
      TestUser.GLOBAL_ADMIN
    );
  });
  describe('GA create card on hub  ', () => {
    beforeAll(async () => {
      const resAspectonHub = await createAspectOnCallout(
        entitiesId.hubCalloutId,
        aspectNameID,
        { profileData: { displayName: aspectDisplayName } },
        AspectTypes.KNOWLEDGE,
        TestUser.GLOBAL_ADMIN
      );
      hubAspectId = resAspectonHub.body.data.createAspectOnCallout.id;
      aspectCommentsIdHub =
        resAspectonHub.body.data.createAspectOnCallout.comments.id;
    });

    afterAll(async () => {
      await removeAspect(hubAspectId);
    });
    test('GA create comment - GA(1) get notifications', async () => {
      const hubAspectSubjectText = `${hubName} - New comment received on your Card &#34;${aspectDisplayName}&#34;, have a look!`;

      // Act
      const messageRes = await mutation(
        sendComment,
        sendCommentVariablesData(
          aspectCommentsIdHub,
          'test message on hub aspect'
        ),
        TestUser.GLOBAL_ADMIN
      );
      msessageId = messageRes.body.data.sendMessageToRoom.id;

      await delay(6000);
      const mails = await getMailsData();

      expect(mails[0]).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            subject: hubAspectSubjectText,
            toAddresses: [users.globalAdminEmail],
          }),
        ])
      );

      expect(mails[1]).toEqual(1);
    });

    test('HM create comment - GA(1) get notifications', async () => {
      const hubAspectSubjectText = `${hubName} - New comment received on your Card &#34;${aspectDisplayName}&#34;, have a look!`;
      // Act
      const messageRes = await mutation(
        sendComment,
        sendCommentVariablesData(
          aspectCommentsIdHub,
          'test message on hub aspect'
        ),
        TestUser.HUB_MEMBER
      );
      msessageId = messageRes.body.data.sendMessageToRoom.id;

      await delay(6000);
      const mails = await getMailsData();

      expect(mails[0]).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            subject: hubAspectSubjectText,
            toAddresses: [users.globalAdminEmail],
          }),
        ])
      );

      expect(mails[1]).toEqual(1);
    });
  });

  describe('HM create card on hub  ', () => {
    beforeAll(async () => {
      const resAspectonHub = await createAspectOnCallout(
        entitiesId.hubCalloutId,
        aspectNameID,
        { profileData: { displayName: aspectDisplayName } },
        AspectTypes.KNOWLEDGE,
        TestUser.HUB_MEMBER
      );
      hubAspectId = resAspectonHub.body.data.createAspectOnCallout.id;
      aspectCommentsIdHub =
        resAspectonHub.body.data.createAspectOnCallout.comments.id;
    });

    afterAll(async () => {
      await removeAspect(hubAspectId);
    });
    test('HM create comment - HM(1) get notifications', async () => {
      const hubAspectSubjectText = `${hubName} - New comment received on your Card &#34;${aspectDisplayName}&#34;, have a look!`;

      // Act
      const messageRes = await mutation(
        sendComment,
        sendCommentVariablesData(
          aspectCommentsIdHub,
          'test message on hub aspect'
        ),
        TestUser.HUB_MEMBER
      );
      msessageId = messageRes.body.data.sendMessageToRoom.id;

      await delay(6000);
      const mails = await getMailsData();

      expect(mails[0]).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            subject: hubAspectSubjectText,
            toAddresses: [users.hubMemberEmail],
          }),
        ])
      );

      expect(mails[1]).toEqual(1);
    });

    test('HA create comment - HM(1) get notifications', async () => {
      const hubAspectSubjectText = `${hubName} - New comment received on your Card &#34;${aspectDisplayName}&#34;, have a look!`;
      // Act
      const messageRes = await mutation(
        sendComment,
        sendCommentVariablesData(
          aspectCommentsIdHub,
          'test message on hub aspect'
        ),
        TestUser.HUB_ADMIN
      );
      msessageId = messageRes.body.data.sendMessageToRoom.id;

      await delay(6000);
      const mails = await getMailsData();

      expect(mails[0]).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            subject: hubAspectSubjectText,
            toAddresses: [users.hubMemberEmail],
          }),
        ])
      );

      expect(mails[1]).toEqual(1);
    });
  });

  describe('CM create aspect on challenge  ', () => {
    beforeAll(async () => {
      const resAspectonHub = await createAspectOnCallout(
        entitiesId.challengeCalloutId,
        aspectNameID,
        { profileData: { displayName: aspectDisplayName } },
        AspectTypes.KNOWLEDGE,
        TestUser.CHALLENGE_MEMBER
      );
      challengeAspectId = resAspectonHub.body.data.createAspectOnCallout.id;
      aspectCommentsIdChallenge =
        resAspectonHub.body.data.createAspectOnCallout.comments.id;
    });

    afterAll(async () => {
      await removeAspect(challengeAspectId);
    });
    test('CM create comment - CM(1) get notifications', async () => {
      const challengeAspectSubjectText = `${challengeName} - New comment received on your Card &#34;${aspectDisplayName}&#34;, have a look!`;

      // Act
      const messageRes = await mutation(
        sendComment,
        sendCommentVariablesData(
          aspectCommentsIdChallenge,
          'test message on challenge aspect'
        ),
        TestUser.CHALLENGE_MEMBER
      );
      msessageId = messageRes.body.data.sendMessageToRoom.id;

      await delay(6000);
      const mails = await getMailsData();

      expect(mails[0]).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            subject: challengeAspectSubjectText,
            toAddresses: [users.challengeMemberEmail],
          }),
        ])
      );

      expect(mails[1]).toEqual(1);
    });

    test('CA create comment - CM(1) get notifications', async () => {
      const challengeAspectSubjectText = `${challengeName} - New comment received on your Card &#34;${aspectDisplayName}&#34;, have a look!`;
      // Act
      const messageRes = await mutation(
        sendComment,
        sendCommentVariablesData(
          aspectCommentsIdChallenge,
          'test message on challenge aspect'
        ),
        TestUser.CHALLENGE_ADMIN
      );
      msessageId = messageRes.body.data.sendMessageToRoom.id;

      await delay(6000);
      const mails = await getMailsData();

      expect(mails[0]).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            subject: challengeAspectSubjectText,
            toAddresses: [users.challengeMemberEmail],
          }),
        ])
      );

      expect(mails[1]).toEqual(1);
    });
  });

  describe('OM create aspect on opportunity  ', () => {
    beforeAll(async () => {
      const resAspectonHub = await createAspectOnCallout(
        entitiesId.opportunityCalloutId,
        aspectNameID,
        { profileData: { displayName: aspectDisplayName } },
        AspectTypes.KNOWLEDGE,
        TestUser.OPPORTUNITY_MEMBER
      );
      opportunityAspectId = resAspectonHub.body.data.createAspectOnCallout.id;
      aspectCommentsIdOpportunity =
        resAspectonHub.body.data.createAspectOnCallout.comments.id;
    });

    afterAll(async () => {
      await removeAspect(opportunityAspectId);
    });
    test('OM create comment - OM(1) get notifications', async () => {
      const opportunityAspectSubjectText = `${opportunityName} - New comment received on your Card &#34;${aspectDisplayName}&#34;, have a look!`;

      // Act
      const messageRes = await mutation(
        sendComment,
        sendCommentVariablesData(
          aspectCommentsIdOpportunity,
          'test message on opportunity aspect'
        ),
        TestUser.OPPORTUNITY_MEMBER
      );
      msessageId = messageRes.body.data.sendMessageToRoom.id;

      await delay(6000);
      const mails = await getMailsData();

      expect(mails[0]).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            subject: opportunityAspectSubjectText,
            toAddresses: [users.opportunityMemberEmail],
          }),
        ])
      );

      expect(mails[1]).toEqual(1);
    });

    test('CA create comment - OM(1) get notifications', async () => {
      const opportunityAspectSubjectText = `${opportunityName} - New comment received on your Card &#34;${aspectDisplayName}&#34;, have a look!`;
      // Act
      const messageRes = await mutation(
        sendComment,
        sendCommentVariablesData(
          aspectCommentsIdOpportunity,
          'test message on opportunity aspect'
        ),
        TestUser.CHALLENGE_ADMIN
      );
      msessageId = messageRes.body.data.sendMessageToRoom.id;

      await delay(6000);
      const mails = await getMailsData();

      expect(mails[0]).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            subject: opportunityAspectSubjectText,
            toAddresses: [users.opportunityMemberEmail],
          }),
        ])
      );

      expect(mails[1]).toEqual(1);
    });
  });

  test('OA create aspect on opportunity and comment - 0 notifications - all roles with notifications disabled', async () => {
    preferencesAspectCommentsConfig.forEach(
      async config =>
        await changePreferenceUser(config.userID, config.type, 'false')
    );
    // Act
    const resAspectonHub = await createAspectOnCallout(
      entitiesId.opportunityCalloutId,
      aspectNameID,
      { profileData: { displayName: aspectDisplayName } },
      AspectTypes.KNOWLEDGE,
      TestUser.OPPORTUNITY_ADMIN
    );
    opportunityAspectId = resAspectonHub.body.data.createAspectOnCallout.id;
    aspectCommentsIdOpportunity =
      resAspectonHub.body.data.createAspectOnCallout.comments.id;
    await mutation(
      sendComment,
      sendCommentVariablesData(
        aspectCommentsIdOpportunity,
        'test message on opportunity aspect'
      ),
      TestUser.OPPORTUNITY_ADMIN
    );

    // Assert
    await delay(1500);
    const mails = await getMailsData();

    expect(mails[1]).toEqual(0);
  });
});
