// import {
//   delay,
//   deleteMailSlurperMails,
//   getMailsData,
//   testConfiguration,
//   TestScenarioConfig,
//   TestScenarioFactory,
//   TestUser,
//   TestUserManager,
// } from '@alkemio/tests-lib';
// import { updateOrganization } from '@functional-api/contributor-management/organization/organization.request.params';
// import { createPostOnCallout } from '@functional-api/callout/post/post.request.params';
// import { sendMessageToRoom } from '@functional-api/communications/communication.params';
// import { changePreferenceUser } from '@functional-api/contributor-management/user/user-preferences-mutation';
// import { UniqueIDGenerator } from '@alkemio/tests-lib';
// import { assignRoleToUser } from '@functional-api/roleset/roles-request.params';
// import {
//   PreferenceType,
//   RoleName,
// } from '@alkemio/tests-lib/core/generated/alkemio-schema';
// import { OrganizationWithSpaceModel } from '@alkemio/tests-lib/scenario/models/OrganizationWithSpaceModel';

// const uniqueId = UniqueIDGenerator.getID();
// let postCommentsIdSpace = '';

// const receivers = (senderDisplayName: string, orgDisplayName: string) => {
//   return `${senderDisplayName} mentioned ${orgDisplayName} in a comment on Alkemio`;
// };

// const baseUrl = testConfiguration.endPoints.server + '/organization';

// const mentionedOrganization = (userDisplayName: string, userNameId: string) => {
//   return `[@${userDisplayName}](${baseUrl}/${userNameId})`;
// };

// let baseScenario: OrganizationWithSpaceModel;
// const scenarioConfig: TestScenarioConfig = {
//   name: 'messaging-mention-org',
//   space: {
//     collaboration: {
//       addPostCallout: true,
//       addPostCollectionCallout: true,
//       addWhiteboardCallout: false,
//       addTutorialCallouts: false,
//     },
//     community: {
//       admins: [TestUser.SPACE_ADMIN],
//       members: [
//         TestUser.SPACE_MEMBER,
//         TestUser.SPACE_ADMIN,
//         TestUser.SUBSPACE_MEMBER,
//         TestUser.SUBSPACE_ADMIN,
//         TestUser.SUBSUBSPACE_MEMBER,
//         TestUser.SUBSUBSPACE_ADMIN,
//       ],
//     },
//     subspace: {
//       collaboration: {
//         addPostCallout: true,
//         addPostCollectionCallout: true,
//         addWhiteboardCallout: false,
//         addTutorialCallouts: false,
//       },
//       community: {
//         admins: [TestUser.SUBSPACE_ADMIN],
//         members: [
//           TestUser.SUBSPACE_MEMBER,
//           TestUser.SUBSPACE_ADMIN,
//           TestUser.SUBSUBSPACE_MEMBER,
//           TestUser.SUBSUBSPACE_ADMIN,
//         ],
//       },
//       subspace: {
//         collaboration: {
//           addPostCallout: true,
//           addPostCollectionCallout: true,
//           addWhiteboardCallout: false,
//           addTutorialCallouts: false,
//         },
//         community: {
//           admins: [TestUser.SUBSUBSPACE_ADMIN],
//           members: [TestUser.SUBSUBSPACE_MEMBER, TestUser.SUBSUBSPACE_ADMIN],
//         },
//       },
//     },
//   },
// };

// beforeAll(async () => {
//   await deleteMailSlurperMails();

//   baseScenario = await TestScenarioFactory.createBaseScenario(scenarioConfig);

//   await updateOrganization(baseScenario.organization.id, {
//     legalEntityName: 'legalEntityName',
//     domain: 'domain',
//     website: 'https://website.org',
//     contactEmail: 'test-org@alkem.io',
//   });

//   await assignRoleToUser(
//     TestUserManager.users.qaUser.id,
//     baseScenario.organization.roleSetId,
//     RoleName.Admin
//   );

//   await changePreferenceUser(
//     TestUserManager.users.qaUser.id,
//     PreferenceType.NotificationOrganizationMention,
//     'true'
//   );

//   await changePreferenceUser(
//     TestUserManager.users.globalAdmin.id,
//     PreferenceType.NotificationOrganizationMention,
//     'true'
//   );

//   await changePreferenceUser(
//     TestUserManager.users.globalAdmin.id,
//     PreferenceType.NotificationPostCommentCreated,
//     'false'
//   );
// });

// afterAll(async () => {
//   await TestScenarioFactory.cleanUpBaseScenario(baseScenario);
// });

// describe('Notifications - Mention Organization', () => {
//   beforeEach(async () => {
//     await deleteMailSlurperMails();
//   });

//   describe('Callout discussion', () => {
//     test.only('GA mention Organization in Space comments callout - 2 notification to Organization admins are sent', async () => {
//       // Act
//       await sendMessageToRoom(
//         baseScenario.space.collaboration.calloutPostCommentsId,
//         `${mentionedOrganization(
//           baseScenario.organization.profile.displayName,
//           baseScenario.organization.nameId
//         )} comment on discussion callout`,
//         TestUser.GLOBAL_ADMIN
//       );
//       await delay(3000);

//       const getEmailsData = await getMailsData();

//       // Assert
//       expect(getEmailsData[1]).toEqual(2);
//       expect(getEmailsData[0]).toEqual(
//         expect.arrayContaining([
//           expect.objectContaining({
//             subject: receivers(
//               TestUserManager.users.globalAdmin.displayName,
//               baseScenario.organization.profile.displayName
//             ),
//             toAddresses: [TestUserManager.users.qaUser.email],
//           }),
//           expect.objectContaining({
//             subject: receivers(
//               TestUserManager.users.globalAdmin.displayName,
//               baseScenario.organization.profile.displayName
//             ),
//             toAddresses: [TestUserManager.users.globalAdmin.email],
//           }),
//         ])
//       );
//     });

//     test('HM mention Organization in Space comments callout - 2 notification to Organization admins are sent', async () => {
//       // Act
//       await sendMessageToRoom(
//         baseScenario.space.collaboration.calloutPostCommentsId,
//         `${mentionedOrganization(
//           baseScenario.organization.profile.displayName,
//           baseScenario.organization.nameId
//         )} comment on discussion callout`,
//         TestUser.SPACE_MEMBER
//       );
//       await delay(3000);

//       const getEmailsData = await getMailsData();

//       // Assert
//       expect(getEmailsData[1]).toEqual(2);
//       expect(getEmailsData[0]).toEqual(
//         expect.arrayContaining([
//           expect.objectContaining({
//             subject: receivers(
//               TestUserManager.users.spaceMember.displayName,
//               baseScenario.organization.profile.displayName
//             ),
//             toAddresses: [TestUserManager.users.qaUser.email],
//           }),
//           expect.objectContaining({
//             subject: receivers(
//               TestUserManager.users.spaceMember.displayName,
//               baseScenario.organization.profile.displayName
//             ),
//             toAddresses: [TestUserManager.users.globalAdmin.email],
//           }),
//         ])
//       );
//     });

//     test('GA mention Organization in Subspace comments callout - 2 notification to Organization admins are sent', async () => {
//       // Act
//       await sendMessageToRoom(
//         baseScenario.subspace.collaboration.calloutPostCommentsId,
//         `${mentionedOrganization(
//           baseScenario.organization.profile.displayName,
//           baseScenario.organization.nameId
//         )} comment on discussion callout`,
//         TestUser.GLOBAL_ADMIN
//       );
//       await delay(3000);

//       const getEmailsData = await getMailsData();

//       // Assert
//       expect(getEmailsData[1]).toEqual(2);
//       expect(getEmailsData[0]).toEqual(
//         expect.arrayContaining([
//           expect.objectContaining({
//             subject: receivers(
//               TestUserManager.users.globalAdmin.displayName,
//               baseScenario.organization.profile.displayName
//             ),
//             toAddresses: [TestUserManager.users.qaUser.email],
//           }),
//           expect.objectContaining({
//             subject: receivers(
//               TestUserManager.users.globalAdmin.displayName,
//               baseScenario.organization.profile.displayName
//             ),
//             toAddresses: [TestUserManager.users.globalAdmin.email],
//           }),
//         ])
//       );
//     });

//     test('GA mention Organization in Subsubspace comments callout - 2 notification to Organization admins are sent', async () => {
//       // Act

//       await sendMessageToRoom(
//         baseScenario.subsubspace.collaboration.calloutPostCommentsId,
//         `${mentionedOrganization(
//           baseScenario.organization.profile.displayName,
//           baseScenario.organization.nameId
//         )} comment on discussion callout`,
//         TestUser.GLOBAL_ADMIN
//       );
//       await delay(3000);

//       const getEmailsData = await getMailsData();

//       // Assert
//       expect(getEmailsData[1]).toEqual(2);
//       expect(getEmailsData[0]).toEqual(
//         expect.arrayContaining([
//           expect.objectContaining({
//             subject: receivers(
//               TestUserManager.users.globalAdmin.displayName,
//               baseScenario.organization.profile.displayName
//             ),
//             toAddresses: [TestUserManager.users.qaUser.email],
//           }),
//           expect.objectContaining({
//             subject: receivers(
//               TestUserManager.users.globalAdmin.displayName,
//               baseScenario.organization.profile.displayName
//             ),
//             toAddresses: [TestUserManager.users.globalAdmin.email],
//           }),
//         ])
//       );
//     });
//   });

//   describe('Post comment', () => {
//     beforeAll(async () => {
//       let postNameID = '';
//       postNameID = `post-name-id-${uniqueId}`;
//       const postDisplayName = `post-d-name-${uniqueId}`;
//       const resPostonSpace = await createPostOnCallout(
//         baseScenario.space.collaboration.calloutPostCollectionId,
//         { displayName: postDisplayName },
//         postNameID,
//         TestUser.GLOBAL_ADMIN
//       );
//       postCommentsIdSpace =
//         resPostonSpace.data?.createContributionOnCallout.post?.comments.id ??
//         '';

//       await delay(3000);
//       await deleteMailSlurperMails();
//     });

//     test('HA mention Organization in Space post - 2 notification to Organization admins are sent', async () => {
//       // Act
//       await sendMessageToRoom(
//         postCommentsIdSpace,
//         `${mentionedOrganization(
//           baseScenario.organization.profile.displayName,
//           baseScenario.organization.nameId
//         )} comment on discussion callout`,
//         TestUser.SPACE_ADMIN
//       );
//       await delay(3000);

//       const getEmailsData = await getMailsData();

//       // Assert
//       expect(getEmailsData[1]).toEqual(2);
//       expect(getEmailsData[0]).toEqual(
//         expect.arrayContaining([
//           expect.objectContaining({
//             subject: receivers(
//               TestUserManager.users.spaceAdmin.displayName,
//               baseScenario.organization.profile.displayName
//             ),
//             toAddresses: [TestUserManager.users.qaUser.email],
//           }),
//           expect.objectContaining({
//             subject: receivers(
//               TestUserManager.users.spaceAdmin.displayName,
//               baseScenario.organization.profile.displayName
//             ),
//             toAddresses: [TestUserManager.users.globalAdmin.email],
//           }),
//         ])
//       );
//     });

//     test('HA mention Organization in Subsubspace post (preference disabled) - 2 notification to Organization admins are sent', async () => {
//       // Arrange
//       await changePreferenceUser(
//         TestUserManager.users.qaUser.id,
//         PreferenceType.NotificationOrganizationMention,
//         'false'
//       );

//       await changePreferenceUser(
//         TestUserManager.users.globalAdmin.id,
//         PreferenceType.NotificationOrganizationMention,
//         'false'
//       );

//       // Act
//       await sendMessageToRoom(
//         postCommentsIdSpace,
//         `${mentionedOrganization(
//           baseScenario.organization.profile.displayName,
//           baseScenario.organization.nameId
//         )} comment on discussion callout`,
//         TestUser.SPACE_ADMIN
//       );

//       await delay(3000);

//       const getEmailsData = await getMailsData();

//       // Assert
//       expect(getEmailsData[1]).toEqual(0);
//     });
//   });

//   // ToDo: add timeline comments mentions, when implemented
//   describe.skip('Post comment', () => {
//     test('OA mention HM in Subsubspace post - 1 notification to HM is sent', async () => {
//       expect(1).toEqual(1);
//     });
//   });
// });
