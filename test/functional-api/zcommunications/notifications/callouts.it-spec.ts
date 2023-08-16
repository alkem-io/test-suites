/* eslint-disable prettier/prettier */
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
  createCalloutOnCollaboration,
  deleteCallout,
  updateCalloutVisibility,
} from '@test/functional-api/integration/callouts/callouts.request.params';
import { CalloutVisibility } from '@test/functional-api/integration/callouts/callouts-enum';
import { users } from '@test/utils/queries/users-data';

const organizationName = 'not-up-org-name' + uniqueId;
const hostNameId = 'not-up-org-nameid' + uniqueId;
const spaceName = 'not-up-eco-name' + uniqueId;
const spaceNameId = 'not-up-eco-nameid' + uniqueId;
const challengeName = `chName${uniqueId}`;
const opportunityName = `opName${uniqueId}`;

let preferencesConfigCallout: any[] = [];

let calloutDisplayName = '';
let calloutDescription = '';
let calloutId = '';

export const templatedAsAdminResult = async (
  entityName: string,
  userEmail: string
) => {
  return expect.arrayContaining([
    expect.objectContaining({
      subject: `[${entityName}] New update shared`,
      toAddresses: [userEmail],
    }),
  ]);
};

const templateResult = async (entityName: string, userEmail: string) => {
  return expect.arrayContaining([
    expect.objectContaining({
      subject: entityName,
      toAddresses: [userEmail],
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

  preferencesConfigCallout = [
    {
      userID: users.globalAdminId,
      type: UserPreferenceType.CALLOUT_PUBLISHED,
    },

    {
      userID: users.spaceMemberId,
      type: UserPreferenceType.CALLOUT_PUBLISHED,
    },

    {
      userID: users.challengeMemberId,
      type: UserPreferenceType.CALLOUT_PUBLISHED,
    },

    {
      userID: users.opportunityMemberId,
      type: UserPreferenceType.CALLOUT_PUBLISHED,
    },

    {
      userID: users.spaceAdminId,
      type: UserPreferenceType.CALLOUT_PUBLISHED,
    },

    {
      userID: users.challengeAdminId,
      type: UserPreferenceType.CALLOUT_PUBLISHED,
    },

    {
      userID: users.opportunityAdminId,
      type: UserPreferenceType.CALLOUT_PUBLISHED,
    },

    {
      userID: users.nonSpaceMemberId,
      type: UserPreferenceType.CALLOUT_PUBLISHED,
    },
  ];
});

afterAll(async () => {
  await removeOpportunity(entitiesId.opportunityId);
  await removeChallenge(entitiesId.challengeId);
  await removeSpace(entitiesId.spaceId);
  await deleteOrganization(entitiesId.organizationId);
});

afterEach(async () => {
  await deleteCallout(calloutId);
});

describe('Notifications - post', () => {
  beforeEach(async () => {
    await deleteMailSlurperMails();

    calloutDisplayName = `call-d-name-${uniqueId}`;
    calloutDescription = `callDescription-${uniqueId}`;
  });

  beforeAll(async () => {
    await changePreferenceUser(
      users.notificationsAdminId,
      UserPreferenceType.CALLOUT_PUBLISHED,
      'false'
    );
    await changePreferenceUser(
      users.globalCommunityAdminId,
      UserPreferenceType.CALLOUT_PUBLISHED,
      'false'
    );

    preferencesConfigCallout.forEach(
      async config =>
        await changePreferenceUser(config.userID, config.type, 'true')
    );
  });
  test('GA PUBLISH space callout - HM(7) get notifications', async () => {
    const spaceCalloutSubjectText = `${spaceName} - New post is published &#34;${calloutDisplayName}&#34;, have a look!`;
    // Act
    const res = await createCalloutOnCollaboration(
      entitiesId.spaceCollaborationId,
      { profile: { displayName: calloutDisplayName } },
      TestUser.GLOBAL_ADMIN
    );
    calloutId = res.body.data.createCalloutOnCollaboration.id;

    await updateCalloutVisibility(calloutId, CalloutVisibility.PUBLISHED);

    await delay(6000);
    const mails = await getMailsData();

    expect(mails[1]).toEqual(7);

    expect(mails[0]).toEqual(
      await templateResult(spaceCalloutSubjectText, users.globalAdminEmail)
    );

    expect(mails[0]).toEqual(
      await templateResult(spaceCalloutSubjectText, users.spaceAdminEmail)
    );
    expect(mails[0]).toEqual(
      await templateResult(spaceCalloutSubjectText, users.spaceMemberEmail)
    );

    expect(mails[0]).toEqual(
      await templateResult(spaceCalloutSubjectText, users.challengeAdminEmail)
    );
    expect(mails[0]).toEqual(
      await templateResult(spaceCalloutSubjectText, users.challengeMemberEmail)
    );
    expect(mails[0]).toEqual(
      await templateResult(spaceCalloutSubjectText, users.opportunityAdminEmail)
    );
    expect(mails[0]).toEqual(
      await templateResult(
        spaceCalloutSubjectText,
        users.opportunityMemberEmail
      )
    );
  });

  test('GA PUBLISH space callout with \'sendNotification\':\'false\' - HM(0) get notifications', async () => {
    // Act
    const res = await createCalloutOnCollaboration(
      entitiesId.spaceCollaborationId,
      { profile: { displayName: calloutDisplayName } },
      TestUser.GLOBAL_ADMIN
    );
    calloutId = res.body.data.createCalloutOnCollaboration.id;

    await updateCalloutVisibility(
      calloutId,
      CalloutVisibility.PUBLISHED,
      TestUser.GLOBAL_ADMIN,
      false
    );

    await delay(6000);
    const mails = await getMailsData();

    // Assert
    expect(mails[1]).toEqual(0);
  });

  test('GA create DRAFT -> PUBLISHED -> DRAFT -> PUBLISHED space callout - HM(7) get notifications on PUBLISH event only', async () => {
    // Act
    const res = await createCalloutOnCollaboration(
      entitiesId.spaceCollaborationId,
      { profile: { displayName: calloutDisplayName } },

      TestUser.GLOBAL_ADMIN
    );

    calloutId = res.body.data.createCalloutOnCollaboration.id;
    await delay(1500);
    let mails = await getMailsData();

    expect(mails[1]).toEqual(0);

    await updateCalloutVisibility(
      calloutId,
      CalloutVisibility.PUBLISHED,
      TestUser.HUB_ADMIN
    );

    await delay(6000);
    mails = await getMailsData();

    expect(mails[1]).toEqual(7);

    await updateCalloutVisibility(
      calloutId,
      CalloutVisibility.DRAFT,
      TestUser.HUB_ADMIN
    );

    await delay(1500);
    mails = await getMailsData();

    expect(mails[1]).toEqual(7);

    await updateCalloutVisibility(
      calloutId,
      CalloutVisibility.PUBLISHED,
      TestUser.HUB_ADMIN
    );

    await delay(6000);
    mails = await getMailsData();

    expect(mails[1]).toEqual(14);
  });

  test('HA create PUBLISHED space callout type: POST - HM(7) get notifications', async () => {
    const spaceCalloutSubjectText = `${spaceName} - New post is published &#34;${calloutDisplayName}&#34;, have a look!`;
    // Act
    const res = await createCalloutOnCollaboration(
      entitiesId.spaceCollaborationId,
      { profile: { displayName: calloutDisplayName } },

      TestUser.HUB_ADMIN
    );
    calloutId = res.body.data.createCalloutOnCollaboration.id;

    await updateCalloutVisibility(
      calloutId,
      CalloutVisibility.PUBLISHED,
      TestUser.HUB_ADMIN
    );

    await delay(6000);
    const mails = await getMailsData();
    expect(mails[1]).toEqual(7);

    expect(mails[0]).toEqual(
      await templateResult(spaceCalloutSubjectText, users.globalAdminEmail)
    );

    expect(mails[0]).toEqual(
      await templateResult(spaceCalloutSubjectText, users.spaceAdminEmail)
    );
    expect(mails[0]).toEqual(
      await templateResult(spaceCalloutSubjectText, users.spaceMemberEmail)
    );

    expect(mails[0]).toEqual(
      await templateResult(spaceCalloutSubjectText, users.challengeAdminEmail)
    );
    expect(mails[0]).toEqual(
      await templateResult(spaceCalloutSubjectText, users.challengeMemberEmail)
    );
    expect(mails[0]).toEqual(
      await templateResult(spaceCalloutSubjectText, users.opportunityAdminEmail)
    );
    expect(mails[0]).toEqual(
      await templateResult(
        spaceCalloutSubjectText,
        users.opportunityMemberEmail
      )
    );
  });

  // Skip until is updated the mechanism for whiteboard callout creation
  test.skip('HA create PUBLISHED space callout type: WHITEBOARD - HM(7) get notifications', async () => {
    const spaceCalloutSubjectText = `${spaceName} - New post is published &#34;${calloutDisplayName}&#34;, have a look!`;
    // Act
    const res = await createCalloutOnCollaboration(
      entitiesId.spaceCollaborationId,
      { profile: { displayName: calloutDisplayName } },

      TestUser.HUB_ADMIN
    );
    calloutId = res.body.data.createCalloutOnCollaboration.id;

    await updateCalloutVisibility(
      calloutId,
      CalloutVisibility.PUBLISHED,
      TestUser.HUB_ADMIN
    );

    await delay(6000);
    const mails = await getMailsData();

    // expect(mails[0]).toEqual(
    //   expect.arrayContaining([
    //     expect.objectContaining({
    //       subject: spaceCalloutSubjectText,
    //       toAddresses: [users.globalAdminEmail],
    //     }),
    //   ])
    // );

    // expect(mails[0]).toEqual(
    //   expect.arrayContaining([
    //     expect.objectContaining({
    //       subject: spaceCalloutSubjectText,
    //       toAddresses: [users.spaceAdminEmail],
    //     }),
    //   ])
    // );
    // expect(mails[0]).toEqual(
    //   expect.arrayContaining([
    //     expect.objectContaining({
    //       subject: spaceCalloutSubjectText,
    //       toAddresses: [users.qaUserEmail],
    //     }),
    //   ])
    // );
    // expect(mails[0]).toEqual(
    //   expect.arrayContaining([
    //     expect.objectContaining({
    //       subject: spaceCalloutSubjectText,
    //       toAddresses: [users.spaceMemberEmail],
    //     }),
    //   ])
    // );

    // expect(mails[0]).toEqual(
    //   expect.arrayContaining([
    //     expect.objectContaining({
    //       subject: spaceCalloutSubjectText,
    //       toAddresses: [`${spaceMemOnly}`],
    //     }),
    //   ])
    // );
    // expect(mails[0]).toEqual(
    //   expect.arrayContaining([
    //     expect.objectContaining({
    //       subject: spaceCalloutSubjectText,
    //       toAddresses: [challengeAndSpaceMemOnly],
    //     }),
    //   ])
    // );
    // expect(mails[0]).toEqual(
    //   expect.arrayContaining([
    //     expect.objectContaining({
    //       subject: spaceCalloutSubjectText,
    //       toAddresses: [opportunityAndChallengeAndSpaceMem],
    //     }),
    //   ])
    // );
    expect(mails[1]).toEqual(7);
  });

  test('HA create PUBLISHED challenge callout type: POST - CM(5) get notifications', async () => {
    const calloutSubjectText = `${challengeName} - New post is published &#34;${calloutDisplayName}&#34;, have a look!`;
    // Act
    const res = await createCalloutOnCollaboration(
      entitiesId.challengeCollaborationId,
      { profile: { displayName: calloutDisplayName } },
      TestUser.HUB_ADMIN
    );
    calloutId = res.body.data.createCalloutOnCollaboration.id;

    await updateCalloutVisibility(
      calloutId,
      CalloutVisibility.PUBLISHED,
      TestUser.HUB_ADMIN
    );

    await delay(6000);
    const mails = await getMailsData();

    expect(mails[1]).toEqual(5);

    expect(mails[0]).toEqual(
      await templateResult(calloutSubjectText, users.globalAdminEmail)
    );

    // Don't receive as Space Admin is not member of challenge
    expect(mails[0]).not.toEqual(
      await templateResult(calloutSubjectText, users.spaceAdminEmail)
    );
    // Don't receive as Space Member is not member of challenge
    expect(mails[0]).not.toEqual(
      await templateResult(calloutSubjectText, users.spaceMemberEmail)
    );

    expect(mails[0]).toEqual(
      await templateResult(calloutSubjectText, users.challengeAdminEmail)
    );
    expect(mails[0]).toEqual(
      await templateResult(calloutSubjectText, users.challengeMemberEmail)
    );
    expect(mails[0]).toEqual(
      await templateResult(calloutSubjectText, users.opportunityAdminEmail)
    );
    expect(mails[0]).toEqual(
      await templateResult(calloutSubjectText, users.opportunityMemberEmail)
    );
  });

  test('HA create PUBLISHED challenge callout type: POST with \'sendNotification\':\'false\' - CM(0) get notifications', async () => {
    // Act
    const res = await createCalloutOnCollaboration(
      entitiesId.challengeCollaborationId,
      { profile: { displayName: calloutDisplayName } },
      TestUser.HUB_ADMIN
    );
    calloutId = res.body.data.createCalloutOnCollaboration.id;

    await updateCalloutVisibility(
      calloutId,
      CalloutVisibility.PUBLISHED,
      TestUser.HUB_ADMIN,
      false
    );

    await delay(6000);
    const mails = await getMailsData();

    // Assert
    expect(mails[1]).toEqual(0);
  });

  test('OA create PUBLISHED opportunity callout type: POST - OM(4) get notifications', async () => {
    const calloutSubjectText = `${opportunityName} - New post is published &#34;${calloutDisplayName}&#34;, have a look!`;
    // Act
    const res = await createCalloutOnCollaboration(
      entitiesId.opportunityCollaborationId,
      { profile: { displayName: calloutDisplayName } },
      TestUser.OPPORTUNITY_ADMIN
    );
    calloutId = res.body.data.createCalloutOnCollaboration.id;
    await updateCalloutVisibility(
      calloutId,
      CalloutVisibility.PUBLISHED,
      TestUser.OPPORTUNITY_ADMIN
    );

    await delay(6000);
    const mails = await getMailsData();

    expect(mails[1]).toEqual(3);

    // GA - 1 mails as opportunity member; as admin - 0
    expect(mails[0]).toEqual(
      await templateResult(calloutSubjectText, users.globalAdminEmail)
    );

    // Don't receive as Space Admin is not member of opportunity
    expect(mails[0]).not.toEqual(
      await templateResult(calloutSubjectText, users.spaceAdminEmail)
    );
    // Don't receive as Space Member is not member of opportunity
    expect(mails[0]).not.toEqual(
      await templateResult(calloutSubjectText, users.spaceMemberEmail)
    );

    // Don't receive as Challenge Member is not member of opportunity
    expect(mails[0]).not.toEqual(
      await templateResult(calloutSubjectText, users.challengeAdminEmail)
    );

    // Don't receive as Challenge Member is not member of opportunity
    expect(mails[0]).not.toEqual(
      await templateResult(calloutSubjectText, users.challengeMemberEmail)
    );
    expect(mails[0]).toEqual(
      await templateResult(calloutSubjectText, users.opportunityAdminEmail)
    );
    expect(mails[0]).toEqual(
      await templateResult(calloutSubjectText, users.opportunityMemberEmail)
    );
  });

  test('OA create PUBLISHED opportunity callout type: POST with \'sendNotification\':\'false\' - OM(0) get notifications', async () => {
    // Act
    const res = await createCalloutOnCollaboration(
      entitiesId.opportunityCollaborationId,
      { profile: { displayName: calloutDisplayName } },
      TestUser.OPPORTUNITY_ADMIN
    );
    calloutId = res.body.data.createCalloutOnCollaboration.id;
    await updateCalloutVisibility(
      calloutId,
      CalloutVisibility.PUBLISHED,
      TestUser.OPPORTUNITY_ADMIN,
      false
    );

    await delay(6000);
    const mails = await getMailsData();

    // Assert
    expect(mails[1]).toEqual(0);
  });

  test('OA create PUBLISHED opportunity callout type: POST - 0 notifications - all roles with notifications disabled', async () => {
    preferencesConfigCallout.forEach(
      async config =>
        await changePreferenceUser(config.userID, config.type, 'false')
    );
    // Act
    const res = await createCalloutOnCollaboration(
      entitiesId.opportunityCollaborationId,
      { profile: { displayName: calloutDisplayName } },
      TestUser.OPPORTUNITY_ADMIN
    );
    calloutId = res.body.data.createCalloutOnCollaboration.id;

    await updateCalloutVisibility(
      calloutId,
      CalloutVisibility.PUBLISHED,
      TestUser.OPPORTUNITY_ADMIN
    );

    // Assert
    await delay(1500);
    const mails = await getMailsData();

    expect(mails[1]).toEqual(0);
  });
});
