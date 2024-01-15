/* eslint-disable prettier/prettier */
import { uniqueId } from '@test/utils/mutations/create-mutation';
import { TestUser } from '@test/utils/token.helper';
import { deleteMailSlurperMails } from '@test/utils/mailslurper.rest.requests';
import { entitiesId, getMailsData } from '@test/functional-api/zcommunications/communications-helper';
import { deleteOpportunityCodegen } from '@test/functional-api/integration/opportunity/opportunity.request.params';
import { deleteChallengeCodegen } from '@test/functional-api/integration/challenge/challenge.request.params';
import { deleteSpaceCodegen } from '@test/functional-api/integration/space/space.request.params';
import { delay } from '@test/utils/delay';
import {
  createCalloutOnCollaborationCodegen,
  deleteCalloutCodegen,
  updateCalloutVisibilityCodegen,
} from '@test/functional-api/integration/callouts/callouts.request.params';
import { users } from '@test/utils/queries/users-data';
import {
  createChallengeWithUsersCodegen,
  createOpportunityWithUsersCodegen,
  createOrgAndSpaceWithUsersCodegen,
} from '@test/utils/data-setup/entities';
import { deleteOrganizationCodegen } from '@test/functional-api/organization/organization.request.params';
import { CalloutVisibility, UserPreferenceType } from '@alkemio/client-lib/dist/types/alkemio-schema';
import { changePreferenceUserCodegen } from '@test/utils/mutations/preferences-mutation';

const organizationName = 'not-up-org-name' + uniqueId;
const hostNameId = 'not-up-org-nameid' + uniqueId;
const spaceName = 'not-up-eco-name' + uniqueId;
const spaceNameId = 'not-up-eco-nameid' + uniqueId;
const challengeName = `chName${uniqueId}`;
const opportunityName = `opName${uniqueId}`;

let preferencesConfigCallout: any[] = [];

let calloutDisplayName = '';
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

  await createOrgAndSpaceWithUsersCodegen(
    organizationName,
    hostNameId,
    spaceName,
    spaceNameId
  );
  await createChallengeWithUsersCodegen(challengeName);
  await createOpportunityWithUsersCodegen(opportunityName);

  preferencesConfigCallout = [
    {
      userID: users.globalAdminId,
      type: UserPreferenceType.NotificationCalloutPublished,
    },

    {
      userID: users.spaceMemberId,
      type: UserPreferenceType.NotificationCalloutPublished,
    },

    {
      userID: users.challengeMemberId,
      type: UserPreferenceType.NotificationCalloutPublished,
    },

    {
      userID: users.opportunityMemberId,
      type: UserPreferenceType.NotificationCalloutPublished,
    },

    {
      userID: users.spaceAdminId,
      type: UserPreferenceType.NotificationCalloutPublished,
    },

    {
      userID: users.challengeAdminId,
      type: UserPreferenceType.NotificationCalloutPublished,
    },

    {
      userID: users.opportunityAdminId,
      type: UserPreferenceType.NotificationCalloutPublished,
    },

    {
      userID: users.nonSpaceMemberId,
      type: UserPreferenceType.NotificationCalloutPublished,
    },
  ];
});

afterAll(async () => {
  await deleteOpportunityCodegen(entitiesId.opportunityId);
  await deleteChallengeCodegen(entitiesId.challengeId);
  await deleteSpaceCodegen(entitiesId.spaceId);
  await deleteOrganizationCodegen(entitiesId.organizationId);
});

afterEach(async () => {
  await deleteCalloutCodegen(calloutId);
});

describe('Notifications - post', () => {
  beforeEach(async () => {
    await deleteMailSlurperMails();

    calloutDisplayName = `call-d-name-${uniqueId}`;
  });

  beforeAll(async () => {
    await changePreferenceUserCodegen(
      users.notificationsAdminId,
      UserPreferenceType.NotificationCalloutPublished,
      'false'
    );
    await changePreferenceUserCodegen(
      users.globalCommunityAdminId,
      UserPreferenceType.NotificationCalloutPublished,
      'false'
    );

    preferencesConfigCallout.forEach(
      async config =>
        await changePreferenceUserCodegen(config.userID, config.type, 'true')
    );
  });
  test('GA PUBLISH space callout - HM(7) get notifications', async () => {
    const spaceCalloutSubjectText = `${spaceName} - New post is published &#34;${calloutDisplayName}&#34;, have a look!`;
    // Act
    const res = await createCalloutOnCollaborationCodegen(
      entitiesId.spaceCollaborationId,
      { framing: { profile: { displayName: calloutDisplayName } } },
      TestUser.GLOBAL_ADMIN
    );
    calloutId = res.data?.createCalloutOnCollaboration.id ?? '';

    await updateCalloutVisibilityCodegen(
      calloutId,
      CalloutVisibility.Published
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

  test("GA PUBLISH space callout with 'sendNotification':'false' - HM(0) get notifications", async () => {
    // Act
    const res = await createCalloutOnCollaborationCodegen(
      entitiesId.spaceCollaborationId,
      { framing: { profile: { displayName: calloutDisplayName } } },
      TestUser.GLOBAL_ADMIN
    );
    calloutId = res.data?.createCalloutOnCollaboration.id ?? '';

    await updateCalloutVisibilityCodegen(
      calloutId,
      CalloutVisibility.Published,
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
    const res = await createCalloutOnCollaborationCodegen(
      entitiesId.spaceCollaborationId,
      { framing: { profile: { displayName: calloutDisplayName } } },

      TestUser.GLOBAL_ADMIN
    );

    calloutId = res.data?.createCalloutOnCollaboration.id ?? '';
    await delay(1500);
    let mails = await getMailsData();

    expect(mails[1]).toEqual(0);

    await updateCalloutVisibilityCodegen(
      calloutId,
      CalloutVisibility.Published,
      TestUser.HUB_ADMIN
    );

    await delay(6000);
    mails = await getMailsData();

    expect(mails[1]).toEqual(7);

    await updateCalloutVisibilityCodegen(
      calloutId,
      CalloutVisibility.Draft,
      TestUser.HUB_ADMIN
    );

    await delay(1500);
    mails = await getMailsData();

    expect(mails[1]).toEqual(7);

    await updateCalloutVisibilityCodegen(
      calloutId,
      CalloutVisibility.Published,
      TestUser.HUB_ADMIN
    );

    await delay(6000);
    mails = await getMailsData();

    expect(mails[1]).toEqual(14);
  });

  test('HA create PUBLISHED space callout type: POST - HM(7) get notifications', async () => {
    const spaceCalloutSubjectText = `${spaceName} - New post is published &#34;${calloutDisplayName}&#34;, have a look!`;
    // Act
    const res = await createCalloutOnCollaborationCodegen(
      entitiesId.spaceCollaborationId,
      { framing: { profile: { displayName: calloutDisplayName } } },

      TestUser.HUB_ADMIN
    );
    calloutId = res.data?.createCalloutOnCollaboration.id ?? '';

    await updateCalloutVisibilityCodegen(
      calloutId,
      CalloutVisibility.Published,
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
    const res = await createCalloutOnCollaborationCodegen(
      entitiesId.spaceCollaborationId,
      { framing: { profile: { displayName: calloutDisplayName } } },

      TestUser.HUB_ADMIN
    );
    calloutId = res.data?.createCalloutOnCollaboration.id ?? '';

    await updateCalloutVisibilityCodegen(
      calloutId,
      CalloutVisibility.Published,
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
    const res = await createCalloutOnCollaborationCodegen(
      entitiesId.challengeCollaborationId,
      { framing: { profile: { displayName: calloutDisplayName } } },
      TestUser.HUB_ADMIN
    );
    calloutId = res.data?.createCalloutOnCollaboration.id ?? '';

    await updateCalloutVisibilityCodegen(
      calloutId,
      CalloutVisibility.Published,
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

  test("HA create PUBLISHED challenge callout type: POST with 'sendNotification':'false' - CM(0) get notifications", async () => {
    // Act
    const res = await createCalloutOnCollaborationCodegen(
      entitiesId.challengeCollaborationId,
      { framing: { profile: { displayName: calloutDisplayName } } },
      TestUser.HUB_ADMIN
    );
    calloutId = res.data?.createCalloutOnCollaboration.id ?? '';

    await updateCalloutVisibilityCodegen(
      calloutId,
      CalloutVisibility.Published,
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
    const res = await createCalloutOnCollaborationCodegen(
      entitiesId.opportunityCollaborationId,
      { framing: { profile: { displayName: calloutDisplayName } } },
      TestUser.OPPORTUNITY_ADMIN
    );
    calloutId = res.data?.createCalloutOnCollaboration.id ?? '';
    await updateCalloutVisibilityCodegen(
      calloutId,
      CalloutVisibility.Published,
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

  test("OA create PUBLISHED opportunity callout type: POST with 'sendNotification':'false' - OM(0) get notifications", async () => {
    // Act
    const res = await createCalloutOnCollaborationCodegen(
      entitiesId.opportunityCollaborationId,
      { framing: { profile: { displayName: calloutDisplayName } } },
      TestUser.OPPORTUNITY_ADMIN
    );
    calloutId = res.data?.createCalloutOnCollaboration.id ?? '';
    await updateCalloutVisibilityCodegen(
      calloutId,
      CalloutVisibility.Published,
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
        await changePreferenceUserCodegen(config.userID, config.type, 'false')
    );
    // Act
    const res = await createCalloutOnCollaborationCodegen(
      entitiesId.opportunityCollaborationId,
      { framing: { profile: { displayName: calloutDisplayName } } },
      TestUser.OPPORTUNITY_ADMIN
    );
    calloutId = res.data?.createCalloutOnCollaboration.id ?? '';

    await updateCalloutVisibilityCodegen(
      calloutId,
      CalloutVisibility.Published,
      TestUser.OPPORTUNITY_ADMIN
    );

    // Assert
    await delay(1500);
    const mails = await getMailsData();

    expect(mails[1]).toEqual(0);
  });
});
