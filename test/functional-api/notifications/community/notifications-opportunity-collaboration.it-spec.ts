import {
  changePreferenceUserCodegen,
  changePreferenceSpaceCodegen,
} from '@test/utils/mutations/preferences-mutation';
import { uniqueId } from '@test/utils/mutations/create-mutation';
import { deleteMailSlurperMails } from '@test/utils/mailslurper.rest.requests';
import { deleteChallengeCodegen } from '@test/functional-api/journey/challenge/challenge.request.params';
import { deleteSpaceCodegen } from '@test/functional-api/journey/space/space.request.params';
import { delay } from '@test/utils/delay';
import { TestUser } from '@test/utils';
import { deleteOpportunityCodegen } from '@test/functional-api/journey/opportunity/opportunity.request.params';
import {
  createRelationCodegen,
  deleteRelationCodegen,
} from '@test/functional-api/relations/relations.request.params';
import { users } from '@test/utils/queries/users-data';
import {
  createChallengeWithUsersCodegen,
  createOpportunityForChallengeCodegen,
  createOrgAndSpaceWithUsersCodegen,
} from '@test/utils/data-setup/entities';
import { deleteOrganizationCodegen } from '@test/functional-api/organization/organization.request.params';
import { SpacePreferenceType, UserPreferenceType } from '@alkemio/client-lib';
import {
  entitiesId,
  getMailsData,
} from '@test/functional-api/roles/community/communications-helper';

const organizationName = `test org name ${uniqueId}`;
const hostNameId = `test-org-${uniqueId}`;
const spaceName = `test space ${uniqueId}`;
const spaceNameId = `test-space-${uniqueId}`;
const challengeName = `test challenge ${uniqueId}`;
const opportunityName = `test opportunity ${uniqueId}`;
const relationType = 'incoming';
const relationDescription = `relation description ${uniqueId}`;
const relationActorName = `relation actor name ${uniqueId}`;
const relationActorType = `relationActorType-${uniqueId}`;
const relationActorRole = `relationActorRole-${uniqueId}`;
const subjectUser = ' - Your interest to collaborate was received!';
let preferencesConfig: any[] = [];
let relationId = '';

beforeAll(async () => {
  // Space:
  //  Members:users.spaceAdminId, users.spaceMemberId, users.qaUserId
  //  Admins: users.spaceAdminId
  await createOrgAndSpaceWithUsersCodegen(
    organizationName,
    hostNameId,
    spaceName,
    spaceNameId
  );
  // Challenge:
  //  Members: users.spaceMemberId, users.qaUserId
  //  Admins: users.spaceMemberId
  await createChallengeWithUsersCodegen(challengeName);
  // Opportunity:
  //  Members: users.qaUserId
  //  Admins: users.qaUserId
  await createOpportunityForChallengeCodegen(opportunityName);

  await changePreferenceUserCodegen(
    users.globalAdminId,
    UserPreferenceType.NotificationCommunityCollaborationInterestAdmin,
    'false'
  );
  await changePreferenceSpaceCodegen(
    entitiesId.spaceId,
    SpacePreferenceType.AuthorizationAnonymousReadAccess,
    'false'
  );
  preferencesConfig = [
    {
      userID: users.spaceMemberId,
      type: UserPreferenceType.NotificationCommunityCollaborationInterestUser,
    },
    {
      userID: users.nonSpaceMemberEmail,
      type: UserPreferenceType.NotificationCommunityCollaborationInterestUser,
    },
    {
      userID: users.challengeMemberEmail,
      type: UserPreferenceType.NotificationCommunityCollaborationInterestUser,
    },
    {
      userID: users.opportunityAdminEmail,
      type: UserPreferenceType.NotificationCommunityCollaborationInterestAdmin,
    },
  ];
});

afterAll(async () => {
  await deleteOpportunityCodegen(entitiesId.opportunityId);
  await deleteChallengeCodegen(entitiesId.challengeId);
  await deleteSpaceCodegen(entitiesId.spaceId);
  await deleteOrganizationCodegen(entitiesId.organizationId);
});

beforeEach(async () => {
  await deleteMailSlurperMails();
});

afterEach(async () => {
  await deleteRelationCodegen(relationId);
});

// skipped as the feature is disabled
describe.skip('Preferences enabled for Admin and User interested', () => {
  beforeAll(async () => {
    for (const config of preferencesConfig) {
      await changePreferenceUserCodegen(config.userID, config.type, 'true');
    }
  });

  test('User member of a Space registers interest in collaboration on Opp (child of Challenge / child of Space)- Opp admin gets notification, User gets notification', async () => {
    // Act
    const createRelationResponse = await createRelationCodegen(
      entitiesId.opportunityCollaborationId,
      relationType,
      relationDescription,
      relationActorName,
      relationActorType,
      relationActorRole,
      TestUser.HUB_MEMBER
    );
    relationId =
      createRelationResponse?.data?.createRelationOnCollaboration.id ?? '';
    await delay(6000);

    const getEmailsData = await getMailsData();
    // Assert
    expect(getEmailsData[1]).toEqual(2);
    expect(getEmailsData[0]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          subject: `[${opportunityName}] Interest to collaborate received from space member`,
          toAddresses: [users.opportunityAdminEmail],
        }),
        expect.objectContaining({
          subject: 'space member' + subjectUser,
          toAddresses: [users.spaceMemberEmail],
        }),
      ])
    );
  });

  test('User member of a Challenge registers interest in collaboration on Opp - Opp admin gets notification, User gets notification', async () => {
    // Act
    const createRelationResponse = await createRelationCodegen(
      entitiesId.opportunityCollaborationId,
      relationType,
      relationDescription,
      relationActorName,
      relationActorType,
      relationActorRole,
      TestUser.CHALLENGE_MEMBER
    );

    relationId =
      createRelationResponse?.data?.createRelationOnCollaboration.id ?? '';
    await delay(6000);

    const getEmailsData = await getMailsData();
    // Assert
    expect(getEmailsData[1]).toEqual(2);
    expect(getEmailsData[0]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          subject: `[${opportunityName}] Interest to collaborate received from space member`,
          toAddresses: [users.opportunityAdminEmail],
        }),
        expect.objectContaining({
          subject: 'challenge member' + subjectUser,
          toAddresses: [users.challengeMemberEmail],
        }),
      ])
    );
  });

  test('User NOT member of a Space register interest in collaboration on Opp (child of Challenge / child of Space) - Opp admin get notification, User gets notification', async () => {
    await changePreferenceSpaceCodegen(
      entitiesId.spaceId,
      SpacePreferenceType.AuthorizationAnonymousReadAccess,
      'true'
    );
    // Act
    const createRelationResponse = await createRelationCodegen(
      entitiesId.opportunityCollaborationId,
      relationType,
      relationDescription,
      relationActorName,
      relationActorType,
      relationActorRole,
      TestUser.NON_HUB_MEMBER
    );

    relationId =
      createRelationResponse?.data?.createRelationOnCollaboration.id ?? '';
    await delay(6000);

    const getEmailsData = await getMailsData();
    // Assert
    expect(getEmailsData[1]).toEqual(2);
    expect(getEmailsData[0]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          subject: `[${opportunityName}] Interest to collaborate received from non space`,
          toAddresses: [users.opportunityAdminEmail],
        }),
        expect.objectContaining({
          subject: 'non space' + subjectUser,
          toAddresses: [users.nonSpaceMemberEmail],
        }),
      ])
    );
  });
  test('NOT REGISTERED user of a Space registers interest in collaboration on Opp (child of Challenge / child of Space) - error is thrown: user not registered, no notifications', async () => {
    await changePreferenceSpaceCodegen(
      entitiesId.spaceId,
      SpacePreferenceType.AuthorizationAnonymousReadAccess,
      'true'
    );
    // Act
    const createRelationResponse = await createRelationCodegen(
      entitiesId.opportunityCollaborationId,
      relationType,
      relationDescription,
      relationActorName,
      relationActorType,
      relationActorRole
    );

    await delay(6000);
    const getEmailsData = await getMailsData();
    // Assert
    expect(createRelationResponse.error?.errors[0].message).toContain(
      `Authorization: unable to grant 'create' privilege: create relation on collaboration: ${entitiesId.opportunityCollaborationId}`
    );
    expect(getEmailsData[1]).toEqual(0);
  });
});

describe('Preferences disabled for Community Admin and User interested', () => {
  beforeEach(async () => {
    await changePreferenceSpaceCodegen(
      entitiesId.spaceId,
      SpacePreferenceType.AuthorizationAnonymousReadAccess,
      'false'
    );
    for (const config of preferencesConfig) {
      await changePreferenceUserCodegen(config.userID, config.type, 'false');
    }
  });
  test('User member of a Challenge registers interest in collaboration on Opp - no one gets notifications', async () => {
    // Act
    const createRelationResponse = await createRelationCodegen(
      entitiesId.opportunityCollaborationId,
      relationType,
      relationDescription,
      relationActorName,
      relationActorType,
      relationActorRole,
      TestUser.CHALLENGE_MEMBER
    );

    relationId =
      createRelationResponse?.data?.createRelationOnCollaboration.id ?? '';
    await delay(6000);

    const getEmailsData = await getMailsData();
    // Assert
    expect(getEmailsData[1]).toEqual(0);
  });
});
