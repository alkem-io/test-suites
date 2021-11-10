import '../../utils/array.matcher';
import {
  createTestEcoverse,
  ecoverseName,
  ecoverseNameId,
  getEcoverseData,
  removeEcoverse,
} from '../integration/ecoverse/ecoverse.request.params';
import {
  createOrganization,
  deleteOrganization,
  hostNameId,
  organizationName,
} from '../integration/organization/organization.request.params';
import { mutation } from '@test/utils/graphql.request';
import {
  sendCommunityUpdate,
  sendCommunityUpdateVariablesData,
} from '@test/utils/mutations/update-mutation';
import { TestUser } from '@test/utils/token.helper';
import {
  assignUserToCommunity,
  assignUserToCommunityVariablesData,
} from '@test/utils/mutations/assign-mutation';
import { getUser } from '@test/functional-api/user-management/user.request.params';
import {
  removeUpdateCommunity,
  removeUpdateCommunityVariablesData,
} from '@test/utils/mutations/remove-mutation';
import {
  setHubVisibility,
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
  const responseOrg = await createOrganization(organizationName, hostNameId);
  organizationId = responseOrg.body.data.createOrganization.id;
  let responseEco = await createTestEcoverse(
    ecoverseName,
    ecoverseNameId,
    organizationId
  );

  ecoverseId = responseEco.body.data.createEcoverse.id;
  ecoverseCommunityId = responseEco.body.data.createEcoverse.community.id;

  let ecoverseData = await getEcoverseData(ecoverseId);

  ecoverseRoomId =
    ecoverseData.body.data.ecoverse.community.communication.updates.id;

  ecoverseRoomMessages =
    ecoverseData.body.data.ecoverse.community.communication.updates.messages;

  const requestUserData = await getUser(email);
  userId = requestUserData.body.data.user.id;

  const requestReaderMemberData = await getUser(readerEmailMember);
  readerMemberId = requestReaderMemberData.body.data.user.id;

  const requestReaderNotMemberData = await getUser(readerEmailNotMember);
  readerNotMemberId = requestReaderNotMemberData.body.data.user.id;
});

afterAll(async () => {
  await removeEcoverse(ecoverseId);
  await deleteOrganization(organizationId);
});

describe('Communities', () => {
  describe('Community updates - read access', () => {
    beforeAll(async () => {
      await mutation(
        assignUserToCommunity,
        assignUserToCommunityVariablesData(ecoverseCommunityId, readerMemberId)
      );

      let res = await mutation(
        sendCommunityUpdate,
        sendCommunityUpdateVariablesData(ecoverseRoomId, 'test'),
        TestUser.GLOBAL_ADMIN
      );

      messageId = res.body.data.sendUpdate;
    });

    afterAll(async () => {
      await mutation(
        removeUpdateCommunity,
        removeUpdateCommunityVariablesData(ecoverseRoomId, messageId)
      );
    });
    test('community updates - PRIVATE hub - read access - sender / reader (member) / reader (not member)', async () => {
      // Act
      let ecoverseDataSender = await getEcoverseData(
        ecoverseId,
        TestUser.GLOBAL_ADMIN
      );
      let getMessageSender =
        ecoverseDataSender.body.data.ecoverse.community.communication.updates
          .messages;

      let ecoverseDataReaderMember = await getEcoverseData(
        ecoverseId,
        TestUser.ECOVERSE_MEMBER
      );

      let getMessageReaderMember =
        ecoverseDataReaderMember.body.data.ecoverse.community.communication
          .updates.messages;

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
      await mutation(
        setHubVisibility,
        setHubVisibilityVariableData(ecoverseId, true)
      );

      // Act
      let ecoverseDataSender = await getEcoverseData(
        ecoverseId,
        TestUser.GLOBAL_ADMIN
      );
      let getMessageSender =
        ecoverseDataSender.body.data.ecoverse.community.communication.updates
          .messages;

      let ecoverseDataReaderMember = await getEcoverseData(
        ecoverseId,
        TestUser.ECOVERSE_MEMBER
      );
      let getMessageReaderMember =
        ecoverseDataReaderMember.body.data.ecoverse.community.communication
          .updates.messages;

      // ToDo - may be a bug - request must be executed twice, to get the data
      await getEcoverseData(ecoverseId, TestUser.NON_ECOVERSE_MEMBER);
      let ecoverseDataReaderNotMemberIn = await getEcoverseData(
        ecoverseId,
        TestUser.NON_ECOVERSE_MEMBER
      );

      let ecoverseDataReaderNotMember =
        ecoverseDataReaderNotMemberIn.body.data.ecoverse.community.communication
          .updates.messages;

      // Assert
      expect(getMessageSender).toHaveLength(1);
      expect(getMessageSender[0]).toEqual({
        id: messageId,
        message: 'test',
        sender: userId,
      });

      expect(getMessageReaderMember[0]).toEqual({
        id: messageId,
        message: 'test',
        sender: userId,
      });

      expect(ecoverseDataReaderNotMember[0]).toEqual({
        id: messageId,
        message: 'test',
        sender: userId,
      });
    });
  });

  describe('Community updates - create / delete', () => {
    test('should create community update', async () => {
      // Act
      let res = await mutation(
        sendCommunityUpdate,
        sendCommunityUpdateVariablesData(ecoverseRoomId, 'test')
      );
      messageId = res.body.data.sendUpdate;

      let ecoverseDataSender = await getEcoverseData(ecoverseId);
      let getMessageSender =
        ecoverseDataSender.body.data.ecoverse.community.communication.updates
          .messages;

      // Assert
      expect(getMessageSender).toHaveLength(1);
      expect(getMessageSender[0]).toEqual({
        id: messageId,
        message: 'test',
        sender: userId,
      });

      await mutation(
        removeUpdateCommunity,
        removeUpdateCommunityVariablesData(ecoverseRoomId, messageId)
      );
    });

    test('should delete community update', async () => {
      // Arrange
      let res = await mutation(
        sendCommunityUpdate,
        sendCommunityUpdateVariablesData(ecoverseRoomId, 'test')
      );

      messageId = res.body.data.sendUpdate;

      // Act
      await mutation(
        removeUpdateCommunity,
        removeUpdateCommunityVariablesData(ecoverseRoomId, messageId)
      );

      let ecoverseDataSender = await getEcoverseData(ecoverseId);
      let getMessageSender =
        ecoverseDataSender.body.data.ecoverse.community.communication.updates
          .messages;

      // Assert
      expect(getMessageSender).toHaveLength(0);
    });
  });
});
