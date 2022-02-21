import '@test/utils/array.matcher';
import {
  createChallengeMutation,
  removeChallenge,
  updateChallenge,
} from '@test/functional-api/integration/challenge/challenge.request.params';
import { getContextQuery } from './context.request.params';
import {
  createReferenceOnContext,
  removeReference,
} from '../references/references.request.params';
import {
  createOrganization,
  deleteOrganization,
  hostNameId,
  organizationName,
} from '../organization/organization.request.params';
import {
  createTestHub,
  hubName,
  hubNameId,
  removeHub,
} from '../hub/hub.request.params';

let challengeName = '';
let challengeId = '';
let uniqueTextId = '';
const taglineText = 'taglineText';
const contextBackground = 'contextBackground';
const contextVision = 'contextVision';
const contextImpact = 'contextImpact';
const contextWho = 'contextWho';
const refName = 'refName';
const refUri = 'https://test.alekm.io/';
const tagsArray = ['tag1', 'tag2'];
let challengeContextData = '';
let challengeRefName = '';
let challengeRefUri = '';
let contextIdChallenge = '';
let refId = '';
let contextId = '';
let hubId = '';
let organizationId = '';

beforeAll(async () => {
  const responseOrg = await createOrganization(organizationName, hostNameId);
  organizationId = responseOrg.body.data.createOrganization.id;
  let responseEco = await createTestHub(hubName, hubNameId, organizationId);
  hubId = responseEco.body.data.createHub.id;
});

afterAll(async () => {
  await removeHub(hubId);
  await deleteOrganization(organizationId);
});

beforeEach(async () => {
  uniqueTextId = Math.random()
    .toString(36)
    .slice(-6);
  challengeName = `testChallenge ${uniqueTextId}`;
  // Create Challenge
  const responseCreateChallenge = await createChallengeMutation(
    challengeName,
    uniqueTextId,
    hubId
  );
  challengeId = responseCreateChallenge.body.data.createChallenge.id;
  challengeContextData =
    responseCreateChallenge.body.data.createChallenge.context;
  challengeRefName =
    responseCreateChallenge.body.data.createChallenge.context.references[0]
      .name;
  challengeRefUri =
    responseCreateChallenge.body.data.createChallenge.context.references[0].uri;
  contextIdChallenge =
    responseCreateChallenge.body.data.createChallenge.context.id;
  refId =
    responseCreateChallenge.body.data.createChallenge.context.references[0].id;
});

afterEach(async () => {
  await removeReference(refId);
  await removeChallenge(challengeId);
});

describe('Context', () => {
  test.skip('should update and query challenge context and references', async () => {
    // Arrange
    // Query Challenge Context Data data
    const contextChallengeQuery = await getContextQuery(hubId, challengeId);

    // Act
    // Update challenge context and references
    const responseUpdateChallenge = await updateChallenge(
      challengeId,
      challengeName + 'change',
      taglineText,
      contextBackground,
      contextVision,
      contextImpact,
      contextWho,
      tagsArray
    );
    const updatedChallengeData =
      responseUpdateChallenge.body.data.updateChallenge.context;

    // Query - updated context data
    const contextUpdatedChallengeQuery = await getContextQuery(
      hubId,
      challengeId
    );
    const queryAfterUpdate =
      contextUpdatedChallengeQuery.body.data.hub.challenge.context;

    // Assert
    expect(contextChallengeQuery.body.data.hub.challenge.context).toEqual(
      challengeContextData
    );
    expect(updatedChallengeData).toEqual(queryAfterUpdate);
    expect(queryAfterUpdate.references).toHaveLength(2);
  });

  test('should update the same reference and query challenge context and references', async () => {
    // Arrange
    // Query Challenge Context Data data
    const contextChallengeQuery = await getContextQuery(hubId, challengeId);
    contextId = contextChallengeQuery.body.data.hub.challenge.context.id;

    // Act
    // Update challenge context and references
    const responseUpdateChallenge = await updateChallenge(
      challengeId,
      challengeName + 'change',
      taglineText,
      contextBackground,
      contextVision,
      contextImpact,
      contextWho,
      tagsArray
    );

    const updatedChallengeData =
      responseUpdateChallenge.body.data.updateChallenge.context;

    // Query - updated context data
    const contextUpdatedChallengeQuery = await getContextQuery(
      hubId,
      challengeId
    );
    const queryAfterUpdate =
      contextUpdatedChallengeQuery.body.data.hub.challenge.context;

    // Assert
    expect(contextChallengeQuery.body.data.hub.challenge.context).toEqual(
      challengeContextData
    );
    expect(updatedChallengeData).toEqual(queryAfterUpdate);
    expect(queryAfterUpdate.references).toHaveLength(1);
  });

  test.skip('should not create reference using same name on context', async () => {
    // Act
    // Update challenge context and references
    const responseCreateContextReference = await createReferenceOnContext(
      contextIdChallenge,
      challengeRefName,
      refUri
    );

    // Query - updated context data
    const contextUpdatedChallengeQuery = await getContextQuery(
      hubId,
      challengeId
    );
    const queryAfterUpdate =
      contextUpdatedChallengeQuery.body.data.hub.challenge.context;

    // Assert
    expect(
      responseCreateContextReference.body.data.createReferenceOnContext.name
    ).toEqual(challengeRefName);
    expect(
      responseCreateContextReference.body.data.createReferenceOnContext.uri
    ).toEqual(challengeRefUri);
    expect(queryAfterUpdate.references[0].name).toEqual(challengeRefName);
    expect(queryAfterUpdate.references[0].uri).toEqual(challengeRefUri);

    expect(queryAfterUpdate.references).toHaveLength(1);
  });

  test.skip('should create reference using different name on context', async () => {
    // Act
    // Update challenge context and references
    await createReferenceOnContext(contextIdChallenge, refName, refUri);

    // Query - updated context data
    const contextUpdatedChallengeQuery = await getContextQuery(
      hubId,
      challengeId
    );
    const queryAfterUpdate =
      contextUpdatedChallengeQuery.body.data.hub.challenge.context;

    // Assert
    expect(queryAfterUpdate.references[0].name).toEqual(challengeRefName);
    expect(queryAfterUpdate.references[0].uri).toEqual(challengeRefUri);
    expect(queryAfterUpdate.references[1].name).toEqual(refName);
    expect(queryAfterUpdate.references[1].uri).toEqual(refUri);

    expect(queryAfterUpdate.references).toHaveLength(2);
  });
});
