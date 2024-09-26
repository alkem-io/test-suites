/* eslint-disable prettier/prettier */
import { uniqueId } from '@test/utils/mutations/create-mutation';
import { TestUser } from '@test/utils/token.helper';
import { deleteMailSlurperMails } from '@test/utils/mailslurper.rest.requests';
import { deleteSpace } from '@test/functional-api/journey/space/space.request.params';
import { delay } from '@test/utils/delay';
import {
  createCalloutOnCollaborationCodegen,
  deleteCalloutCodegen,
  updateCalloutVisibilityCodegen,
} from '@test/functional-api/callout/callouts.request.params';
import {
  createChallengeWithUsers,
  createOpportunityWithUsers,
  createOrgAndSpaceWithUsers,
} from '@test/utils/data-setup/entities';
import {
  CalloutVisibility,
  UserPreferenceType,
} from '@alkemio/client-lib/dist/types/alkemio-schema';
import { changePreferenceUserCodegen } from '@test/utils/mutations/preferences-mutation';
import { users } from '@test/utils/queries/users-data';
import { entitiesId, getMailsData } from '@test/types/entities-helper';
import { deleteOrganization } from '@test/functional-api/contributor-management/organization/organization.request.params';

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
      userID: users.globalAdmin.id,
      type: UserPreferenceType.NotificationCalloutPublished,
    },

    {
      userID: users.spaceMember.id,
      type: UserPreferenceType.NotificationCalloutPublished,
    },

    {
      userID: users.challengeMember.id,
      type: UserPreferenceType.NotificationCalloutPublished,
    },

    {
      userID: users.opportunityMember.id,
      type: UserPreferenceType.NotificationCalloutPublished,
    },

    {
      userID: users.spaceAdmin.id,
      type: UserPreferenceType.NotificationCalloutPublished,
    },

    {
      userID: users.challengeAdmin.id,
      type: UserPreferenceType.NotificationCalloutPublished,
    },

    {
      userID: users.opportunityAdmin.id,
      type: UserPreferenceType.NotificationCalloutPublished,
    },

    {
      userID: users.nonSpaceMember.id,
      type: UserPreferenceType.NotificationCalloutPublished,
    },
  ];
});

afterAll(async () => {
  await deleteSpace(entitiesId.opportunity.id);
  await deleteSpace(entitiesId.challenge.id);
  await deleteSpace(entitiesId.spaceId);
  await deleteOrganization(entitiesId.organization.id);
});

afterEach(async () => {
  await deleteCallout(calloutId);
});

describe('Notifications - post', () => {
  beforeEach(async () => {
    await deleteMailSlurperMails();

    calloutDisplayName = `call-d-name-${uniqueId}`;
  });

  beforeAll(async () => {
    await changePreferenceUser(
      users.notificationsAdmin.id,
      UserPreferenceType.NotificationCalloutPublished,
      'false'
    );
    await changePreferenceUser(
      users.globalCommunityAdmin.id,
      UserPreferenceType.NotificationCalloutPublished,
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
      entitiesId.space.collaborationId,
      { framing: { profile: { displayName: calloutDisplayName } } },
      TestUser.GLOBAL_ADMIN
    );
    calloutId = res.data?.createCalloutOnCollaboration.id ?? '';

    await updateCalloutVisibility(
      calloutId,
      CalloutVisibility.Published
    );

    await delay(6000);
    const mails = await getMailsData();

    expect(mails[1]).toEqual(7);

    expect(mails[0]).toEqual(
      await templateResult(spaceCalloutSubjectText, users.globalAdmin.email)
    );

    expect(mails[0]).toEqual(
      await templateResult(spaceCalloutSubjectText, users.spaceAdmin.email)
    );
    expect(mails[0]).toEqual(
      await templateResult(spaceCalloutSubjectText, users.spaceMember.email)
    );

    expect(mails[0]).toEqual(
      await templateResult(spaceCalloutSubjectText, users.challengeAdmin.email)
    );
    expect(mails[0]).toEqual(
      await templateResult(spaceCalloutSubjectText, users.challengeMember.email)
    );
    expect(mails[0]).toEqual(
      await templateResult(
        spaceCalloutSubjectText,
        users.opportunityAdmin.email
      )
    );
    expect(mails[0]).toEqual(
      await templateResult(
        spaceCalloutSubjectText,
        users.opportunityMember.email
      )
    );
  });

  test("GA PUBLISH space callout with 'sendNotification':'false' - HM(0) get notifications", async () => {
    // Act
    const res = await createCalloutOnCollaboration(
      entitiesId.space.collaborationId,
      { framing: { profile: { displayName: calloutDisplayName } } },
      TestUser.GLOBAL_ADMIN
    );
    calloutId = res.data?.createCalloutOnCollaboration.id ?? '';

    await updateCalloutVisibility(
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

  // ToDo: fix test
  test.skip('GA create DRAFT -> PUBLISHED -> DRAFT -> PUBLISHED space callout - HM(7) get notifications on PUBLISH event only', async () => {
    // Act
    const res = await createCalloutOnCollaboration(
      entitiesId.space.collaborationId,
      { framing: { profile: { displayName: calloutDisplayName } } },

      TestUser.GLOBAL_ADMIN
    );

    calloutId = res.data?.createCalloutOnCollaboration.id ?? '';
    await delay(1500);
    let mails = await getMailsData();

    expect(mails[1]).toEqual(0);

    await updateCalloutVisibility(
      calloutId,
      CalloutVisibility.Published,
      TestUser.HUB_ADMIN
    );

    await delay(6000);
    mails = await getMailsData();

    expect(mails[1]).toEqual(7);

    await updateCalloutVisibility(
      calloutId,
      CalloutVisibility.Draft,
      TestUser.HUB_ADMIN
    );

    await delay(1500);
    mails = await getMailsData();

    expect(mails[1]).toEqual(7);

    await updateCalloutVisibility(
      calloutId,
      CalloutVisibility.Published,
      TestUser.HUB_ADMIN
    );

    await delay(6000);
    mails = await getMailsData();

    expect(mails[1]).toEqual(14);
  });

  //ToDo: Fix test
  test.skip('HA create PUBLISHED space callout type: POST - HM(7) get notifications', async () => {
    const spaceCalloutSubjectText = `${spaceName} - New post is published &#34;${calloutDisplayName}&#34;, have a look!`;
    // Act
    const res = await createCalloutOnCollaboration(
      entitiesId.space.collaborationId,
      { framing: { profile: { displayName: calloutDisplayName } } },

      TestUser.HUB_ADMIN
    );
    calloutId = res.data?.createCalloutOnCollaboration.id ?? '';

    await updateCalloutVisibility(
      calloutId,
      CalloutVisibility.Published,
      TestUser.HUB_ADMIN
    );

    await delay(6000);
    const mails = await getMailsData();
    expect(mails[1]).toEqual(7);

    expect(mails[0]).toEqual(
      await templateResult(spaceCalloutSubjectText, users.globalAdmin.email)
    );

    expect(mails[0]).toEqual(
      await templateResult(spaceCalloutSubjectText, users.spaceAdmin.email)
    );
    expect(mails[0]).toEqual(
      await templateResult(spaceCalloutSubjectText, users.spaceMember.email)
    );

    expect(mails[0]).toEqual(
      await templateResult(spaceCalloutSubjectText, users.challengeAdmin.email)
    );
    expect(mails[0]).toEqual(
      await templateResult(spaceCalloutSubjectText, users.challengeMember.email)
    );
    expect(mails[0]).toEqual(
      await templateResult(
        spaceCalloutSubjectText,
        users.opportunityAdmin.email
      )
    );
    expect(mails[0]).toEqual(
      await templateResult(
        spaceCalloutSubjectText,
        users.opportunityMember.email
      )
    );
  });

  // Skip until is updated the mechanism for whiteboard callout creation
  test.skip('HA create PUBLISHED space callout type: WHITEBOARD - HM(7) get notifications', async () => {
    const spaceCalloutSubjectText = `${spaceName} - New post is published &#34;${calloutDisplayName}&#34;, have a look!`;
    // Act
    const res = await createCalloutOnCollaboration(
      entitiesId.space.collaborationId,
      { framing: { profile: { displayName: calloutDisplayName } } },

      TestUser.HUB_ADMIN
    );
    calloutId = res.data?.createCalloutOnCollaboration.id ?? '';

    await updateCalloutVisibility(
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
    //       toAddresses: [users.globalAdmin.email],
    //     }),
    //   ])
    // );

    // expect(mails[0]).toEqual(
    //   expect.arrayContaining([
    //     expect.objectContaining({
    //       subject: spaceCalloutSubjectText,
    //       toAddresses: [users.spaceAdmin.email],
    //     }),
    //   ])
    // );
    // expect(mails[0]).toEqual(
    //   expect.arrayContaining([
    //     expect.objectContaining({
    //       subject: spaceCalloutSubjectText,
    //       toAddresses: [users.qaUser.email],
    //     }),
    //   ])
    // );
    // expect(mails[0]).toEqual(
    //   expect.arrayContaining([
    //     expect.objectContaining({
    //       subject: spaceCalloutSubjectText,
    //       toAddresses: [users.spaceMember.email],
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
      entitiesId.challenge.collaborationId,
      { framing: { profile: { displayName: calloutDisplayName } } },
      TestUser.HUB_ADMIN
    );
    calloutId = res.data?.createCalloutOnCollaboration.id ?? '';

    await updateCalloutVisibility(
      calloutId,
      CalloutVisibility.Published,
      TestUser.HUB_ADMIN
    );

    await delay(6000);
    const mails = await getMailsData();

    expect(mails[1]).toEqual(5);

    expect(mails[0]).toEqual(
      await templateResult(calloutSubjectText, users.globalAdmin.email)
    );

    // Don't receive as Space Admin is not member of challenge
    expect(mails[0]).not.toEqual(
      await templateResult(calloutSubjectText, users.spaceAdmin.email)
    );
    // Don't receive as Space Member is not member of challenge
    expect(mails[0]).not.toEqual(
      await templateResult(calloutSubjectText, users.spaceMember.email)
    );

    expect(mails[0]).toEqual(
      await templateResult(calloutSubjectText, users.challengeAdmin.email)
    );
    expect(mails[0]).toEqual(
      await templateResult(calloutSubjectText, users.challengeMember.email)
    );
    expect(mails[0]).toEqual(
      await templateResult(calloutSubjectText, users.opportunityAdmin.email)
    );
    expect(mails[0]).toEqual(
      await templateResult(calloutSubjectText, users.opportunityMember.email)
    );
  });

  test("HA create PUBLISHED challenge callout type: POST with 'sendNotification':'false' - CM(0) get notifications", async () => {
    // Act
    const res = await createCalloutOnCollaboration(
      entitiesId.challenge.collaborationId,
      { framing: { profile: { displayName: calloutDisplayName } } },
      TestUser.HUB_ADMIN
    );
    calloutId = res.data?.createCalloutOnCollaboration.id ?? '';

    await updateCalloutVisibility(
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
    const res = await createCalloutOnCollaboration(
      entitiesId.opportunity.collaborationId,
      { framing: { profile: { displayName: calloutDisplayName } } },
      TestUser.OPPORTUNITY_ADMIN
    );
    calloutId = res.data?.createCalloutOnCollaboration.id ?? '';
    await updateCalloutVisibility(
      calloutId,
      CalloutVisibility.Published,
      TestUser.OPPORTUNITY_ADMIN
    );

    await delay(6000);
    const mails = await getMailsData();

    expect(mails[1]).toEqual(3);

    // GA - 1 mails as opportunity member; as admin - 0
    expect(mails[0]).toEqual(
      await templateResult(calloutSubjectText, users.globalAdmin.email)
    );

    // Don't receive as Space Admin is not member of opportunity
    expect(mails[0]).not.toEqual(
      await templateResult(calloutSubjectText, users.spaceAdmin.email)
    );
    // Don't receive as Space Member is not member of opportunity
    expect(mails[0]).not.toEqual(
      await templateResult(calloutSubjectText, users.spaceMember.email)
    );

    // Don't receive as Challenge Member is not member of opportunity
    expect(mails[0]).not.toEqual(
      await templateResult(calloutSubjectText, users.challengeAdmin.email)
    );

    // Don't receive as Challenge Member is not member of opportunity
    expect(mails[0]).not.toEqual(
      await templateResult(calloutSubjectText, users.challengeMember.email)
    );
    expect(mails[0]).toEqual(
      await templateResult(calloutSubjectText, users.opportunityAdmin.email)
    );
    expect(mails[0]).toEqual(
      await templateResult(calloutSubjectText, users.opportunityMember.email)
    );
  });

  test("OA create PUBLISHED opportunity callout type: POST with 'sendNotification':'false' - OM(0) get notifications", async () => {
    // Act
    const res = await createCalloutOnCollaboration(
      entitiesId.opportunity.collaborationId,
      { framing: { profile: { displayName: calloutDisplayName } } },
      TestUser.OPPORTUNITY_ADMIN
    );
    calloutId = res.data?.createCalloutOnCollaboration.id ?? '';
    await updateCalloutVisibility(
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
        await changePreferenceUser(config.userID, config.type, 'false')
    );
    // Act
    const res = await createCalloutOnCollaboration(
      entitiesId.opportunity.collaborationId,
      { framing: { profile: { displayName: calloutDisplayName } } },
      TestUser.OPPORTUNITY_ADMIN
    );
    calloutId = res.data?.createCalloutOnCollaboration.id ?? '';

    await updateCalloutVisibility(
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
