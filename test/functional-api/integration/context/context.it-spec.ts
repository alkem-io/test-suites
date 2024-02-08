import '@test/utils/array.matcher';
import {
  createChallengeMutation,
  deleteChallengeCodegen,
  updateChallengeCodegen,
} from '@test/functional-api/journey/challenge/challenge.request.params';
import { getContextQuery } from './context.request.params';
import { deleteReferenceOnProfileCodegen } from '../references/references.request.params';
import {
  deleteOrganizationCodegen,
  hostNameId,
  organizationName,
} from '../../organization/organization.request.params';

import { entitiesId } from '@test/functional-api/zcommunications/communications-helper';
import { createOrgAndSpaceCodegen } from '@test/utils/data-setup/entities';
import {
  deleteSpaceCodegen,
  spaceName,
  spaceNameId,
} from '@test/functional-api/journey/space/space.request.params';

let challengeName = '';
let challengeId = '';
let uniqueTextId = '';
const taglineText = 'taglineText';
const contextBackground = 'contextBackground';
const contextVision = 'contextVision';
const contextImpact = 'contextImpact';
const contextWho = 'contextWho';
let challengeContextData = '';
const refId = '';

beforeAll(async () => {
  await createOrgAndSpaceCodegen(
    organizationName,
    hostNameId,
    spaceName,
    spaceNameId
  );
});

afterAll(async () => {
  await deleteSpaceCodegen(entitiesId.spaceId);
  await deleteOrganizationCodegen(entitiesId.organizationId);
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
    entitiesId.spaceId
  );
  challengeId = responseCreateChallenge.body.data.createChallenge.id;
  challengeContextData =
    responseCreateChallenge.body.data.createChallenge.context;
});

afterEach(async () => {
  await deleteReferenceOnProfileCodegen(refId);
  await deleteChallengeCodegen(challengeId);
});

// The suite require update / Extension

describe.skip('Context', () => {
  test.skip('should update and query challenge context and references', async () => {
    // Arrange
    // Query Challenge Context Data data
    const contextChallengeQuery = await getContextQuery(
      entitiesId.spaceId,
      challengeId
    );

    // Act
    // Update challenge context and references
    const responseUpdateChallenge = await updateChallengeCodegen(
      challengeId,
      challengeName + 'change',
      taglineText,
      contextBackground,
      contextVision,
      contextImpact,
      contextWho
    );
    const updatedChallengeData =
      responseUpdateChallenge?.data?.updateChallenge.context;

    // Query - updated context data
    const contextUpdatedChallengeQuery = await getContextQuery(
      entitiesId.spaceId,
      challengeId
    );
    const queryAfterUpdate =
      contextUpdatedChallengeQuery.body.data.space.challenge.context;

    // Assert
    expect(contextChallengeQuery.body.data.space.challenge.context).toEqual(
      challengeContextData
    );
    expect(updatedChallengeData).toEqual(queryAfterUpdate);
    expect(queryAfterUpdate.references).toHaveLength(2);
  });

  test('should update the same reference and query challenge context and references', async () => {
    // Arrange
    // Query Challenge Context Data data
    const contextChallengeQuery = await getContextQuery(
      entitiesId.spaceId,
      challengeId
    );

    // Act
    // Update challenge context and references
    const responseUpdateChallenge = await updateChallengeCodegen(
      challengeId,
      challengeName + 'change',
      taglineText,
      contextBackground,
      contextVision,
      contextImpact,
      contextWho
    );

    const updatedChallengeData =
      responseUpdateChallenge?.data?.updateChallenge.context;

    // Query - updated context data
    const contextUpdatedChallengeQuery = await getContextQuery(
      entitiesId.spaceId,
      challengeId
    );
    const queryAfterUpdate =
      contextUpdatedChallengeQuery.body.data.space.challenge.context;

    // Assert
    expect(contextChallengeQuery.body.data.space.challenge.context).toEqual(
      challengeContextData
    );
    expect(updatedChallengeData).toEqual(queryAfterUpdate);
    expect(queryAfterUpdate.references).toHaveLength(1);
  });
});
