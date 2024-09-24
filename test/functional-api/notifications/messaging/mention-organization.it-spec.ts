/* eslint-disable prettier/prettier */
import { deleteMailSlurperMails } from '@test/utils/mailslurper.rest.requests';
import { delay } from '@test/utils/delay';
import { TestUser } from '@test/utils';
import { uniqueId } from '@test/utils/mutations/create-mutation';
import { deleteOrganization, updateOrganization } from '@test/functional-api/contributor-management/organization/organization.request.params';
import { deleteSpaceCodegen } from '@test/functional-api/journey/space/space.request.params';
import { assignUserAsOrganizationAdminCodegen } from '@test/utils/mutations/authorization-mutation';
import { users } from '@test/utils/queries/users-data';
import { changePreferenceOrganizationCodegen } from '@test/utils/mutations/preferences-mutation';
import {
  createPostOnCalloutCodegen,
} from '@test/functional-api/callout/post/post.request.params';
import {
  createChallengeWithUsersCodegen,
  createOpportunityWithUsersCodegen,
  createOrgAndSpaceWithUsersCodegen,
} from '@test/utils/data-setup/entities';
import { UserPreferenceType } from '@alkemio/client-lib';
import { sendMessageToRoomCodegen } from '@test/functional-api/communications/communication.params';
import { entitiesId, getMailsData } from '@test/types/entities-helper';

const organizationName = 'urole-org-name' + uniqueId;
const hostNameId = 'urole-org-nameid' + uniqueId;
const spaceName = '111' + uniqueId;
const spaceNameId = '111' + uniqueId;
const challengeName = `chName${uniqueId}`;
const opportunityName = `oppName${uniqueId}`;

let postCommentsIdSpace = '';

const receivers = (senderDisplayName: string, orgDisplayName: string) => {
  return `${senderDisplayName} mentioned ${orgDisplayName} in a comment on Alkemio`;
};

const baseUrl = process.env.ALKEMIO_BASE_URL + '/organization';

const mentionedOrganization = (userDisplayName: string, userNameId: string) => {
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

  await updateOrganization(entitiesId.organization.id, {
    legalEntityName: 'legalEntityName',
    domain: 'domain',
    website: 'https://website.org',
    contactEmail: 'test-org@alkem.io',
  });

  await createChallengeWithUsersCodegen(challengeName);
  await createOpportunityWithUsersCodegen(opportunityName);

  await assignUserAsOrganizationAdminCodegen(
    users.qaUser.id,
    entitiesId.organization.id
  );

  preferencesConfig = [
    {
      organizationID: entitiesId.organization.id,
      type: UserPreferenceType.NotificationOrganizationMention,
    },
  ];

  preferencesConfig.forEach(
    async config =>
      await changePreferenceOrganizationCodegen(
        config.organizationID,
        config.type,
        'true'
      )
  );
});

afterAll(async () => {
  await deleteSpaceCodegen(entitiesId.opportunity.id);
  await deleteSpaceCodegen(entitiesId.challenge.id);
  await deleteSpaceCodegen(entitiesId.spaceId);
  await deleteOrganization(entitiesId.organization.id);
});
describe('Notifications - Mention Organization', () => {
  beforeEach(async () => {
    await deleteMailSlurperMails();
  });

  describe('Callout discussion', () => {
    test('GA mention Organization in Space comments callout - 2 notification to Organization admins are sent', async () => {
      // Act
      await sendMessageToRoomCodegen(
        entitiesId.space.discussionCalloutCommentsId,
        `${mentionedOrganization(
          entitiesId.organization.displayName,
          entitiesId.organization.nameId
        )} comment on discussion callout`,
        TestUser.GLOBAL_ADMIN
      );
      await delay(3000);

      const getEmailsData = await getMailsData();

      // Assert
      expect(getEmailsData[1]).toEqual(2);
      expect(getEmailsData[0]).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            subject: receivers(
              users.globalAdmin.displayName,
              entitiesId.organization.displayName
            ),
            toAddresses: [users.qaUser.email],
          }),
          expect.objectContaining({
            subject: receivers(
              users.globalAdmin.displayName,
              entitiesId.organization.displayName
            ),
            toAddresses: [users.globalAdmin.email],
          }),
        ])
      );
    });

    test('HM mention Organization in Space comments callout - 2 notification to Organization admins are sent', async () => {
      // Act
      await sendMessageToRoomCodegen(
        entitiesId.space.discussionCalloutCommentsId,
        `${mentionedOrganization(
          entitiesId.organization.displayName,
          entitiesId.organization.nameId
        )} comment on discussion callout`,
        TestUser.HUB_MEMBER
      );
      await delay(3000);

      const getEmailsData = await getMailsData();

      // Assert
      expect(getEmailsData[1]).toEqual(2);
      expect(getEmailsData[0]).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            subject: receivers(
              users.spaceMember.displayName,
              entitiesId.organization.displayName
            ),
            toAddresses: [users.qaUser.email],
          }),
          expect.objectContaining({
            subject: receivers(
              users.spaceMember.displayName,
              entitiesId.organization.displayName
            ),
            toAddresses: [users.globalAdmin.email],
          }),
        ])
      );
    });

    test('GA mention Organization in Challenge comments callout - 2 notification to Organization admins are sent', async () => {
      // Act
      await sendMessageToRoomCodegen(
        entitiesId.challenge.discussionCalloutCommentsId,
        `${mentionedOrganization(
          entitiesId.organization.displayName,
          entitiesId.organization.nameId
        )} comment on discussion callout`,
        TestUser.GLOBAL_ADMIN
      );
      await delay(3000);

      const getEmailsData = await getMailsData();

      // Assert
      expect(getEmailsData[1]).toEqual(2);
      expect(getEmailsData[0]).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            subject: receivers(
              users.globalAdmin.displayName,
              entitiesId.organization.displayName
            ),
            toAddresses: [users.qaUser.email],
          }),
          expect.objectContaining({
            subject: receivers(
              users.globalAdmin.displayName,
              entitiesId.organization.displayName
            ),
            toAddresses: [users.globalAdmin.email],
          }),
        ])
      );
    });

    test('GA mention Organization in Opportunity comments callout - 2 notification to Organization admins are sent', async () => {
      // Act

      await sendMessageToRoomCodegen(
        entitiesId.opportunity.discussionCalloutCommentsId,
        `${mentionedOrganization(
          entitiesId.organization.displayName,
          entitiesId.organization.nameId
        )} comment on discussion callout`,
        TestUser.GLOBAL_ADMIN
      );
      await delay(3000);

      const getEmailsData = await getMailsData();

      // Assert
      expect(getEmailsData[1]).toEqual(2);
      expect(getEmailsData[0]).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            subject: receivers(
              users.globalAdmin.displayName,
              entitiesId.organization.displayName
            ),
            toAddresses: [users.qaUser.email],
          }),
          expect.objectContaining({
            subject: receivers(
              users.globalAdmin.displayName,
              entitiesId.organization.displayName
            ),
            toAddresses: [users.globalAdmin.email],
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

      await delay(3000);
      await deleteMailSlurperMails();
    });

    test('HA mention Organization in Space post - 2 notification to Organization admins are sent', async () => {
      // Act
      await sendMessageToRoomCodegen(
        postCommentsIdSpace,
        `${mentionedOrganization(
          entitiesId.organization.displayName,
          entitiesId.organization.nameId
        )} comment on discussion callout`,
        TestUser.HUB_ADMIN
      );
      await delay(3000);

      const getEmailsData = await getMailsData();

      // Assert
      expect(getEmailsData[1]).toEqual(2);
      expect(getEmailsData[0]).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            subject: receivers(
              users.spaceAdmin.displayName,
              entitiesId.organization.displayName
            ),
            toAddresses: [users.qaUser.email],
          }),
          expect.objectContaining({
            subject: receivers(
              users.spaceAdmin.displayName,
              entitiesId.organization.displayName
            ),
            toAddresses: [users.globalAdmin.email],
          }),
        ])
      );
    });

    test('HA mention Organization in Opportunity post (preference disabled) - 2 notification to Organization admins are sent', async () => {
      // Arrange
      preferencesConfig.forEach(
        async config =>
          await changePreferenceOrganizationCodegen(
            config.organizationID,
            config.type,
            'false'
          )
      );

      // Act
      await sendMessageToRoomCodegen(
        postCommentsIdSpace,
        `${mentionedOrganization(
          entitiesId.organization.displayName,
          entitiesId.organization.nameId
        )} comment on discussion callout`,
        TestUser.HUB_ADMIN
      );

      await delay(3000);

      const getEmailsData = await getMailsData();

      // Assert
      expect(getEmailsData[1]).toEqual(2);
    });
  });

  // ToDo: add timeline comments mentions, when implemented
  describe.skip('Post comment', () => {
    test('OA mention HM in Opportunity post - 1 notification to HM is sent', async () => {
      expect(1).toEqual(1);
    });
  });
});
