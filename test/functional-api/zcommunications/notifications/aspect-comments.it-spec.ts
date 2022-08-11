import {
  UserPreferenceType,
  changePreferenceUser,
} from '@test/utils/mutations/preferences-mutation';
import { uniqueId } from '@test/utils/mutations/create-mutation';
import { TestUser } from '@test/utils/token.helper';
import { deleteMailSlurperMails } from '@test/utils/mailslurper.rest.requests';
import {
  createCalloutToMainChallenge,
  createCalloutToMainHub,
  createCalloutToMainOpportunity,
  createChallengeWithUsers,
  createOpportunityWithUsers,
  createOrgAndHubWithUsers,
  registerUsersAndAssignToAllEntitiesAsMembers,
} from '../create-entities-with-users-helper';
import { entitiesId, getMailsData, users } from '../communications-helper';
import { removeOpportunity } from '@test/functional-api/integration/opportunity/opportunity.request.params';
import { removeChallenge } from '@test/functional-api/integration/challenge/challenge.request.params';
import { removeHub } from '@test/functional-api/integration/hub/hub.request.params';
import { deleteOrganization } from '@test/functional-api/integration/organization/organization.request.params';
import { delay } from '@test/utils/delay';
import { removeUser } from '@test/functional-api/user-management/user.request.params';
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
let aspectDescription = '';
let aspectCommentsIdHub = '';
let aspectCommentsIdChallenge = '';
let aspectCommentsIdOpportunity = '';
let msessageId = '';
let preferencesAspectConfig: any[] = [];
let preferencesAspectCommentsConfig: any[] = [];
let hubCalloutId = '';
let challengeCalloutId = '';
let opportunityCalloutId = '';

const hubMemOnly = `hubmem${uniqueId}@alkem.io`;
const challengeAndHubMemOnly = `chalmem${uniqueId}@alkem.io`;
const opportunityAndChallengeAndHubMem = `oppmem${uniqueId}@alkem.io`;

beforeAll(async () => {
  const hubCalloutName = `hub-callout-${uniqueId}`;
  const challCalloutName = `ch-callout-${uniqueId}`;
  const oppCalloutName = `opp-callout-${uniqueId}`;
  await deleteMailSlurperMails();

  await createOrgAndHubWithUsers(
    organizationName,
    hostNameId,
    hubName,
    hubNameId
  );
  await createChallengeWithUsers(challengeName);
  await createOpportunityWithUsers(opportunityName);
  const resHub = await createCalloutToMainHub(hubCalloutName, hubCalloutName);
  hubCalloutId = resHub;
  const resCh = await createCalloutToMainChallenge(
    challCalloutName,
    challCalloutName
  );
  console.log(resCh);
  challengeCalloutId = resCh;
  const resOpp = await createCalloutToMainOpportunity(
    oppCalloutName,
    oppCalloutName
  );
  opportunityCalloutId = resOpp;
  await registerUsersAndAssignToAllEntitiesAsMembers(
    hubMemOnly,
    challengeAndHubMemOnly,
    opportunityAndChallengeAndHubMem
  );

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
      userID: hubMemOnly,
      type: UserPreferenceType.ASPECT_CREATED,
    },
    {
      userID: hubMemOnly,
      type: UserPreferenceType.ASPECT_CREATED_ADMIN,
    },

    {
      userID: challengeAndHubMemOnly,
      type: UserPreferenceType.ASPECT_CREATED,
    },
    {
      userID: challengeAndHubMemOnly,
      type: UserPreferenceType.ASPECT_CREATED_ADMIN,
    },

    {
      userID: opportunityAndChallengeAndHubMem,
      type: UserPreferenceType.ASPECT_CREATED,
    },
    {
      userID: opportunityAndChallengeAndHubMem,
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
      userID: users.hubMemberId,
      type: UserPreferenceType.ASPECT_CREATED,
    },
    {
      userID: users.hubMemberId,
      type: UserPreferenceType.ASPECT_CREATED_ADMIN,
    },
    {
      userID: users.qaUserId,
      type: UserPreferenceType.ASPECT_CREATED,
    },
    {
      userID: users.qaUserId,
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
      userID: hubMemOnly,
      type: UserPreferenceType.ASPECT_COMMENT_CREATED,
    },
    {
      userID: challengeAndHubMemOnly,
      type: UserPreferenceType.ASPECT_COMMENT_CREATED,
    },
    {
      userID: opportunityAndChallengeAndHubMem,
      type: UserPreferenceType.ASPECT_COMMENT_CREATED,
    },
    {
      userID: users.hubAdminId,
      type: UserPreferenceType.ASPECT_COMMENT_CREATED,
    },
    {
      userID: users.hubMemberId,
      type: UserPreferenceType.ASPECT_COMMENT_CREATED,
    },
    {
      userID: users.qaUserId,
      type: UserPreferenceType.ASPECT_COMMENT_CREATED,
    },
    {
      userID: users.nonHubMemberId,
      type: UserPreferenceType.ASPECT_COMMENT_CREATED,
    },
  ];
});

afterAll(async () => {
  await removeUser(hubMemOnly);
  await removeUser(challengeAndHubMemOnly);
  await removeUser(opportunityAndChallengeAndHubMem);

  await removeOpportunity(entitiesId.opportunityId);
  await removeChallenge(entitiesId.challengeId);
  await removeHub(entitiesId.hubId);
  await deleteOrganization(entitiesId.organizationId);
});

describe('Notifications - aspect comments', () => {
  let aspectNameID = '';
  aspectNameID = `aspect-name-id-${uniqueId}`;
  aspectDisplayName = `aspect-d-name-${uniqueId}`;
  aspectDescription = `aspectDescription-${uniqueId}`;
  beforeEach(async () => {
    await deleteMailSlurperMails();

    aspectNameID = `aspect-name-id-${uniqueId}`;
    aspectDisplayName = `aspect-d-name-${uniqueId}`;
    aspectDescription = `aspectDescription-${uniqueId}`;
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
  describe('GA create aspect on hub  ', () => {
    beforeAll(async () => {
      const resAspectonHub = await createAspectOnCallout(
        hubCalloutId,
        aspectDisplayName,
        aspectNameID,
        aspectDescription,
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
      const hubAspectSubjectText = `New comment received on your aspect ${aspectDisplayName}`;

      // Act
      const messageRes = await mutation(
        sendComment,
        sendCommentVariablesData(
          aspectCommentsIdHub,
          'test message on hub aspect'
        ),
        TestUser.GLOBAL_ADMIN
      );
      msessageId = messageRes.body.data.sendComment.id;

      await delay(6000);
      const mails = await getMailsData();

      expect(mails[0]).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            subject: hubAspectSubjectText,
            toAddresses: [users.globalAdminIdEmail],
          }),
        ])
      );

      expect(mails[1]).toEqual(1);
    });

    test('HM create comment - GA(1) get notifications', async () => {
      const hubAspectSubjectText = `New comment received on your aspect ${aspectDisplayName}`;
      // Act
      const messageRes = await mutation(
        sendComment,
        sendCommentVariablesData(
          aspectCommentsIdHub,
          'test message on hub aspect'
        ),
        TestUser.HUB_MEMBER
      );
      msessageId = messageRes.body.data.sendComment.id;

      await delay(6000);
      const mails = await getMailsData();

      expect(mails[0]).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            subject: hubAspectSubjectText,
            toAddresses: [users.globalAdminIdEmail],
          }),
        ])
      );

      expect(mails[1]).toEqual(1);
    });
  });

  describe('HM create aspect on hub  ', () => {
    beforeAll(async () => {
      const resAspectonHub = await createAspectOnCallout(
        hubCalloutId,
        aspectDisplayName,
        aspectNameID,
        aspectDescription,
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
      const hubAspectSubjectText = `New comment received on your aspect ${aspectDisplayName}`;

      // Act
      const messageRes = await mutation(
        sendComment,
        sendCommentVariablesData(
          aspectCommentsIdHub,
          'test message on hub aspect'
        ),
        TestUser.HUB_MEMBER
      );
      msessageId = messageRes.body.data.sendComment.id;

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
      const hubAspectSubjectText = `New comment received on your aspect ${aspectDisplayName}`;
      // Act
      const messageRes = await mutation(
        sendComment,
        sendCommentVariablesData(
          aspectCommentsIdHub,
          'test message on hub aspect'
        ),
        TestUser.HUB_ADMIN
      );
      msessageId = messageRes.body.data.sendComment.id;

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
        challengeCalloutId,
        aspectDisplayName,
        aspectNameID,
        aspectDescription,
        AspectTypes.KNOWLEDGE,
        TestUser.QA_USER
      );
      challengeAspectId = resAspectonHub.body.data.createAspectOnCallout.id;
      aspectCommentsIdChallenge =
        resAspectonHub.body.data.createAspectOnCallout.comments.id;
    });

    afterAll(async () => {
      await removeAspect(challengeAspectId);
    });
    test('CM create comment - CM(1) get notifications', async () => {
      const challengeAspectSubjectText = `New comment received on your aspect ${aspectDisplayName}`;

      // Act
      const messageRes = await mutation(
        sendComment,
        sendCommentVariablesData(
          aspectCommentsIdChallenge,
          'test message on challenge aspect'
        ),
        TestUser.QA_USER
      );
      msessageId = messageRes.body.data.sendComment.id;

      await delay(6000);
      const mails = await getMailsData();

      expect(mails[0]).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            subject: challengeAspectSubjectText,
            toAddresses: [users.qaUserEmail],
          }),
        ])
      );

      expect(mails[1]).toEqual(1);
    });

    test('CA create comment - CM(1) get notifications', async () => {
      const challengeAspectSubjectText = `New comment received on your aspect ${aspectDisplayName}`;
      // Act
      const messageRes = await mutation(
        sendComment,
        sendCommentVariablesData(
          aspectCommentsIdChallenge,
          'test message on challenge aspect'
        ),
        TestUser.HUB_MEMBER
      );
      msessageId = messageRes.body.data.sendComment.id;

      await delay(6000);
      const mails = await getMailsData();

      expect(mails[0]).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            subject: challengeAspectSubjectText,
            toAddresses: [users.qaUserEmail],
          }),
        ])
      );

      expect(mails[1]).toEqual(1);
    });
  });

  describe('OM create aspect on opportunity  ', () => {
    beforeAll(async () => {
      const resAspectonHub = await createAspectOnCallout(
        opportunityCalloutId,
        aspectDisplayName,
        aspectNameID,
        aspectDescription,
        AspectTypes.KNOWLEDGE,
        TestUser.QA_USER
      );
      opportunityAspectId = resAspectonHub.body.data.createAspectOnCallout.id;
      aspectCommentsIdOpportunity =
        resAspectonHub.body.data.createAspectOnCallout.comments.id;
    });

    afterAll(async () => {
      await removeAspect(opportunityAspectId);
    });
    test('OM create comment - OM(1) get notifications', async () => {
      const opportunityAspectSubjectText = `New comment received on your aspect ${aspectDisplayName}`;

      // Act
      const messageRes = await mutation(
        sendComment,
        sendCommentVariablesData(
          aspectCommentsIdOpportunity,
          'test message on opportunity aspect'
        ),
        TestUser.QA_USER
      );
      msessageId = messageRes.body.data.sendComment.id;

      await delay(6000);
      const mails = await getMailsData();

      expect(mails[0]).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            subject: opportunityAspectSubjectText,
            toAddresses: [users.qaUserEmail],
          }),
        ])
      );

      expect(mails[1]).toEqual(1);
    });

    test('CA create comment - CM(1) get notifications', async () => {
      const opportunityAspectSubjectText = `New comment received on your aspect ${aspectDisplayName}`;
      // Act
      const messageRes = await mutation(
        sendComment,
        sendCommentVariablesData(
          aspectCommentsIdOpportunity,
          'test message on opportunity aspect'
        ),
        TestUser.HUB_MEMBER
      );
      msessageId = messageRes.body.data.sendComment.id;

      await delay(6000);
      const mails = await getMailsData();

      expect(mails[0]).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            subject: opportunityAspectSubjectText,
            toAddresses: [users.qaUserEmail],
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
      opportunityCalloutId,
      aspectDisplayName,
      aspectNameID,
      aspectDescription,
      AspectTypes.KNOWLEDGE,
      TestUser.QA_USER
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
      TestUser.HUB_MEMBER
    );

    // Assert
    await delay(1500);
    const mails = await getMailsData();

    expect(mails[1]).toEqual(0);
  });
});
