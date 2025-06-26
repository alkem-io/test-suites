/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  deleteMailSlurperMails,
  getMailsData,
  TestScenarioConfig,
  TestScenarioFactory,
  TestUserManager,
  UniqueIDGenerator,
} from '@alkemio/tests-lib';
import { TestUser } from '@alkemio/tests-lib';
import { delay } from '@alkemio/tests-lib';
import {
  CalloutVisibility,
  PreferenceType,
} from '@alkemio/tests-lib/core/generated/alkemio-schema';
import { OrganizationWithSpaceModel } from '@alkemio/tests-lib/scenario/models/OrganizationWithSpaceModel';
import {
  createCalloutOnCalloutsSet,
  deleteCallout,
  updateCalloutVisibility,
} from '@functional-api/callout/callouts.request.params';
import { changePreferenceUser } from '@functional-api/contributor-management/user/user-preferences-mutation';

const uniqueId = UniqueIDGenerator.getID();
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

let baseScenario: OrganizationWithSpaceModel;
const scenarioConfig: TestScenarioConfig = {
  name: 'callouts-notifications',
  space: {
    community: {
      admins: [TestUser.SPACE_ADMIN],
      members: [
        TestUser.SPACE_MEMBER,
        TestUser.SPACE_ADMIN,
        TestUser.SUBSPACE_MEMBER,
        TestUser.SUBSPACE_ADMIN,
        TestUser.SUBSUBSPACE_MEMBER,
        TestUser.SUBSUBSPACE_ADMIN,
      ],
    },
    subspace: {
      community: {
        admins: [TestUser.SUBSPACE_ADMIN],
        members: [
          TestUser.SUBSPACE_MEMBER,
          TestUser.SUBSPACE_ADMIN,
          TestUser.SUBSUBSPACE_MEMBER,
          TestUser.SUBSUBSPACE_ADMIN,
        ],
      },
      subspace: {
        community: {
          admins: [TestUser.SUBSUBSPACE_ADMIN],
          members: [TestUser.SUBSUBSPACE_MEMBER, TestUser.SUBSUBSPACE_ADMIN],
        },
      },
    },
  },
};

beforeAll(async () => {
  await deleteMailSlurperMails();

  baseScenario = await TestScenarioFactory.createBaseScenario(scenarioConfig);

  preferencesConfigCallout = [
    {
      userID: TestUserManager.users.globalAdmin.id,
      type: PreferenceType.NotificationCalloutPublished,
    },

    {
      userID: TestUserManager.users.spaceMember.id,
      type: PreferenceType.NotificationCalloutPublished,
    },

    {
      userID: TestUserManager.users.subspaceMember.id,
      type: PreferenceType.NotificationCalloutPublished,
    },

    {
      userID: TestUserManager.users.subsubspaceMember.id,
      type: PreferenceType.NotificationCalloutPublished,
    },

    {
      userID: TestUserManager.users.spaceAdmin.id,
      type: PreferenceType.NotificationCalloutPublished,
    },

    {
      userID: TestUserManager.users.subspaceAdmin.id,
      type: PreferenceType.NotificationCalloutPublished,
    },

    {
      userID: TestUserManager.users.subsubspaceAdmin.id,
      type: PreferenceType.NotificationCalloutPublished,
    },

    {
      userID: TestUserManager.users.nonSpaceMember.id,
      type: PreferenceType.NotificationCalloutPublished,
    },
  ];
});

afterAll(async () => {
  await TestScenarioFactory.cleanUpBaseScenario(baseScenario);
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
      TestUserManager.users.globalSupportAdmin.id,
      PreferenceType.NotificationCalloutPublished,
      'false'
    );

    preferencesConfigCallout.forEach(async config => {
      await changePreferenceUser(config.userID, config.type, 'true');
    });
  });
  test('GA PUBLISH space callout - HM(7) get notifications', async () => {
    const spaceCalloutSubjectText = `${baseScenario.space.about.profile.displayName} - New post is published &#34;${calloutDisplayName}&#34;, have a look!`;
    // Act
    const res = await createCalloutOnCalloutsSet(
      baseScenario.space.collaboration.calloutsSetId,
      { framing: { profile: { displayName: calloutDisplayName } } },
      TestUser.GLOBAL_ADMIN
    );
    calloutId = res.data?.createCalloutOnCalloutsSet.id ?? '';

    await updateCalloutVisibility(calloutId, CalloutVisibility.Published);

    await delay(6000);
    const mails = await getMailsData();

    expect(mails[1]).toEqual(7);

    expect(mails[0]).toEqual(
      await templateResult(
        spaceCalloutSubjectText,
        TestUserManager.users.globalAdmin.email
      )
    );

    expect(mails[0]).toEqual(
      await templateResult(
        spaceCalloutSubjectText,
        TestUserManager.users.spaceAdmin.email
      )
    );
    expect(mails[0]).toEqual(
      await templateResult(
        spaceCalloutSubjectText,
        TestUserManager.users.spaceMember.email
      )
    );

    expect(mails[0]).toEqual(
      await templateResult(
        spaceCalloutSubjectText,
        TestUserManager.users.subspaceAdmin.email
      )
    );
    expect(mails[0]).toEqual(
      await templateResult(
        spaceCalloutSubjectText,
        TestUserManager.users.subspaceMember.email
      )
    );
    expect(mails[0]).toEqual(
      await templateResult(
        spaceCalloutSubjectText,
        TestUserManager.users.subsubspaceAdmin.email
      )
    );
    expect(mails[0]).toEqual(
      await templateResult(
        spaceCalloutSubjectText,
        TestUserManager.users.subsubspaceMember.email
      )
    );
  });

  test("GA PUBLISH space callout with 'sendNotification':'false' - HM(0) get notifications", async () => {
    // Act
    const res = await createCalloutOnCalloutsSet(
      baseScenario.space.collaboration.calloutsSetId,
      { framing: { profile: { displayName: calloutDisplayName } } },
      TestUser.GLOBAL_ADMIN
    );
    calloutId = res.data?.createCalloutOnCalloutsSet.id ?? '';

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

  test('GA create DRAFT -> PUBLISHED -> DRAFT -> PUBLISHED space callout - HM(7) get notifications on PUBLISH event only', async () => {
    // Act
    const res = await createCalloutOnCalloutsSet(
      baseScenario.space.collaboration.calloutsSetId,
      { framing: { profile: { displayName: calloutDisplayName } } },

      TestUser.GLOBAL_ADMIN
    );

    calloutId = res.data?.createCalloutOnCalloutsSet.id ?? '';
    await delay(1500);
    let mails = await getMailsData();

    expect(mails[1]).toEqual(0);

    await updateCalloutVisibility(
      calloutId,
      CalloutVisibility.Published,
      TestUser.SPACE_ADMIN
    );

    await delay(6000);
    mails = await getMailsData();

    expect(mails[1]).toEqual(7);

    await updateCalloutVisibility(
      calloutId,
      CalloutVisibility.Draft,
      TestUser.SPACE_ADMIN
    );

    await delay(1500);
    mails = await getMailsData();

    expect(mails[1]).toEqual(7);

    await updateCalloutVisibility(
      calloutId,
      CalloutVisibility.Published,
      TestUser.SPACE_ADMIN
    );

    await delay(6000);
    mails = await getMailsData();

    expect(mails[1]).toEqual(14);
  });

  test('HA create PUBLISHED space callout type: POST - HM(7) get notifications', async () => {
    const spaceCalloutSubjectText = `${baseScenario.space.about.profile.displayName} - New post is published &#34;${calloutDisplayName}&#34;, have a look!`;
    // Act
    const res = await createCalloutOnCalloutsSet(
      baseScenario.space.collaboration.calloutsSetId,
      { framing: { profile: { displayName: calloutDisplayName } } },

      TestUser.SPACE_ADMIN
    );
    calloutId = res.data?.createCalloutOnCalloutsSet.id ?? '';

    await updateCalloutVisibility(
      calloutId,
      CalloutVisibility.Published,
      TestUser.SPACE_ADMIN
    );

    await delay(6000);
    const mails = await getMailsData();
    expect(mails[1]).toEqual(7);

    expect(mails[0]).toEqual(
      await templateResult(
        spaceCalloutSubjectText,
        TestUserManager.users.globalAdmin.email
      )
    );

    expect(mails[0]).toEqual(
      await templateResult(
        spaceCalloutSubjectText,
        TestUserManager.users.spaceAdmin.email
      )
    );
    expect(mails[0]).toEqual(
      await templateResult(
        spaceCalloutSubjectText,
        TestUserManager.users.spaceMember.email
      )
    );

    expect(mails[0]).toEqual(
      await templateResult(
        spaceCalloutSubjectText,
        TestUserManager.users.subspaceAdmin.email
      )
    );
    expect(mails[0]).toEqual(
      await templateResult(
        spaceCalloutSubjectText,
        TestUserManager.users.subspaceMember.email
      )
    );
    expect(mails[0]).toEqual(
      await templateResult(
        spaceCalloutSubjectText,
        TestUserManager.users.subsubspaceAdmin.email
      )
    );
    expect(mails[0]).toEqual(
      await templateResult(
        spaceCalloutSubjectText,
        TestUserManager.users.subsubspaceMember.email
      )
    );
  });

  // Skip until is updated the mechanism for whiteboard callout creation
  test.skip('HA create PUBLISHED space callout type: WHITEBOARD - HM(7) get notifications', async () => {
    // Act
    const res = await createCalloutOnCalloutsSet(
      baseScenario.space.collaboration.calloutsSetId,
      { framing: { profile: { displayName: calloutDisplayName } } },

      TestUser.SPACE_ADMIN
    );
    calloutId = res.data?.createCalloutOnCalloutsSet.id ?? '';

    await updateCalloutVisibility(
      calloutId,
      CalloutVisibility.Published,
      TestUser.SPACE_ADMIN
    );

    await delay(6000);
    const mails = await getMailsData();

    // expect(mails[0]).toEqual(
    //   expect.arrayContaining([
    //     expect.objectContaining({
    //       subject: spaceCalloutSubjectText,
    //       toAddresses: [TestUserManager.users.globalAdmin.email],
    //     }),
    //   ])
    // );

    // expect(mails[0]).toEqual(
    //   expect.arrayContaining([
    //     expect.objectContaining({
    //       subject: spaceCalloutSubjectText,
    //       toAddresses: [TestUserManager.users.spaceAdmin.email],
    //     }),
    //   ])
    // );
    // expect(mails[0]).toEqual(
    //   expect.arrayContaining([
    //     expect.objectContaining({
    //       subject: spaceCalloutSubjectText,
    //       toAddresses: [TestUserManager.users.qaUser.email],
    //     }),
    //   ])
    // );
    // expect(mails[0]).toEqual(
    //   expect.arrayContaining([
    //     expect.objectContaining({
    //       subject: spaceCalloutSubjectText,
    //       toAddresses: [TestUserManager.users.spaceMember.email],
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
    //       toAddresses: [subspaceAndSpaceMemOnly],
    //     }),
    //   ])
    // );
    // expect(mails[0]).toEqual(
    //   expect.arrayContaining([
    //     expect.objectContaining({
    //       subject: spaceCalloutSubjectText,
    //       toAddresses: [subsubspaceAndSubspaceAndSpaceMem],
    //     }),
    //   ])
    // );
    expect(mails[1]).toEqual(7);
  });

  test('HA create PUBLISHED subspace callout type: POST - CM(5) get notifications', async () => {
    const calloutSubjectText = `${baseScenario.subspace.about.profile.displayName} - New post is published &#34;${calloutDisplayName}&#34;, have a look!`;
    // Act
    const res = await createCalloutOnCalloutsSet(
      baseScenario.subspace.collaboration.calloutsSetId,
      { framing: { profile: { displayName: calloutDisplayName } } },
      TestUser.SPACE_ADMIN
    );
    calloutId = res.data?.createCalloutOnCalloutsSet.id ?? '';

    await updateCalloutVisibility(
      calloutId,
      CalloutVisibility.Published,
      TestUser.SPACE_ADMIN
    );

    await delay(6000);
    const mails = await getMailsData();

    expect(mails[1]).toEqual(5);

    expect(mails[0]).toEqual(
      await templateResult(
        calloutSubjectText,
        TestUserManager.users.globalAdmin.email
      )
    );

    // Don't receive as Space Admin is not member of subspace
    expect(mails[0]).not.toEqual(
      await templateResult(
        calloutSubjectText,
        TestUserManager.users.spaceAdmin.email
      )
    );
    // Don't receive as Space Member is not member of subspace
    expect(mails[0]).not.toEqual(
      await templateResult(
        calloutSubjectText,
        TestUserManager.users.spaceMember.email
      )
    );

    expect(mails[0]).toEqual(
      await templateResult(
        calloutSubjectText,
        TestUserManager.users.subspaceAdmin.email
      )
    );
    expect(mails[0]).toEqual(
      await templateResult(
        calloutSubjectText,
        TestUserManager.users.subspaceMember.email
      )
    );
    expect(mails[0]).toEqual(
      await templateResult(
        calloutSubjectText,
        TestUserManager.users.subsubspaceAdmin.email
      )
    );
    expect(mails[0]).toEqual(
      await templateResult(
        calloutSubjectText,
        TestUserManager.users.subsubspaceMember.email
      )
    );
  });

  test("HA create PUBLISHED subspace callout type: POST with 'sendNotification':'false' - CM(0) get notifications", async () => {
    // Act
    const res = await createCalloutOnCalloutsSet(
      baseScenario.subspace.collaboration.calloutsSetId,
      { framing: { profile: { displayName: calloutDisplayName } } },
      TestUser.SPACE_ADMIN
    );
    calloutId = res.data?.createCalloutOnCalloutsSet.id ?? '';

    await updateCalloutVisibility(
      calloutId,
      CalloutVisibility.Published,
      TestUser.SPACE_ADMIN,
      false
    );

    await delay(6000);
    const mails = await getMailsData();

    // Assert
    expect(mails[1]).toEqual(0);
  });

  test('OA create PUBLISHED subsubspace callout type: POST - OM(4) get notifications', async () => {
    const calloutSubjectText = `${baseScenario.subsubspace.about.profile.displayName} - New post is published &#34;${calloutDisplayName}&#34;, have a look!`;
    // Act
    const res = await createCalloutOnCalloutsSet(
      baseScenario.subsubspace.collaboration.calloutsSetId,
      { framing: { profile: { displayName: calloutDisplayName } } },
      TestUser.SUBSUBSPACE_ADMIN
    );
    calloutId = res.data?.createCalloutOnCalloutsSet.id ?? '';
    await updateCalloutVisibility(
      calloutId,
      CalloutVisibility.Published,
      TestUser.SUBSUBSPACE_ADMIN
    );

    await delay(6000);
    const mails = await getMailsData();

    expect(mails[1]).toEqual(3);

    // GA - 1 mails as subsubspace member; as admin - 0
    expect(mails[0]).toEqual(
      await templateResult(
        calloutSubjectText,
        TestUserManager.users.globalAdmin.email
      )
    );

    // Don't receive as Space Admin is not member of subsubspace
    expect(mails[0]).not.toEqual(
      await templateResult(
        calloutSubjectText,
        TestUserManager.users.spaceAdmin.email
      )
    );
    // Don't receive as Space Member is not member of subsubspace
    expect(mails[0]).not.toEqual(
      await templateResult(
        calloutSubjectText,
        TestUserManager.users.spaceMember.email
      )
    );

    // Don't receive as Subspace Member is not member of subsubspace
    expect(mails[0]).not.toEqual(
      await templateResult(
        calloutSubjectText,
        TestUserManager.users.subspaceAdmin.email
      )
    );

    // Don't receive as Subspace Member is not member of subsubspace
    expect(mails[0]).not.toEqual(
      await templateResult(
        calloutSubjectText,
        TestUserManager.users.subspaceMember.email
      )
    );
    expect(mails[0]).toEqual(
      await templateResult(
        calloutSubjectText,
        TestUserManager.users.subsubspaceAdmin.email
      )
    );
    expect(mails[0]).toEqual(
      await templateResult(
        calloutSubjectText,
        TestUserManager.users.subsubspaceMember.email
      )
    );
  });

  test("OA create PUBLISHED subsubspace callout type: POST with 'sendNotification':'false' - OM(0) get notifications", async () => {
    // Act
    const res = await createCalloutOnCalloutsSet(
      baseScenario.subsubspace.collaboration.calloutsSetId,
      { framing: { profile: { displayName: calloutDisplayName } } },
      TestUser.SUBSUBSPACE_ADMIN
    );
    calloutId = res.data?.createCalloutOnCalloutsSet.id ?? '';
    await updateCalloutVisibility(
      calloutId,
      CalloutVisibility.Published,
      TestUser.SUBSUBSPACE_ADMIN,
      false
    );

    await delay(6000);
    const mails = await getMailsData();

    // Assert
    expect(mails[1]).toEqual(0);
  });

  test('OA create PUBLISHED subsubspace callout type: POST - 0 notifications - all roles with notifications disabled', async () => {
    preferencesConfigCallout.forEach(
      async config =>
        await changePreferenceUser(config.userID, config.type, 'false')
    );
    // Act
    const res = await createCalloutOnCalloutsSet(
      baseScenario.subsubspace.collaboration.calloutsSetId,
      { framing: { profile: { displayName: calloutDisplayName } } },
      TestUser.SUBSUBSPACE_ADMIN
    );
    calloutId = res.data?.createCalloutOnCalloutsSet.id ?? '';

    await updateCalloutVisibility(
      calloutId,
      CalloutVisibility.Published,
      TestUser.SUBSUBSPACE_ADMIN
    );

    // Assert
    await delay(1500);
    const mails = await getMailsData();

    expect(mails[1]).toEqual(0);
  });
});
