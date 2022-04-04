import '../../utils/array.matcher';
import { removeHub } from '../integration/hub/hub.request.params';
import { deleteOrganization } from '../integration/organization/organization.request.params';
import { TestUser } from '@test/utils/token.helper';
import {
  delay,
  entitiesId,
  getMailsData,
  users,
} from './communications-helper';
import { uniqueId } from '@test/utils/mutations/create-mutation';
import {
  changePreferenceHub,
  changePreferenceUser,
  createFeedback,
  HubPreferenceType,
  UserPreferenceType,
} from '@test/utils/mutations/preferences-mutation';
import {
  createChallengeWithUsers,
  createOrgAndHubWithUsers,
} from './create-entities-with-users-helper';
import { deleteMailSlurperMails } from '@test/utils/mailslurper.rest.requests';
import { removeChallenge } from '../integration/challenge/challenge.request.params';

let challengeName = `chName${uniqueId}`;
let organizationName = 'rev-org-name' + uniqueId;
let hostNameId = 'rev-org-nameid' + uniqueId;
let hubName = 'rev-eco-name' + uniqueId;
let hubNameId = 'rev-eco-nameid' + uniqueId;
let preferencesConfig: any[] = [];

beforeAll(async () => {
  await createOrgAndHubWithUsers(
    organizationName,
    hostNameId,
    hubName,
    hubNameId
  );
  await createChallengeWithUsers(challengeName);

  await changePreferenceHub(
    entitiesId.hubId,
    HubPreferenceType.ANONYMOUS_READ_ACCESS,
    'true'
  );

  preferencesConfig = [
    {
      userID: users.globalAdminId,
      type: UserPreferenceType.REVIEW_SUBMITTED,
    },
    {
      userID: users.globalAdminId,
      type: UserPreferenceType.REVIEW_SUBMITTED_ADMIN,
    },
    {
      userID: users.hubAdminId,
      type: UserPreferenceType.REVIEW_SUBMITTED,
    },
    {
      userID: users.hubAdminId,
      type: UserPreferenceType.REVIEW_SUBMITTED_ADMIN,
    },
    {
      userID: users.hubMemberId,
      type: UserPreferenceType.REVIEW_SUBMITTED,
    },
    {
      userID: users.hubMemberId,
      type: UserPreferenceType.REVIEW_SUBMITTED_ADMIN,
    },
    {
      userID: users.qaUserId,
      type: UserPreferenceType.REVIEW_SUBMITTED,
    },
    {
      userID: users.qaUserId,
      type: UserPreferenceType.REVIEW_SUBMITTED_ADMIN,
    },
    {
      userID: users.nonHubMemberId,
      type: UserPreferenceType.REVIEW_SUBMITTED,
    },
    {
      userID: users.nonHubMemberId,
      type: UserPreferenceType.REVIEW_SUBMITTED_ADMIN,
    },
  ];
});

afterAll(async () => {
  await removeChallenge(entitiesId.challengeId);
  await removeHub(entitiesId.hubId);
  await deleteOrganization(entitiesId.organizationId);
});

// Skipping the suites as the functionallity is enabled to work only with SSI enabled
describe.skip('Perform community review', () => {
  describe('Authorization - DDT user privileges to update hub preferences', () => {
    // Arrange

    test.each`
      userRole                   | message
      ${TestUser.GLOBAL_ADMIN}   | ${"Authorization: unable to grant 'community-context-review' privilege: creating feedback on community:"}
      ${TestUser.HUB_ADMIN}      | ${"Authorization: unable to grant 'community-context-review' privilege: creating feedback on community:"}
      ${TestUser.HUB_MEMBER}     | ${"Authorization: unable to grant 'community-context-review' privilege: creating feedback on community:"}
      ${TestUser.QA_USER}        | ${"Authorization: unable to grant 'community-context-review' privilege: creating feedback on community:"}
      ${TestUser.NON_HUB_MEMBER} | ${"Authorization: unable to grant 'community-context-review' privilege: creating feedback on community:"}
    `(
      'User: "$userRole" get message: "$message", whe intend to perform mutation createFeedbackOnCommunityContext on hub community',
      async ({ userRole, message }) => {
        // Act
        let updateHubPref = await createFeedback(
          entitiesId.hubCommunityId,
          userRole
        );

        // Assert
        expect(updateHubPref.text).toContain(message);
      }
    );
  });

  describe('Authorization - DDT perform review on challenge', () => {
    // Arrange

    test.each`
      userRole                   | message
      ${TestUser.GLOBAL_ADMIN}   | ${'true'}
      ${TestUser.HUB_ADMIN}      | ${"Authorization: unable to grant 'community-context-review' privilege: creating feedback on community:"}
      ${TestUser.HUB_MEMBER}     | ${'true'}
      ${TestUser.QA_USER}        | ${'true'}
      ${TestUser.NON_HUB_MEMBER} | ${"Authorization: unable to grant 'community-context-review' privilege: creating feedback on community:"}
    `(
      'User: "$userRole" get message: "$message", whe intend to perform mutation createFeedbackOnCommunityContext on challenge community',
      async ({ userRole, message }) => {
        // Act
        let updateHubPref = await createFeedback(
          entitiesId.challengeCommunityId,
          userRole
        );

        // Assert
        expect(updateHubPref.text).toContain(message);
      }
    );
  });

  describe('Authorization - DDT perform review on opportunity', () => {
    // Arrange

    test.each`
      userRole                   | message
      ${TestUser.GLOBAL_ADMIN}   | ${'true'}
      ${TestUser.HUB_ADMIN}      | ${"Authorization: unable to grant 'community-context-review' privilege: creating feedback on community:"}
      ${TestUser.HUB_MEMBER}     | ${'true'}
      ${TestUser.QA_USER}        | ${'true'}
      ${TestUser.NON_HUB_MEMBER} | ${"Authorization: unable to grant 'community-context-review' privilege: creating feedback on community:"}
    `(
      'User: "$userRole" get message: "$message", whe intend to perform mutation createFeedbackOnCommunityContext on opportunity community',
      async ({ userRole, message }) => {
        // Act
        let updateHubPref = await createFeedback(
          entitiesId.challengeCommunityId,
          userRole
        );

        // Assert
        expect(updateHubPref.text).toContain(message);
      }
    );
  });

  describe('Notifications - reviews', () => {
    beforeAll(async () => {
      preferencesConfig.forEach(
        async config =>
          await changePreferenceUser(config.userID, config.type, 'true')
      );
    });

    beforeEach(async () => {
      await deleteMailSlurperMails();
    });

    afterAll(async () => {
      preferencesConfig.forEach(
        async config =>
          await changePreferenceUser(config.userID, config.type, 'false')
      );
    });
    // Arrange
    test.each`
      role                     | senderEmail                   | communityAdminMesssage                                               | GAEmail                       | HAEmail
      ${TestUser.GLOBAL_ADMIN} | ${[users.globalAdminIdEmail]} | ${`The member admin alkemio of ${challengeName} submitted a review`} | ${[users.globalAdminIdEmail]} | ${[users.hubMemberEmail]}
      ${TestUser.HUB_MEMBER}   | ${[users.hubMemberEmail]}     | ${`The member hub member of ${challengeName} submitted a review`}    | ${[users.globalAdminIdEmail]} | ${[users.hubMemberEmail]}
      ${TestUser.QA_USER}      | ${[users.qaUserEmail]}        | ${`The member qa user of ${challengeName} submitted a review`}       | ${[users.globalAdminIdEmail]} | ${[users.hubMemberEmail]}
    `(
      'Notifications are send to: "$senderEmail", "$GAEmail" and "$HAEmail", when member: "$role", sends a review',
      async ({
        role,
        senderEmail,
        communityAdminMesssage,
        GAEmail,
        HAEmail,
      }) => {
        let bum = await createFeedback(entitiesId.challengeCommunityId, role);
        await delay(2500);
        var mails = await getMailsData();

        expect(mails[0]).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              subject: `You have submitted a review about ${challengeName} community`,
              toAddresses: senderEmail,
            }),
          ])
        );

        expect(mails[0]).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              subject: communityAdminMesssage,
              toAddresses: GAEmail,
            }),
          ])
        );

        expect(mails[0]).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              subject: communityAdminMesssage,
              toAddresses: HAEmail,
            }),
          ])
        );
        expect(mails[1]).toEqual(3);
      }
    );
  });
});
