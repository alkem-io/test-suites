import { createOrganization } from '@functional-api/contributor-management/organization/organization.request.params';
import { UniqueIDGenerator } from '@alkemio/tests-lib';;
const uniqueId = UniqueIDGenerator.getID();
import { createInnovationPack } from './innovation_pack.request.params';
import { createWhiteboardTemplate } from '@functional-api/templates/whiteboard/whiteboard-templates.request.params';
import { authorizationPolicyResetOnPlatform } from '@functional-api/platform/authorization-platform-mutation';

describe('Organization', () => {
  const organizationName = 'Organization with many whiteboardes' + uniqueId;
  const hostNameId = 'org-whiteboardes' + uniqueId;
  const packName = `Default Innovation Pack Name ${uniqueId}`;
  const packNameId = `pack-nameid-${uniqueId}`;
  let orgId = '';
  beforeAll(async () => {
    await authorizationPolicyResetOnPlatform();

    const res = await createOrganization(organizationName, hostNameId);
    orgId = res?.data?.createOrganization.id ?? '';
  });
  // afterAll(async () => await deleteOrganization(orgId));

  describe('Innovation pack library', () => {
    test('Create', async () => {
      const packData = await createInnovationPack(
        packName,
        packNameId,
        orgId
      );
      const templateSetId =
        packData?.data?.createInnovationPack?.templatesSet?.id ?? '';

      await createWhiteboardTemplate(templateSetId);

      await createWhiteboardTemplate(templateSetId);

      await createWhiteboardTemplate(templateSetId);

      await createWhiteboardTemplate(templateSetId);

      await createWhiteboardTemplate(templateSetId);

      await createWhiteboardTemplate(templateSetId);

      expect(200).toBe(200);
    });
  });
});
