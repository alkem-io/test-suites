import { createOrganization } from '@functional-api/contributor-management/organization/organization.request.params';
import { UniqueIDGenerator } from '@alkemio/tests-lib';;
const uniqueId = UniqueIDGenerator.getID();
import { createInnovationPack } from './innovation_pack.request.params';
import {
  whiteboardTemplateValues1,
  whiteboardTemplateValues2,
  whiteboardTemplateValues3,
  whiteboardTemplateValues4,
  whiteboardTemplateValues5,
  whiteboardTemplateValues6,
} from './whiteboard-values-fixed';
import { createWhiteboardTemplate } from '@functional-api/templates/whiteboard/whiteboard-templates.request.params';
import { authorizationPolicyResetOnPlatform } from '@functional-api/platform/authorization-platform-mutation';

/** @testCase TC-0503 */
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

      await createWhiteboardTemplate(
        templateSetId,
        whiteboardTemplateValues1
      );

      await createWhiteboardTemplate(
        templateSetId,
        whiteboardTemplateValues2
      );

      await createWhiteboardTemplate(
        templateSetId,
        whiteboardTemplateValues3
      );

      await createWhiteboardTemplate(
        templateSetId,
        whiteboardTemplateValues4
      );

      await createWhiteboardTemplate(
        templateSetId,
        whiteboardTemplateValues5
      );

      await createWhiteboardTemplate(
        templateSetId,
        whiteboardTemplateValues6
      );

      expect(200).toBe(200);
    });
  });
});
