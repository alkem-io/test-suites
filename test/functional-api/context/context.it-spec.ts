import '@test/utils/array.matcher';
import {
  deleteChallengeCodegen,
  updateChallengeCodegen,
} from '@test/functional-api/journey/challenge/challenge.request.params';
import { getContextDataCodegen } from './context.request.params';
import { deleteReferenceOnProfileCodegen } from '../references/references.request.params';
import {
  deleteOrganizationCodegen,
  hostNameId,
  organizationName,
} from '../organization/organization.request.params';
import { createOrgAndSpaceCodegen } from '@test/utils/data-setup/entities';
import {
  deleteSpaceCodegen,
  spaceName,
  spaceNameId,
} from '@test/functional-api/journey/space/space.request.params';
import { createChallengeCodegen } from '@test/utils/mutations/journeys/challenge';
import { entitiesId } from '../roles/community/communications-helper';

let challengeName = '';
let challengeId = '';
let uniqueTextId = '';
const taglineText = 'taglineText';
const contextBackground = 'contextBackground';
const contextVision = 'contextVision';
const contextImpact = 'contextImpact';
const contextWho = 'contextWho';
let challengeContextData: any;
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
  const responseCreateChallenge = await createChallengeCodegen(
    challengeName,
    uniqueTextId,
    entitiesId.spaceId
  );
  const challengeData = responseCreateChallenge?.data?.createChallenge;
  challengeId = challengeData?.id ?? '';
  challengeContextData = challengeData?.context ?? {};
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
    const contextChallengeQuery = await getContextDataCodegen(
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
    const contextUpdatedChallengeQuery = await getContextDataCodegen(
      entitiesId.spaceId,
      challengeId
    );
    const queryAfterUpdate =
      contextUpdatedChallengeQuery?.data?.space.challenge.context;

    // Assert
    expect(contextChallengeQuery?.data?.space.challenge.context).toEqual(
      challengeContextData
    );
    expect(updatedChallengeData).toEqual(queryAfterUpdate);
  });

  test('should update the same reference and query challenge context and references', async () => {
    // Arrange
    // Query Challenge Context Data data
    const contextChallengeQuery = await getContextDataCodegen(
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
    const contextUpdatedChallengeQuery = await getContextDataCodegen(
      entitiesId.spaceId,
      challengeId
    );
    const queryAfterUpdate =
      contextUpdatedChallengeQuery?.data?.space.challenge.context;

    // Assert
    expect(contextChallengeQuery?.data?.space.challenge.context).toEqual(
      challengeContextData
    );
    expect(updatedChallengeData).toEqual(queryAfterUpdate);
  });
});
