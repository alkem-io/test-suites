import '@test/utils/array.matcher';
import {
  getOpportunityDataCodegen,
  updateOpportunityCodegen,
  removeOpportunityCodegen,
  getOpportunitiesDataCodegen,
} from './opportunity.request.params';
import {
  deleteOrganization,
  deleteOrganizationCodegen,
} from '../organization/organization.request.params';
import { removeSpace } from '../space/space.request.params';
import {
  createChallengeMutation,
  removeChallenge,
} from '../challenge/challenge.request.params';
import { uniqueId } from '@test/utils/mutations/create-mutation';
import { entitiesId } from '@test/functional-api/zcommunications/communications-helper';
import {
  createChallengeForOrgSpaceCodegen,
  createOpportunityForChallengeCodegen,
  createOrgAndSpaceCodegen,
} from '@test/utils/data-setup/entities';
import { createOpportunityCodegen } from '@test/utils/mutations/journeys/opportunity';

let opportunityName = '';
let opportunityTextId = '';
let opportunityId = '';
let additionalOpportunityId = '';
let challengeName = '';
const challengeId = '';
let additionalChallengeId = '';
const organizationName = 'opp-org-name' + uniqueId;
const hostNameId = 'opp-org-nameid' + uniqueId;
const spaceName = 'opp-eco-name' + uniqueId;
const spaceNameId = 'opp-eco-nameid' + uniqueId;

beforeEach(async () => {
  challengeName = `testChallenge ${uniqueId}`;
  opportunityName = `opportunityName ${uniqueId}`;
  opportunityTextId = `op${uniqueId}`;
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
  await removeOpportunityCodegen(entitiesId.opportunityId);

  await removeChallenge(additionalChallengeId);
  await removeChallenge(challengeId);
  await removeChallenge(entitiesId.challengeId);

  await removeSpace(entitiesId.spaceId);
  await deleteOrganizationCodegen(entitiesId.organizationId);
});

describe('Opportunities', () => {
  afterEach(async () => {
    await removeOpportunityCodegen(additionalOpportunityId);
    await removeOpportunityCodegen(opportunityId);
  });

  test('should create opportunity and query the data', async () => {
    // Act
    // Create Opportunity
    const responseCreateOpportunityOnChallenge = await createOpportunityCodegen(
      opportunityName,
      opportunityTextId,
      entitiesId.challengeId
    );
    const createOpportunityData =
      responseCreateOpportunityOnChallenge?.data?.createOpportunity;

    opportunityId = createOpportunityData?.id ?? '';

    // Query Opportunity data
    const requestQueryOpportunity = await getOpportunityDataCodegen(
      opportunityId
    );
    const requestOpportunityData =
      requestQueryOpportunity?.data?.lookup.opportunity;

    // Assert
    expect(createOpportunityData).toEqual(requestOpportunityData);
  });

  test('should update opportunity and query the data', async () => {
    // Arrange
    // Create Opportunity on Challenge
    const responseCreateOpportunityOnChallenge = await createOpportunityCodegen(
      opportunityName,
      opportunityTextId,
      entitiesId.challengeId
    );

    opportunityId =
      responseCreateOpportunityOnChallenge?.data?.createOpportunity.id ?? '';
    // Act
    // Update the created Opportunity
    const responseUpdateOpportunity = await updateOpportunityCodegen(
      opportunityId
    );
    const updateOpportunityData =
      responseUpdateOpportunity?.data?.updateOpportunity;

    // Query Opportunity data
    const requestQueryOpportunity = await getOpportunityDataCodegen(
      opportunityId
    );
    const requestOpportunityData =
      requestQueryOpportunity?.data?.lookup.opportunity;

    // Assert
    expect(updateOpportunityData).toEqual(requestOpportunityData);
  });

  test('should remove opportunity and query the data', async () => {
    // Arrange
    // Create Opportunity
    const responseCreateOpportunityOnChallenge = await createOpportunityCodegen(
      opportunityName,
      opportunityTextId,
      entitiesId.challengeId
    );
    opportunityId =
      responseCreateOpportunityOnChallenge?.data?.createOpportunity.id ?? '';

    // Act
    // Remove opportunity
    const removeOpportunityResponse = await removeOpportunityCodegen(
      opportunityId
    );

    // Query Opportunity data
    const requestQueryOpportunity = await getOpportunityDataCodegen(
      opportunityId
    );

    // Assert
    expect(responseCreateOpportunityOnChallenge.status).toBe(200);
    expect(removeOpportunityResponse?.data?.deleteOpportunity.id ?? '').toEqual(
      opportunityId
    );
    expect(requestQueryOpportunity?.error?.errors[0].message).toEqual(
      `Unable to find Opportunity with ID: ${opportunityId}`
    );
  });

  test('should get all opportunities', async () => {
    // Arrange
    // Create Opportunity
    const responseCreateOpportunityOnChallenge = await createOpportunityCodegen(
      opportunityName,
      opportunityTextId,
      entitiesId.challengeId
    );
    const oppData =
      responseCreateOpportunityOnChallenge?.data?.createOpportunity;

    opportunityName = oppData?.profile.displayName ?? '';
    opportunityId = oppData?.id ?? '';

    // Act
    // Get all opportunities
    const getAllOpportunityResponse = await getOpportunitiesDataCodegen(
      entitiesId.spaceId
    );
    console.log(getAllOpportunityResponse?.error?.errors);

    // Assert
    expect(responseCreateOpportunityOnChallenge.status).toBe(200);
    expect(
      getAllOpportunityResponse?.data?.space.opportunities
    ).toContainObject({
      nameID: `${opportunityTextId}`,
    });
  });

  test.skip('should throw an error for creating opportunity with same name/textId on different challenges', async () => {
    // Arrange
    const responseCreateChallengeTwo = await createChallengeMutation(
      `${challengeName}ch`,
      `${uniqueId}ch`,
      entitiesId.spaceId
    );
    additionalChallengeId =
      responseCreateChallengeTwo.body.data.createChallenge.id;

    // Act
    // Create Opportunity on Challange One
    const responseCreateOpportunityOnChallengeOne = await createOpportunityCodegen(
      opportunityName,
      `${opportunityTextId}new`,
      entitiesId.challengeId
    );
    opportunityId =
      responseCreateOpportunityOnChallengeOne?.data?.createOpportunity.id ?? '';

    const responseCreateOpportunityOnChallengeTwo = await createOpportunityCodegen(
      opportunityName,
      `${opportunityTextId}new`,
      additionalChallengeId
    );

    // Assert
    expect(responseCreateOpportunityOnChallengeOne.status).toBe(200);
    expect(
      responseCreateOpportunityOnChallengeTwo?.error?.errors[0].message
    ).toContain(
      `Unable to create entity: the provided nameID is already taken: ${opportunityTextId}new`
    );
  });
});

describe('DDT should not create opportunities with same nameID within the same challenge', () => {
  afterAll(async () => {
    await removeOpportunityCodegen(additionalOpportunityId);
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
      const responseCreateOpportunityOnChallenge = await createOpportunityCodegen(
        opportunityDisplayName,
        opportunityNameIdD,
        entitiesId.challengeId
      );
      const responseData = JSON.stringify(
        responseCreateOpportunityOnChallenge
      ).replace('\\', '');

      if (
        !responseCreateOpportunityOnChallenge?.error?.errors[0].message.includes(
          'errors'
        )
      ) {
        additionalOpportunityId =
          responseCreateOpportunityOnChallenge?.data?.createOpportunity.id ??
          '';
      }
      // Assert
      expect(responseData).toContain(expected);
    }
  );
});
