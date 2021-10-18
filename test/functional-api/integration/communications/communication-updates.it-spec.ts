import '../../../utils/array.matcher';
import {
  createTestEcoverse,
  ecoverseName,
  ecoverseNameId,
  getEcoverseData,
  removeEcoverseMutation,
} from '../ecoverse/ecoverse.request.params';
import {
  createOrganizationMutation,
  deleteOrganizationMutation,
  hostNameId,
  organizationName,
} from '../organization/organization.request.params';
import { executeMutation } from '@test/utils/graphql.request';
import {
  sendCommunityUpdateMut,
  sendCommunityUpdateVariablesData,
} from '@test/utils/mutations/update-mutation';
import { TestUser } from '@test/utils/token.helper';
import {
  assignUserToCommunityMut,
  assignUserToCommunityVariablesData,
} from '@test/utils/mutations/assign-mutation';
import { getUser } from '@test/functional-api/user-management/user.request.params';
import {
  removeUpdateCommunityMut,
  removeUpdateCommunityVariablesData,
} from '@test/utils/mutations/remove-mutation';
import {
  setHubVisibilityMut,
  setHubVisibilityVariableData,
} from '@test/utils/mutations/authorization-mutation';

let email = 'admin@alkem.io';
let userId = '';
let readerEmailMember = 'ecoverse.member@alkem.io';
let readerMemberId = '';
let readerEmailNotMember = 'non.ecoverse@alkem.io';
let readerNotMemberId = '';
let ecoverseId = '';
let organizationId = '';
let ecoverseCommunityId = '';
let ecoverseRoomId = '';
let ecoverseRoomMessages = '';
let messageId = '';

beforeAll(async () => {
  const responseOrg = await createOrganizationMutation(
    organizationName,
    hostNameId
  );
  organizationId = responseOrg.body.data.createOrganization.id;
  let responseEco = await createTestEcoverse(
    ecoverseName,
    ecoverseNameId,
    organizationId
  );

  ecoverseId = responseEco.body.data.createEcoverse.id;
  ecoverseCommunityId = responseEco.body.data.createEcoverse.community.id;

  let ecoverseData = await getEcoverseData(ecoverseId);
  ecoverseRoomId = ecoverseData.body.data.ecoverse.community.updatesRoom.id;
  ecoverseRoomMessages =
    ecoverseData.body.data.ecoverse.community.updatesRoom.messages;

  const requestUserData = await getUser(email);
  userId = requestUserData.body.data.user.id;

  const requestReaderMemberData = await getUser(readerEmailMember);
  readerMemberId = requestReaderMemberData.body.data.user.id;

  const requestReaderNotMemberData = await getUser(readerEmailNotMember);
  readerNotMemberId = requestReaderNotMemberData.body.data.user.id;
});

afterAll(async () => {
  await removeEcoverseMutation(ecoverseId);
  await deleteOrganizationMutation(organizationId);
});

describe('Communities', () => {
  describe('Community updates - read access', () => {
    beforeAll(async () => {
      await executeMutation(
        assignUserToCommunityMut,
        assignUserToCommunityVariablesData(ecoverseCommunityId, readerMemberId)
      );

      let res = await executeMutation(
        sendCommunityUpdateMut,
        sendCommunityUpdateVariablesData(ecoverseCommunityId, 'test'),
        TestUser.GLOBAL_ADMIN
      );

      messageId = res.body.data.sendMessageToCommunityUpdates;
    });

    afterAll(async () => {
      await executeMutation(
        removeUpdateCommunityMut,
        removeUpdateCommunityVariablesData(ecoverseCommunityId, messageId)
      );
    });
    test('community updates - PRIVATE hub - read access - sender / reader (member) / reader (not member)', async () => {
      // Act
      let ecoverseDataSender = await getEcoverseData(
        ecoverseId,
        TestUser.GLOBAL_ADMIN
      );
      let getMessageSender =
        ecoverseDataSender.body.data.ecoverse.community.updatesRoom.messages;

      let ecoverseDataReaderMember = await getEcoverseData(
        ecoverseId,
        TestUser.ECOVERSE_MEMBER
      );

      let getMessageReaderMember =
        ecoverseDataReaderMember.body.data.ecoverse.community.updatesRoom
          .messages;

      let ecoverseDataReader = await getEcoverseData(
        ecoverseId,
        TestUser.NON_ECOVERSE_MEMBER
      );

      // Assert
      expect(getMessageSender).toHaveLength(1);
      expect(getMessageSender[0]).toEqual({
        id: messageId,
        message: 'test',
        sender: userId,
      });

      expect(getMessageSender).toHaveLength(1);
      expect(getMessageReaderMember[0]).toEqual({
        id: messageId,
        message: 'test',
        sender: userId,
      });

      expect(ecoverseDataReader.text).toContain(
        `User (${readerEmailNotMember}) does not have credentials that grant 'read' access `
      );
    });

    test('community updates - NOT PRIVATE hub - read access - sender / reader (member) / reader (not member)', async () => {
      // Arrange
      await executeMutation(
        setHubVisibilityMut,
        setHubVisibilityVariableData(ecoverseId, true)
      );

      // Act
      let ecoverseDataSender = await getEcoverseData(
        ecoverseId,
        TestUser.GLOBAL_ADMIN
      );
      let getMessageSender =
        ecoverseDataSender.body.data.ecoverse.community.updatesRoom.messages;

      let ecoverseDataReaderMember = await getEcoverseData(
        ecoverseId,
        TestUser.ECOVERSE_MEMBER
      );
      let getMessageReaderMember =
        ecoverseDataReaderMember.body.data.ecoverse.community.updatesRoom
          .messages;

      let ecoverseDataReader = await getEcoverseData(
        ecoverseId,
        TestUser.NON_ECOVERSE_MEMBER
      );

      // Assert
      expect(getMessageSender).toHaveLength(1);
      expect(getMessageSender[0]).toEqual({
        id: messageId,
        message: 'test',
        sender: userId,
      });

      expect(getMessageSender).toHaveLength(1);
      expect(getMessageReaderMember[0]).toEqual({
        id: messageId,
        message: 'test',
        sender: userId,
      });

      expect(ecoverseDataReader.text).toContain(
        `User (${readerEmailNotMember}) does not have credentials that grant 'read' access `
      );
    });
  });

  describe('Community updates - create / delete', () => {
    test('should create community update', async () => {
      // Act
      let res = await executeMutation(
        sendCommunityUpdateMut,
        sendCommunityUpdateVariablesData(ecoverseCommunityId, 'test')
      );
      messageId = res.body.data.sendMessageToCommunityUpdates;

      let ecoverseDataSender = await getEcoverseData(ecoverseId);
      let getMessageSender =
        ecoverseDataSender.body.data.ecoverse.community.updatesRoom.messages;

      // Assert
      expect(getMessageSender).toHaveLength(1);
      expect(getMessageSender[0]).toEqual({
        id: messageId,
        message: 'test',
        sender: userId,
      });
    });

    test('should delete community update', async () => {
      // Arrange
      let res = await executeMutation(
        sendCommunityUpdateMut,
        sendCommunityUpdateVariablesData(ecoverseCommunityId, 'test')
      );

      messageId = res.body.data.sendMessageToCommunityUpdates;

      // Act
      await executeMutation(
        removeUpdateCommunityMut,
        removeUpdateCommunityVariablesData(ecoverseCommunityId, messageId)
      );

      let ecoverseDataSender = await getEcoverseData(ecoverseId);
      let getMessageSender =
        ecoverseDataSender.body.data.ecoverse.community.updatesRoom.messages;

      // Assert
      expect(getMessageSender).toHaveLength(0);
    });
  });
});
