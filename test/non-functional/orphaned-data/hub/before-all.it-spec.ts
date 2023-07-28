import { createCalloutOnCollaboration } from '@test/functional-api/integration/callouts/callouts.request.params';
import { entitiesId } from '@test/functional-api/zcommunications/communications-helper';
import { createOrgAndSpace } from '@test/functional-api/zcommunications/create-entities-with-users-helper';
import { uniqueId } from '@test/utils/mutations/create-mutation';

const organizationName = 'post-org-name' + uniqueId;
const hostNameId = 'post-org-nameid' + uniqueId;
const spaceName = 'post-eco-name' + uniqueId;
const spaceNameId = 'post-eco-nameid' + uniqueId;

// beforeAll(async () => {
//   await createOrgAndSpace(organizationName, hostNameId, spaceName, spaceNameId);
// });
describe('Space', () => {
  test('test', async () => {
    expect('test').toBe('test');
  });
});
