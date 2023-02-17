/* eslint-disable prettier/prettier */
import { deleteMailSlurperMails } from '@test/utils/mailslurper.rest.requests';
import { delay } from '@test/utils/delay';
import { entitiesId, getMailsData } from '../../communications-helper';
import { TestUser } from '@test/utils';
import {
  createChallengeWithUsers,
  createOpportunityWithUsers,
  createOrgAndHubWithUsers,
} from '../../create-entities-with-users-helper';
import { uniqueId } from '@test/utils/mutations/create-mutation';
import { deleteOrganization } from '@test/functional-api/integration/organization/organization.request.params';
import { removeHub } from '@test/functional-api/integration/hub/hub.request.params';
import { mutation } from '@test/utils/graphql.request';
import { removeOpportunity } from '@test/functional-api/integration/opportunity/opportunity.request.params';
import { removeChallenge } from '@test/functional-api/integration/challenge/challenge.request.params';
import { users } from '@test/utils/queries/users-data';
import { postCommentInCallout } from '@test/functional-api/integration/comments/comments.request.params';
import {
  changePreferenceUser,
  UserPreferenceType,
} from '@test/utils/mutations/preferences-mutation';
import {
  AspectTypes,
  createAspectOnCallout,
} from '@test/functional-api/integration/aspect/aspect.request.params';
import {
  sendComment,
  sendCommentVariablesData,
} from '@test/utils/mutations/communications-mutation';

const organizationName = 'urole-org-name' + uniqueId;
const hostNameId = 'urole-org-nameid' + uniqueId;
const hubName = '111' + uniqueId;
const hubNameId = '111' + uniqueId;
const challengeName = `chName${uniqueId}`;
const opportunityName = `oppName${uniqueId}`;

let aspectCommentsIdHub = '';
let aspectCommentsIdChallenge = '';
let aspectCommentsIdOpportunity = '';

const receivers = (senderDisplayName: string) => {
  return `${senderDisplayName} mentioned you in a comment on Alkemio`;
};

const baseUrl = process.env.ALKEMIO_BASE_URL + '/user';

const mentionedUser = (userDisplayName: string, userNameId: string) => {
  return `[@${userDisplayName}](${baseUrl}/${userNameId})`;
};

let preferencesConfig: any[] = [];

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

  preferencesConfig = [
    {
      userID: users.globalAdminId,
      type: UserPreferenceType.COMMUNICATION_MENTION,
    },
    {
      userID: users.hubMemberId,
      type: UserPreferenceType.COMMUNICATION_MENTION,
    },
    {
      userID: users.challengeMemberId,
      type: UserPreferenceType.COMMUNICATION_MENTION,
    },
    {
      userID: users.opportunityMemberId,
      type: UserPreferenceType.COMMUNICATION_MENTION,
    },
    {
      userID: users.hubAdminId,
      type: UserPreferenceType.COMMUNICATION_MENTION,
    },
    {
      userID: users.challengeAdminId,
      type: UserPreferenceType.COMMUNICATION_MENTION,
    },
    {
      userID: users.opportunityAdminId,
      type: UserPreferenceType.COMMUNICATION_MENTION,
    },
    {
      userID: users.nonHubMemberId,
      type: UserPreferenceType.COMMUNICATION_MENTION,
    },
  ];

  preferencesConfig.forEach(
    async config =>
      await changePreferenceUser(config.userID, config.type, 'true')
  );
});

afterAll(async () => {
  await removeOpportunity(entitiesId.opportunityId);
  await removeChallenge(entitiesId.challengeId);
  await removeHub(entitiesId.hubId);
  await deleteOrganization(entitiesId.organizationId);
});
describe('Notifications - Mention User', () => {
  beforeEach(async () => {
    await deleteMailSlurperMails();
  });

  describe('Callout discussion', () => {
    test('GA mention HM in Hub comments callout - 1 notification to HM is sent', async () => {
      // Act
      await postCommentInCallout(
        entitiesId.hubDiscussionCalloutId,
        `${mentionedUser(
          users.hubMemberDisplayName,
          users.hubMemberNameId
        )} comment on discussion callout`,
        TestUser.GLOBAL_ADMIN
      );
      await delay(3000);

      const getEmailsData = await getMailsData();

      // Assert
      expect(getEmailsData[1]).toEqual(1);
      expect(getEmailsData[0]).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            subject: receivers(users.globalAdminDisplayName),
            toAddresses: [users.hubMemberEmail],
          }),
        ])
      );
    });

    test('HM mention Non Hub member in Hub comments callout - 1 notification to NonHM is sent', async () => {
      // Act
      await postCommentInCallout(
        entitiesId.hubDiscussionCalloutId,
        `${mentionedUser(
          users.nonHubMemberDisplayName,
          users.nonHubMemberNameId
        )} comment on discussion callout`,
        TestUser.HUB_MEMBER
      );
      await delay(3000);

      const getEmailsData = await getMailsData();

      // Assert
      expect(getEmailsData[1]).toEqual(1);
      expect(getEmailsData[0]).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            subject: receivers(users.hubMemberDisplayName),
            toAddresses: [users.nonHubMemberEmail],
          }),
        ])
      );
    });

    test('HM mention Non Hub member and Hub Admin in Hub comments callout - 2 notification to NonHM and HA is sent', async () => {
      // Act
      await postCommentInCallout(
        entitiesId.hubDiscussionCalloutId,
        `${mentionedUser(
          users.nonHubMemberDisplayName,
          users.nonHubMemberNameId
        )}, ${mentionedUser(
          users.hubAdminDisplayName,
          users.hubAdminNameId
        )}  comment on discussion callout`,
        TestUser.HUB_MEMBER
      );
      await delay(3000);

      const getEmailsData = await getMailsData();

      // Assert
      expect(getEmailsData[1]).toEqual(2);
      expect(getEmailsData[0]).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            subject: receivers(users.hubMemberDisplayName),
            toAddresses: [users.nonHubMemberEmail],
          }),
          expect.objectContaining({
            subject: receivers(users.hubMemberDisplayName),
            toAddresses: [users.hubAdminEmail],
          }),
        ])
      );
    });

    test('Non Hub member mention HM in Hub comments callout - 0 notification to HM is sent', async () => {
      // Act
      await postCommentInCallout(
        entitiesId.hubDiscussionCalloutId,
        `${mentionedUser(
          users.hubMemberDisplayName,
          users.hubMemberNameId
        )} comment on discussion callout`,
        TestUser.NON_HUB_MEMBER
      );
      await delay(3000);

      const getEmailsData = await getMailsData();

      // Assert
      expect(getEmailsData[1]).toEqual(0);
    });

    test('GA mention HM in Challenge comments callout - 1 notification to HM is sent', async () => {
      // Act
      await postCommentInCallout(
        entitiesId.challengeDiscussionCalloutId,
        `${mentionedUser(
          users.hubMemberDisplayName,
          users.hubMemberNameId
        )} comment on discussion callout`,
        TestUser.GLOBAL_ADMIN
      );
      await delay(3000);

      const getEmailsData = await getMailsData();

      // Assert
      expect(getEmailsData[1]).toEqual(1);
      expect(getEmailsData[0]).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            subject: receivers(users.globalAdminDisplayName),
            toAddresses: [users.hubMemberEmail],
          }),
        ])
      );
    });

    test('GA mention HM in Opportunity comments callout - 1 notification to HM is sent', async () => {
      // Act

      await postCommentInCallout(
        entitiesId.opportunityDiscussionCalloutId,
        `${mentionedUser(
          users.hubMemberDisplayName,
          users.hubMemberNameId
        )} comment on discussion callout`,
        TestUser.GLOBAL_ADMIN
      );
      await delay(3000);

      const getEmailsData = await getMailsData();

      // Assert
      expect(getEmailsData[1]).toEqual(1);
      expect(getEmailsData[0]).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            subject: receivers(users.globalAdminDisplayName),
            toAddresses: [users.hubMemberEmail],
          }),
        ])
      );
    });
  });

  describe('Aspect comment', () => {
    beforeAll(async () => {
      let aspectNameID = '';
      aspectNameID = `aspect-name-id-${uniqueId}`;
      const aspectDisplayName = `aspect-d-name-${uniqueId}`;
      const resAspectonHub = await createAspectOnCallout(
        entitiesId.hubCalloutId,
        aspectDisplayName,
        aspectNameID,
        AspectTypes.KNOWLEDGE,
        TestUser.GLOBAL_ADMIN
      );
      aspectCommentsIdHub =
        resAspectonHub.body.data.createAspectOnCallout.comments.id;

      const resAspectonChallenge = await createAspectOnCallout(
        entitiesId.challengeCalloutId,
        aspectDisplayName,
        aspectNameID,
        AspectTypes.KNOWLEDGE,
        TestUser.CHALLENGE_MEMBER
      );
      aspectCommentsIdChallenge =
        resAspectonChallenge.body.data.createAspectOnCallout.comments.id;

      const resAspectonOpp = await createAspectOnCallout(
        entitiesId.opportunityCalloutId,
        aspectDisplayName,
        aspectNameID,
        AspectTypes.KNOWLEDGE,
        TestUser.OPPORTUNITY_MEMBER
      );
      aspectCommentsIdOpportunity =
        resAspectonOpp.body.data.createAspectOnCallout.comments.id;

      await delay(3000);
      await deleteMailSlurperMails();
    });

    test('HA mention HM in Hub aspect - 1 notification to HM is sent', async () => {
      // Act
      await mutation(
        sendComment,
        sendCommentVariablesData(
          aspectCommentsIdHub,
          `${mentionedUser(
            users.hubMemberDisplayName,
            users.hubMemberNameId
          )} comment on discussion callout`
        ),
        TestUser.HUB_ADMIN
      );
      await delay(3000);

      const getEmailsData = await getMailsData();

      // Assert
      expect(getEmailsData[1]).toEqual(1);
      expect(getEmailsData[0]).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            subject: receivers(users.hubAdminDisplayName),
            toAddresses: [users.hubMemberEmail],
          }),
        ])
      );
    });
    test('CA mention HM in Challenge aspect - 1 notification to HM is sent', async () => {
      // Act
      await mutation(
        sendComment,
        sendCommentVariablesData(
          aspectCommentsIdChallenge,
          `${mentionedUser(
            users.hubMemberDisplayName,
            users.hubMemberNameId
          )} comment on discussion callout`
        ),
        TestUser.CHALLENGE_MEMBER
      );
      await delay(3000);

      const getEmailsData = await getMailsData();

      // Assert
      expect(getEmailsData[1]).toEqual(1);
      expect(getEmailsData[0]).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            subject: receivers(users.challengeMemberDisplayName),
            toAddresses: [users.hubMemberEmail],
          }),
        ])
      );
    });

    test('OA mention HM in Opportunity aspect - 1 notification to HM is sent', async () => {
      // Act
      await mutation(
        sendComment,
        sendCommentVariablesData(
          aspectCommentsIdOpportunity,
          `${mentionedUser(
            users.hubMemberDisplayName,
            users.hubMemberNameId
          )} comment on discussion callout`
        ),
        TestUser.OPPORTUNITY_MEMBER
      );

      await delay(3000);

      const getEmailsData = await getMailsData();

      // Assert
      expect(getEmailsData[1]).toEqual(1);
      expect(getEmailsData[0]).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            subject: receivers(users.opportunityMemberDisplayName),
            toAddresses: [users.hubMemberEmail],
          }),
        ])
      );
    });

    test('OA mention HM in Opportunity aspect (preference disabled) - 0 notification to HM is sent', async () => {
      // Arrange
      preferencesConfig.forEach(
        async config =>
          await changePreferenceUser(config.userID, config.type, 'false')
      );

      // Act
      await mutation(
        sendComment,
        sendCommentVariablesData(
          aspectCommentsIdOpportunity,
          `${mentionedUser(
            users.hubMemberDisplayName,
            users.hubMemberNameId
          )} comment on discussion callout`
        ),
        TestUser.OPPORTUNITY_MEMBER
      );

      await delay(3000);

      const getEmailsData = await getMailsData();

      // Assert
      expect(getEmailsData[1]).toEqual(0);
    });
  });

  // ToDo: add timeline comments mentions, when implemented
  describe.skip('Aspect comment', () => {
    test('OA mention HM in Opportunity aspect - 1 notification to HM is sent', async () => {
      expect(1).toEqual(1);
    });
  });
});
