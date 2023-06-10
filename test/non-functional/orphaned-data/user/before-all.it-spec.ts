import {
  createOrgAndHub,
  createChallengeForOrgHub,
  createOpportunityForChallenge,
} from '@test/functional-api/zcommunications/create-entities-with-users-helper';
import { uniqueId } from '@test/utils/mutations/create-mutation';

const organizationName = 'post-org-name' + uniqueId;
const hostNameId = 'post-org-nameid' + uniqueId;
const hubName = 'post-eco-name' + uniqueId;
const hubNameId = 'post-eco-nameid' + uniqueId;
const opportunityName = 'post-opp';
const challengeName = 'post-chal';

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
