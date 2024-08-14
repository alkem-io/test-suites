import { deleteChallengeCodegen } from '@test/functional-api/journey/challenge/challenge.request.params';
import { deleteSpaceCodegen } from '@test/functional-api/journey/space/space.request.params';
import { deleteOpportunityCodegen } from '@test/functional-api/journey/opportunity/opportunity.request.params';
import { deleteOrganizationCodegen } from '@test/functional-api/organization/organization.request.params';
import { entitiesId } from '@test/functional-api/roles/community/communications-helper';

afterAll(async () => {
  await deleteOpportunityCodegen(entitiesId.opportunity.id);
  await deleteChallengeCodegen(entitiesId.challenge.id);
  await deleteSpaceCodegen(entitiesId.spaceId);
  await deleteOrganizationCodegen(entitiesId.organization.id);
});

describe('Organization', () => {
  test('test', async () => {
    expect('test').toBe('test');
  });
});
