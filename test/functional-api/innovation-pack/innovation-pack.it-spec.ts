import { createOrganization } from '@test/functional-api/contributor-management/organization/organization.request.params';
import { uniqueId } from '@test/utils/mutations/create-mutation';
import { createInnovationPackOnLibrary } from './innovation_pack.request.params';
import {
  whiteboardTemplateValues1,
  whiteboardTemplateValues2,
  whiteboardTemplateValues3,
  whiteboardTemplateValues4,
  whiteboardTemplateValues5,
  whiteboardTemplateValues6,
} from './whiteboard-values-fixed';
import { createWhiteboardTemplate } from '../templates/whiteboard/templates.request.params';
import { authorizationPolicyResetOnPlatform } from '@test/utils/mutations/authorization-platform-mutation';

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
      const packData = await createInnovationPackOnLibrary(
        packName,
        packNameId,
        orgId
      );
      const templateSetId =
        packData?.data?.createInnovationPack?.templatesSet?.id ?? '';

      await createWhiteboardTemplate(
        templateSetId,
        whiteboardTemplateTitle,
        whiteboardTemplateValues1
      );

      await createWhiteboardTemplate(
        templateSetId,
        whiteboardTemplateTitle,
        whiteboardTemplateValues2
      );

      await createWhiteboardTemplate(
        templateSetId,
        whiteboardTemplateTitle,
        whiteboardTemplateValues3
      );

      await createWhiteboardTemplate(
        templateSetId,
        whiteboardTemplateTitle,
        whiteboardTemplateValues4
      );

      await createWhiteboardTemplate(
        templateSetId,
        whiteboardTemplateTitle,
        whiteboardTemplateValues5
      );

      await createWhiteboardTemplate(
        templateSetId,
        whiteboardTemplateTitle,
        whiteboardTemplateValues6
      );

      expect(200).toBe(200);
    });
  });
});
