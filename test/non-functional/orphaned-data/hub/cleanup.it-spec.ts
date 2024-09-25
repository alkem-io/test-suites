import { deleteChallengeCodegen } from '@test/functional-api/journey/challenge/challenge.request.params';
import { deleteSpace } from '@test/functional-api/journey/space/space.request.params';
import { deleteOpportunityCodegen } from '@test/functional-api/journey/opportunity/opportunity.request.params';
import { deleteOrganization } from '@test/functional-api/contributor-management/organization/organization.request.params';
import { entitiesId } from '@test/types/entities-helper';

afterAll(async () => {
  await deleteOpportunityCodegen(entitiesId.opportunity.id);
  await deleteChallengeCodegen(entitiesId.challenge.id);
  await deleteSpace(entitiesId.spaceId);
  await deleteOrganization(entitiesId.organization.id);
});

describe('Organization', () => {
  test('test', async () => {
    expect('test').toBe('test');
  });
});
