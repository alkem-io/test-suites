import {
  createOrgAndHub,
  createChallengeForOrgHub,
  createOpportunityForChallenge,
} from '@test/functional-api/zcommunications/create-entities-with-users-helper';
import { uniqueId } from '@test/utils/mutations/create-mutation';

const organizationName = 'aspect-org-name' + uniqueId;
const hostNameId = 'aspect-org-nameid' + uniqueId;
const hubName = 'aspect-eco-name' + uniqueId;
const hubNameId = 'aspect-eco-nameid' + uniqueId;
const opportunityName = 'aspect-opp';
const challengeName = 'aspect-chal';

beforeAll(async () => {
  await createOrgAndHub(organizationName, hostNameId, hubName, hubNameId);
  await createChallengeForOrgHub(challengeName);
  await createOpportunityForChallenge(opportunityName);
});
describe('User', () => {
  test('test', async () => {
    expect('test').toBe('test');
  });
});
