/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  TestScenarioConfig,
  TestScenarioFactory,
  TestUser,
  TestUserManager,
} from '@alkemio/tests-lib';
import { UniqueIDGenerator } from '@alkemio/tests-lib';
import {
  deleteVirtualContributorOnAccount,
  queryVCData,
} from '../virtual-contributor/vc.request.params';
import {
  assignLicensePlanToAccount,
  getLicensePlanByName,
} from '@functional-api/license/license.params.request';
import {
  createSpaceAndGetData,
  deleteSpace,
} from '../../journey/space/space.request.params';
import { getModelCardForAiPersona } from './ai-persona-model-card.request.params';
import {
  createVirtualContributorWithEngineType,
  createExternalVirtualContributorWithEngineType,
} from './ai-persona-engine.request.params';
import { OrganizationWithSpaceModel } from '@alkemio/tests-lib/scenario/models/OrganizationWithSpaceModel';
import { AiPersonaEngine } from '@alkemio/tests-lib/core/generated/alkemio-schema';

const uniqueId = UniqueIDGenerator.getID();

// Setup IDs and test data
let expertVcId = '';
let guidanceVcId = '';
let genericOpenAiVcId = '';
let libraFlowVcId = '';
let vcLicensePlanId = '';

// Space for testing
const spaceNameVC = 'engine-model-card-name' + uniqueId;
const spaceNameIdVC = 'engine-model-cardid' + uniqueId;
let vcSpaceId = '';

// VC names for different engines
const expertVcName = 'expertVc' + uniqueId;
const guidanceVcName = 'claudeVc' + uniqueId;
const genericOpenAiVcName = 'genericOpenAiVc' + uniqueId;
const libraFlowVcName = 'libraFlowlVc' + uniqueId;

let baseScenario: OrganizationWithSpaceModel;

const scenarioConfig: TestScenarioConfig = {
  name: 'ai-persona-engine-types',
};

describe('AI Persona Engine Types Model Card', () => {
  beforeAll(async () => {
    baseScenario = await TestScenarioFactory.createBaseScenario(scenarioConfig);

    // Assign license for virtual contributors
    const vcLicensePlan = await getLicensePlanByName(
      'FEATURE_VIRTUAL_CONTRIBUTORS'
    );
    vcLicensePlanId = vcLicensePlan[0].id;

    await assignLicensePlanToAccount(
      baseScenario.organization.accountId,
      vcLicensePlanId
    );

    // Create a space for the VCs
    const responceVcSpace = await createSpaceAndGetData(
      spaceNameVC,
      spaceNameIdVC,
      TestUserManager.users.betaTester.accountId
    );
    vcSpaceId = responceVcSpace?.data?.lookup?.space?.id ?? '';

    // Create VCs with different engine types
    const libraFlowVcData = await createVirtualContributorWithEngineType(
      libraFlowVcName,
      baseScenario.organization.accountId,
      vcSpaceId,
      AiPersonaEngine.LibraFlow,
      TestUser.GLOBAL_ADMIN
    );
    libraFlowVcId = libraFlowVcData?.data?.createVirtualContributor?.id ?? '';

    const expertVcData = await createVirtualContributorWithEngineType(
      expertVcName,
      baseScenario.organization.accountId,
      vcSpaceId,
      AiPersonaEngine.Expert,
      TestUser.GLOBAL_ADMIN
    );
    expertVcId = expertVcData?.data?.createVirtualContributor?.id ?? '';

    // Create a knowledge-based VC with OpenAI engine
    const genericOpenAiVcData =
      await createExternalVirtualContributorWithEngineType(
        genericOpenAiVcName,
        baseScenario.organization.accountId,
        AiPersonaEngine.GenericOpenai,
        TestUser.GLOBAL_ADMIN
      );
    genericOpenAiVcId =
      genericOpenAiVcData?.data?.createVirtualContributor?.id ?? '';

    // Create a knowledge-based VC with Guidance engine
    const guidanceVcData = await createExternalVirtualContributorWithEngineType(
      guidanceVcName,
      baseScenario.organization.accountId,
      AiPersonaEngine.Guidance,
      TestUser.GLOBAL_ADMIN
    );
    guidanceVcId = guidanceVcData?.data?.createVirtualContributor?.id ?? '';
  });

  afterAll(async () => {
    // Clean up all created VCs
    await deleteVirtualContributorOnAccount(expertVcId).catch();
    await deleteVirtualContributorOnAccount(libraFlowVcId).catch();
    await deleteVirtualContributorOnAccount(genericOpenAiVcId).catch();
    await deleteVirtualContributorOnAccount(guidanceVcId).catch();
    await deleteSpace(vcSpaceId).catch();
  });

  it('should create virtual contributors with different engine types', async () => {
    // Verify all VCs were created successfully
    const vcIds = [libraFlowVcId, expertVcId, genericOpenAiVcId, guidanceVcId];
    for (const vcId of vcIds) {
      expect(vcId).toBeDefined();
      expect(vcId.length).toBeGreaterThan(0);
    }
  });

  it('should have correct engine type in each model card', async () => {
    // Query all VC data in parallel
    const [libraFlowData, expertData, genericOpenAiData, guidanceData] =
      await Promise.all([
        queryVCData(libraFlowVcId),
        queryVCData(expertVcId),
        queryVCData(genericOpenAiVcId),
        queryVCData(guidanceVcId),
      ]);

    // Verify engine types
    const engineTypeTests = [
      { vcData: libraFlowData, expectedType: AiPersonaEngine.LibraFlow },
      { vcData: expertData, expectedType: AiPersonaEngine.Expert },
      {
        vcData: genericOpenAiData,
        expectedType: AiPersonaEngine.GenericOpenai,
      },
      { vcData: guidanceData, expectedType: AiPersonaEngine.Guidance },
    ];

    for (const { vcData, expectedType } of engineTypeTests) {
      const engine = vcData?.data?.lookup.virtualContributor?.aiPersona?.engine;
      expect(engine).toBe(expectedType);
    }
  });

  it('should have different model card information for different engines', async () => {
    // Get model card data for different engines in parallel
    const [
      libraFlowModelCard,
      expertModelCard,
      genericOpenAiModelCard,
      guidanceModelCard,
    ] = await Promise.all([
      getModelCardForAiPersona(libraFlowVcId),
      getModelCardForAiPersona(expertVcId),
      getModelCardForAiPersona(genericOpenAiVcId),
      getModelCardForAiPersona(guidanceVcId),
    ]);

    // Extract AI engine data from responses
    const getAiEngineData = (response: any) => {
      return response?.data?.lookup?.virtualContributor?.aiPersona?.modelCard
        ?.aiEngine;
    };

    // Extract and verify each engine's data
    const libraFlowEngine = getAiEngineData(libraFlowModelCard);
    const expertEngine = getAiEngineData(expertModelCard);
    const genericOpenAiEngine = getAiEngineData(genericOpenAiModelCard);
    const guidanceEngine = getAiEngineData(guidanceModelCard);

    // Verify all engine data exists
    [
      libraFlowEngine,
      expertEngine,
      genericOpenAiEngine,
      guidanceEngine,
    ].forEach(engine => {
      expect(engine).toBeDefined();
    });

    // Test LibraFlow engine properties
    expect(libraFlowEngine.isExternal).toBe(true);
    expect(libraFlowEngine.hostingLocation).toBe('Unknown');
    expect(libraFlowEngine.isUsingOpenWeightsModel).toBe(true);
    expect(libraFlowEngine.isInteractionDataUsedForTraining).toBe(null);
    expect(libraFlowEngine.canAccessWebWhenAnswering).toBe(true);
    expect(libraFlowEngine.areAnswersRestrictedToBodyOfKnowledge).toBe('Yes');
    expect(libraFlowEngine.additionalTechnicalDetails).toBeDefined();

    // Test Expert engine properties
    expect(expertEngine.isExternal).toBe(false);
    expect(expertEngine.hostingLocation).toBe('Sweden, EU');
    expect(expertEngine.isUsingOpenWeightsModel).toBe(false);
    expect(expertEngine.isInteractionDataUsedForTraining).toBe(false);
    expect(expertEngine.canAccessWebWhenAnswering).toBe(false);
    expect(expertEngine.areAnswersRestrictedToBodyOfKnowledge).toBe('Yes');
    expect(expertEngine.additionalTechnicalDetails).toBeDefined();

    // Test GenericOpenAI engine properties
    expect(genericOpenAiEngine.isExternal).toBe(true);
    expect(genericOpenAiEngine.hostingLocation).toBe('Unknown');
    expect(genericOpenAiEngine.isUsingOpenWeightsModel).toBe(true);
    expect(genericOpenAiEngine.isInteractionDataUsedForTraining).toBe(null);
    expect(genericOpenAiEngine.canAccessWebWhenAnswering).toBe(true);
    expect(genericOpenAiEngine.areAnswersRestrictedToBodyOfKnowledge).toBe(
      'No'
    );
    expect(genericOpenAiEngine.additionalTechnicalDetails).toBeDefined();

    // Test Guidance engine properties
    expect(guidanceEngine.isExternal).toBe(false);
    expect(guidanceEngine.hostingLocation).toBeDefined();
    expect(guidanceEngine.isUsingOpenWeightsModel).toBe(false);
    expect(guidanceEngine.isInteractionDataUsedForTraining).toBe(false);
    expect(guidanceEngine.canAccessWebWhenAnswering).toBe(false);
    expect(guidanceEngine.areAnswersRestrictedToBodyOfKnowledge).toBe('Yes');
    expect(guidanceEngine.additionalTechnicalDetails).toBeDefined();
  });

  it('should have different monitoring data for different engines', async () => {
    // Get model card data for different engines in parallel
    const [expertModelCard, genericOpenAiModelCard] = await Promise.all([
      getModelCardForAiPersona(expertVcId),
      getModelCardForAiPersona(genericOpenAiVcId),
    ]);

    // Get monitoring data
    const expertMonitoring =
      expertModelCard?.data?.lookup?.virtualContributor?.aiPersona?.modelCard
        ?.monitoring;
    const genericOpenAiMonitoring =
      genericOpenAiModelCard?.data?.lookup?.virtualContributor?.aiPersona
        ?.modelCard?.monitoring;

    // Verify monitoring data exists
    expect(expertMonitoring).toBeDefined();
    expect(genericOpenAiMonitoring).toBeDefined();

    // Alkemio hosted engines should have monitoring by Alkemio
    expect(expertMonitoring?.isUsageMonitoredByAlkemio).toBe(true);

    // External engines might have different monitoring settings
    expect(genericOpenAiMonitoring?.isUsageMonitoredByAlkemio).toBeDefined();
  });

  it('should have model card for registered user access', async () => {
    // Test accessing model card as non-admin user
    const externalModelCard = await getModelCardForAiPersona(
      guidanceVcId,
      TestUser.NON_SPACE_MEMBER
    );

    // Verify model card can be accessed by registered user
    expect(
      externalModelCard?.data?.lookup?.virtualContributor?.aiPersona?.modelCard
    ).toBeDefined();

    // Verify specific fields are visible to registered users
    const aiEngine =
      externalModelCard?.data?.lookup?.virtualContributor?.aiPersona?.modelCard
        ?.aiEngine;
    expect(aiEngine).toBeDefined();
    expect(aiEngine?.isExternal).toBeDefined();
    expect(aiEngine?.hostingLocation).toBeDefined();
  });
});
