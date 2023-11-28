import '../../utils/array.matcher';
import { removeSpace } from '../integration/space/space.request.params';
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
  changePreferenceSpace,
  changePreferenceUser,
  createFeedback,
  SpacePreferenceType,
  UserPreferenceType,
} from '@test/utils/mutations/preferences-mutation';
import { deleteMailSlurperMails } from '@test/utils/mailslurper.rest.requests';
import { removeChallenge } from '../integration/challenge/challenge.request.params';
import {
  createChallengeWithUsersCodegen,
  createOrgAndSpaceWithUsersCodegen,
} from '@test/utils/data-setup/entities';

const challengeName = `chName${uniqueId}`;
const organizationName = 'rev-org-name' + uniqueId;
const hostNameId = 'rev-org-nameid' + uniqueId;
const spaceName = 'rev-eco-name' + uniqueId;
const spaceNameId = 'rev-eco-nameid' + uniqueId;
let preferencesConfig: any[] = [];

beforeAll(async () => {
  await createOrgAndSpaceWithUsersCodegen(
    organizationName,
    hostNameId,
    spaceName,
    spaceNameId
  );
  await createChallengeWithUsersCodegen(challengeName);

  await changePreferenceSpace(
    entitiesId.spaceId,
    SpacePreferenceType.ANONYMOUS_READ_ACCESS,
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
      userID: users.spaceAdminId,
      type: UserPreferenceType.REVIEW_SUBMITTED,
    },
    {
      userID: users.spaceAdminId,
      type: UserPreferenceType.REVIEW_SUBMITTED_ADMIN,
    },
    {
      userID: users.spaceMemberId,
      type: UserPreferenceType.REVIEW_SUBMITTED,
    },
    {
      userID: users.spaceMemberId,
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
      userID: users.nonSpaceMemberId,
      type: UserPreferenceType.REVIEW_SUBMITTED,
    },
    {
      userID: users.nonSpaceMemberId,
      type: UserPreferenceType.REVIEW_SUBMITTED_ADMIN,
    },
  ];
});

afterAll(async () => {
  await removeChallenge(entitiesId.challengeId);
  await removeSpace(entitiesId.spaceId);
  await deleteOrganization(entitiesId.organizationId);
});

// Skipping the suites as the functionallity is enabled to work only with SSI enabled
describe.skip('Perform community review', () => {
  describe('Authorization - DDT user privileges to update space preferences', () => {
    // Arrange

    test.each`
      userRole                   | message
      ${TestUser.GLOBAL_ADMIN}   | ${"Authorization: unable to grant 'community-context-review' privilege: creating feedback on community:"}
      ${TestUser.HUB_ADMIN}      | ${"Authorization: unable to grant 'community-context-review' privilege: creating feedback on community:"}
      ${TestUser.HUB_MEMBER}     | ${"Authorization: unable to grant 'community-context-review' privilege: creating feedback on community:"}
      ${TestUser.QA_USER}        | ${"Authorization: unable to grant 'community-context-review' privilege: creating feedback on community:"}
      ${TestUser.NON_HUB_MEMBER} | ${"Authorization: unable to grant 'community-context-review' privilege: creating feedback on community:"}
    `(
      'User: "$userRole" get message: "$message", whe intend to perform mutation createFeedbackOnCommunityContext on space community',
      async ({ userRole, message }) => {
        // Act
        const updateSpacePref = await createFeedback(
          entitiesId.spaceCommunityId,
          userRole
        );

        // Assert
        expect(updateSpacePref.text).toContain(message);
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
        const updateSpacePref = await createFeedback(
          entitiesId.challengeCommunityId,
          userRole
        );

        // Assert
        expect(updateSpacePref.text).toContain(message);
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
        const updateSpacePref = await createFeedback(
          entitiesId.challengeCommunityId,
          userRole
        );

        // Assert
        expect(updateSpacePref.text).toContain(message);
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
      ${TestUser.GLOBAL_ADMIN} | ${[users.globalAdminIdEmail]} | ${`The member admin alkemio of ${challengeName} submitted a review`} | ${[users.globalAdminIdEmail]} | ${[users.spaceMemberEmail]}
      ${TestUser.HUB_MEMBER}   | ${[users.spaceMemberEmail]}   | ${`The member space member of ${challengeName} submitted a review`}  | ${[users.globalAdminIdEmail]} | ${[users.spaceMemberEmail]}
      ${TestUser.QA_USER}      | ${[users.qaUserEmail]}        | ${`The member qa user of ${challengeName} submitted a review`}       | ${[users.globalAdminIdEmail]} | ${[users.spaceMemberEmail]}
    `(
      'Notifications are send to: "$senderEmail", "$GAEmail" and "$HAEmail", when member: "$role", sends a review',
      async ({
        role,
        senderEmail,
        communityAdminMesssage,
        GAEmail,
        HAEmail,
      }) => {
        const bum = await createFeedback(entitiesId.challengeCommunityId, role);
        await delay(2500);
        const mails = await getMailsData();

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
