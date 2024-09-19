/* eslint-disable prettier/prettier */
import { deleteMailSlurperMails } from '@test/utils/mailslurper.rest.requests';
import { delay } from '@test/utils/delay';
import { TestUser } from '@test/utils';
import { uniqueId } from '@test/utils/mutations/create-mutation';
import { deleteSpaceCodegen } from '@test/functional-api/journey/space/space.request.params';
import { users } from '@test/utils/queries/users-data';
import {
  createPostOnCalloutCodegen,
} from '@test/functional-api/callout/post/post.request.params';
import {
  createChallengeWithUsersCodegen,
  createOpportunityWithUsersCodegen,
  createOrgAndSpaceWithUsersCodegen,
} from '@test/utils/data-setup/entities';
import { deleteOrganizationCodegen } from '@test/functional-api/organization/organization.request.params';
import { UserPreferenceType } from '@alkemio/client-lib';
import { changePreferenceUserCodegen } from '@test/utils/mutations/preferences-mutation';
import { sendMessageToRoomCodegen } from '@test/functional-api/communications/communication.params';
import {
  entitiesId,
  getMailsData,
} from '@test/functional-api/roles/community/communications-helper';

const organizationName = 'urole-org-name' + uniqueId;
const hostNameId = 'urole-org-nameid' + uniqueId;
const spaceName = '111' + uniqueId;
const spaceNameId = '111' + uniqueId;
const challengeName = `chName${uniqueId}`;
const opportunityName = `oppName${uniqueId}`;

let postCommentsIdSpace = '';
let postCommentsIdChallenge = '';
let postCommentsIdOpportunity = '';

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

  await createOrgAndSpaceWithUsersCodegen(
    organizationName,
    hostNameId,
    spaceName,
    spaceNameId
  );

  await createChallengeWithUsersCodegen(challengeName);
  await createOpportunityWithUsersCodegen(opportunityName);

  preferencesConfig = [
    {
      userID: users.globalAdmin.id,
      type: UserPreferenceType.NotificationCommunicationMention,
    },
    {
      userID: users.spaceMember.id,
      type: UserPreferenceType.NotificationCommunicationMention,
    },
    {
      userID: users.challengeMember.id,
      type: UserPreferenceType.NotificationCommunicationMention,
    },
    {
      userID: users.opportunityMember.id,
      type: UserPreferenceType.NotificationCommunicationMention,
    },
    {
      userID: users.spaceAdmin.id,
      type: UserPreferenceType.NotificationCommunicationMention,
    },
    {
      userID: users.challengeAdmin.id,
      type: UserPreferenceType.NotificationCommunicationMention,
    },
    {
      userID: users.opportunityAdmin.id,
      type: UserPreferenceType.NotificationCommunicationMention,
    },
    {
      userID: users.nonSpaceMember.id,
      type: UserPreferenceType.NotificationCommunicationMention,
    },
  ];

  preferencesConfig.forEach(
    async config =>
      await changePreferenceUserCodegen(config.userID, config.type, 'true')
  );
});

afterAll(async () => {
  await deleteSpaceCodegen(entitiesId.opportunity.id);
  await deleteSpaceCodegen(entitiesId.challenge.id);
  await deleteSpaceCodegen(entitiesId.spaceId);
  await deleteOrganizationCodegen(entitiesId.organization.id);
});
describe('Notifications - Mention User', () => {
  beforeEach(async () => {
    await deleteMailSlurperMails();
  });

  describe('Callout discussion', () => {
    test('GA mention HM in Space comments callout - 1 notification to HM is sent', async () => {
      // Act
      await sendMessageToRoomCodegen(
        entitiesId.space.discussionCalloutCommentsId,
        `${mentionedUser(
          users.spaceMember.displayName,
          users.spaceMember.nameId
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
            subject: receivers(users.globalAdmin.displayName),
            toAddresses: [users.spaceMember.email],
          }),
        ])
      );
    });

    test('HM mention Non Space member in Space comments callout - 1 notification to NonHM is sent', async () => {
      // Act
      await sendMessageToRoomCodegen(
        entitiesId.space.discussionCalloutCommentsId,
        `${mentionedUser(
          users.nonSpaceMember.displayName,
          users.nonSpaceMember.nameId
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
            subject: receivers(users.spaceMember.displayName),
            toAddresses: [users.nonSpaceMember.email],
          }),
        ])
      );
    });

    test('HM mention Non Space member and Space Admin in Space comments callout - 2 notification to NonHM and HA is sent', async () => {
      // Act
      await sendMessageToRoomCodegen(
        entitiesId.space.discussionCalloutCommentsId,
        `${mentionedUser(
          users.nonSpaceMember.displayName,
          users.nonSpaceMember.nameId
        )}, ${mentionedUser(
          users.spaceAdmin.displayName,
          users.spaceAdmin.nameId
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
            subject: receivers(users.spaceMember.displayName),
            toAddresses: [users.nonSpaceMember.email],
          }),
          expect.objectContaining({
            subject: receivers(users.spaceMember.displayName),
            toAddresses: [users.spaceAdmin.email],
          }),
        ])
      );
    });

    test('Non Space member mention HM in Space comments callout - 0 notification to HM is sent', async () => {
      // Act
      await sendMessageToRoomCodegen(
        entitiesId.space.discussionCalloutCommentsId,
        `${mentionedUser(
          users.spaceMember.displayName,
          users.spaceMember.nameId
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
      await sendMessageToRoomCodegen(
        entitiesId.challenge.discussionCalloutCommentsId,
        `${mentionedUser(
          users.spaceMember.displayName,
          users.spaceMember.nameId
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
            subject: receivers(users.globalAdmin.displayName),
            toAddresses: [users.spaceMember.email],
          }),
        ])
      );
    });

    test('GA mention HM in Opportunity comments callout - 1 notification to HM is sent', async () => {
      // Act

      await sendMessageToRoomCodegen(
        entitiesId.opportunity.discussionCalloutCommentsId,
        `${mentionedUser(
          users.spaceMember.displayName,
          users.spaceMember.nameId
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
            subject: receivers(users.globalAdmin.displayName),
            toAddresses: [users.spaceMember.email],
          }),
        ])
      );
    });
  });

  describe('Post comment', () => {
    beforeAll(async () => {
      let postNameID = '';
      postNameID = `post-name-id-${uniqueId}`;
      const postDisplayName = `post-d-name-${uniqueId}`;
      const resPostonSpace = await createPostOnCalloutCodegen(
        entitiesId.space.calloutId,
        { displayName: postDisplayName },
        postNameID,
        TestUser.GLOBAL_ADMIN
      );
      postCommentsIdSpace =
        resPostonSpace.data?.createContributionOnCallout.post?.comments.id ??
        '';

      const resPostonChallenge = await createPostOnCalloutCodegen(
        entitiesId.challenge.calloutId,
        { displayName: postDisplayName },
        postNameID,
        TestUser.CHALLENGE_MEMBER
      );
      postCommentsIdChallenge =
        resPostonChallenge.data?.createContributionOnCallout.post?.comments
          .id ?? '';

      const resPostonOpp = await createPostOnCalloutCodegen(
        entitiesId.opportunity.calloutId,
        { displayName: postDisplayName },
        postNameID,
        TestUser.OPPORTUNITY_MEMBER
      );
      postCommentsIdOpportunity =
        resPostonOpp.data?.createContributionOnCallout.post?.comments.id ?? '';

      await delay(3000);
      await deleteMailSlurperMails();
    });

    test('HA mention HM in Space post - 1 notification to HM is sent', async () => {
      // Act
      await sendMessageToRoomCodegen(
        postCommentsIdSpace,
        `${mentionedUser(
          users.spaceMember.displayName,
          users.spaceMember.nameId
        )} comment on discussion callout`,
        TestUser.HUB_ADMIN
      );
      await delay(3000);

      const getEmailsData = await getMailsData();

      // Assert
      expect(getEmailsData[1]).toEqual(1);
      expect(getEmailsData[0]).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            subject: receivers(users.spaceAdmin.displayName),
            toAddresses: [users.spaceMember.email],
          }),
        ])
      );
    });

    test('CA mention HM in Challenge post - 1 notification to HM is sent', async () => {
      // Act
      await sendMessageToRoomCodegen(
        postCommentsIdChallenge,
        `${mentionedUser(
          users.spaceMember.displayName,
          users.spaceMember.nameId
        )} comment on discussion callout`,
        TestUser.CHALLENGE_MEMBER
      );
      await delay(3000);

      const getEmailsData = await getMailsData();

      // Assert
      expect(getEmailsData[1]).toEqual(1);
      expect(getEmailsData[0]).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            subject: receivers(users.challengeMember.displayName),
            toAddresses: [users.spaceMember.email],
          }),
        ])
      );
    });

    test('OA mention HM in Opportunity post - 1 notification to HM is sent', async () => {
      // Act
      await sendMessageToRoomCodegen(
        postCommentsIdOpportunity,
        `${mentionedUser(
          users.spaceMember.displayName,
          users.spaceMember.nameId
        )} comment on discussion callout`,
        TestUser.OPPORTUNITY_MEMBER
      );

      await delay(3000);

      const getEmailsData = await getMailsData();

      // Assert
      expect(getEmailsData[1]).toEqual(1);
      expect(getEmailsData[0]).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            subject: receivers(users.opportunityMember.displayName),
            toAddresses: [users.spaceMember.email],
          }),
        ])
      );
    });

    test('OA mention HM in Opportunity post (preference disabled) - 0 notification to HM is sent', async () => {
      // Arrange
      preferencesConfig.forEach(
        async config =>
          await changePreferenceUserCodegen(config.userID, config.type, 'false')
      );

      // Act
      await sendMessageToRoomCodegen(
        postCommentsIdOpportunity,
        `${mentionedUser(
          users.spaceMember.displayName,
          users.spaceMember.nameId
        )} comment on discussion callout`,
        TestUser.OPPORTUNITY_MEMBER
      );

      await delay(3000);

      const getEmailsData = await getMailsData();

      // Assert
      expect(getEmailsData[1]).toEqual(0);
    });
  });

  // ToDo: add timeline comments mentions, when implemented
  describe.skip('Post comment', () => {
    test('OA mention HM in Opportunity post - 1 notification to HM is sent', async () => {
      expect(1).toEqual(1);
    });
  });
});
