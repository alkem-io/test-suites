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
  createPostOnCallout,
  deletePost,
} from '@functional-api/callout/post/post.request.params';
import { changePreferenceUser } from '@functional-api/contributor-management/user/user-preferences-mutation';
import { PreferenceType } from '@alkemio/tests-lib/core/generated/alkemio-schema';
import { OrganizationWithSpaceModel } from '@alkemio/tests-lib/scenario/models/OrganizationWithSpaceModel';

const uniqueId = UniqueIDGenerator.getID();

let spacePostId = '';
let subspacePostId = '';
let subsubspacePostId = '';
let postDisplayName = '';
export let preferencesPostOnCallForPostCreatedConfig: any[] = [];

const templatedAdminResult = async (entityName: string, userEmail: string) => {
  return expect.arrayContaining([
    expect.objectContaining({
      subject: entityName,
      toAddresses: [userEmail],
    }),
  ]);
};

const templateMemberResult = async (entityName: string, userEmail: string) => {
  return expect.arrayContaining([
    expect.objectContaining({
      subject: entityName,
      toAddresses: [userEmail],
    }),
  ]);
};

let baseScenario: OrganizationWithSpaceModel;
const scenarioConfig: TestScenarioConfig = {
  name: 'posts-notifications',
  space: {
    collaboration: {
      addPostCallout: true,
      addPostCollectionCallout: true,
      addWhiteboardCallout: true,
    },
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
      collaboration: {
        addPostCallout: true,
        addPostCollectionCallout: true,
        addWhiteboardCallout: true,
      },
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
        collaboration: {
          addPostCallout: true,
          addPostCollectionCallout: true,
          addWhiteboardCallout: true,
        },
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

  preferencesPostOnCallForPostCreatedConfig = [
    {
      userID: TestUserManager.users.globalAdmin.id,
      type: PreferenceType.NotificationPostCreated,
    },
    {
      userID: TestUserManager.users.globalAdmin.id,
      type: PreferenceType.NotificationPostCreatedAdmin,
    },

    {
      userID: TestUserManager.users.spaceMember.id,
      type: PreferenceType.NotificationPostCreated,
    },
    {
      userID: TestUserManager.users.spaceMember.id,
      type: PreferenceType.NotificationPostCreatedAdmin,
    },

    {
      userID: TestUserManager.users.subspaceMember.id,
      type: PreferenceType.NotificationPostCreated,
    },
    {
      userID: TestUserManager.users.subspaceMember.id,
      type: PreferenceType.NotificationPostCreatedAdmin,
    },

    {
      userID: TestUserManager.users.subsubspaceMember.id,
      type: PreferenceType.NotificationPostCreated,
    },
    {
      userID: TestUserManager.users.subsubspaceMember.id,
      type: PreferenceType.NotificationPostCreatedAdmin,
    },

    {
      userID: TestUserManager.users.spaceAdmin.id,
      type: PreferenceType.NotificationPostCreated,
    },
    {
      userID: TestUserManager.users.spaceAdmin.id,
      type: PreferenceType.NotificationPostCreatedAdmin,
    },
    {
      userID: TestUserManager.users.subspaceAdmin.id,
      type: PreferenceType.NotificationPostCreated,
    },
    {
      userID: TestUserManager.users.subspaceAdmin.id,
      type: PreferenceType.NotificationPostCreatedAdmin,
    },
    {
      userID: TestUserManager.users.subsubspaceAdmin.id,
      type: PreferenceType.NotificationPostCreated,
    },
    {
      userID: TestUserManager.users.subsubspaceAdmin.id,
      type: PreferenceType.NotificationPostCreatedAdmin,
    },
    {
      userID: TestUserManager.users.nonSpaceMember.id,
      type: PreferenceType.NotificationPostCreated,
    },
    {
      userID: TestUserManager.users.nonSpaceMember.id,
      type: PreferenceType.NotificationPostCreatedAdmin,
    },
  ];
});

afterAll(async () => {
  await TestScenarioFactory.cleanUpBaseScenario(baseScenario);
});

describe('Notifications - post', () => {
  let postNameID = '';

  beforeEach(async () => {
    await deleteMailSlurperMails();

    postNameID = `asp-name-id-${uniqueId}`;
    postDisplayName = `asp-d-name-${uniqueId}`;
  });

  beforeAll(async () => {
    await changePreferenceUser(
      TestUserManager.users.globalSupportAdmin.id,
      PreferenceType.NotificationPostCommentCreated,
      'false'
    );
    await changePreferenceUser(
      TestUserManager.users.globalSupportAdmin.id,
      PreferenceType.NotificationPostCreated,
      'false'
    );
    await changePreferenceUser(
      TestUserManager.users.globalSupportAdmin.id,
      PreferenceType.NotificationPostCreatedAdmin,
      'false'
    );

    preferencesPostOnCallForPostCreatedConfig.forEach(
      async config =>
        await changePreferenceUser(config.userID, config.type, 'true')
    );
  });

  afterEach(async () => {
    await deletePost(spacePostId);
    await deletePost(subspacePostId);
    await deletePost(subsubspacePostId);
  });

  test('GA create space post - GA(1), HA (2), HM(6) get notifications', async () => {
    const postSubjectAdmin = `${baseScenario.space.about.profile.displayName}: New Post created by admin`;
    const postSubjectMember = `${baseScenario.space.about.profile.displayName}: New Post created by admin, have a look!`;

    // Act
    const resPostonSpace = await createPostOnCallout(
      baseScenario.space.collaboration.calloutPostCollectionId,
      { displayName: postDisplayName },
      postNameID,
      TestUser.GLOBAL_ADMIN
    );
    spacePostId =
      resPostonSpace.data?.createContributionOnCallout.post?.id ?? '';

    await delay(6000);
    const mails = await getMailsData();
    expect(mails[0]).toEqual(
      await templatedAdminResult(
        postSubjectAdmin,
        TestUserManager.users.globalAdmin.email
      )
    );

    expect(mails[0]).toEqual(
      await templatedAdminResult(
        postSubjectAdmin,
        TestUserManager.users.spaceAdmin.email
      )
    );

    expect(mails[0]).toEqual(
      await templateMemberResult(
        postSubjectMember,
        TestUserManager.users.globalAdmin.email
      )
    );
    expect(mails[0]).toEqual(
      await templateMemberResult(
        postSubjectMember,
        TestUserManager.users.spaceAdmin.email
      )
    );
    expect(mails[0]).toEqual(
      await templateMemberResult(
        postSubjectMember,
        TestUserManager.users.spaceMember.email
      )
    );

    expect(mails[0]).toEqual(
      await templateMemberResult(
        postSubjectMember,
        TestUserManager.users.subspaceAdmin.email
      )
    );
    expect(mails[0]).toEqual(
      await templateMemberResult(
        postSubjectMember,
        TestUserManager.users.subspaceMember.email
      )
    );
    expect(mails[0]).toEqual(
      await templateMemberResult(
        postSubjectMember,
        TestUserManager.users.subsubspaceAdmin.email
      )
    );
    expect(mails[1]).toEqual(9);
    expect(mails[0]).toEqual(
      await templateMemberResult(
        postSubjectMember,
        TestUserManager.users.subsubspaceMember.email
      )
    );
  });

  test('HA create space post - GA(1), HA (1), HM(6) get notifications', async () => {
    const postSubjectAdmin = `${baseScenario.space.about.profile.displayName}: New Post created by space`;
    const postSubjectMember = `${baseScenario.space.about.profile.displayName}: New Post created by space, have a look!`;
    // Act
    const resPostonSpace = await createPostOnCallout(
      baseScenario.space.collaboration.calloutPostCollectionId,
      { displayName: postDisplayName },
      postNameID,
      TestUser.SPACE_ADMIN
    );
    spacePostId =
      resPostonSpace.data?.createContributionOnCallout.post?.id ?? '';

    await delay(6000);
    const mails = await getMailsData();

    expect(mails[1]).toEqual(9);

    expect(mails[0]).toEqual(
      await templatedAdminResult(
        postSubjectAdmin,
        TestUserManager.users.globalAdmin.email
      )
    );

    expect(mails[0]).toEqual(
      await templatedAdminResult(
        postSubjectAdmin,
        TestUserManager.users.spaceAdmin.email
      )
    );

    expect(mails[0]).toEqual(
      await templateMemberResult(
        postSubjectMember,
        TestUserManager.users.globalAdmin.email
      )
    );
    expect(mails[0]).toEqual(
      await templateMemberResult(
        postSubjectMember,
        TestUserManager.users.spaceAdmin.email
      )
    );
    expect(mails[0]).toEqual(
      await templateMemberResult(
        postSubjectMember,
        TestUserManager.users.spaceMember.email
      )
    );

    expect(mails[0]).toEqual(
      await templateMemberResult(
        postSubjectMember,
        TestUserManager.users.subspaceAdmin.email
      )
    );
    expect(mails[0]).toEqual(
      await templateMemberResult(
        postSubjectMember,
        TestUserManager.users.subspaceMember.email
      )
    );
    expect(mails[0]).toEqual(
      await templateMemberResult(
        postSubjectMember,
        TestUserManager.users.subsubspaceAdmin.email
      )
    );
    expect(mails[0]).toEqual(
      await templateMemberResult(
        postSubjectMember,
        TestUserManager.users.subsubspaceMember.email
      )
    );
  });

  test('HA create subspace post - GA(1), HA (1), CA(1), CM(3),  get notifications', async () => {
    const postSubjectAdmin = `${baseScenario.subspace.about.profile.displayName}: New Post created by space`;
    const postSubjectMember = `${baseScenario.subspace.about.profile.displayName}: New Post created by space, have a look!`;
    // Act
    const resPostonSpace = await createPostOnCallout(
      baseScenario.subspace.collaboration.calloutPostCollectionId,
      { displayName: postDisplayName },
      postNameID,
      TestUser.SPACE_ADMIN
    );
    subspacePostId =
      resPostonSpace.data?.createContributionOnCallout.post?.id ?? '';

    await delay(6000);
    const mails = await getMailsData();
    expect(mails[0]).toEqual(
      await templatedAdminResult(
        postSubjectAdmin,
        TestUserManager.users.globalAdmin.email
      )
    );

    // Space admin does not reacive email
    expect(mails[0]).not.toEqual(
      await templatedAdminResult(
        postSubjectAdmin,
        TestUserManager.users.spaceAdmin.email
      )
    );

    expect(mails[0]).toEqual(
      await templateMemberResult(
        postSubjectMember,
        TestUserManager.users.globalAdmin.email
      )
    );
    expect(mails[0]).toEqual(
      await templateMemberResult(
        postSubjectAdmin,
        TestUserManager.users.subspaceAdmin.email
      )
    );

    // Space member does not reacive email
    expect(mails[0]).not.toEqual(
      await templateMemberResult(
        postSubjectMember,
        TestUserManager.users.spaceMember.email
      )
    );

    expect(mails[0]).toEqual(
      await templateMemberResult(
        postSubjectMember,
        TestUserManager.users.subspaceAdmin.email
      )
    );
    expect(mails[0]).toEqual(
      await templateMemberResult(
        postSubjectMember,
        TestUserManager.users.subspaceMember.email
      )
    );
    expect(mails[0]).toEqual(
      await templateMemberResult(
        postSubjectMember,
        TestUserManager.users.subsubspaceAdmin.email
      )
    );
    expect(mails[1]).toEqual(7);
    expect(mails[0]).toEqual(
      await templateMemberResult(
        postSubjectMember,
        TestUserManager.users.subsubspaceMember.email
      )
    );
  });

  test('OM create subsubspace post - HA(2), CA(1), OA(2), OM(4), get notifications', async () => {
    const postSubjectAdmin = `${baseScenario.subsubspace.about.profile.displayName}: New Post created by subsubspace`;
    const postSubjectMember = `${baseScenario.subsubspace.about.profile.displayName}: New Post created by subsubspace, have a look!`;
    // Act
    const resPostonSpace = await createPostOnCallout(
      baseScenario.subsubspace.collaboration.calloutPostCollectionId,
      { displayName: postDisplayName },
      postNameID,
      TestUser.SUBSUBSPACE_MEMBER
    );
    subsubspacePostId =
      resPostonSpace.data?.createContributionOnCallout.post?.id ?? '';

    await delay(6000);
    const mails = await getMailsData();
    expect(mails[0]).toEqual(
      await templatedAdminResult(
        postSubjectAdmin,
        TestUserManager.users.globalAdmin.email
      )
    );

    // Space admin does not reacive email
    expect(mails[0]).not.toEqual(
      await templatedAdminResult(
        postSubjectAdmin,
        TestUserManager.users.spaceAdmin.email
      )
    );

    expect(mails[0]).toEqual(
      await templateMemberResult(
        postSubjectMember,
        TestUserManager.users.globalAdmin.email
      )
    );

    // Space admin does not reacive email
    expect(mails[0]).not.toEqual(
      await templateMemberResult(
        postSubjectMember,
        TestUserManager.users.spaceAdmin.email
      )
    );

    // Space member does not reacive email
    expect(mails[0]).not.toEqual(
      await templateMemberResult(
        postSubjectMember,
        TestUserManager.users.spaceMember.email
      )
    );

    // Subspace admin does not reacive email
    expect(mails[0]).not.toEqual(
      await templateMemberResult(
        postSubjectMember,
        TestUserManager.users.subspaceAdmin.email
      )
    );

    // Subspace member does not reacive email
    expect(mails[0]).not.toEqual(
      await templateMemberResult(
        postSubjectMember,
        TestUserManager.users.subspaceMember.email
      )
    );
    expect(mails[0]).toEqual(
      await templateMemberResult(
        postSubjectAdmin,
        TestUserManager.users.subsubspaceAdmin.email
      )
    );

    expect(mails[0]).toEqual(
      await templateMemberResult(
        postSubjectMember,
        TestUserManager.users.subsubspaceAdmin.email
      )
    );

    expect(mails[0]).toEqual(
      await templateMemberResult(
        postSubjectMember,
        TestUserManager.users.subsubspaceAdmin.email
      )
    );
    expect(mails[1]).toEqual(5);

    expect(mails[0]).toEqual(
      await templateMemberResult(
        postSubjectMember,
        TestUserManager.users.subsubspaceMember.email
      )
    );
  });

  test('OA create subsubspace post - 0 notifications - all roles with notifications disabled', async () => {
    preferencesPostOnCallForPostCreatedConfig.forEach(
      async config =>
        await changePreferenceUser(config.userID, config.type, 'false')
    );
    // Act
    const resPostonSpace = await createPostOnCallout(
      baseScenario.subsubspace.collaboration.calloutPostCollectionId,
      { displayName: postDisplayName },
      postNameID,
      TestUser.SUBSUBSPACE_ADMIN
    );
    subsubspacePostId =
      resPostonSpace.data?.createContributionOnCallout.post?.id ?? '';

    // Assert
    await delay(1500);
    const mails = await getMailsData();

    expect(mails[1]).toEqual(0);
  });
});
