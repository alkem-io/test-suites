import { createCalloutOnCollaboration } from '@test/functional-api/integration/callouts/callouts.request.params';
import { entitiesId } from '@test/functional-api/zcommunications/communications-helper';
import { createOrgAndHub } from '@test/functional-api/zcommunications/create-entities-with-users-helper';
import { uniqueId } from '@test/utils/mutations/create-mutation';

const organizationName = 'post-org-name' + uniqueId;
const hostNameId = 'post-org-nameid' + uniqueId;
const hubName = 'post-eco-name' + uniqueId;
const hubNameId = 'post-eco-nameid' + uniqueId;

// beforeAll(async () => {
//   await createOrgAndHub(organizationName, hostNameId, hubName, hubNameId);
// });
describe('Hub', () => {
  test('test', async () => {
    expect('test').toBe('test');
  });
});
