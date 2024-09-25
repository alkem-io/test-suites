import { uniqueId } from '@test/utils/mutations/create-mutation';
import { TestUser } from '@test/utils/token.helper';
import { deleteMailSlurperMails } from '@test/utils/mailslurper.rest.requests';
import { deleteSpace } from '@test/functional-api/journey/space/space.request.params';
import { delay } from '@test/utils/delay';
import { users } from '@test/utils/queries/users-data';
import {
  createWhiteboardCalloutOnCollaborationCodegen,
  updateCalloutVisibilityCodegen,
} from '@test/functional-api/callout/callouts.request.params';
import {
  createChallengeWithUsers,
  createOpportunityWithUsers,
  createOrgAndSpaceWithUsers,
} from '@test/utils/data-setup/entities';
import { changePreferenceUserCodegen } from '@test/utils/mutations/preferences-mutation';
import { createWhiteboardOnCalloutCodegen } from '@test/functional-api/callout/call-for-whiteboards/whiteboard-collection-callout.params.request';
import { deleteWhiteboardCodegen } from '@test/functional-api/callout/whiteboard/whiteboard-callout.params.request';

import {
  CalloutType,
  CalloutVisibility,
  UserPreferenceType,
} from '@test/generated/alkemio-schema';
import { entitiesId, getMailsData } from '@test/types/entities-helper';
import { deleteOrganization } from '@test/functional-api/contributor-management/organization/organization.request.params';

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
  const resSpace = await createWhiteboardCalloutOnCollaborationCodegen(
    entitiesId.space.collaborationId,
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
    entitiesId.challenge.collaborationId,
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
    entitiesId.opportunity.collaborationId,
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
      userID: users.globalAdmin.id,
      type: UserPreferenceType.NotificationWhiteboardCreated,
    },

    {
      userID: users.spaceMember.id,
      type: UserPreferenceType.NotificationWhiteboardCreated,
    },

    {
      userID: users.challengeMember.id,
      type: UserPreferenceType.NotificationWhiteboardCreated,
    },

    {
      userID: users.opportunityMember.id,
      type: UserPreferenceType.NotificationWhiteboardCreated,
    },

    {
      userID: users.spaceAdmin.id,
      type: UserPreferenceType.NotificationWhiteboardCreated,
    },

    {
      userID: users.challengeAdmin.id,
      type: UserPreferenceType.NotificationWhiteboardCreated,
    },

    {
      userID: users.opportunityAdmin.id,
      type: UserPreferenceType.NotificationWhiteboardCreated,
    },

    {
      userID: users.nonSpaceMember.id,
      type: UserPreferenceType.NotificationWhiteboardCreated,
    },
  ];
});

afterAll(async () => {
  await deleteSpace(entitiesId.opportunity.id);
  await deleteSpace(entitiesId.challenge.id);
  await deleteSpace(entitiesId.spaceId);
  await deleteOrganization(entitiesId.organization.id);
});

describe('Notifications - whiteboard', () => {
  beforeEach(async () => {
    await deleteMailSlurperMails();
  });

  beforeAll(async () => {
    await changePreferenceUserCodegen(
      users.notificationsAdmin.id,
      UserPreferenceType.NotificationWhiteboardCreated,
      'false'
    );
    preferencesConfig.forEach(
      async config =>
        await changePreferenceUserCodegen(config.userID, config.type, 'true')
    );
    await deleteMailSlurperMails();
  });

  // ToDo: fix test
  test.skip('GA create space whiteboard - GA(1), HA (2), HM(6) get notifications', async () => {
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
      await expectedDataFunc(subjectTextAdmin, [users.globalAdmin.email])
    );

    expect(mails[0]).toEqual(
      await expectedDataFunc(subjectTextAdmin, [users.spaceAdmin.email])
    );

    expect(mails[0]).toEqual(
      await expectedDataFunc(subjectTextMember, [users.globalAdmin.email])
    );
    expect(mails[0]).toEqual(
      await expectedDataFunc(subjectTextMember, [users.spaceAdmin.email])
    );
    expect(mails[0]).toEqual(
      await expectedDataFunc(subjectTextMember, [users.spaceMember.email])
    );

    expect(mails[0]).toEqual(
      await expectedDataFunc(subjectTextMember, [users.challengeAdmin.email])
    );
    expect(mails[0]).toEqual(
      await expectedDataFunc(subjectTextMember, [users.challengeMember.email])
    );
    expect(mails[0]).toEqual(
      await expectedDataFunc(subjectTextMember, [users.opportunityAdmin.email])
    );
    expect(mails[0]).toEqual(
      await expectedDataFunc(subjectTextMember, [users.opportunityMember.email])
    );

    await deleteWhiteboardCodegen(spaceWhiteboardId);
  });

  // ToDo: fix test
  test.skip('HA create space whiteboard - GA(1), HA (1), HM(6) get notifications', async () => {
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
      await expectedDataFunc(subjectTextAdmin, [users.globalAdmin.email])
    );

    expect(mails[0]).toEqual(
      await expectedDataFunc(subjectTextAdmin, [users.spaceAdmin.email])
    );

    expect(mails[0]).toEqual(
      await expectedDataFunc(subjectTextMember, [users.globalAdmin.email])
    );
    expect(mails[0]).toEqual(
      await expectedDataFunc(subjectTextMember, [users.spaceAdmin.email])
    );
    expect(mails[0]).toEqual(
      await expectedDataFunc(subjectTextMember, [users.spaceMember.email])
    );

    expect(mails[0]).toEqual(
      await expectedDataFunc(subjectTextMember, [users.challengeAdmin.email])
    );
    expect(mails[0]).toEqual(
      await expectedDataFunc(subjectTextMember, [users.challengeMember.email])
    );
    expect(mails[0]).toEqual(
      await expectedDataFunc(subjectTextMember, [users.opportunityAdmin.email])
    );
    expect(mails[0]).toEqual(
      await expectedDataFunc(subjectTextMember, [users.opportunityMember.email])
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
      await expectedDataFunc(subjectTextAdmin, [users.globalAdmin.email])
    );

    // Space admin does not reacive email as admin message
    expect(mails[0]).not.toEqual(
      await expectedDataFunc(subjectTextAdmin, [users.spaceAdmin.email])
    );

    expect(mails[0]).toEqual(
      await expectedDataFunc(subjectTextMember, [users.globalAdmin.email])
    );

    // Space admin does not reacive email as member message
    expect(mails[0]).not.toEqual(
      await expectedDataFunc(subjectTextMember, [users.spaceAdmin.email])
    );

    // Space member does not reacive email
    expect(mails[0]).not.toEqual(
      await expectedDataFunc(subjectTextMember, [users.spaceMember.email])
    );

    expect(mails[0]).toEqual(
      await expectedDataFunc(subjectTextAdmin, [users.challengeAdmin.email])
    );

    expect(mails[0]).toEqual(
      await expectedDataFunc(subjectTextMember, [users.challengeAdmin.email])
    );
    expect(mails[0]).toEqual(
      await expectedDataFunc(subjectTextMember, [users.challengeMember.email])
    );
    expect(mails[0]).toEqual(
      await expectedDataFunc(subjectTextMember, [users.opportunityAdmin.email])
    );
    expect(mails[0]).toEqual(
      await expectedDataFunc(subjectTextMember, [users.opportunityMember.email])
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
      await expectedDataFunc(subjectTextAdmin, [users.globalAdmin.email])
    );

    // Space admin does not reacive email as admin message
    expect(mails[0]).not.toEqual(
      await expectedDataFunc(subjectTextAdmin, [users.spaceAdmin.email])
    );

    expect(mails[0]).toEqual(
      await expectedDataFunc(subjectTextMember, [users.globalAdmin.email])
    );

    // Space admin does not reacive email as member message
    expect(mails[0]).not.toEqual(
      await expectedDataFunc(subjectTextMember, [users.spaceAdmin.email])
    );
    // Space member does not reacive email
    expect(mails[0]).not.toEqual(
      await expectedDataFunc(subjectTextMember, [users.spaceMember.email])
    );

    // Challenge admin does not reacive email as admin message
    expect(mails[0]).not.toEqual(
      await expectedDataFunc(subjectTextAdmin, [users.challengeAdmin.email])
    );

    // Challenge member does not reacive email
    expect(mails[0]).not.toEqual(
      await expectedDataFunc(subjectTextMember, [users.challengeMember.email])
    );

    expect(mails[0]).toEqual(
      await expectedDataFunc(subjectTextAdmin, [users.opportunityAdmin.email])
    );

    expect(mails[0]).toEqual(
      await expectedDataFunc(subjectTextMember, [users.opportunityAdmin.email])
    );
    expect(mails[0]).toEqual(
      await expectedDataFunc(subjectTextMember, [users.opportunityMember.email])
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
