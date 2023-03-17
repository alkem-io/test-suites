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

import {
  deleteOrganization,
  updateOrganization,
} from '@test/functional-api/integration/organization/organization.request.params';
import { removeHub } from '@test/functional-api/integration/hub/hub.request.params';
import { mutation } from '@test/utils/graphql.request';
import {
  assignUserAsOrganizationAdmin,
  userAsOrganizationOwnerVariablesData,
} from '@test/utils/mutations/authorization-mutation';

import { removeOpportunity } from '@test/functional-api/integration/opportunity/opportunity.request.params';
import { removeChallenge } from '@test/functional-api/integration/challenge/challenge.request.params';
import { users } from '@test/utils/queries/users-data';
import { postCommentInCallout } from '@test/functional-api/integration/comments/comments.request.params';
import {
  changePreferenceOrganization,
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

  await createOrgAndHubWithUsers(
    organizationName,
    hostNameId,
    hubName,
    hubNameId
  );

  await updateOrganization(
    entitiesId.organizationId,
    'legalEntityName',
    'domain',
    'https://website.org',
    'test-org@alkem.io'
  );

  await createChallengeWithUsers(challengeName);
  await createOpportunityWithUsers(opportunityName);

  await mutation(
    assignUserAsOrganizationAdmin,
    userAsOrganizationOwnerVariablesData(
      users.qaUserId,
      entitiesId.organizationId
    )
  );

  preferencesConfig = [
    {
      organizationID: entitiesId.organizationId,
      type: UserPreferenceType.ORGANIZATION_MENTION,
    },
  ];

  preferencesConfig.forEach(
    async config =>
      await changePreferenceOrganization(
        config.organizationID,
        config.type,
        'true'
      )
  );
});

afterAll(async () => {
  await removeOpportunity(entitiesId.opportunityId);
  await removeChallenge(entitiesId.challengeId);
  await removeHub(entitiesId.hubId);
  await deleteOrganization(entitiesId.organizationId);
});
describe('Notifications - Mention Organization', () => {
  beforeEach(async () => {
    await deleteMailSlurperMails();
  });

  describe('Callout discussion', () => {
    test('GA mention Organization in Hub comments callout - 2 notification to Organization admins are sent', async () => {
      // Act
      await postCommentInCallout(
        entitiesId.hubDiscussionCalloutId,
        `${mentionedOrganization(
          entitiesId.organizationDisplayName,
          entitiesId.organizationNameId
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
              users.globalAdminDisplayName,
              entitiesId.organizationDisplayName
            ),
            toAddresses: [users.qaUserEmail],
          }),
          expect.objectContaining({
            subject: receivers(
              users.globalAdminDisplayName,
              entitiesId.organizationDisplayName
            ),
            toAddresses: [users.globalAdminEmail],
          }),
        ])
      );
    });

    test('HM mention Organization in Hub comments callout - 2 notification to Organization admins are sent', async () => {
      // Act
      await postCommentInCallout(
        entitiesId.hubDiscussionCalloutId,
        `${mentionedOrganization(
          entitiesId.organizationDisplayName,
          entitiesId.organizationNameId
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
              users.hubMemberDisplayName,
              entitiesId.organizationDisplayName
            ),
            toAddresses: [users.qaUserEmail],
          }),
          expect.objectContaining({
            subject: receivers(
              users.hubMemberDisplayName,
              entitiesId.organizationDisplayName
            ),
            toAddresses: [users.globalAdminEmail],
          }),
        ])
      );
    });

    test('GA mention Organization in Challenge comments callout - 2 notification to Organization admins are sent', async () => {
      // Act
      await postCommentInCallout(
        entitiesId.challengeDiscussionCalloutId,
        `${mentionedOrganization(
          entitiesId.organizationDisplayName,
          entitiesId.organizationNameId
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
              users.globalAdminDisplayName,
              entitiesId.organizationDisplayName
            ),
            toAddresses: [users.qaUserEmail],
          }),
          expect.objectContaining({
            subject: receivers(
              users.globalAdminDisplayName,
              entitiesId.organizationDisplayName
            ),
            toAddresses: [users.globalAdminEmail],
          }),
        ])
      );
    });

    test('GA mention Organization in Opportunity comments callout - 2 notification to Organization admins are sent', async () => {
      // Act

      await postCommentInCallout(
        entitiesId.opportunityDiscussionCalloutId,
        `${mentionedOrganization(
          entitiesId.organizationDisplayName,
          entitiesId.organizationNameId
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
              users.globalAdminDisplayName,
              entitiesId.organizationDisplayName
            ),
            toAddresses: [users.qaUserEmail],
          }),
          expect.objectContaining({
            subject: receivers(
              users.globalAdminDisplayName,
              entitiesId.organizationDisplayName
            ),
            toAddresses: [users.globalAdminEmail],
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
        aspectNameID,
        { profileData: { displayName: aspectDisplayName } },
        AspectTypes.KNOWLEDGE,
        TestUser.GLOBAL_ADMIN
      );
      aspectCommentsIdHub =
        resAspectonHub.body.data.createAspectOnCallout.comments.id;

      await delay(3000);
      await deleteMailSlurperMails();
    });

    test('HA mention Organization in Hub aspect - 2 notification to Organization admins are sent', async () => {
      // Act
      await mutation(
        sendComment,
        sendCommentVariablesData(
          aspectCommentsIdHub,
          `${mentionedOrganization(
            entitiesId.organizationDisplayName,
            entitiesId.organizationNameId
          )} comment on discussion callout`
        ),
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
              users.hubAdminDisplayName,
              entitiesId.organizationDisplayName
            ),
            toAddresses: [users.qaUserEmail],
          }),
          expect.objectContaining({
            subject: receivers(
              users.hubAdminDisplayName,
              entitiesId.organizationDisplayName
            ),
            toAddresses: [users.globalAdminEmail],
          }),
        ])
      );
    });

    test('HA mention Organization in Opportunity aspect (preference disabled) - 2 notification to Organization admins are sent', async () => {
      // Arrange
      preferencesConfig.forEach(
        async config =>
          await changePreferenceOrganization(
            config.organizationID,
            config.type,
            'false'
          )
      );

      // Act
      await mutation(
        sendComment,
        sendCommentVariablesData(
          aspectCommentsIdHub,
          `${mentionedOrganization(
            entitiesId.organizationDisplayName,
            entitiesId.organizationNameId
          )} comment on discussion callout`
        ),
        TestUser.HUB_ADMIN
      );

      await delay(3000);

      const getEmailsData = await getMailsData();

      // Assert
      expect(getEmailsData[1]).toEqual(2);
    });
  });

  // ToDo: add timeline comments mentions, when implemented
  describe.skip('Aspect comment', () => {
    test('OA mention HM in Opportunity aspect - 1 notification to HM is sent', async () => {
      expect(1).toEqual(1);
    });
  });
});
