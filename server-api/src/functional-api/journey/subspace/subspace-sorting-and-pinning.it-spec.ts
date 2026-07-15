/* eslint-disable @typescript-eslint/no-explicit-any */
import { OrganizationWithSpaceModel } from '@alkemio/tests-lib/scenario/models/OrganizationWithSpaceModel';
import {
  TestScenarioConfig,
  TestScenarioFactory,
  TestUser,
  UniqueIDGenerator,
} from '@alkemio/tests-lib';
import { SpaceSortMode } from '@alkemio/tests-lib/core/generated/alkemio-schema';
import {
  createSubspaceOrFail,
  getSubspacesData,
  updateSubspacePinned,
  updateSubspacesSortOrder,
} from './subspace.request.params';
import {
  deleteSpace,
  getSpaceData,
  updateSpaceSettings,
} from '../space/space.request.params';

// Note: After running `pnpm --filter @alkemio/tests-lib run codegen` against a
// server with the sorting/pinning schema, the `as any` casts below can be
// removed because the generated query types will include pinned, sortOrder, and
// sortMode fields natively.

const uniqueId = UniqueIDGenerator.getID();

let baseScenario: OrganizationWithSpaceModel;
const scenarioConfig: TestScenarioConfig = {
  name: 'subspace-sort-pin',
  space: {
    collaboration: {
      addTutorialCallouts: false,
    },
    community: {
      admins: [TestUser.SPACE_ADMIN],
      members: [
        TestUser.SPACE_MEMBER,
        TestUser.SPACE_ADMIN,
        TestUser.SUBSPACE_ADMIN,
        TestUser.SUBSPACE_MEMBER,
      ],
    },
  },
};

beforeAll(async () => {
  baseScenario = await TestScenarioFactory.createBaseScenario(scenarioConfig);
});

afterAll(async () => {
  await TestScenarioFactory.cleanUpBaseScenario(baseScenario);
});

describe('Subspace sorting and pinning', () => {
  let subspaceAId = '';
  let subspaceBId = '';
  let subspaceCId = '';

  beforeAll(async () => {
    subspaceAId = await createSubspaceOrFail(
      `alpha-${uniqueId}`,
      `alpha-${uniqueId}`,
      baseScenario.space.id
    );

    subspaceBId = await createSubspaceOrFail(
      `bravo-${uniqueId}`,
      `bravo-${uniqueId}`,
      baseScenario.space.id
    );

    subspaceCId = await createSubspaceOrFail(
      `charlie-${uniqueId}`,
      `charlie-${uniqueId}`,
      baseScenario.space.id
    );
  });

  afterAll(async () => {
    await deleteSpace(subspaceCId);
    await deleteSpace(subspaceBId);
    await deleteSpace(subspaceAId);
  });

  describe('Pinning subspaces', () => {
    afterEach(async () => {
      // Reset all subspaces to unpinned
      await updateSubspacePinned(baseScenario.space.id, subspaceAId, false);
      await updateSubspacePinned(baseScenario.space.id, subspaceBId, false);
      await updateSubspacePinned(baseScenario.space.id, subspaceCId, false);
    });

    test('should pin a subspace', async () => {
      // Act
      const response = await updateSubspacePinned(
        baseScenario.space.id,
        subspaceAId,
        true
      );

      // Assert
      expect(response.error).toBeUndefined();
      expect(response.data?.updateSubspacePinned.id).toEqual(subspaceAId);
      expect(response.data?.updateSubspacePinned.pinned).toBe(true);
    });

    test('should unpin a subspace', async () => {
      // Arrange
      await updateSubspacePinned(baseScenario.space.id, subspaceAId, true);

      // Act
      const response = await updateSubspacePinned(
        baseScenario.space.id,
        subspaceAId,
        false
      );

      // Assert
      expect(response.error).toBeUndefined();
      expect(response.data?.updateSubspacePinned.pinned).toBe(false);
    });

    test('should be idempotent when pinning an already pinned subspace', async () => {
      // Arrange
      await updateSubspacePinned(baseScenario.space.id, subspaceAId, true);

      // Act
      const response = await updateSubspacePinned(
        baseScenario.space.id,
        subspaceAId,
        true
      );

      // Assert
      expect(response.error).toBeUndefined();
      expect(response.data?.updateSubspacePinned.pinned).toBe(true);
    });

    test('should be idempotent when unpinning an already unpinned subspace', async () => {
      // Act
      const response = await updateSubspacePinned(
        baseScenario.space.id,
        subspaceAId,
        false
      );

      // Assert
      expect(response.error).toBeUndefined();
      expect(response.data?.updateSubspacePinned.pinned).toBe(false);
    });

    test('should pin multiple subspaces independently', async () => {
      // Act
      await updateSubspacePinned(baseScenario.space.id, subspaceAId, true);
      await updateSubspacePinned(baseScenario.space.id, subspaceCId, true);

      // Assert
      const subspacesResponse = await getSubspacesData(baseScenario.space.id);
      const subspaces =
        (subspacesResponse.data?.lookup?.space?.subspaces as any[]) ?? [];

      const subspaceA = subspaces.find((s: any) => s.id === subspaceAId);
      const subspaceB = subspaces.find((s: any) => s.id === subspaceBId);
      const subspaceC = subspaces.find((s: any) => s.id === subspaceCId);

      expect(subspaceA?.pinned).toBe(true);
      expect(subspaceB?.pinned).toBe(false);
      expect(subspaceC?.pinned).toBe(true);
    });

    test('should persist pinned state across queries', async () => {
      // Arrange
      await updateSubspacePinned(baseScenario.space.id, subspaceBId, true);

      // Act - query via different endpoint
      const spaceData = await getSpaceData(baseScenario.space.id);
      const subspaces =
        (spaceData.data?.lookup?.space?.subspaces as any[]) ?? [];
      const subspaceB = subspaces.find((s: any) => s.id === subspaceBId);

      // Assert
      expect(subspaceB?.pinned).toBe(true);
    });

    test('should return error when pinning with invalid parent spaceID', async () => {
      // Act
      const response = await updateSubspacePinned(
        '00000000-0000-0000-0000-000000000000',
        subspaceAId,
        true
      );

      // Assert
      expect(response.data?.updateSubspacePinned).toBeUndefined();
      expect(response.error?.errors?.[0]?.code).toEqual('ENTITY_NOT_FOUND');
    });

    test('should return error when pinning with invalid subspaceID', async () => {
      // Act
      const response = await updateSubspacePinned(
        baseScenario.space.id,
        '00000000-0000-0000-0000-000000000000',
        true
      );

      // Assert
      expect(response.data?.updateSubspacePinned).toBeUndefined();
      expect(response.error?.errors?.[0]?.code).toEqual('ENTITY_NOT_FOUND');
      expect(response.error?.errors?.[0]?.message).toContain(
        'Subspace not found within parent Space'
      );
    });
  });

  describe('Pinning authorization', () => {
    afterEach(async () => {
      await updateSubspacePinned(baseScenario.space.id, subspaceAId, false);
    });

    test('should allow space admin to pin a subspace', async () => {
      // Act
      const response = await updateSubspacePinned(
        baseScenario.space.id,
        subspaceAId,
        true,
        TestUser.SPACE_ADMIN
      );

      // Assert
      expect(response.error).toBeUndefined();
      expect(response.data?.updateSubspacePinned.pinned).toBe(true);
    });

    test('should allow global admin to pin a subspace', async () => {
      // Act
      const response = await updateSubspacePinned(
        baseScenario.space.id,
        subspaceAId,
        true,
        TestUser.GLOBAL_ADMIN
      );

      // Assert
      expect(response.error).toBeUndefined();
      expect(response.data?.updateSubspacePinned.pinned).toBe(true);
    });

    test('should not allow space member to pin a subspace', async () => {
      // Act
      const response = await updateSubspacePinned(
        baseScenario.space.id,
        subspaceAId,
        true,
        TestUser.SPACE_MEMBER
      );

      // Assert
      expect(response.data?.updateSubspacePinned).toBeUndefined();
      expect(response.error?.errors?.[0]?.code).toEqual('FORBIDDEN_POLICY');
    });

    test('should not allow non-space member to pin a subspace', async () => {
      // Act
      const response = await updateSubspacePinned(
        baseScenario.space.id,
        subspaceAId,
        true,
        TestUser.NON_SPACE_MEMBER
      );

      // Assert
      expect(response.data?.updateSubspacePinned).toBeUndefined();
      expect(response.error?.errors?.[0]?.code).toEqual('FORBIDDEN_POLICY');
    });
  });

  describe('Sort mode settings', () => {
    afterEach(async () => {
      // Reset to default
      await updateSpaceSettings(baseScenario.space.id, {
        sortMode: SpaceSortMode.Alphabetical,
      });
    });

    test('should default to ALPHABETICAL sort mode', async () => {
      // Act
      const spaceData = await getSpaceData(baseScenario.space.id);
      const settings = spaceData.data?.lookup?.space?.settings as any;

      // Assert
      expect(settings?.sortMode).toEqual(SpaceSortMode.Alphabetical);
    });

    test('should update sort mode to CUSTOM', async () => {
      // Act
      const response = await updateSpaceSettings(baseScenario.space.id, {
        sortMode: SpaceSortMode.Custom,
      });

      // Assert
      expect(response.error).toBeUndefined();

      const spaceData = await getSpaceData(baseScenario.space.id);
      const settings = spaceData.data?.lookup?.space?.settings as any;
      expect(settings?.sortMode).toEqual(SpaceSortMode.Custom);
    });

    test('should update sort mode back to ALPHABETICAL', async () => {
      // Arrange
      await updateSpaceSettings(baseScenario.space.id, {
        sortMode: SpaceSortMode.Custom,
      });

      // Act
      await updateSpaceSettings(baseScenario.space.id, {
        sortMode: SpaceSortMode.Alphabetical,
      });

      // Assert
      const spaceData = await getSpaceData(baseScenario.space.id);
      const settings = spaceData.data?.lookup?.space?.settings as any;
      expect(settings?.sortMode).toEqual(SpaceSortMode.Alphabetical);
    });

    test('should preserve sort mode when updating other settings', async () => {
      // Arrange
      await updateSpaceSettings(baseScenario.space.id, {
        sortMode: SpaceSortMode.Custom,
      });

      // Act - update without sortMode
      await updateSpaceSettings(baseScenario.space.id, {
        collaboration: {
          allowMembersToCreateCallouts: true,
        },
      });

      // Assert
      const spaceData = await getSpaceData(baseScenario.space.id);
      const settings = spaceData.data?.lookup?.space?.settings as any;
      expect(settings?.sortMode).toEqual(SpaceSortMode.Custom);
    });
  });

  describe('Subspaces sort order', () => {
    test('should update sort order of subspaces', async () => {
      // Act - reverse the order: C, B, A
      const response = await updateSubspacesSortOrder(
        baseScenario.space.id,
        [subspaceCId, subspaceBId, subspaceAId]
      );

      // Assert
      expect(response.error).toBeUndefined();
      const sortedSubspaces =
        response.data?.updateSubspacesSortOrder ?? [];
      expect(sortedSubspaces).toHaveLength(3);

      // Verify sort order values are assigned in ascending order
      const subC = sortedSubspaces.find(
        (s: { id: string }) => s.id === subspaceCId
      );
      const subB = sortedSubspaces.find(
        (s: { id: string }) => s.id === subspaceBId
      );
      const subA = sortedSubspaces.find(
        (s: { id: string }) => s.id === subspaceAId
      );

      expect(subC?.sortOrder).toBeLessThan(subB?.sortOrder ?? 0);
      expect(subB?.sortOrder).toBeLessThan(subA?.sortOrder ?? 0);
    });

    test('should persist sort order across queries', async () => {
      // Arrange
      await updateSubspacesSortOrder(baseScenario.space.id, [
        subspaceCId,
        subspaceAId,
        subspaceBId,
      ]);

      // Act
      const subspacesResponse = await getSubspacesData(baseScenario.space.id);
      const subspaces =
        (subspacesResponse.data?.lookup?.space?.subspaces as any[]) ?? [];

      const subC = subspaces.find((s: any) => s.id === subspaceCId);
      const subA = subspaces.find((s: any) => s.id === subspaceAId);
      const subB = subspaces.find((s: any) => s.id === subspaceBId);

      // Assert
      expect(subC?.sortOrder).toBeLessThan(subA?.sortOrder ?? 0);
      expect(subA?.sortOrder).toBeLessThan(subB?.sortOrder ?? 0);
    });

    test('should allow space admin to update sort order', async () => {
      // Act
      const response = await updateSubspacesSortOrder(
        baseScenario.space.id,
        [subspaceAId, subspaceBId, subspaceCId],
        TestUser.SPACE_ADMIN
      );

      // Assert
      expect(response.error).toBeUndefined();
    });

    test('should not allow space member to update sort order', async () => {
      // Act
      const response = await updateSubspacesSortOrder(
        baseScenario.space.id,
        [subspaceAId, subspaceBId, subspaceCId],
        TestUser.SPACE_MEMBER
      );

      // Assert
      expect(response.data?.updateSubspacesSortOrder).toBeUndefined();
      expect(response.error?.errors?.[0]?.code).toEqual('FORBIDDEN_POLICY');
    });
  });

  describe('Default values on new subspaces', () => {
    let newSubspaceId = '';

    afterAll(async () => {
      if (newSubspaceId) {
        await deleteSpace(newSubspaceId);
      }
    });

    test('should create subspace with pinned=false by default', async () => {
      // Act — createSubspaceOrFail surfaces a genuine create failure instead of
      // masking it into an empty id.
      newSubspaceId = await createSubspaceOrFail(
        `new-sub-${uniqueId}`,
        `new-sub-${uniqueId}`,
        baseScenario.space.id
      );

      // Assert
      const subspacesResponse = await getSubspacesData(baseScenario.space.id);
      const subspaces =
        (subspacesResponse.data?.lookup?.space?.subspaces as any[]) ?? [];
      const newSubspace = subspaces.find(
        (s: any) => s.id === newSubspaceId
      );

      expect(newSubspace?.pinned).toBe(false);
    });
  });

  describe('Combined pinning and sort order', () => {
    afterEach(async () => {
      await updateSubspacePinned(baseScenario.space.id, subspaceAId, false);
      await updateSubspacePinned(baseScenario.space.id, subspaceBId, false);
      await updateSubspacePinned(baseScenario.space.id, subspaceCId, false);
    });

    test('should maintain pinned state after sort order update', async () => {
      // Arrange - pin subspace B
      await updateSubspacePinned(baseScenario.space.id, subspaceBId, true);

      // Act - update sort order
      await updateSubspacesSortOrder(baseScenario.space.id, [
        subspaceCId,
        subspaceAId,
        subspaceBId,
      ]);

      // Assert - pinned state should be preserved
      const subspacesResponse = await getSubspacesData(baseScenario.space.id);
      const subspaces =
        (subspacesResponse.data?.lookup?.space?.subspaces as any[]) ?? [];

      const subB = subspaces.find((s: any) => s.id === subspaceBId);
      expect(subB?.pinned).toBe(true);
    });

    test('should maintain sort order after pinning', async () => {
      // Arrange - set custom order: C, A, B
      await updateSubspacesSortOrder(baseScenario.space.id, [
        subspaceCId,
        subspaceAId,
        subspaceBId,
      ]);

      // Act - pin subspace A
      await updateSubspacePinned(baseScenario.space.id, subspaceAId, true);

      // Assert - query and check sort orders are preserved
      const subspacesResponse = await getSubspacesData(baseScenario.space.id);
      const subspaces =
        (subspacesResponse.data?.lookup?.space?.subspaces as any[]) ?? [];

      const subC = subspaces.find((s: any) => s.id === subspaceCId);
      const subA = subspaces.find((s: any) => s.id === subspaceAId);
      const subB = subspaces.find((s: any) => s.id === subspaceBId);

      expect(subA?.pinned).toBe(true);
      expect(subC?.sortOrder).toBeLessThan(subA?.sortOrder ?? 0);
      expect(subA?.sortOrder).toBeLessThan(subB?.sortOrder ?? 0);
    });
  });
});
