import { uniqueId } from '@test/utils/mutations/create-mutation';
import { TestUser } from '@test/utils/token.helper';
import { deleteMailSlurperMails } from '@test/utils/mailslurper.rest.requests';
import { deleteSpaceCodegen } from '@test/functional-api/journey/space/space.request.params';
import { delay } from '@test/utils/delay';
import { users } from '@test/utils/queries/users-data';
import {
  createWhiteboardCalloutOnCollaborationCodegen,
  updateCalloutVisibilityCodegen,
} from '@test/functional-api/callout/callouts.request.params';
import {
  createChallengeWithUsersCodegen,
  createOpportunityWithUsersCodegen,
  createOrgAndSpaceWithUsersCodegen,
} from '@test/utils/data-setup/entities';
import { deleteOrganizationCodegen } from '@test/functional-api/organization/organization.request.params';
import { changePreferenceUserCodegen } from '@test/utils/mutations/preferences-mutation';
import { createWhiteboardOnCalloutCodegen } from '@test/functional-api/callout/call-for-whiteboards/whiteboard-collection-callout.params.request';
import { deleteWhiteboardCodegen } from '@test/functional-api/callout/whiteboard/whiteboard-callout.params.request';
import {
  entitiesId,
  getMailsData,
} from '@test/functional-api/roles/community/communications-helper';
import {
  CalloutType,
  CalloutVisibility,
  UserPreferenceType,
} from '@test/generated/alkemio-schema';

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

  await createOrgAndSpaceWithUsersCodegen(
    organizationName,
    hostNameId,
    spaceName,
    spaceNameId
  );
  await createChallengeWithUsersCodegen(challengeName);
  await createOpportunityWithUsersCodegen(opportunityName);
  const resSpace = await createWhiteboardCalloutOnCollaborationCodegen(
    entitiesId.spaceCollaborationId,
    {
      framing: {
        profile: {
          displayName: 'whiteboard callout space',
          description: 'test',
        },
      },
      type: CalloutType.WhiteboardCollection,
    },
    TestUser.GLOBAL_ADMIN
  );
  whiteboardCollectionSpaceCalloutId =
    resSpace?.data?.createCalloutOnCollaboration.id ?? '';

  await updateCalloutVisibilityCodegen(
    whiteboardCollectionSpaceCalloutId,
    CalloutVisibility.Published
  );

  const resChallenge = await createWhiteboardCalloutOnCollaborationCodegen(
    entitiesId.challengeCollaborationId,
    {
      framing: {
        profile: {
          displayName: 'whiteboard callout challenge',
          description: '',
        },
      },
      type: CalloutType.WhiteboardCollection,
    },
    TestUser.GLOBAL_ADMIN
  );
  whiteboardCollectionChallengeCalloutId =
    resChallenge?.data?.createCalloutOnCollaboration.id ?? '';

  await updateCalloutVisibilityCodegen(
    whiteboardCollectionChallengeCalloutId,
    CalloutVisibility.Published
  );

  const resOpportunity = await createWhiteboardCalloutOnCollaborationCodegen(
    entitiesId.opportunityCollaborationId,
    {
      framing: {
        profile: {
          displayName: 'whiteboard callout opportunity',
          description: 'test',
        },
      },
      type: CalloutType.WhiteboardCollection,
    },
    TestUser.GLOBAL_ADMIN
  );
  whiteboardCollectionOpportunityCalloutId =
    resOpportunity?.data?.createCalloutOnCollaboration.id ?? '';

  await updateCalloutVisibilityCodegen(
    whiteboardCollectionOpportunityCalloutId,
    CalloutVisibility.Published
  );
  await deleteMailSlurperMails();

  preferencesConfig = [
    {
      userID: users.globalAdminId,
      type: UserPreferenceType.NotificationWhiteboardCreated,
    },

    {
      userID: users.spaceMemberId,
      type: UserPreferenceType.NotificationWhiteboardCreated,
    },

    {
      userID: users.challengeMemberId,
      type: UserPreferenceType.NotificationWhiteboardCreated,
    },

    {
      userID: users.opportunityMemberId,
      type: UserPreferenceType.NotificationWhiteboardCreated,
    },

    {
      userID: users.spaceAdminId,
      type: UserPreferenceType.NotificationWhiteboardCreated,
    },

    {
      userID: users.challengeAdminId,
      type: UserPreferenceType.NotificationWhiteboardCreated,
    },

    {
      userID: users.opportunityAdminId,
      type: UserPreferenceType.NotificationWhiteboardCreated,
    },

    {
      userID: users.nonSpaceMemberId,
      type: UserPreferenceType.NotificationWhiteboardCreated,
    },
  ];
});

afterAll(async () => {
  await deleteSpaceCodegen(entitiesId.opportunityId);
  await deleteSpaceCodegen(entitiesId.challengeId);
  await deleteSpaceCodegen(entitiesId.spaceId);
  await deleteOrganizationCodegen(entitiesId.organizationId);
});

describe('Notifications - whiteboard', () => {
  beforeEach(async () => {
    await deleteMailSlurperMails();
  });

  beforeAll(async () => {
    await changePreferenceUserCodegen(
      users.notificationsAdminId,
      UserPreferenceType.NotificationWhiteboardCreated,
      'false'
    );
    preferencesConfig.forEach(
      async config =>
        await changePreferenceUserCodegen(config.userID, config.type, 'true')
    );
    await deleteMailSlurperMails();
  });

  test('GA create space whiteboard - GA(1), HA (2), HM(6) get notifications', async () => {
    const subjectTextAdmin = `${spaceName}: New Whiteboard created by admin`;
    const subjectTextMember = `${spaceName}: New Whiteboard created by admin, have a look!`;

    // Act
    const res = await createWhiteboardOnCalloutCodegen(
      whiteboardCollectionSpaceCalloutId,
      TestUser.GLOBAL_ADMIN
    );
    spaceWhiteboardId =
      res?.data?.createContributionOnCallout?.whiteboard?.id ?? '';
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

    await deleteWhiteboardCodegen(spaceWhiteboardId);
  });

  test('HA create space whiteboard - GA(1), HA (1), HM(6) get notifications', async () => {
    const subjectTextAdmin = `${spaceName}: New Whiteboard created by space`;
    const subjectTextMember = `${spaceName}: New Whiteboard created by space, have a look!`;
    // Act
    const res = await createWhiteboardOnCalloutCodegen(
      whiteboardCollectionSpaceCalloutId,
      TestUser.HUB_ADMIN
    );
    spaceWhiteboardId =
      res?.data?.createContributionOnCallout?.whiteboard?.id ?? '';

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
    const res = await createWhiteboardOnCalloutCodegen(
      whiteboardCollectionChallengeCalloutId,
      TestUser.HUB_ADMIN
    );
    spaceWhiteboardId =
      res?.data?.createContributionOnCallout?.whiteboard?.id ?? '';

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
    const res = await createWhiteboardOnCalloutCodegen(
      whiteboardCollectionOpportunityCalloutId,
      TestUser.OPPORTUNITY_MEMBER
    );
    spaceWhiteboardId =
      res?.data?.createContributionOnCallout?.whiteboard?.id ?? '';

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
        await changePreferenceUserCodegen(config.userID, config.type, 'false')
    );
    // Act
    const res = await createWhiteboardOnCalloutCodegen(
      whiteboardCollectionOpportunityCalloutId,
      TestUser.OPPORTUNITY_ADMIN
    );
    spaceWhiteboardId =
      res?.data?.createContributionOnCallout?.whiteboard?.id ?? '';

    // Assert
    await delay(1500);
    const mails = await getMailsData();

    expect(mails[1]).toEqual(0);
  });
});
