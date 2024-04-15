import {
  createSubspaceCodegen,
  getSubspaceDataCodegen,
} from './challenge.request.params';
import '@test/utils/array.matcher';
import { deleteOrganizationCodegen } from '@test/functional-api/organization/organization.request.params';
import {
  deleteSpaceCodegen,
  updateSpaceContextCodegen,
} from '../space/space.request.params';
import { entitiesId } from '@test/functional-api/roles/community/communications-helper';
import { uniqueId } from '@test/utils/mutations/create-mutation';
import { users } from '@test/utils/queries/users-data';
import { createOrgAndSpaceCodegen } from '@test/utils/data-setup/entities';

let challengeName = '';
let challengeId = '';
let additionalChallengeId = '';
const organizationName = 'flowch-org-name' + uniqueId;
const hostNameId = 'flowch-org-nameid' + uniqueId;
const spaceName = 'flowch-eco-name' + uniqueId;
const spaceNameId = 'flowch-eco-nameid' + uniqueId;

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
  challengeName = `fl-ch-dname-${uniqueId}`;

  const responseCreateChallenge = await createSubspaceCodegen(
    challengeName,
    uniqueId,
    entitiesId.spaceId
  );
  challengeId = responseCreateChallenge.data?.createSubspace.id ?? '';
});

afterEach(async () => {
  await deleteSpaceCodegen(challengeId);
});

describe('Flows challenge', () => {
  test('should not result unassigned users to a challenge', async () => {
    // Act
    const responseGroupQuery = await getSubspaceDataCodegen(
      entitiesId.spaceId,
      challengeId
    );

    // Assert
    expect(responseGroupQuery.status).toBe(200);
    expect(
      responseGroupQuery.data?.space.subspace?.community?.memberUsers
    ).toHaveLength(1);
    expect(
      responseGroupQuery.data?.space.subspace?.community?.leadUsers
    ).toHaveLength(1);
    expect(
      responseGroupQuery.data?.space?.subspace?.community?.memberUsers?.[0]
        .email
    ).toEqual(users.globalAdminEmail);
  });

  test('should  modify challenge name to allready existing challenge name and/or textId', async () => {
    // Arrange
    // Create second challenge and get its id and name
    const responseSecondChallenge = await createSubspaceCodegen(
      challengeName + challengeName,
      uniqueId + uniqueId,
      entitiesId.spaceId
    );
    const secondchallengeName =
      responseSecondChallenge.data?.createSubspace.profile.displayName ?? '';
    additionalChallengeId =
      responseSecondChallenge.data?.createSubspace.id ?? '';

    // Act
    const responseUpdateChallenge = await updateSpaceContextCodegen(
      challengeId,
      secondchallengeName,
      {
        vision: 'test vision update',
        impact: 'test impact update',
        who: 'test who update',
      }
    );

    // Assert
    expect(responseUpdateChallenge.status).toBe(200);
    expect(
      responseUpdateChallenge.data?.updateSpace.profile.displayName
    ).toEqual(secondchallengeName);
    await deleteSpaceCodegen(additionalChallengeId);
  });

  test('should creating 2 challenges with same name', async () => {
    // Act
    // Create second challenge with same name
    const response = await createSubspaceCodegen(
      challengeName,
      `${uniqueId}-2`,
      entitiesId.spaceId
    );
    const challengeData = response.data?.createSubspace;
    additionalChallengeId = challengeData?.id ?? '';

    // Assert
    expect(challengeData?.profile.displayName).toContain(challengeName);
    await deleteSpaceCodegen(additionalChallengeId);
  });

  test('should throw error - creating 2 challenges with different name and same nameId', async () => {
    // Act
    // Create second challenge with same textId
    const response = await createSubspaceCodegen(
      challengeName + challengeName,
      uniqueId,
      entitiesId.spaceId
    );
    // Assert
    expect(JSON.stringify(response)).toContain(
      `Unable to create entity: the provided nameID is already taken: ${uniqueId}`
    );
  });
});
