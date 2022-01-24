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
import { entitiesId, users } from './communications-helper';

beforeAll(async () => {
  const responseOrg = await createOrganization(organizationName, hostNameId);
  entitiesId.organizationId = responseOrg.body.data.createOrganization.id;
  let responseEco = await createTestEcoverse(
    ecoverseName,
    ecoverseNameId,
    entitiesId.organizationId
  );
  entitiesId.ecoverseId = responseEco.body.data.createEcoverse.id;
  entitiesId.ecoverseCommunityId =
    responseEco.body.data.createEcoverse.community.id;
  entitiesId.ecoverseUpdatesId =
    responseEco.body.data.createEcoverse.community.communication.updates.id;

  const requestUserData = await getUser(users.globalAdminIdEmail);
  users.globalAdminId = requestUserData.body.data.user.id;

  const requestReaderMemberData = await getUser(users.ecoverseMemberEmail);
  users.ecoverseMemberId = requestReaderMemberData.body.data.user.id;

  const requestReaderNotMemberData = await getUser(
    users.nonEcoverseMemberEmail
  );
  users.nonEcoverseMemberId = requestReaderNotMemberData.body.data.user.id;
});

afterAll(async () => {
  await removeEcoverse(entitiesId.ecoverseId);
  await deleteOrganization(entitiesId.organizationId);
});

describe('Communities', () => {
  describe('Community updates - read access', () => {
    beforeAll(async () => {
      await mutation(
        assignUserToCommunity,
        assignUserToCommunityVariablesData(
          entitiesId.ecoverseCommunityId,
          users.ecoverseMemberId
        )
      );

      let res = await mutation(
        sendCommunityUpdate,
        sendCommunityUpdateVariablesData(entitiesId.ecoverseUpdatesId, 'test'),
        TestUser.GLOBAL_ADMIN
      );
      entitiesId.messageId = res.body.data.sendUpdate.id;
    });

    afterAll(async () => {
      await mutation(
        removeUpdateCommunity,
        removeUpdateCommunityVariablesData(
          entitiesId.ecoverseUpdatesId,
          entitiesId.messageId
        )
      );
    });
    test('community updates - PRIVATE hub - read access - sender / reader (member) / reader (not member)', async () => {
      // Act
      let ecoverseDataSender = await getEcoverseData(
        entitiesId.ecoverseId,
        TestUser.GLOBAL_ADMIN
      );
      let getMessageSender =
        ecoverseDataSender.body.data.ecoverse.community.communication.updates
          .messages;

      let ecoverseDataReaderMember = await getEcoverseData(
        entitiesId.ecoverseId,
        TestUser.ECOVERSE_MEMBER
      );

      let getMessageReaderMember =
        ecoverseDataReaderMember.body.data.ecoverse.community.communication
          .updates.messages;

      let ecoverseDataReader = await getEcoverseData(
        entitiesId.ecoverseId,
        TestUser.NON_ECOVERSE_MEMBER
      );

      // Assert
      expect(getMessageSender).toHaveLength(1);
      expect(getMessageSender[0]).toEqual({
        id: entitiesId.messageId,
        message: 'test',
        sender: users.globalAdminId,
      });

      expect(getMessageSender).toHaveLength(1);
      expect(getMessageReaderMember[0]).toEqual({
        id: entitiesId.messageId,
        message: 'test',
        sender: users.globalAdminId,
      });

      expect(ecoverseDataReader.text).toContain(
        `User (${users.nonEcoverseMemberEmail}) does not have credentials that grant 'read' access `
      );
    });

    test('community updates - NOT PRIVATE hub - read access - sender / reader (member) / reader (not member)', async () => {
      // Arrange
      await mutation(
        setHubVisibility,
        setHubVisibilityVariableData(entitiesId.ecoverseId, true)
      );

      // Act
      let ecoverseDataSender = await getEcoverseData(
        entitiesId.ecoverseId,
        TestUser.GLOBAL_ADMIN
      );
      let getMessageSender =
        ecoverseDataSender.body.data.ecoverse.community.communication.updates
          .messages;

      let ecoverseDataReaderMember = await getEcoverseData(
        entitiesId.ecoverseId,
        TestUser.ECOVERSE_MEMBER
      );
      let getMessageReaderMember =
        ecoverseDataReaderMember.body.data.ecoverse.community.communication
          .updates.messages;

      let ecoverseDataReaderNotMemberIn = await getEcoverseData(
        entitiesId.ecoverseId,
        TestUser.NON_ECOVERSE_MEMBER
      );
      let ecoverseDataReaderNotMember =
        ecoverseDataReaderNotMemberIn.body.data.ecoverse.community.communication
          .updates.messages;

      // Assert
      expect(getMessageSender).toHaveLength(1);
      expect(getMessageSender[0]).toEqual({
        id: entitiesId.messageId,
        message: 'test',
        sender: users.globalAdminId,
      });

      expect(getMessageReaderMember[0]).toEqual({
        id: entitiesId.messageId,
        message: 'test',
        sender: users.globalAdminId,
      });

      expect(ecoverseDataReaderNotMember[0]).toEqual({
        id: entitiesId.messageId,
        message: 'test',
        sender: users.globalAdminId,
      });
    });
  });

  describe('Community updates - create / delete', () => {
    test('should create community update', async () => {
      // Act
      let res = await mutation(
        sendCommunityUpdate,
        sendCommunityUpdateVariablesData(entitiesId.ecoverseUpdatesId, 'test')
      );
      entitiesId.messageId = res.body.data.sendUpdate.id;

      let ecoverseDataSender = await getEcoverseData(entitiesId.ecoverseId);
      let getMessageSender =
        ecoverseDataSender.body.data.ecoverse.community.communication.updates
          .messages;

      // Assert
      expect(getMessageSender).toHaveLength(1);
      expect(getMessageSender[0]).toEqual({
        id: entitiesId.messageId,
        message: 'test',
        sender: users.globalAdminId,
      });

      await mutation(
        removeUpdateCommunity,
        removeUpdateCommunityVariablesData(
          entitiesId.ecoverseUpdatesId,
          entitiesId.messageId
        )
      );
    });

    test('should delete community update', async () => {
      // Arrange
      let res = await mutation(
        sendCommunityUpdate,
        sendCommunityUpdateVariablesData(entitiesId.ecoverseUpdatesId, 'test')
      );

      entitiesId.messageId = res.body.data.sendUpdate.id;

      // Act
      await mutation(
        removeUpdateCommunity,
        removeUpdateCommunityVariablesData(
          entitiesId.ecoverseUpdatesId,
          entitiesId.messageId
        )
      );

      let ecoverseDataSender = await getEcoverseData(entitiesId.ecoverseId);
      let getMessageSender =
        ecoverseDataSender.body.data.ecoverse.community.communication.updates
          .messages;

      // Assert
      expect(getMessageSender).toHaveLength(0);
    });
  });
});
