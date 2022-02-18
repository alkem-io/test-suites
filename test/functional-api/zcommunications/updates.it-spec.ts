import '../../utils/array.matcher';
import {
  createTestEcoverse,
  hubName,
  hubNameId,
  getEcoverseData,
  removeEcoverse,
} from '../integration/hub/hub.request.params';
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
    hubName,
    hubNameId,
    entitiesId.organizationId
  );
  entitiesId.hubId = responseEco.body.data.createEcoverse.id;
  entitiesId.hubCommunityId = responseEco.body.data.createEcoverse.community.id;
  entitiesId.hubUpdatesId =
    responseEco.body.data.createEcoverse.community.communication.updates.id;

  const requestUserData = await getUser(users.globalAdminIdEmail);
  users.globalAdminId = requestUserData.body.data.user.id;

  const requestReaderMemberData = await getUser(users.hubMemberEmail);
  users.hubMemberId = requestReaderMemberData.body.data.user.id;

  const requestReaderNotMemberData = await getUser(
    users.nonEcoverseMemberEmail
  );
  users.nonEcoverseMemberId = requestReaderNotMemberData.body.data.user.id;
});

afterAll(async () => {
  await removeEcoverse(entitiesId.hubId);
  await deleteOrganization(entitiesId.organizationId);
});

describe('Communities', () => {
  describe('Community updates - read access', () => {
    beforeAll(async () => {
      await mutation(
        assignUserToCommunity,
        assignUserToCommunityVariablesData(
          entitiesId.hubCommunityId,
          users.hubMemberId
        )
      );

      let res = await mutation(
        sendCommunityUpdate,
        sendCommunityUpdateVariablesData(entitiesId.hubUpdatesId, 'test'),
        TestUser.GLOBAL_ADMIN
      );
      entitiesId.messageId = res.body.data.sendUpdate.id;
    });

    afterAll(async () => {
      await mutation(
        removeUpdateCommunity,
        removeUpdateCommunityVariablesData(
          entitiesId.hubUpdatesId,
          entitiesId.messageId
        )
      );
    });
    test('community updates - PRIVATE hub - read access - sender / reader (member) / reader (not member)', async () => {
      // Act
      let hubDataSender = await getEcoverseData(
        entitiesId.hubId,
        TestUser.GLOBAL_ADMIN
      );
      let getMessageSender =
        hubDataSender.body.data.hub.community.communication.updates.messages;

      let hubDataReaderMember = await getEcoverseData(
        entitiesId.hubId,
        TestUser.HUB_MEMBER
      );

      let getMessageReaderMember =
        hubDataReaderMember.body.data.hub.community.communication.updates
          .messages;

      let hubDataReader = await getEcoverseData(
        entitiesId.hubId,
        TestUser.NON_HUB_MEMBER
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

      expect(hubDataReader.text).toContain(
        `User (${users.nonEcoverseMemberEmail}) does not have credentials that grant 'read' access `
      );
    });

    test('community updates - NOT PRIVATE hub - read access - sender / reader (member) / reader (not member)', async () => {
      // Arrange
      await mutation(
        setHubVisibility,
        setHubVisibilityVariableData(entitiesId.hubId, true)
      );

      // Act
      let hubDataSender = await getEcoverseData(
        entitiesId.hubId,
        TestUser.GLOBAL_ADMIN
      );
      let getMessageSender =
        hubDataSender.body.data.hub.community.communication.updates.messages;

      let hubDataReaderMember = await getEcoverseData(
        entitiesId.hubId,
        TestUser.HUB_MEMBER
      );
      let getMessageReaderMember =
        hubDataReaderMember.body.data.hub.community.communication.updates
          .messages;

      let hubDataReaderNotMemberIn = await getEcoverseData(
        entitiesId.hubId,
        TestUser.NON_HUB_MEMBER
      );
      let hubDataReaderNotMember =
        hubDataReaderNotMemberIn.body.data.hub.community.communication.updates
          .messages;

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

      expect(hubDataReaderNotMember[0]).toEqual({
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
        sendCommunityUpdateVariablesData(entitiesId.hubUpdatesId, 'test')
      );
      entitiesId.messageId = res.body.data.sendUpdate.id;

      let hubDataSender = await getEcoverseData(entitiesId.hubId);
      let getMessageSender =
        hubDataSender.body.data.hub.community.communication.updates.messages;

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
          entitiesId.hubUpdatesId,
          entitiesId.messageId
        )
      );
    });

    test('should delete community update', async () => {
      // Arrange
      let res = await mutation(
        sendCommunityUpdate,
        sendCommunityUpdateVariablesData(entitiesId.hubUpdatesId, 'test')
      );

      entitiesId.messageId = res.body.data.sendUpdate.id;

      // Act
      await mutation(
        removeUpdateCommunity,
        removeUpdateCommunityVariablesData(
          entitiesId.hubUpdatesId,
          entitiesId.messageId
        )
      );

      let hubDataSender = await getEcoverseData(entitiesId.hubId);
      let getMessageSender =
        hubDataSender.body.data.hub.community.communication.updates.messages;

      // Assert
      expect(getMessageSender).toHaveLength(0);
    });
  });
});
