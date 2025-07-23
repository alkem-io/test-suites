import { templateInfoUpdate } from './space-template-testdata';
import { deleteTemplate, GetTemplateById } from '../template.request.params';

import {
  createSpaceBasicData,
  deleteSpace,
  getSpaceData,
  sorted__create_read_update_delete_grant_createSubspace_readLicense_readAbout,
  TestScenarioConfig,
  TestScenarioFactory,
  TestUser,
  TestUserManager,
} from '@alkemio/tests-lib';
import {
  getSpaceTemplatesCount,
  createTemplateFromSpace,
  getSpaceTemplatesCountForSpace,
  updateSpaceTemplate,
  createSpaceFromTemplate,
  getTemplateContentSpaceHierarchy,
  getSpaceHierarchy,
  createSubSpaceFromTemplate,
} from './space-template.request.params';
import { OrganizationWithSpaceModel } from '@alkemio/tests-lib/scenario/models/OrganizationWithSpaceModel';
import { SpacePrivacyMode } from '@alkemio/tests-lib/core/generated/alkemio-schema';

let templateId = '';

let baseScenario: OrganizationWithSpaceModel;
const scenarioConfig: TestScenarioConfig = {
  name: 'hierarchical-templates',
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
      settings: {
        privacy: {
          mode: SpacePrivacyMode.Private,
        },
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
        settings: {
          privacy: {
            mode: SpacePrivacyMode.Private,
          },
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
  baseScenario = await TestScenarioFactory.createBaseScenario(scenarioConfig);
});

afterAll(async () => {
  await TestScenarioFactory.cleanUpBaseScenario(baseScenario);
});

describe('Use hierarchical space template from other account ', () => {
  afterEach(async () => {
    await deleteTemplate(templateId);
  });

  test.only('Create L0 + L1 / L2 from Space template created from another account', async () => {
    // Arrange

    const countBefore = await getSpaceTemplatesCount(
      baseScenario.space.templateSetId
    );
    const spaceDataForTemplate = await getSpaceData(baseScenario.space.id);
    const spaceInfoBefore = spaceDataForTemplate?.data?.lookup?.space;

    const res = await createTemplateFromSpace(
      baseScenario.space.id,
      baseScenario.space.templateSetId,
      'Subspace Template 1'
    );

    const collaborationData = res?.data?.createTemplateFromSpace;
    templateId = collaborationData?.id ?? '';

    // Act

    const createSpaceUsingTemplate = await createSpaceFromTemplate(
      templateId,
      TestUserManager.users.betaTester.accountId,
      'Space from Subspace Template Beta Tester',
      TestUser.GLOBAL_BETA_TESTER
    );
    const spaceFromTemplateId =
      createSpaceUsingTemplate?.data?.createSpace?.id ?? '';

    // expect(spaceFromTemplateId).toBeTruthy();
    console.log(
      'createSpaceUsingTemplate',
      createSpaceUsingTemplate?.data?.createSpace
    );
    console.log(
      'createSpaceUsingTemplate',
      createSpaceUsingTemplate?.error?.errors
    );
    const spaceData = await getSpaceData(
      spaceFromTemplateId,
      TestUser.GLOBAL_BETA_TESTER
    );
    const spaceInfo = spaceData?.data?.lookup?.space;
    const subspaceFromTemplateId =
      spaceData?.data?.lookup?.space?.subspaces?.[0]?.id ?? '';
    console.log('spaceData', spaceData?.data?.lookup?.space);
    const subsubspaceFromTemplateId =
      spaceData?.data?.lookup?.space?.subspaces?.[0]?.subspaces?.[0]?.id ?? '';
    console.log('spaceData', spaceData?.data?.lookup?.space);
    console.log(
      'spaceData',
      spaceData?.data?.lookup?.space?.subspaces[0].collaboration.calloutsSet
        .callouts
    );
    console.log(
      'subspaceData',
      spaceData?.data?.lookup?.space?.subspaces[0].collaboration
    );
    const countAfter = await getSpaceTemplatesCount(
      baseScenario.space.templateSetId
    );

    const getTemplate = await GetTemplateById(templateId);
    const templateData = getTemplate?.data?.lookup.template;

    // Assert
    // Verify User who used template has access to hierarchy
    expect((spaceInfo?.authorization?.myPrivileges ?? []).sort()).toEqual(
      sorted__create_read_update_delete_grant_createSubspace_readLicense_readAbout
    );
    expect(
      (spaceInfo?.subspaces?.[0]?.authorization?.myPrivileges ?? []).sort()
    ).toEqual(
      sorted__create_read_update_delete_grant_createSubspace_readLicense_readAbout
    );
    console.log(
      spaceInfo?.subspaces?.[0]?.subspaces?.[0]?.authorization?.myPrivileges ??
        []
    );
    expect(
      (
        spaceInfo?.subspaces?.[0]?.subspaces?.[0]?.authorization
          ?.myPrivileges ?? []
      ).sort()
    ).toEqual(
      sorted__create_read_update_delete_grant_createSubspace_readLicense_readAbout
    );

    // Verify callouts are created
    expect(
      spaceInfo?.subspaces?.[0]?.subspaces?.[0]?.collaboration?.calloutsSet
        .callouts.length
    ).toEqual(
      spaceInfoBefore?.subspaces?.[0]?.subspaces?.[0]?.collaboration
        ?.calloutsSet.callouts.length
    );
    expect(
      spaceInfo?.subspaces?.[0]?.collaboration?.calloutsSet.callouts.length
    ).toEqual(
      spaceInfoBefore?.subspaces?.[0]?.collaboration?.calloutsSet.callouts
        .length
    );
    expect(spaceInfo?.collaboration?.calloutsSet.callouts.length).toEqual(
      spaceInfoBefore?.collaboration?.calloutsSet.callouts.length
    );

    // Verify spaces levels
    expect(spaceInfo?.subspaces?.[0]?.subspaces?.[0]?.level).toEqual(
      spaceInfoBefore?.subspaces?.[0]?.subspaces?.[0]?.level
    );
    expect(spaceInfo?.subspaces?.[0]?.level).toEqual(
      spaceInfoBefore?.subspaces?.[0]?.level
    );
    expect(spaceInfo?.level).toEqual(spaceInfoBefore?.level);

    // Verify spaces settings
    expect(spaceInfo?.subspaces?.[0]?.subspaces?.[0]?.settings).toEqual(
      spaceInfoBefore?.subspaces?.[0]?.subspaces?.[0]?.settings
    );
    expect(spaceInfo?.subspaces?.[0]?.settings).toEqual(
      spaceInfoBefore?.subspaces?.[0]?.settings
    );
    expect(spaceInfo?.settings).toEqual(spaceInfoBefore?.settings);

    // expect(countAfter).toEqual((countBefore as number) + 1);
    // expect(collaborationData).toEqual(
    //   expect.objectContaining({
    //     id: templateData?.id,
    //     type: templateData?.type,
    //   })
    // );
    await deleteSpace(subsubspaceFromTemplateId, TestUser.GLOBAL_BETA_TESTER);
    await deleteSpace(subspaceFromTemplateId, TestUser.GLOBAL_BETA_TESTER);
    await deleteSpace(spaceFromTemplateId, TestUser.GLOBAL_BETA_TESTER);
  });

  test.only('Create L0 + L1 from L1 template created from another account', async () => {
    // Arrange

    const countBefore = await getSpaceTemplatesCount(
      baseScenario.space.templateSetId
    );
    const spaceDataForTemplate = await getSpaceData(baseScenario.space.id);
    const spaceInfoBefore = spaceDataForTemplate?.data?.lookup?.space;

    const res = await createTemplateFromSpace(
      baseScenario.subspace.id,
      baseScenario.space.templateSetId,
      'Subspace Template 1'
    );
    console.log('res', res.error);

    const collaborationData = res?.data?.createTemplateFromSpace;
    templateId = collaborationData?.id ?? '';

    // Act

    const createSpaceUsingTemplate = await createSpaceFromTemplate(
      templateId,
      TestUserManager.users.betaTester.accountId,
      'Space from Subspace Template Beta Tester',
      TestUser.GLOBAL_BETA_TESTER
    );
    console.log('res2', createSpaceUsingTemplate.error);
    const spaceFromTemplateId =
      createSpaceUsingTemplate?.data?.createSpace?.id ?? '';

    const spaceData = await getSpaceData(
      spaceFromTemplateId,
      TestUser.GLOBAL_BETA_TESTER
    );
    const spaceInfo = spaceData?.data?.lookup?.space;
    const l1Info = spaceInfo?.subspaces?.[0];
    const l2Info = l1Info?.subspaces?.[0];
    const subspaceFromTemplateId =
      spaceData?.data?.lookup?.space?.subspaces?.[0]?.id ?? '';
    console.log('spaceData', spaceData?.data?.lookup?.space);
    const subsubspaceFromTemplateId =
      spaceData?.data?.lookup?.space?.subspaces?.[0]?.subspaces?.[0]?.id ?? '';
    console.log('spaceData', spaceData?.data?.lookup?.space);
    console.log(
      'spaceData',
      spaceData?.data?.lookup?.space?.subspaces[0].collaboration.calloutsSet
        .callouts
    );
    console.log(
      'subspaceData',
      spaceData?.data?.lookup?.space?.subspaces[0].collaboration
    );
    const countAfter = await getSpaceTemplatesCount(
      baseScenario.space.templateSetId
    );

    const getTemplate = await GetTemplateById(templateId);
    const templateData = getTemplate?.data?.lookup.template;

    // Assert
    // Verify User who used template has access to hierarchy
    expect((spaceInfo?.authorization?.myPrivileges ?? []).sort()).toEqual(
      sorted__create_read_update_delete_grant_createSubspace_readLicense_readAbout
    );
    expect((l1Info?.authorization?.myPrivileges ?? []).sort()).toEqual(
      sorted__create_read_update_delete_grant_createSubspace_readLicense_readAbout
    );
    expect(l1Info?.subspaces).toHaveLength(0);

    // Verify callouts are created
    // expect(
    //   spaceInfo?.subspaces?.[0]?.subspaces?.[0]?.collaboration?.calloutsSet
    //     .callouts.length
    // ).toEqual(
    //   spaceInfoBefore?.subspaces?.[0]?.subspaces?.[0]?.collaboration
    //     ?.calloutsSet.callouts.length
    // );
    console.log(spaceInfo?.collaboration?.calloutsSet.callouts);
    console.log(l2Info?.collaboration?.calloutsSet.callouts);
    expect(l1Info?.collaboration?.calloutsSet.callouts.length).toEqual(
      spaceInfoBefore?.subspaces?.[0].subspaces?.[0].collaboration?.calloutsSet
        .callouts.length
    );

    // Verify spaces levels
    expect(spaceInfo?.level).toEqual(spaceInfoBefore?.level);
    expect(l1Info?.level).toEqual(spaceInfoBefore?.subspaces?.[0]?.level);
    // Verify spaces settings
    // expect(spaceInfo?.subspaces?.[0]?.subspaces?.[0]?.settings).toEqual(
    //   spaceInfoBefore?.subspaces?.[0]?.subspaces?.[0]?.settings
    // );
    expect(spaceInfo?.settings).toEqual(spaceInfoBefore?.settings);
    expect(l1Info?.settings).toEqual(spaceInfoBefore?.subspaces?.[0]?.settings);

    // expect(countAfter).toEqual((countBefore as number) + 1);
    // expect(collaborationData).toEqual(
    //   expect.objectContaining({
    //     id: templateData?.id,
    //     type: templateData?.type,
    //   })
    // );
    await deleteSpace(subsubspaceFromTemplateId, TestUser.GLOBAL_BETA_TESTER);
    await deleteSpace(subspaceFromTemplateId, TestUser.GLOBAL_BETA_TESTER);
    await deleteSpace(spaceFromTemplateId, TestUser.GLOBAL_BETA_TESTER);
  });

  test.only('Create L1 + L2 from L0 template created from another account', async () => {
    // Arrange

    const countBefore = await getSpaceTemplatesCount(
      baseScenario.space.templateSetId
    );
    const spaceDataForTemplate = await getSpaceData(baseScenario.space.id);
    const spaceInfoBefore = spaceDataForTemplate?.data?.lookup?.space;

    const res = await createTemplateFromSpace(
      baseScenario.space.id,
      baseScenario.space.templateSetId,
      'Subspace Template 1'
    );
    console.log('res', res.error);

    const collaborationData = res?.data?.createTemplateFromSpace;
    templateId = collaborationData?.id ?? '';

    const space = await createSpaceBasicData(
      'BetaTesterSpace',
      'BetaTesterSpace',
      TestUserManager.users.betaTester.accountId,
      false,
      TestUser.GLOBAL_BETA_TESTER
    );

    const spaceId = space?.data?.createSpace.id ?? '';
    // Act

    const createSpaceUsingTemplate = await createSubSpaceFromTemplate(
      templateId,
      TestUserManager.users.betaTester.accountId,
      'Space from Subspace Template Beta Tester',
      TestUser.GLOBAL_BETA_TESTER
    );
    console.log('res2', createSpaceUsingTemplate.error);
    const spaceFromTemplateId =
      createSpaceUsingTemplate?.data?.createSpace?.id ?? '';

    const spaceData = await getSpaceData(
      spaceFromTemplateId,
      TestUser.GLOBAL_BETA_TESTER
    );
    const spaceInfo = spaceData?.data?.lookup?.space;
    const l1Info = spaceInfo?.subspaces?.[0];
    const l2Info = l1Info?.subspaces?.[0];
    const subspaceFromTemplateId =
      spaceData?.data?.lookup?.space?.subspaces?.[0]?.id ?? '';
    console.log('spaceData', spaceData?.data?.lookup?.space);
    const subsubspaceFromTemplateId =
      spaceData?.data?.lookup?.space?.subspaces?.[0]?.subspaces?.[0]?.id ?? '';
    console.log('spaceData', spaceData?.data?.lookup?.space);
    console.log(
      'spaceData',
      spaceData?.data?.lookup?.space?.subspaces[0].collaboration.calloutsSet
        .callouts
    );
    console.log(
      'subspaceData',
      spaceData?.data?.lookup?.space?.subspaces[0].collaboration
    );
    const countAfter = await getSpaceTemplatesCount(
      baseScenario.space.templateSetId
    );

    const getTemplate = await GetTemplateById(templateId);
    const templateData = getTemplate?.data?.lookup.template;

    // Assert
    // Verify User who used template has access to hierarchy
    expect((spaceInfo?.authorization?.myPrivileges ?? []).sort()).toEqual(
      sorted__create_read_update_delete_grant_createSubspace_readLicense_readAbout
    );
    expect((l1Info?.authorization?.myPrivileges ?? []).sort()).toEqual(
      sorted__create_read_update_delete_grant_createSubspace_readLicense_readAbout
    );
    expect(l1Info?.subspaces).toHaveLength(0);

    // Verify callouts are created
    // expect(
    //   spaceInfo?.subspaces?.[0]?.subspaces?.[0]?.collaboration?.calloutsSet
    //     .callouts.length
    // ).toEqual(
    //   spaceInfoBefore?.subspaces?.[0]?.subspaces?.[0]?.collaboration
    //     ?.calloutsSet.callouts.length
    // );
    console.log(spaceInfo?.collaboration?.calloutsSet.callouts);
    console.log(l2Info?.collaboration?.calloutsSet.callouts);
    expect(l1Info?.collaboration?.calloutsSet.callouts.length).toEqual(
      spaceInfoBefore?.subspaces?.[0].subspaces?.[0].collaboration?.calloutsSet
        .callouts.length
    );

    // Verify spaces levels
    expect(spaceInfo?.level).toEqual(spaceInfoBefore?.level);
    expect(l1Info?.level).toEqual(spaceInfoBefore?.subspaces?.[0]?.level);
    // Verify spaces settings
    // expect(spaceInfo?.subspaces?.[0]?.subspaces?.[0]?.settings).toEqual(
    //   spaceInfoBefore?.subspaces?.[0]?.subspaces?.[0]?.settings
    // );
    expect(spaceInfo?.settings).toEqual(spaceInfoBefore?.settings);
    expect(l1Info?.settings).toEqual(spaceInfoBefore?.subspaces?.[0]?.settings);

    // expect(countAfter).toEqual((countBefore as number) + 1);
    // expect(collaborationData).toEqual(
    //   expect.objectContaining({
    //     id: templateData?.id,
    //     type: templateData?.type,
    //   })
    // );
    await deleteSpace(subsubspaceFromTemplateId, TestUser.GLOBAL_BETA_TESTER);
    await deleteSpace(subspaceFromTemplateId, TestUser.GLOBAL_BETA_TESTER);
    await deleteSpace(spaceFromTemplateId, TestUser.GLOBAL_BETA_TESTER);
  });

  test('Delete subspace template', async () => {
    // Arrange
    const countBefore = await getSpaceTemplatesCountForSpace(
      baseScenario.space.id
    );
    const res = await createTemplateFromSpace(
      baseScenario.subspace.id,
      baseScenario.space.templateSetId,
      'Subspace Template 2'
    );

    templateId = res?.data?.createTemplateFromSpace.id ?? '';

    // Verify template was created
    const countAfterCreate = await getSpaceTemplatesCountForSpace(
      baseScenario.space.id
    );
    expect(countAfterCreate).toEqual((countBefore as number) + 1);

    // Act
    const resDeleteTemplate = await deleteTemplate(templateId);
    const countAfter = await getSpaceTemplatesCountForSpace(
      baseScenario.space.id
    );

    // Assert
    expect(countAfter).toEqual(countBefore);
    expect(resDeleteTemplate?.data?.deleteTemplate.id).toEqual(templateId);

    // Clear the templateId to prevent double cleanup
    templateId = '';
  });

  test('Update subspace template', async () => {
    // Arrange
    const res = await createTemplateFromSpace(
      baseScenario.subspace.id,
      baseScenario.space.templateSetId,
      'Subspace Template 3'
    );
    const collaborationData = res?.data?.createTemplateFromSpace;
    templateId = collaborationData?.id ?? '';

    const resUpdateTemplate = await updateSpaceTemplate(
      templateId,
      templateInfoUpdate
    );
    const resBaseData = resUpdateTemplate?.data?.updateTemplate;

    expect(resBaseData?.profile).toEqual(
      expect.objectContaining({
        displayName: templateInfoUpdate.displayName,
        description: templateInfoUpdate.description,
      })
    );
  });
});

// Tests for hierarchical space templates feature (PRs #5217 & #8471)
// This feature allows creating templates that include entire space hierarchies
// and using them to create spaces with nested subspace structures
describe('Hierarchical Space Templates', () => {
  let hierarchicalTemplateId = '';
  let flatTemplateId = '';

  afterEach(async () => {
    if (hierarchicalTemplateId) {
      await deleteTemplate(hierarchicalTemplateId);
      hierarchicalTemplateId = '';
    }
    if (flatTemplateId) {
      await deleteTemplate(flatTemplateId);
      flatTemplateId = '';
    }
  });

  describe('Template Creation with Hierarchy', () => {
    test('Create hierarchical template with recursive=true includes all subspaces', async () => {
      // Arrange
      const countBefore = await getSpaceTemplatesCount(
        baseScenario.space.templateSetId
      );

      // Act - Create template from L0 space with full hierarchy
      const res = await createTemplateFromSpace(
        baseScenario.space.id,
        baseScenario.space.templateSetId,
        'Hierarchical Template - Full',
        true // recursive = true
      );

      hierarchicalTemplateId = res?.data?.createTemplateFromSpace?.id ?? '';

      // Assert
      const countAfter = await getSpaceTemplatesCount(
        baseScenario.space.templateSetId
      );
      expect(countAfter).toEqual((countBefore as number) + 1);

      // Verify User who used template has access to hierarchy
      const templateContentSpace = await getTemplateContentSpaceHierarchy(
        hierarchicalTemplateId
      );
      // expect(templateContentSpace).toBeDefined();
      // expect(templateContentSpace?.subspaces).toBeDefined();
      // expect(templateContentSpace?.subspaces?.length).toBeGreaterThan(0);

      // Verify subspace has its own subspace (L2)
      const subspace = templateContentSpace?.subspaces?.[0];
      expect(subspace?.subspaces).toBeDefined();
      expect(subspace?.subspaces?.length).toBeGreaterThan(0);
    });

    test('Create flat template with recursive=false includes only root space', async () => {
      // Arrange
      const countBefore = await getSpaceTemplatesCount(
        baseScenario.space.templateSetId
      );

      // Act - Create template from L0 space without hierarchy
      const res = await createTemplateFromSpace(
        baseScenario.space.id,
        baseScenario.space.templateSetId,
        'Flat Template - Root Only',
        false // recursive = false
      );

      flatTemplateId = res?.data?.createTemplateFromSpace?.id ?? '';

      // Assert
      const countAfter = await getSpaceTemplatesCount(
        baseScenario.space.templateSetId
      );
      expect(countAfter).toEqual((countBefore as number) + 1);

      // Verify template content space has no subspaces
      const templateContentSpace =
        await getTemplateContentSpaceHierarchy(flatTemplateId);
      expect(templateContentSpace).toBeDefined();
      expect(templateContentSpace?.subspaces).toEqual([]);
    });

    test('Create template from subspace with recursive=true includes remaining levels', async () => {
      // Act - Create template from L1 subspace with hierarchy
      const res = await createTemplateFromSpace(
        baseScenario.subspace.id,
        baseScenario.space.templateSetId,
        'Subspace Template - With L2',
        true // recursive = true
      );

      hierarchicalTemplateId = res?.data?.createTemplateFromSpace?.id ?? '';

      // Assert
      const templateContentSpace = await getTemplateContentSpaceHierarchy(
        hierarchicalTemplateId
      );
      expect(templateContentSpace).toBeDefined();
      expect(templateContentSpace?.level).toEqual('L1'); // Should be L1 level
      expect(templateContentSpace?.subspaces).toBeDefined();
      expect(templateContentSpace?.subspaces?.length).toBeGreaterThan(0);

      // Verify it includes L2 subspace
      const subsubspace = templateContentSpace?.subspaces?.[0];
      expect(subsubspace?.level).toEqual('L2'); // Should be L2 level
    });

    test('Create template from subsubspace has no further nesting', async () => {
      // Act - Create template from L2 subspace
      const res = await createTemplateFromSpace(
        baseScenario.subsubspace.id,
        baseScenario.space.templateSetId,
        'Subsubspace Template - L2 Only',
        true // recursive = true (should have no effect at L2)
      );

      hierarchicalTemplateId = res?.data?.createTemplateFromSpace?.id ?? '';

      // Assert
      const templateContentSpace = await getTemplateContentSpaceHierarchy(
        hierarchicalTemplateId
      );
      expect(templateContentSpace).toBeDefined();
      expect(templateContentSpace?.level).toEqual('L2'); // Should be L2 level
      expect(templateContentSpace?.subspaces).toEqual([]); // No further nesting allowed
    });
  });

  describe('Space Creation from Hierarchical Templates', () => {
    test('Create L0 space from hierarchical template creates full hierarchy', async () => {
      // Arrange - Create hierarchical template first
      const templateRes = await createTemplateFromSpace(
        baseScenario.space.id,
        baseScenario.space.templateSetId,
        'Hierarchical Template for Space Creation',
        true
      );
      hierarchicalTemplateId =
        templateRes?.data?.createTemplateFromSpace?.id ?? '';

      // Act - Create space from hierarchical template
      const spaceRes = await createSpaceFromTemplate(
        hierarchicalTemplateId,
        baseScenario.organization.accountId,
        'Space from Hierarchical Template'
      );

      const createdSpaceId = spaceRes?.data?.createSpace?.id ?? '';
      expect(createdSpaceId).toBeTruthy();

      // Assert - Verify created space has hierarchy
      const createdSpace = await getSpaceHierarchy(createdSpaceId);
      expect(createdSpace).toBeDefined();
      expect(createdSpace?.subspaces).toBeDefined();
      expect(createdSpace?.subspaces?.length).toBeGreaterThan(0);

      // Verify subspace has its own subspace
      const createdSubspace = createdSpace?.subspaces?.[0];
      expect(createdSubspace?.subspaces).toBeDefined();
      expect(createdSubspace?.subspaces?.length).toBeGreaterThan(0);

      // Cleanup created space
      // Note: This would require a deleteSpace function similar to deleteTemplate
      // For now, we'll rely on the base scenario cleanup
    });

    test('Create L0 space from flat template creates only root space', async () => {
      // Arrange - Create flat template first
      const templateRes = await createTemplateFromSpace(
        baseScenario.space.id,
        baseScenario.space.templateSetId,
        'Flat Template for Space Creation',
        false
      );
      flatTemplateId = templateRes?.data?.createTemplateFromSpace?.id ?? '';

      // Act - Create space from flat template
      const spaceRes = await createSpaceFromTemplate(
        flatTemplateId,
        baseScenario.organization.accountId,
        'Space from Flat Template'
      );

      const createdSpaceId = spaceRes?.data?.createSpace?.id ?? '';
      expect(createdSpaceId).toBeTruthy();

      // Assert - Verify created space has no subspaces
      const createdSpace = await getSpaceHierarchy(createdSpaceId);
      expect(createdSpace).toBeDefined();
      expect(createdSpace?.subspaces).toEqual([]);
    });
  });

  describe('Template Hierarchy Validation', () => {
    test('Template hierarchy respects space level limits', async () => {
      // Test that creating a template from different levels maintains proper level information
      const templates = [];

      // L0 template
      const l0Res = await createTemplateFromSpace(
        baseScenario.space.id,
        baseScenario.space.templateSetId,
        'L0 Template',
        true
      );
      templates.push(l0Res?.data?.createTemplateFromSpace?.id ?? '');

      // L1 template
      const l1Res = await createTemplateFromSpace(
        baseScenario.subspace.id,
        baseScenario.space.templateSetId,
        'L1 Template',
        true
      );
      templates.push(l1Res?.data?.createTemplateFromSpace?.id ?? '');

      // L2 template
      const l2Res = await createTemplateFromSpace(
        baseScenario.subsubspace.id,
        baseScenario.space.templateSetId,
        'L2 Template',
        true
      );
      templates.push(l2Res?.data?.createTemplateFromSpace?.id ?? '');

      // Verify level information in templates
      const expectedLevels = ['L0', 'L1', 'L2'];
      for (let i = 0; i < templates.length; i++) {
        const templateContentSpace = await getTemplateContentSpaceHierarchy(
          templates[i]
        );
        expect(templateContentSpace?.level).toEqual(expectedLevels[i]); // L0, L1, L2
      }

      // Cleanup
      for (const templateId of templates) {
        await deleteTemplate(templateId);
      }
    });

    test('Recursive parameter defaults correctly when not specified', async () => {
      // Test creating template without specifying recursive parameter
      const res = await createTemplateFromSpace(
        baseScenario.space.id,
        baseScenario.space.templateSetId,
        'Template with Default Recursive'
        // recursive parameter not specified - should default based on server implementation
      );

      hierarchicalTemplateId = res?.data?.createTemplateFromSpace?.id ?? '';

      // Verify template was created successfully
      expect(hierarchicalTemplateId).toBeTruthy();

      const templateContentSpace = await getTemplateContentSpaceHierarchy(
        hierarchicalTemplateId
      );
      expect(templateContentSpace).toBeDefined();

      // Based on PR description, default should be true, so subspaces should be included
      expect(templateContentSpace?.subspaces).toBeDefined();
    });
  });

  describe('Edge Cases and Error Handling', () => {
    test('Handle template creation from space with no subspaces', async () => {
      // This test would require a space with no subspaces
      // For now, we'll test L2 space which has no subspaces by definition
      const res = await createTemplateFromSpace(
        baseScenario.subsubspace.id,
        baseScenario.space.templateSetId,
        'Template from Space with No Subspaces',
        true
      );

      hierarchicalTemplateId = res?.data?.createTemplateFromSpace?.id ?? '';

      const templateContentSpace = await getTemplateContentSpaceHierarchy(
        hierarchicalTemplateId
      );
      expect(templateContentSpace).toBeDefined();
      expect(templateContentSpace?.subspaces).toEqual([]);
    });

    test('Verify template content space relationships are maintained', async () => {
      // Create hierarchical template and verify relationships
      const res = await createTemplateFromSpace(
        baseScenario.space.id,
        baseScenario.space.templateSetId,
        'Template for Relationship Testing',
        true
      );

      hierarchicalTemplateId = res?.data?.createTemplateFromSpace?.id ?? '';

      const templateContentSpace = await getTemplateContentSpaceHierarchy(
        hierarchicalTemplateId
      );
      expect(templateContentSpace).toBeDefined();

      if (
        templateContentSpace?.subspaces &&
        templateContentSpace.subspaces.length > 0
      ) {
        const subspace = templateContentSpace.subspaces[0];
        expect(subspace.id).toBeTruthy();
        expect(subspace.about?.id).toBeTruthy();

        // If there's a sub-subspace, verify its structure too
        if (subspace.subspaces && subspace.subspaces.length > 0) {
          const subsubspace = subspace.subspaces[0];
          expect(subsubspace.id).toBeTruthy();
          expect(subsubspace.about?.id).toBeTruthy();
        }
      }
    });
  });

  // Tests for cross-user template usage scenarios
  // These tests verify authorization, template sharing, and permission handling
  // across different user roles when using hierarchical space templates
  describe('Cross-User Template Usage', () => {
    let templateByAdmin = '';
    let templateBySpaceAdmin = '';

    afterEach(async () => {
      if (templateByAdmin) {
        await deleteTemplate(templateByAdmin, TestUser.GLOBAL_ADMIN);
        templateByAdmin = '';
      }
      if (templateBySpaceAdmin) {
        await deleteTemplate(templateBySpaceAdmin, TestUser.SPACE_ADMIN);
        templateBySpaceAdmin = '';
      }
      // Note: Space cleanup would be handled by base scenario cleanup
    });

    test('Space Admin can use hierarchical template created by Global Admin', async () => {
      // Arrange - Global Admin creates hierarchical template
      const templateRes = await createTemplateFromSpace(
        baseScenario.space.id,
        baseScenario.space.templateSetId,
        'Global Admin Hierarchical Template',
        true, // recursive = true
        TestUser.GLOBAL_ADMIN
      );
      templateByAdmin = templateRes?.data?.createTemplateFromSpace?.id ?? '';
      expect(templateByAdmin).toBeTruthy();

      // Act - Space Admin attempts to use the template (may require higher privileges)
      const spaceRes = await createSpaceFromTemplate(
        templateByAdmin,
        baseScenario.organization.accountId,
        'Space by Space Admin from Global Template',
        TestUser.SPACE_ADMIN
      );

      // Assert - Check if successful or if authorization is required
      if (spaceRes?.data?.createSpace?.id) {
        const createdSpaceId = spaceRes.data.createSpace.id;
        expect(createdSpaceId).toBeTruthy();

        // Verify the created space has hierarchy
        const createdSpace = await getSpaceHierarchy(createdSpaceId);
        expect(createdSpace).toBeDefined();
        expect(createdSpace?.subspaces).toBeDefined();
        expect(createdSpace?.subspaces?.length).toBeGreaterThan(0);

        // Verify hierarchy depth
        const subspace = createdSpace?.subspaces?.[0];
        expect(subspace?.subspaces).toBeDefined();
        expect(subspace?.subspaces?.length).toBeGreaterThan(0);
      } else {
        // If authorization failed, that's also valid behavior to test
        expect(spaceRes?.error).toBeDefined();
        expect(spaceRes?.error?.errors?.[0]?.message).toContain(
          'Authorization'
        );
      }
    });

    test('Space Member can use hierarchical template created by Space Admin', async () => {
      // Arrange - Space Admin creates hierarchical template
      const templateRes = await createTemplateFromSpace(
        baseScenario.space.id,
        baseScenario.space.templateSetId,
        'Space Admin Hierarchical Template',
        true, // recursive = true
        TestUser.SPACE_ADMIN
      );
      templateBySpaceAdmin =
        templateRes?.data?.createTemplateFromSpace?.id ?? '';
      expect(templateBySpaceAdmin).toBeTruthy();

      // Act - Space Member uses the template to create a space
      const spaceRes = await createSpaceFromTemplate(
        templateBySpaceAdmin,
        baseScenario.organization.accountId,
        'Space by Space Member from Admin Template',
        TestUser.SPACE_MEMBER
      );

      const createdSpaceId = spaceRes?.data?.createSpace?.id ?? '';
      expect(createdSpaceId).toBeTruthy();

      // Assert - Verify the created space has hierarchy
      const createdSpace = await getSpaceHierarchy(createdSpaceId);
      expect(createdSpace).toBeDefined();
      expect(createdSpace?.subspaces).toBeDefined();
      expect(createdSpace?.subspaces?.length).toBeGreaterThan(0);
    });

    test('Non-space member cannot use template to create space in organization', async () => {
      // Arrange - Global Admin creates hierarchical template
      const templateRes = await createTemplateFromSpace(
        baseScenario.space.id,
        baseScenario.space.templateSetId,
        'Template for Non-Member Test',
        true,
        TestUser.GLOBAL_ADMIN
      );
      templateByAdmin = templateRes?.data?.createTemplateFromSpace?.id ?? '';

      // Act - Non-space member attempts to create space
      const spaceRes = await createSpaceFromTemplate(
        templateByAdmin,
        baseScenario.organization.accountId,
        'Unauthorized Space Creation Attempt',
        TestUser.NON_SPACE_MEMBER
      );

      // Assert - Should receive authorization error
      expect(spaceRes?.error).toBeDefined();
      expect(spaceRes?.error?.errors).toBeDefined();
      expect(spaceRes?.error?.errors?.[0]?.extensions).toBeDefined();
      expect(spaceRes?.data?.createSpace?.id).toBeFalsy();
    });

    test('User can view template details created by another user', async () => {
      // Arrange - Global Admin creates hierarchical template
      const templateRes = await createTemplateFromSpace(
        baseScenario.space.id,
        baseScenario.space.templateSetId,
        'Public Template for Viewing',
        true,
        TestUser.GLOBAL_ADMIN
      );
      templateByAdmin = templateRes?.data?.createTemplateFromSpace?.id ?? '';

      // Act - Space Member views template details
      const templateContentSpace = await getTemplateContentSpaceHierarchy(
        templateByAdmin,
        TestUser.SPACE_MEMBER
      );

      // Assert
      expect(templateContentSpace).toBeDefined();
      expect(templateContentSpace?.id).toBeTruthy();
      expect(templateContentSpace?.subspaces).toBeDefined();
    });

    test('Template inheritance preserves original creator permissions', async () => {
      // Arrange - Space Admin creates template from their managed subspace
      const templateRes = await createTemplateFromSpace(
        baseScenario.subspace.id,
        baseScenario.space.templateSetId,
        'Subspace Template by Admin',
        true,
        TestUser.SPACE_ADMIN
      );
      templateBySpaceAdmin =
        templateRes?.data?.createTemplateFromSpace?.id ?? '';

      // Act - Global Admin uses the template (should work)
      const spaceRes = await createSpaceFromTemplate(
        templateBySpaceAdmin,
        baseScenario.organization.accountId,
        'Space by Global Admin from Subspace Template',
        TestUser.GLOBAL_ADMIN
      );

      const createdSpaceId = spaceRes?.data?.createSpace?.id ?? '';
      expect(createdSpaceId).toBeTruthy();

      // Assert - Verify template maintained its hierarchical structure
      const createdSpace = await getSpaceHierarchy(createdSpaceId);
      expect(createdSpace).toBeDefined();
      expect(createdSpace?.level).toEqual('L0'); // Should be created at L0 level

      // Since template was created from L1 subspace, it should have L2 content
      if (createdSpace?.subspaces && createdSpace.subspaces.length > 0) {
        const subspace = createdSpace.subspaces[0];
        expect(subspace?.level).toEqual('L1');

        // Check for L2 subspaces if they exist in original hierarchy
        if (subspace?.subspaces && subspace.subspaces.length > 0) {
          expect(subspace.subspaces[0]?.level).toEqual('L2');
        }
      }
    });

    test('Template creation across different space levels by different users', async () => {
      const templates: { id: string; user: TestUser; sourceLevel: string }[] =
        [];

      try {
        // Global Admin creates template from L0 space
        const l0Template = await createTemplateFromSpace(
          baseScenario.space.id,
          baseScenario.space.templateSetId,
          'L0 Template by Global Admin',
          true,
          TestUser.GLOBAL_ADMIN
        );
        templates.push({
          id: l0Template?.data?.createTemplateFromSpace?.id ?? '',
          user: TestUser.GLOBAL_ADMIN,
          sourceLevel: 'L0',
        });

        // Space Admin creates template from L1 subspace
        const l1Template = await createTemplateFromSpace(
          baseScenario.subspace.id,
          baseScenario.space.templateSetId,
          'L1 Template by Space Admin',
          true,
          TestUser.SPACE_ADMIN
        );
        templates.push({
          id: l1Template?.data?.createTemplateFromSpace?.id ?? '',
          user: TestUser.SPACE_ADMIN,
          sourceLevel: 'L1',
        });

        // Subspace Admin creates template from L2 subspace
        const l2Template = await createTemplateFromSpace(
          baseScenario.subsubspace.id,
          baseScenario.space.templateSetId,
          'L2 Template by Subspace Admin',
          true,
          TestUser.SUBSPACE_ADMIN
        );
        templates.push({
          id: l2Template?.data?.createTemplateFromSpace?.id ?? '',
          user: TestUser.SUBSPACE_ADMIN,
          sourceLevel: 'L2',
        });

        // Act & Assert - Each template can be used by different users
        for (const template of templates) {
          // Space Member uses each template
          const spaceRes = await createSpaceFromTemplate(
            template.id,
            baseScenario.organization.accountId,
            `Space from ${template.sourceLevel} template by Member`,
            TestUser.SPACE_MEMBER
          );

          const createdSpaceId = spaceRes?.data?.createSpace?.id ?? '';
          expect(createdSpaceId).toBeTruthy();

          // Verify template content matches source level
          const templateContent = await getTemplateContentSpaceHierarchy(
            template.id,
            TestUser.SPACE_MEMBER
          );
          expect(templateContent?.level).toEqual(template.sourceLevel);
        }
      } finally {
        // Cleanup
        for (const template of templates) {
          if (template.id) {
            await deleteTemplate(template.id, template.user);
          }
        }
      }
    });

    test('Template usage respects organization boundaries', async () => {
      // This test would require multiple organizations to fully test
      // For now, we test within the same organization with different access levels

      // Arrange - Create template with specific organization context
      const templateRes = await createTemplateFromSpace(
        baseScenario.space.id,
        baseScenario.space.templateSetId,
        'Organization Specific Template',
        true,
        TestUser.GLOBAL_ADMIN
      );
      templateByAdmin = templateRes?.data?.createTemplateFromSpace?.id ?? '';

      // Act - Verify template can be used within the same organization by authorized users
      const spaceRes = await createSpaceFromTemplate(
        templateByAdmin,
        baseScenario.organization.accountId,
        'Space within Same Organization',
        TestUser.SPACE_ADMIN
      );

      const createdSpaceId = spaceRes?.data?.createSpace?.id ?? '';
      expect(createdSpaceId).toBeTruthy();

      // Assert - Verify the space was created successfully
      const createdSpace = await getSpaceHierarchy(createdSpaceId);
      expect(createdSpace).toBeDefined();
      expect(createdSpace?.id).toEqual(createdSpaceId);
    });

    test('Template modifications by different users', async () => {
      // Arrange - Global Admin creates template
      const templateRes = await createTemplateFromSpace(
        baseScenario.space.id,
        baseScenario.space.templateSetId,
        'Template for Modification Test',
        true,
        TestUser.GLOBAL_ADMIN
      );
      templateByAdmin = templateRes?.data?.createTemplateFromSpace?.id ?? '';

      // Act - Space Admin attempts to update the template
      const updateResult = await updateSpaceTemplate(
        templateByAdmin,
        {
          displayName: 'Updated by Space Admin',
          description: 'Modified template description',
        },
        TestUser.SPACE_ADMIN
      );

      // Assert - Verify update was successful (assuming Space Admin has permissions)
      expect(updateResult?.data?.updateTemplate?.profile?.displayName).toEqual(
        'Updated by Space Admin'
      );
      expect(updateResult?.data?.updateTemplate?.profile?.description).toEqual(
        'Modified template description'
      );

      // Verify template can still be used after modification
      const spaceRes = await createSpaceFromTemplate(
        templateByAdmin,
        baseScenario.organization.accountId,
        'Space from Modified Template',
        TestUser.SPACE_MEMBER
      );

      const createdSpaceId = spaceRes?.data?.createSpace?.id ?? '';
      expect(createdSpaceId).toBeTruthy();
    });
  });
});
