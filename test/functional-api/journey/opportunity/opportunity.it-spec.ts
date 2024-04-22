import '@test/utils/array.matcher';
import {
  getOpportunityDataCodegen,
  updateOpportunityCodegen,
  deleteOpportunityCodegen,
} from './opportunity.request.params';
import { deleteOrganizationCodegen } from '@test/functional-api/organization/organization.request.params';
import {
  deleteSpaceCodegen,
  updateSpaceContextCodegen,
} from '../space/space.request.params';
import {
  createSubspaceCodegen,
  getSubspaceDataCodegen,
} from '../challenge/challenge.request.params';
import { uniqueId } from '@test/utils/mutations/create-mutation';
import { entitiesId } from '@test/functional-api/roles/community/communications-helper';
import {
  createChallengeForOrgSpaceCodegen,
  createOpportunityForChallengeCodegen,
  createOrgAndSpaceCodegen,
} from '@test/utils/data-setup/entities';
import { createOpportunityCodegen } from '@test/utils/mutations/journeys/opportunity';
import { createChallengeCodegen } from '@test/utils/mutations/journeys/challenge';

let opportunityName = '';
let opportunityNameId = '';
let opportunityId = '';
let additionalOpportunityId: string;
let challengeName = '';
let additionalChallengeId = '';
const organizationName = 'opp-org-name' + uniqueId;
const hostNameId = 'opp-org-nameid' + uniqueId;
const spaceName = 'opp-eco-name' + uniqueId;
const spaceNameId = 'opp-eco-nameid' + uniqueId;

beforeEach(async () => {
  challengeName = `testChallenge ${uniqueId}`;
  opportunityName = `opportunityName ${uniqueId}`;
  opportunityNameId = `op${uniqueId}`;
});

beforeAll(async () => {
  opportunityName = 'post-opp';
  challengeName = 'post-chal';
  await createOrgAndSpaceCodegen(
    organizationName,
    hostNameId,
    spaceName,
    spaceNameId
  );
  await createChallengeForOrgSpaceCodegen(challengeName);
  await createOpportunityForChallengeCodegen(opportunityName);
});

afterAll(async () => {
  await deleteOpportunityCodegen(entitiesId.opportunityId);
  await deleteSpaceCodegen(additionalChallengeId);
  await deleteSpaceCodegen(entitiesId.challengeId);
  await deleteSpaceCodegen(entitiesId.spaceId);
  await deleteOrganizationCodegen(entitiesId.organizationId);
});

describe('Opportunities', () => {
  afterEach(async () => {
    await deleteOpportunityCodegen(opportunityId);
  });

  test('should create opportunity and query the data', async () => {
    // Act
    // Create Opportunity
    const responseCreateOpportunityOnChallenge = await createSubspaceCodegen(
      opportunityName,
      opportunityNameId,
      entitiesId.challengeId
    );
    const createOpportunityData =
      responseCreateOpportunityOnChallenge?.data?.createSubspace;

    opportunityId = createOpportunityData?.id ?? '';

    // Query Opportunity data
    const requestQueryOpportunity = await getSubspaceDataCodegen(
      entitiesId.spaceId,
      opportunityId
    );
    const requestOpportunityData =
      requestQueryOpportunity?.data?.space.subspace;

    // Assert
    expect(createOpportunityData).toEqual(requestOpportunityData);
  });

  test('should update opportunity and query the data', async () => {
    // Arrange
    // Create Opportunity on Challenge
    const responseCreateOpportunityOnChallenge = await createSubspaceCodegen(
      opportunityName,
      opportunityNameId,
      entitiesId.challengeId
    );

    opportunityId =
      responseCreateOpportunityOnChallenge?.data?.createSubspace.id ?? '';
    // Act
    // Update the created Opportunity
    const responseUpdateOpportunity = await updateSpaceContextCodegen(
      opportunityId
    );
    const updateOpportunityData = responseUpdateOpportunity?.data?.updateSpace;

    // Query Opportunity data
    const requestQueryOpportunity = await getSubspaceDataCodegen(
      entitiesId.spaceId,
      opportunityId
    );
    const requestOpportunityData =
      requestQueryOpportunity?.data?.space.subspace;

    // Assert
    expect(updateOpportunityData?.profile).toEqual(
      requestOpportunityData?.profile
    );
    expect(updateOpportunityData?.context).toEqual(
      requestOpportunityData?.context
    );
  });

  test('should remove opportunity and query the data', async () => {
    // Arrange
    // Create Opportunity
    const responseCreateOpportunityOnChallenge = await createSubspaceCodegen(
      opportunityName,
      opportunityNameId,
      entitiesId.challengeId
    );
    opportunityId =
      responseCreateOpportunityOnChallenge?.data?.createSubspace.id ?? '';

    // Act
    // Remove opportunity
    const removeOpportunityResponse = await deleteSpaceCodegen(opportunityId);

    // Query Opportunity data
    const requestQueryOpportunity = await getSubspaceDataCodegen(
      entitiesId.spaceId,
      opportunityId
    );

    // Assert
    expect(responseCreateOpportunityOnChallenge.status).toBe(200);
    expect(removeOpportunityResponse?.data?.deleteSpace.id ?? '').toEqual(
      opportunityId
    );
    expect(requestQueryOpportunity?.error?.errors[0].message).toEqual(
      `Unable to find subspace with ID: '${opportunityId}'`
    );
  });

  test('should throw an error for creating opportunity with same name/NameId on different challenges', async () => {
    // Arrange
    const responseCreateChallengeTwo = await createSubspaceCodegen(
      `${challengeName}ch`,
      `${uniqueId}ch`,
      entitiesId.spaceId
    );
    additionalChallengeId =
      responseCreateChallengeTwo?.data?.createSubspace.id ?? '';

    // Act
    // Create Opportunity on Challange One
    const responseCreateOpportunityOnChallengeOne = await createSubspaceCodegen(
      opportunityName,
      `${opportunityNameId}new`,
      entitiesId.challengeId
    );
    opportunityId =
      responseCreateOpportunityOnChallengeOne?.data?.createSubspace.id ?? '';

    const responseCreateOpportunityOnChallengeTwo = await createOpportunityCodegen(
      opportunityName,
      `${opportunityNameId}new`,
      additionalChallengeId
    );

    // Assert
    expect(responseCreateOpportunityOnChallengeOne.status).toBe(200);
    expect(
      responseCreateOpportunityOnChallengeTwo?.error?.errors[0].message
    ).toContain(
      `Unable to create entity: the provided nameID is already taken: ${opportunityNameId}new`
    );
  });
});

describe('DDT should not create opportunities with same nameID within the same challenge', () => {
  afterAll(async () => {
    await deleteSpaceCodegen(additionalOpportunityId);
  });
  // Arrange
  test.each`
    opportunityDisplayName | opportunityNameIdD | expected
    ${'opp name a'}        | ${'opp-nameid-a'}  | ${'nameID":"opp-nameid-a'}
    ${'opp name b'}        | ${'opp-nameid-a'}  | ${'Unable to create entity: the provided nameID is already taken: opp-nameid-a'}
  `(
    'should expect: "$expected" for opportunity creation with name: "$opportunityDisplayName" and nameID: "$opportunityNameIdD"',
    async ({ opportunityDisplayName, opportunityNameIdD, expected }) => {
      // Act
      // Create Opportunity
      const responseCreateOpportunityOnChallenge = await createSubspaceCodegen(
        opportunityDisplayName,
        opportunityNameIdD,
        entitiesId.challengeId
      );
      const responseData = JSON.stringify(
        responseCreateOpportunityOnChallenge
      ).replace('\\', '');

      if (!responseCreateOpportunityOnChallenge?.error) {
        additionalOpportunityId =
          responseCreateOpportunityOnChallenge?.data?.createSubspace.id ?? '';
      }

      // Assert
      expect(responseData).toContain(expected);
    }
  );
});
