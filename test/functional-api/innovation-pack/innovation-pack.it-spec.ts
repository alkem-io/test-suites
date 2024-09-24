import { createOrganization } from '@test/functional-api/contributor-management/organization/organization.request.params';
import { authorizationPolicyResetOnPlatform } from '@test/utils/mutations/authorization-mutation';
import { uniqueId } from '@test/utils/mutations/create-mutation';
import { createInnovationPackOnLibraryCodegen } from './innovation_pack.request.params';
import {
  whiteboardTemplateValues1,
  whiteboardTemplateValues2,
  whiteboardTemplateValues3,
  whiteboardTemplateValues4,
  whiteboardTemplateValues5,
  whiteboardTemplateValues6,
} from './whiteboard-values-fixed';
import { createWhiteboardTemplateCodegen } from '../templates/whiteboard/templates.request.params';

describe('Organization', () => {
  const organizationName = 'Organization with many whiteboardes' + uniqueId;
  const hostNameId = 'org-whiteboardes' + uniqueId;
  const packName = `Default Innovation Pack Name ${uniqueId}`;
  const whiteboardTemplateTitle = `Default Whiteboard Template Title ${uniqueId}`;
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
      const packData = await createInnovationPackOnLibraryCodegen(
        packName,
        packNameId,
        orgId
      );
      const templateSetId =
        packData?.data?.createInnovationPack?.templatesSet?.id ?? '';

      await createWhiteboardTemplateCodegen(
        templateSetId,
        whiteboardTemplateTitle,
        whiteboardTemplateValues1
      );

      await createWhiteboardTemplateCodegen(
        templateSetId,
        whiteboardTemplateTitle,
        whiteboardTemplateValues2
      );

      await createWhiteboardTemplateCodegen(
        templateSetId,
        whiteboardTemplateTitle,
        whiteboardTemplateValues3
      );

      await createWhiteboardTemplateCodegen(
        templateSetId,
        whiteboardTemplateTitle,
        whiteboardTemplateValues4
      );

      await createWhiteboardTemplateCodegen(
        templateSetId,
        whiteboardTemplateTitle,
        whiteboardTemplateValues5
      );

      await createWhiteboardTemplateCodegen(
        templateSetId,
        whiteboardTemplateTitle,
        whiteboardTemplateValues6
      );

      expect(200).toBe(200);
    });
  });
});
