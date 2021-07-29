import '@test/utils/array.matcher';
import {
  createChallangeMutation,
  removeChallangeMutation,
} from '@test/functional-api/integration/challenge/challenge.request.params';
import {
  createAspectOnOpportunityMutation,
  removeAspectMutation,
  getAspectPerOpportunity,
  updateAspectMutation,
} from './aspect.request.params';
import {
  createOpportunityMutation,
  removeOpportunityMutation,
} from '@test/functional-api/integration/opportunity/opportunity.request.params';
import {
  createOrganisationMutation,
  deleteOrganisationMutation,
  hostNameId,
  organisationName,
} from '../organisation/organisation.request.params';
import {
  createTestEcoverse,
  ecoverseName,
  ecoverseNameId,
  removeEcoverseMutation,
} from '../ecoverse/ecoverse.request.params';

let organisationId = '';
let ecoverseId = '';
let opportunityName = '';
let opportunityTextId = '';
let opportunityId = '';
let challengeName = '';
let challengeId = '';
let aspectId = '';
let aspectTitle = '';
let aspectFrame = '';
let aspectExplanation = '';
let aspectDataCreate = '';
let uniqueTextId = '';
let contextId = '';
let aspectCountPerOpportunity = async (): Promise<number> => {
  const responseQuery = await getAspectPerOpportunity(opportunityId);
  let response = responseQuery.body.data.ecoverse.opportunity.context.aspects;
  return response;
};

let aspectDataPerOpportunity = async (): Promise<String> => {
  const responseQuery = await getAspectPerOpportunity(opportunityId);
  let response =
    responseQuery.body.data.ecoverse.opportunity.context.aspects[0];
  return response;
};

beforeAll(async () => {
  const responseOrg = await createOrganisationMutation(
    organisationName,
    hostNameId
  );
  organisationId = responseOrg.body.data.createOrganisation.id;
  let responseEco = await createTestEcoverse(
    ecoverseName,
    ecoverseNameId,
    organisationId
  );
  ecoverseId = responseEco.body.data.createEcoverse.id;
});

afterAll(async () => {
  await removeEcoverseMutation(ecoverseId);
  await deleteOrganisationMutation(organisationId);
});

beforeEach(async () => {
  uniqueTextId = Math.random()
    .toString(36)
    .slice(-6);
  challengeName = `testChallenge ${uniqueTextId}`;
  opportunityName = `opportunityName ${uniqueTextId}`;
  opportunityTextId = `opp${uniqueTextId}`;
  aspectTitle = `aspectTitle-${uniqueTextId}`;
  aspectFrame = `aspectFrame-${uniqueTextId}`;
  aspectExplanation = `aspectExplanation-${uniqueTextId}`;
  // Create Challenge
  const responseCreateChallenge = await createChallangeMutation(
    challengeName,
    uniqueTextId,
    ecoverseId
  );
  challengeId = responseCreateChallenge.body.data.createChallenge.id;

  // Create Opportunity
  const responseCreateOpportunityOnChallenge = await createOpportunityMutation(
    challengeId,
    opportunityName,
    opportunityTextId
  );

  opportunityId =
    responseCreateOpportunityOnChallenge.body.data.createOpportunity.id;
  contextId =
    responseCreateOpportunityOnChallenge.body.data.createOpportunity.context.id;

  // Create Aspect on opportunity group
  const createAspectResponse = await createAspectOnOpportunityMutation(
    contextId,
    aspectTitle,
    aspectFrame,
    aspectExplanation
  );
  aspectDataCreate = createAspectResponse.body.data.createAspect;
  aspectId = createAspectResponse.body.data.createAspect.id;
});

afterEach(async () => {
  await removeAspectMutation(aspectId);
  await removeOpportunityMutation(opportunityId);
  await removeChallangeMutation(challengeId);
});

describe('Aspect', () => {
  test('should assert created aspect on opportunity', async () => {
    // Assert
    expect(await aspectDataPerOpportunity()).toEqual(aspectDataCreate);
  });

  test('should create 2 aspects for the same opportunity', async () => {
    // Act
    // Create second aspect with different names
    await createAspectOnOpportunityMutation(
      contextId,
      aspectTitle + aspectTitle,
      aspectFrame,
      aspectExplanation
    );
    // Assert
    expect(await aspectCountPerOpportunity()).toHaveLength(2);
  });

  test('should NOT create 2 aspects for the same opportunity with same name', async () => {
    // Act
    // Create second aspects with same names
    const responseSecondAspect = await createAspectOnOpportunityMutation(
      contextId,
      aspectTitle,
      aspectFrame,
      aspectExplanation
    );

    // Assert
    expect(await aspectCountPerOpportunity()).toHaveLength(1);
    expect(responseSecondAspect.body.errors[0].message).toEqual(
      `Already have an aspect with the provided title: ${aspectTitle}`
    );
  });

  test('should update aspect', async () => {
    // Act
    // Update Aspect
    const responseUpdateAspect = await updateAspectMutation(
      aspectId,
      `${aspectTitle} + change`,
      `${aspectFrame} + change`,
      `${aspectExplanation} + change`
    );
    const responseUpdateAspectData =
      responseUpdateAspect.body.data.updateAspect;

    // Assert
    expect(await aspectCountPerOpportunity()).toHaveLength(1);
    expect(responseUpdateAspectData).toEqual(await aspectDataPerOpportunity());
  });

  test('should remove created aspect from opportunity', async () => {
    // Act
    // Remove aspect
    const responseRemoveAaspect = await removeAspectMutation(aspectId);

    // Assert
    expect(await aspectCountPerOpportunity()).toHaveLength(0);
    expect(responseRemoveAaspect.body.data.deleteAspect.id).toEqual(aspectId);
  });
});
