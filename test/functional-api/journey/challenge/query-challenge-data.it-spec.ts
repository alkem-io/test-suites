import '@test/utils/array.matcher';

import {
  createSubspaceCodegen,
  getSubspaceDataCodegen,
} from './challenge.request.params';
import {
  createOrganization,
  deleteOrganization,
} from '@test/functional-api/contributor-management/organization/organization.request.params';
import {
  deleteSpace,
  updateSpaceContext,
} from '../space/space.request.params';
import { entitiesId } from '@test/types/entities-helper';
// import { uniqueId } from '@test/utils/mutations/create-mutation';

import { createOrgAndSpace } from '@test/utils/data-setup/entities';
//import { uniqueId } from '@test/utils/mutations/journeys/challenge';
export const uniqueId = Math.random()
  .toString(12)
  .slice(-6);

let opportunityName = '';
let opportunityNameId = '';
let opportunityId = '';
let challengeName = '';
let challengeId = '';
const additionalChallengeId = '';
let uniqueTextId = '';
let organizationNameTest = '';
let organizationIdTest = '';
const organizationName = 'org-name' + uniqueId;
const hostNameId = 'org-nameid' + uniqueId;
const spaceName = 'eco-name' + uniqueId;
const spaceNameId = 'eco-nameid' + uniqueId;

beforeAll(async () => {
  await createOrgAndSpace(
    organizationName,
    hostNameId,
    spaceName,
    spaceNameId
  );

  organizationNameTest = `QA organizationNameTest ${uniqueId}`;

  // Create Organization
  const responseCreateOrganization = await createOrganization(
    organizationNameTest,
    'org' + uniqueId
  );
  organizationIdTest =
    responseCreateOrganization.data?.createOrganization.id ?? '';
});

afterAll(async () => {
  await deleteSpace(entitiesId.spaceId);
  await deleteOrganization(entitiesId.organization.id);
  await deleteOrganization(organizationIdTest);
});

afterEach(async () => {
  await deleteSpace(opportunityId);
  await deleteSpace(additionalChallengeId);
  await deleteSpace(challengeId);
});

beforeEach(async () => {
  uniqueTextId = Math.random()
    .toString(36)
    .slice(-6);
  challengeName = `testChallenge ${uniqueTextId}`;
  opportunityName = `opportunityName ${uniqueTextId}`;
  opportunityNameId = `opp${uniqueTextId}`;
  organizationNameTest = `organizationNameTest ${uniqueTextId}`;
  // Create Challenge
  const responseCreateChallenge = await createSubspaceCodegen(
    challengeName,
    uniqueTextId,
    entitiesId.spaceId
  );
  challengeId = responseCreateChallenge.data?.createSubspace.id ?? '';
});

describe('Query Challenge data', () => {
  test('should query community through challenge', async () => {
    // Act
    const responseQueryData = await getSubspaceDataCodegen(
      entitiesId.spaceId,
      challengeId
    );

    // Assert
    expect(responseQueryData.data?.space.subspace?.profile.displayName).toEqual(
      challengeName
    );
  });

  test('should query opportunity through challenge', async () => {
    // Act
    // Create Opportunity
    const responseCreateOpportunityOnChallenge = await createSubspaceCodegen(
      opportunityName,
      opportunityNameId,
      challengeId
    );

    opportunityId =
      responseCreateOpportunityOnChallenge.data?.createSubspace.id ?? '';

    // Query Opportunity data through Challenge query
    const responseQueryData = await getSubspaceDataCodegen(
      entitiesId.spaceId,
      challengeId
    );

    // Assert
    expect(responseQueryData.data?.space.subspace?.subspaces).toHaveLength(1);
    expect(
      responseQueryData.data?.space.subspace?.subspaces?.[0].profile.displayName
    ).toEqual(opportunityName);
    expect(
      responseQueryData.data?.space.subspace?.subspaces?.[0].nameID
    ).toEqual(opportunityNameId);
    expect(responseQueryData.data?.space.subspace?.subspaces?.[0].id).toEqual(
      opportunityId
    );
  });

  test('should create opportunity and query the data', async () => {
    // Act
    // Create Opportunity
    const responseCreateOpportunityOnChallenge = await createSubspaceCodegen(
      opportunityName,
      opportunityNameId,
      challengeId
    );

    const createOpportunityData =
      responseCreateOpportunityOnChallenge.data?.createSubspace;

    opportunityId =
      responseCreateOpportunityOnChallenge.data?.createSubspace.id ?? '';

    // Query Opportunity data
    const requestQueryOpportunity = await getSubspaceDataCodegen(
      entitiesId.spaceId,
      opportunityId
    );
    const requestOpportunityData = requestQueryOpportunity.data?.space.subspace;

    // Assert
    expect(createOpportunityData).toEqual(requestOpportunityData);
  });

  test('should update a challenge', async () => {
    // Arrange
    const context = {
      vision: 'test vision update',
      impact: 'test impact update',
      who: 'test who update',
    };
    const response = await updateSpaceContext(
      challengeId,
      challengeName + 'change',
      context
    );
    const updatedChallenge = response.data?.updateSpace;

    // Act
    const getChallengeDatas = await getSubspaceDataCodegen(
      entitiesId.spaceId,
      challengeId
    );

    // Assert
    expect(updatedChallenge?.profile.displayName).toEqual(
      challengeName + 'change'
    );
    expect(getChallengeDatas.data?.space.subspace?.profile.displayName).toEqual(
      challengeName + 'change'
    );
    expect(getChallengeDatas.data?.space.subspace?.context.impact).toEqual(
      context.impact
    );
  });
});
