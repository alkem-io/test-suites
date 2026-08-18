import {
  TestScenarioConfig,
  TestScenarioFactory,
  TestUser,
} from '@alkemio/tests-lib';
import { moveSpaceL1ToSpaceL2 } from './conversion.request.params';
import { getSpaceData } from '../space/space.request.params';
import { getRoleSetMembersList } from '@functional-api/roleset/roleset.request.params';
import { sendMessageToRoom } from '@functional-api/communications/communication.params';
import { getSpaceCommunication } from '../space/space.request.params';
import { OrganizationWithSpaceModel } from '@alkemio/tests-lib/scenario/models/OrganizationWithSpaceModel';

/**
 * Comparison: Same-L0 vs Cross-L0 Demotion
 *
 * Key insight: The boundary is same-L0 vs cross-L0, not the level change direction.
 * Any operation crossing L0 boundaries clears ALL roles because community memberships
 * are hierarchical under the L0. Admin credentials rooted in the source L0's chain
 * are meaningless in the target L0's context.
 *
 * | Aspect                  | Same-L0 convertSpaceL1ToSpaceL2 | Cross-L0 moveSpaceL1ToSpaceL2 |
 * |-------------------------|----------------------------------|-------------------------------|
 * | Admins                  | Preserved                        | REMOVED                       |
 * | levelZeroSpaceID        | Unchanged                        | Updated to target L0          |
 * | Innovation flow         | Inherited (same L0)              | Synced per template           |
 * | Room handling            | None needed                     | Fire-and-forget post-commit   |
 * | URL / profile.url       | No change                        | Revoked / updated             |
 * | NameID validation       | Not needed (same scope)          | Required (new scope)          |
 * | Account context         | Unchanged                        | Inherited from target L0      |
 */

// Source with L1 subspace, no L2 children
const sourceConfig: TestScenarioConfig = {
  name: 'compare-src',
  space: {
    community: {
      admins: [TestUser.SPACE_ADMIN],
      members: [
        TestUser.SPACE_MEMBER,
        TestUser.SPACE_ADMIN,
        TestUser.SUBSPACE_MEMBER,
        TestUser.SUBSPACE_ADMIN,
      ],
    },
    subspace: {
      community: {
        admins: [TestUser.SUBSPACE_ADMIN],
        members: [TestUser.SUBSPACE_MEMBER, TestUser.SUBSPACE_ADMIN],
      },
    },
  },
};

const targetConfig: TestScenarioConfig = {
  name: 'compare-tgt',
  space: {
    community: {
      admins: [TestUser.SPACE_ADMIN],
      members: [
        TestUser.SPACE_MEMBER,
        TestUser.SUBSPACE_MEMBER,
        TestUser.SUBSPACE_ADMIN,
      ],
    },
    subspace: {
      community: {
        admins: [TestUser.SUBSPACE_ADMIN],
        members: [TestUser.SUBSPACE_MEMBER, TestUser.SUBSPACE_ADMIN],
      },
    },
  },
};

describe('Same-L0 vs Cross-L0 demotion comparison', () => {
  describe('Cross-L0 moveSpaceL1ToSpaceL2 removes admins', () => {
    let crossL0Source: OrganizationWithSpaceModel;
    let crossL0Target: OrganizationWithSpaceModel;
    let urlBefore: string;

    beforeAll(async () => {
      // Independent scenarios (distinct names, no shared state) — build concurrently.
      [crossL0Source, crossL0Target] = await Promise.all([
        TestScenarioFactory.createBaseScenario({
          ...sourceConfig,
          name: 'compare-cross-src',
        }),
        TestScenarioFactory.createBaseScenario({
          ...targetConfig,
          name: 'compare-cross-tgt',
        }),
      ]);

      // Capture URL before move
      const dataBefore = await getSpaceData(crossL0Source.subspace.id);
      urlBefore = dataBefore.data?.lookup.space?.about.profile.url ?? '';

      await moveSpaceL1ToSpaceL2(
        crossL0Source.subspace.id,
        crossL0Target.subspace.id
      );
    });

    afterAll(async () => {
      await TestScenarioFactory.cleanUpBaseScenario(crossL0Source);
      await TestScenarioFactory.cleanUpBaseScenario(crossL0Target);
    });

    test('cross-L0: admins are REMOVED', async () => {
      const spaceData = await getSpaceData(crossL0Source.subspace.id);
      const admins =
        spaceData.data?.lookup.space?.community.roleSet.adminUsers ?? [];

      expect(admins).toHaveLength(0);
    });

    test('cross-L0: members are REMOVED', async () => {
      const roleSetData = await getRoleSetMembersList(
        crossL0Source.subspace.community.roleSetId
      );
      const members = roleSetData.data?.lookup.roleSet?.memberUsers ?? [];

      expect(members).toHaveLength(0);
    });

    test('cross-L0: account inherited from target L0', async () => {
      const movedData = await getSpaceData(crossL0Source.subspace.id);
      const targetData = await getSpaceData(crossL0Target.space.id);

      expect(movedData.data?.lookup.space?.account.id).toEqual(
        targetData.data?.lookup.space?.account.id
      );
    });

    test('cross-L0: profile url is updated after move', async () => {
      const movedData = await getSpaceData(crossL0Source.subspace.id);
      const urlAfter = movedData.data?.lookup.space?.about.profile.url ?? '';

      expect(urlAfter).toBeDefined();
      expect(urlAfter).not.toBe('');
      expect(urlAfter).not.toEqual(urlBefore);
    });
  });

  describe('Cross-L0 move revokes room memberships', () => {
    let roomSource: OrganizationWithSpaceModel;
    let roomTarget: OrganizationWithSpaceModel;

    beforeAll(async () => {
      // Independent scenarios (distinct names, no shared state) — build concurrently.
      [roomSource, roomTarget] = await Promise.all([
        TestScenarioFactory.createBaseScenario({
          ...sourceConfig,
          name: 'compare-room-src',
        }),
        TestScenarioFactory.createBaseScenario({
          ...targetConfig,
          name: 'compare-room-tgt',
        }),
      ]);

      // Send messages to updates room before move
      const msgRes = await sendMessageToRoom(
        roomSource.subspace.communication.updatesId,
        'Update before cross-L0 move'
      );
      expect(msgRes?.data?.sendMessageToRoom?.id).toBeDefined();

      await moveSpaceL1ToSpaceL2(
        roomSource.subspace.id,
        roomTarget.subspace.id
      );
    });

    afterAll(async () => {
      await TestScenarioFactory.cleanUpBaseScenario(roomSource);
      await TestScenarioFactory.cleanUpBaseScenario(roomTarget);
    });

    test('cross-L0: updates room messages are preserved after move', async () => {
      const commData = await getSpaceCommunication(roomSource.subspace.id);
      const updatesMessages =
        commData.data?.lookup.space?.community.communication.updates.messages ??
        [];

      expect(updatesMessages).toHaveLength(1);
    });

    test('cross-L0: former member loses access', async () => {
      const spaceData = await getSpaceData(
        roomSource.subspace.id,
        TestUser.SUBSPACE_MEMBER
      );

      const privileges =
        spaceData.data?.lookup.space?.authorization?.myPrivileges ?? [];
      expect(privileges).not.toContain('UPDATE');
    });
  });
});
