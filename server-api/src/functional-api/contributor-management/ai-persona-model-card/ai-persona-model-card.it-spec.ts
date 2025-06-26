/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  TestScenarioConfig,
  TestScenarioFactory,
  TestUser,
  TestUserManager,
} from '@alkemio/tests-lib';

import { UniqueIDGenerator } from '@alkemio/tests-lib';
import {
  createVirtualContributorOnAccountSpaceBased,
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
import { OrganizationWithSpaceModel } from '@alkemio/tests-lib/scenario/models/OrganizationWithSpaceModel';
import {
  AiPersonaModelCardEntry,
  AiPersonaModelCardEntryFlagName,
} from '@alkemio/tests-lib/core/generated/alkemio-schema';

const uniqueId = UniqueIDGenerator.getID();

let vcId = '';
let vcLicensePlanId = '';
const spaceNameVC = 'model-card-name' + uniqueId;
const spaceNameIdVC = 'model-card-nameid' + uniqueId;
let vcSpaceId = '';
const vcName = 'modelCardVcName' + uniqueId;

let baseScenario: OrganizationWithSpaceModel;

const scenarioConfig: TestScenarioConfig = {
  name: 'ai-persona-model-card',
};

describe('AI Persona Model Card', () => {
  beforeAll(async () => {
    baseScenario = await TestScenarioFactory.createBaseScenario(scenarioConfig);

    const vcLicensePlan = await getLicensePlanByName(
      'FEATURE_VIRTUAL_CONTRIBUTORS'
    );
    vcLicensePlanId = vcLicensePlan[0].id;

    await assignLicensePlanToAccount(
      baseScenario.organization.accountId,
      vcLicensePlanId
    );

    const responceVcSpace = await createSpaceAndGetData(
      spaceNameVC,
      spaceNameIdVC,
      TestUserManager.users.betaTester.accountId
    );
    vcSpaceId = responceVcSpace?.data?.lookup?.space?.id ?? '';
  });

  afterAll(async () => {
    await deleteVirtualContributorOnAccount(vcId).catch();
    await deleteSpace(vcSpaceId).catch();
  });

  it('should create a virtual contributor with a model card', async () => {
    // Create a virtual contributor on the account
    const vcData = await createVirtualContributorOnAccountSpaceBased(
      vcName,
      baseScenario.organization.accountId,
      vcSpaceId,
      TestUser.GLOBAL_ADMIN
    );

    vcId = vcData?.data?.createVirtualContributor?.id ?? '';
    expect(vcId).toBeDefined();

    // Query the VC data to get AI Persona ID
    const vcDataQuery = await queryVCData(vcId);
    const aiPersonaId =
      vcDataQuery?.data?.lookup.virtualContributor?.aiPersona?.id ?? '';
    expect(aiPersonaId).toBeDefined();

    // Query model card data
    const modelCardData = await getModelCardForAiPersona(vcId);

    // Verify model card exists
    expect(
      modelCardData?.data?.lookup?.virtualContributor?.aiPersona?.modelCard
    ).toBeDefined();
  });

  it('should have correct space usage data in model card', async () => {
    // Query model card data
    const modelCardData = await getModelCardForAiPersona(vcId);
    const spaceUsage =
      modelCardData?.data?.lookup.virtualContributor?.aiPersona?.modelCard
        ?.spaceUsage;

    // Verify space usage data exists
    expect(spaceUsage).toBeDefined();
    expect(spaceUsage?.length).toBeGreaterThan(0);

    // Verify expected model card entries are present
    const entries = spaceUsage?.map(
      (entry: {
        modelCardEntry: AiPersonaModelCardEntry;
        flags: { name: AiPersonaModelCardEntryFlagName }[];
      }) => entry.modelCardEntry
    );
    expect(entries).toContain(AiPersonaModelCardEntry.SpaceCapabilities);
    expect(entries).toContain(AiPersonaModelCardEntry.SpaceDataAccess);
    expect(entries).toContain(AiPersonaModelCardEntry.SpaceRoleRequired);

    // Verify each entry has appropriate flags
    const capabilitiesEntry = spaceUsage?.find(
      (entry: {
        modelCardEntry: AiPersonaModelCardEntry;
        flags: { name: AiPersonaModelCardEntryFlagName }[];
      }) => entry.modelCardEntry === AiPersonaModelCardEntry.SpaceCapabilities
    );
    expect(capabilitiesEntry?.flags).toBeDefined();
    expect(capabilitiesEntry?.flags.length).toBeGreaterThan(0);

    // Check for specific flags
    const flagNames = capabilitiesEntry?.flags.map(
      (flag: { name: AiPersonaModelCardEntryFlagName }) => flag.name
    );
    expect(flagNames).toContain(
      AiPersonaModelCardEntryFlagName.SpaceCapabilityTagging
    );
  });

  it('should have correct AI engine data in model card', async () => {
    // Query model card data
    const modelCardData = await getModelCardForAiPersona(vcId);
    const aiEngine =
      modelCardData?.data?.lookup.virtualContributor?.aiPersona?.modelCard
        ?.aiEngine;

    // Verify AI engine data exists
    expect(aiEngine).toBeDefined();

    // Verify all required fields are present
    expect(aiEngine?.isExternal).toBeDefined();
    expect(aiEngine?.hostingLocation).toBeDefined();
    expect(aiEngine?.isUsingOpenWeightsModel).toBeDefined();
    expect(aiEngine?.areAnswersRestrictedToBodyOfKnowledge).toBeDefined();
    expect(aiEngine?.canAccessWebWhenAnswering).toBeDefined();
    expect(aiEngine?.additionalTechnicalDetails).toBeDefined();

    // Verify values for typical Mistral engine (default for space-based VCs)
    expect(typeof aiEngine?.isExternal).toBe('boolean');
    expect(typeof aiEngine?.canAccessWebWhenAnswering).toBe('boolean');
  });

  it('should have correct monitoring data in model card', async () => {
    // Query model card data
    const modelCardData = await getModelCardForAiPersona(vcId);
    const monitoring =
      modelCardData?.data?.lookup.virtualContributor?.aiPersona?.modelCard
        ?.monitoring;

    // Verify monitoring data exists
    expect(monitoring).toBeDefined();

    // Verify isUsageMonitoredByAlkemio is present and true
    expect(monitoring?.isUsageMonitoredByAlkemio).toBeDefined();
    expect(monitoring?.isUsageMonitoredByAlkemio).toBe(true);
  });
});
