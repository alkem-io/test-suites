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
  createOrgAndSpaceWithUsers,
} from '../create-entities-with-users-helper';
import { entitiesId, getMailsData } from '../communications-helper';
import { removeOpportunity } from '@test/functional-api/integration/opportunity/opportunity.request.params';
import { removeChallenge } from '@test/functional-api/integration/challenge/challenge.request.params';
import { removeSpace } from '@test/functional-api/integration/space/space.request.params';
import { deleteOrganization } from '@test/functional-api/integration/organization/organization.request.params';
import { delay } from '@test/utils/delay';
import {
  createWhiteboardOnCallout,
  deleteWhiteboard,
} from '@test/functional-api/integration/whiteboard/whiteboard.request.params';
import { users } from '@test/utils/queries/users-data';
import {
  createWhiteboardCalloutOnCollaboration,
  updateCalloutVisibility,
} from '@test/functional-api/integration/callouts/callouts.request.params';
import {
  CalloutType,
  CalloutVisibility,
} from '@test/functional-api/integration/callouts/callouts-enum';

const organizationName = 'not-up-org-name' + uniqueId;
const hostNameId = 'not-up-org-nameid' + uniqueId;
const spaceName = 'not-up-eco-name' + uniqueId;
const spaceNameId = 'not-up-eco-nameid' + uniqueId;
const challengeName = `chName${uniqueId}`;
const opportunityName = `opName${uniqueId}`;
let spaceWhiteboardId = '';
let preferencesConfig: any[] = [];
let whiteboardCollectionSpaceCalloutId = '';

let whiteboardCollectionChallengeCalloutId = '';

let whiteboardCollectionOpportunityCalloutId = '';

const expectedDataFunc = async (subject: string, toAddresses: any[]) => {
  return expect.arrayContaining([
    expect.objectContaining({
      subject,
      toAddresses,
    }),
  ]);
};

beforeAll(async () => {
  await deleteMailSlurperMails();

  await createOrgAndSpaceWithUsers(
    organizationName,
    hostNameId,
    spaceName,
    spaceNameId
  );
  await createChallengeWithUsers(challengeName);
  await createOpportunityWithUsers(opportunityName);
  const resSpace = await createWhiteboardCalloutOnCollaboration(
    entitiesId.spaceCollaborationId,
    {
      profile: { displayName: 'whiteboard callout space' },
      type: CalloutType.WHITEBOARD_COLLECTION,
    },
    TestUser.GLOBAL_ADMIN
  );
  whiteboardCollectionSpaceCalloutId =
    resSpace.body.data.createCalloutOnCollaboration.id;

  await updateCalloutVisibility(
    whiteboardCollectionSpaceCalloutId,
    CalloutVisibility.PUBLISHED
  );

  const resChallenge = await createWhiteboardCalloutOnCollaboration(
    entitiesId.challengeCollaborationId,
    {
      profile: { displayName: 'whiteboard callout challenge' },
      type: CalloutType.WHITEBOARD_COLLECTION,
    },
    TestUser.GLOBAL_ADMIN
  );
  whiteboardCollectionChallengeCalloutId =
    resChallenge.body.data.createCalloutOnCollaboration.id;

  await updateCalloutVisibility(
    whiteboardCollectionChallengeCalloutId,
    CalloutVisibility.PUBLISHED
  );

  const resOpportunity = await createWhiteboardCalloutOnCollaboration(
    entitiesId.opportunityCollaborationId,
    {
      profile: { displayName: 'whiteboard callout opportunity' },
      type: CalloutType.WHITEBOARD_COLLECTION,
    },
    TestUser.GLOBAL_ADMIN
  );
  whiteboardCollectionOpportunityCalloutId =
    resOpportunity.body.data.createCalloutOnCollaboration.id;

  await updateCalloutVisibility(
    whiteboardCollectionOpportunityCalloutId,
    CalloutVisibility.PUBLISHED
  );
  await deleteMailSlurperMails();

  preferencesConfig = [
    {
      userID: users.globalAdminId,
      type: UserPreferenceType.WHITEBOARD_CREATED,
    },

    {
      userID: users.spaceMemberId,
      type: UserPreferenceType.WHITEBOARD_CREATED,
    },

    {
      userID: users.challengeMemberId,
      type: UserPreferenceType.WHITEBOARD_CREATED,
    },

    {
      userID: users.opportunityMemberId,
      type: UserPreferenceType.WHITEBOARD_CREATED,
    },

    {
      userID: users.spaceAdminId,
      type: UserPreferenceType.WHITEBOARD_CREATED,
    },

    {
      userID: users.challengeAdminId,
      type: UserPreferenceType.WHITEBOARD_CREATED,
    },

    {
      userID: users.opportunityAdminId,
      type: UserPreferenceType.WHITEBOARD_CREATED,
    },

    {
      userID: users.nonSpaceMemberId,
      type: UserPreferenceType.WHITEBOARD_CREATED,
    },
  ];
});

afterAll(async () => {
  await removeOpportunity(entitiesId.opportunityId);
  await removeChallenge(entitiesId.challengeId);
  await removeSpace(entitiesId.spaceId);
  await deleteOrganization(entitiesId.organizationId);
});

describe('Notifications - whiteboard', () => {
  let whiteboardDisplayName = '';

  beforeEach(async () => {
    await deleteMailSlurperMails();
    whiteboardDisplayName = `asp-d-name-${uniqueId}`;
  });

  beforeAll(async () => {
    await changePreferenceUser(
      users.notificationsAdminId,
      UserPreferenceType.WHITEBOARD_CREATED,
      'false'
    );
    preferencesConfig.forEach(
      async config =>
        await changePreferenceUser(config.userID, config.type, 'true')
    );
    await deleteMailSlurperMails();
  });

  test('GA create space whiteboard - GA(1), HA (2), HM(6) get notifications', async () => {
    const subjectTextAdmin = `${spaceName}: New Whiteboard created by admin`;
    const subjectTextMember = `${spaceName}: New Whiteboard created by admin, have a look!`;

    // Act
    const res = await createWhiteboardOnCallout(
      whiteboardCollectionSpaceCalloutId,
      whiteboardDisplayName,
      TestUser.GLOBAL_ADMIN
    );
    spaceWhiteboardId = res.body.data.createWhiteboardOnCallout.id;
    await delay(6000);
    const mails = await getMailsData();

    expect(mails[1]).toEqual(9);

    expect(mails[0]).toEqual(
      await expectedDataFunc(subjectTextAdmin, [users.globalAdminEmail])
    );

    expect(mails[0]).toEqual(
      await expectedDataFunc(subjectTextAdmin, [users.spaceAdminEmail])
    );

    expect(mails[0]).toEqual(
      await expectedDataFunc(subjectTextMember, [users.globalAdminEmail])
    );
    expect(mails[0]).toEqual(
      await expectedDataFunc(subjectTextMember, [users.spaceAdminEmail])
    );
    expect(mails[0]).toEqual(
      await expectedDataFunc(subjectTextMember, [users.spaceMemberEmail])
    );

    expect(mails[0]).toEqual(
      await expectedDataFunc(subjectTextMember, [users.challengeAdminEmail])
    );
    expect(mails[0]).toEqual(
      await expectedDataFunc(subjectTextMember, [users.challengeMemberEmail])
    );
    expect(mails[0]).toEqual(
      await expectedDataFunc(subjectTextMember, [users.opportunityAdminEmail])
    );
    expect(mails[0]).toEqual(
      await expectedDataFunc(subjectTextMember, [users.opportunityMemberEmail])
    );

    await deleteWhiteboard(spaceWhiteboardId);
  });

  test('HA create space whiteboard - GA(1), HA (1), HM(6) get notifications', async () => {
    const subjectTextAdmin = `${spaceName}: New Whiteboard created by space`;
    const subjectTextMember = `${spaceName}: New Whiteboard created by space, have a look!`;
    // Act
    const res = await createWhiteboardOnCallout(
      whiteboardCollectionSpaceCalloutId,
      whiteboardDisplayName,
      TestUser.HUB_ADMIN
    );
    spaceWhiteboardId = res.body.data.createWhiteboardOnCallout.id;

    await delay(6000);
    const mails = await getMailsData();

    expect(mails[1]).toEqual(9);

    expect(mails[0]).toEqual(
      await expectedDataFunc(subjectTextAdmin, [users.globalAdminEmail])
    );

    expect(mails[0]).toEqual(
      await expectedDataFunc(subjectTextAdmin, [users.spaceAdminEmail])
    );

    expect(mails[0]).toEqual(
      await expectedDataFunc(subjectTextMember, [users.globalAdminEmail])
    );
    expect(mails[0]).toEqual(
      await expectedDataFunc(subjectTextMember, [users.spaceAdminEmail])
    );
    expect(mails[0]).toEqual(
      await expectedDataFunc(subjectTextMember, [users.spaceMemberEmail])
    );

    expect(mails[0]).toEqual(
      await expectedDataFunc(subjectTextMember, [users.challengeAdminEmail])
    );
    expect(mails[0]).toEqual(
      await expectedDataFunc(subjectTextMember, [users.challengeMemberEmail])
    );
    expect(mails[0]).toEqual(
      await expectedDataFunc(subjectTextMember, [users.opportunityAdminEmail])
    );
    expect(mails[0]).toEqual(
      await expectedDataFunc(subjectTextMember, [users.opportunityMemberEmail])
    );
  });

  test('HA create challenge whiteboard - GA(1), HA (1), CA(1), CM(3),  get notifications', async () => {
    const subjectTextAdmin = `${challengeName}: New Whiteboard created by space`;
    const subjectTextMember = `${challengeName}: New Whiteboard created by space, have a look!`;
    // Act
    const res = await createWhiteboardOnCallout(
      whiteboardCollectionChallengeCalloutId,
      whiteboardDisplayName,
      TestUser.HUB_ADMIN
    );
    spaceWhiteboardId = res.body.data.createWhiteboardOnCallout.id;

    await delay(6000);
    const mails = await getMailsData();

    expect(mails[1]).toEqual(7);

    expect(mails[0]).toEqual(
      await expectedDataFunc(subjectTextAdmin, [users.globalAdminEmail])
    );

    // Space admin does not reacive email as admin message
    expect(mails[0]).not.toEqual(
      await expectedDataFunc(subjectTextAdmin, [users.spaceAdminEmail])
    );

    expect(mails[0]).toEqual(
      await expectedDataFunc(subjectTextMember, [users.globalAdminEmail])
    );

    // Space admin does not reacive email as member message
    expect(mails[0]).not.toEqual(
      await expectedDataFunc(subjectTextMember, [users.spaceAdminEmail])
    );

    // Space member does not reacive email
    expect(mails[0]).not.toEqual(
      await expectedDataFunc(subjectTextMember, [users.spaceMemberEmail])
    );

    expect(mails[0]).toEqual(
      await expectedDataFunc(subjectTextAdmin, [users.challengeAdminEmail])
    );

    expect(mails[0]).toEqual(
      await expectedDataFunc(subjectTextMember, [users.challengeAdminEmail])
    );
    expect(mails[0]).toEqual(
      await expectedDataFunc(subjectTextMember, [users.challengeMemberEmail])
    );
    expect(mails[0]).toEqual(
      await expectedDataFunc(subjectTextMember, [users.opportunityAdminEmail])
    );
    expect(mails[0]).toEqual(
      await expectedDataFunc(subjectTextMember, [users.opportunityMemberEmail])
    );
  });

  test('OM create opportunity whiteboard - HA(2), CA(1), OA(2), OM(4), get notifications', async () => {
    const subjectTextAdmin = `${opportunityName}: New Whiteboard created by opportunity`;
    const subjectTextMember = `${opportunityName}: New Whiteboard created by opportunity, have a look!`;
    // Act
    const res = await createWhiteboardOnCallout(
      whiteboardCollectionOpportunityCalloutId,
      whiteboardDisplayName,
      TestUser.OPPORTUNITY_MEMBER
    );
    spaceWhiteboardId = res.body.data.createWhiteboardOnCallout.id;

    await delay(6000);
    const mails = await getMailsData();

    expect(mails[1]).toEqual(5);

    expect(mails[0]).toEqual(
      await expectedDataFunc(subjectTextAdmin, [users.globalAdminEmail])
    );

    // Space admin does not reacive email as admin message
    expect(mails[0]).not.toEqual(
      await expectedDataFunc(subjectTextAdmin, [users.spaceAdminEmail])
    );

    expect(mails[0]).toEqual(
      await expectedDataFunc(subjectTextMember, [users.globalAdminEmail])
    );

    // Space admin does not reacive email as member message
    expect(mails[0]).not.toEqual(
      await expectedDataFunc(subjectTextMember, [users.spaceAdminEmail])
    );
    // Space member does not reacive email
    expect(mails[0]).not.toEqual(
      await expectedDataFunc(subjectTextMember, [users.spaceMemberEmail])
    );

    // Challenge admin does not reacive email as admin message
    expect(mails[0]).not.toEqual(
      await expectedDataFunc(subjectTextAdmin, [users.challengeAdminEmail])
    );

    // Challenge member does not reacive email
    expect(mails[0]).not.toEqual(
      await expectedDataFunc(subjectTextMember, [users.challengeMemberEmail])
    );

    expect(mails[0]).toEqual(
      await expectedDataFunc(subjectTextAdmin, [users.opportunityAdminEmail])
    );

    expect(mails[0]).toEqual(
      await expectedDataFunc(subjectTextMember, [users.opportunityAdminEmail])
    );
    expect(mails[0]).toEqual(
      await expectedDataFunc(subjectTextMember, [users.opportunityMemberEmail])
    );
  });

  test('OA create opportunity whiteboard - 0 notifications - all roles with notifications disabled', async () => {
    preferencesConfig.forEach(
      async config =>
        await changePreferenceUser(config.userID, config.type, 'false')
    );
    // Act
    const res = await createWhiteboardOnCallout(
      whiteboardCollectionOpportunityCalloutId,
      whiteboardDisplayName,
      TestUser.OPPORTUNITY_ADMIN
    );
    spaceWhiteboardId = res.body.data.createWhiteboardOnCallout.id;

    // Assert
    await delay(1500);
    const mails = await getMailsData();

    expect(mails[1]).toEqual(0);
  });
});
