import '@test/utils/array.matcher';
import { createSubspaceCodegen } from '../challenge/challenge.request.params';
import { deleteSpace } from '../space/space.request.params';
import { TestUser } from '@test/utils/token.helper';
import { users } from '@test/utils/queries/users-data';
import {
  createChallengeWithUsers,
  createOrgAndSpaceWithUsers,
} from '@test/utils/data-setup/entities';
import {
  assignRoleToUser,
  removeRoleFromUser,
} from '@test/functional-api/roleset/roles-request.params';
import { CommunityRoleType } from '@test/generated/alkemio-schema';
import { deleteOrganization } from '@test/functional-api/contributor-management/organization/organization.request.params';
import { entitiesId } from '@test/types/entities-helper';
export const uniqueId = Math.random()
  .toString(12)
  .slice(-6);

const credentialsType = 'SPACE_ADMIN';
const opportunityName = `op-dname${uniqueId}`;
const opportunityNameId = `op-nameid${uniqueId}`;
let opportunityId = '';
let opportunityRoleSetId = '';
const challengeName = `opp-auth-nam-ch-${uniqueId}`;
const organizationName = 'opp-auth-org-name' + uniqueId;
const hostNameId = 'opp-auth-org-nameid' + uniqueId;
const spaceName = 'opp-auth-eco-name' + uniqueId;
const spaceNameId = 'opp-auth-eco-nameid' + uniqueId;

beforeAll(async () => {
  await createOrgAndSpaceWithUsers(
    organizationName,
    hostNameId,
    spaceName,
    spaceNameId
  );
  await createChallengeWithUsers(challengeName);
});

beforeEach(async () => {
  const responseCreateOpportunityOnChallenge = await createSubspace(
    opportunityName,
    opportunityNameId,
    entitiesId.challenge.id
  );

  const oppData = responseCreateOpportunityOnChallenge?.data?.createSubspace;

  opportunityId = oppData?.id ?? '';
  opportunityRoleSetId = oppData?.community?.roleSet.id ?? '';
});

afterEach(async () => {
  await deleteSpace(opportunityId);
});

afterAll(async () => {
  await deleteSpace(entitiesId.challenge.id);
  await deleteSpace(entitiesId.spaceId);
  await deleteOrganization(entitiesId.organization.id);
});

describe('Opportunity Admin', () => {
  test('should create opportunity admin', async () => {
    // Act
    const res = await assignRoleToUser(
      users.challengeMember.id,
      opportunityRoleSetId,
      CommunityRoleType.Admin
    );

    // Assert
    expect(res?.data?.assignRoleToUser?.agent?.credentials).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          resourceID: opportunityId,
          type: credentialsType,
        }),
      ])
    );
  });

  test('should add same user as admin of 2 opportunities', async () => {
    // Arrange
    const responseOppTwo = await createSubspace(
      `oppdname-${uniqueId}`,
      `oppnameid-${uniqueId}`,
      entitiesId.challenge.id
    );
    const oppDataTwo = responseOppTwo?.data?.createSubspace;
    const opportunityIdTwo = oppDataTwo?.id ?? '';
    const opportunityRoleSetId2 = oppDataTwo?.community?.roleSet.id ?? '';

    // Act
    const resOne = await assignRoleToUser(
      users.challengeMember.id,
      opportunityRoleSetId,
      CommunityRoleType.Admin
    );

    const resTwo = await assignRoleToUser(
      users.opportunityMember.email,
      opportunityRoleSetId2,
      CommunityRoleType.Admin
    );

    // Assert
    expect(resOne?.data?.assignRoleToUser?.agent?.credentials).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          resourceID: opportunityId,
          type: credentialsType,
        }),
      ])
    );
    expect(resTwo?.data?.assignRoleToUser?.agent?.credentials).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          resourceID: opportunityIdTwo,
          type: credentialsType,
        }),
      ])
    );
    await deleteSpace(opportunityIdTwo);
  });

  test('should be able one opportunity admin to remove another admin from opportunity', async () => {
    // Arrange
    await assignRoleToUser(
      users.challengeMember.id,
      opportunityRoleSetId,
      CommunityRoleType.Admin
    );

    await assignRoleToUser(
      users.opportunityMember.email,
      opportunityRoleSetId,
      CommunityRoleType.Admin
    );

    const res = await removeRoleFromUser(
      users.opportunityMember.email,
      opportunityRoleSetId,
      CommunityRoleType.Admin,
      TestUser.CHALLENGE_MEMBER
    );

    // Assert
    expect(res?.data?.removeRoleFromUser?.agent?.credentials).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          resourceID: opportunityId,
          type: credentialsType,
        }),
      ])
    );
  });

  test('should remove the only admin of an opportunity', async () => {
    // Arrange
    await assignRoleToUser(
      users.challengeMember.id,
      opportunityRoleSetId,
      CommunityRoleType.Admin
    );

    // Act
    const res = await removeRoleFromUser(
      users.opportunityMember.email,
      opportunityRoleSetId,
      CommunityRoleType.Admin,
      TestUser.CHALLENGE_MEMBER
    );

    // Assert
    expect(res?.data?.removeRoleFromUser?.agent?.credentials).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          resourceID: opportunityId,
          type: credentialsType,
        }),
      ])
    );
  });
});
