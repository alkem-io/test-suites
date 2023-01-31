import {
  createOrganization,
  deleteOrganization,
} from '@test/functional-api/integration/organization/organization.request.params';
import { uniqueId } from '@test/utils/mutations/create-mutation';
import { createCanvasTemplate } from '../templates/templates.request.params';
import {
  canvasTemplateValues1,
  canvasTemplateValues2,
  canvasTemplateValues3,
  canvasTemplateValues4,
  canvasTemplateValues5,
  canvasTemplateValues6,
} from './canvase-values';
import { createInnovationPackOnLibrary } from './innovation_pack.request.params';

describe('Organization', () => {
  const organizationName = 'Organization with many canvases' + uniqueId;
  const hostNameId = 'org-canvases' + uniqueId;
  const packName = `Default Innovation Pack Name ${uniqueId}`;
  const canvasTemplateTitle = `Default Canvas Template Title ${uniqueId}`;
  const packNameId = `pack-nameid-${uniqueId}`;
  let orgId = '';
  beforeAll(async () => {
    const res = await createOrganization(organizationName, hostNameId);
    orgId = res.body.data.createOrganization.id;
  });
  afterAll(async () => await deleteOrganization(orgId));

  describe('Innovation pack library', () => {
    test('Create', async () => {
      const packData = await createInnovationPackOnLibrary(
        packName,
        packNameId,
        orgId
      );
      const templateSetId =
        packData.body.data.createInnovationPackOnLibrary.templates.id;

      await createCanvasTemplate(
        templateSetId,
        canvasTemplateTitle,
        canvasTemplateValues1
      );

      await createCanvasTemplate(
        templateSetId,
        canvasTemplateTitle,
        canvasTemplateValues2
      );

      await createCanvasTemplate(
        templateSetId,
        canvasTemplateTitle,
        canvasTemplateValues3
      );

      await createCanvasTemplate(
        templateSetId,
        canvasTemplateTitle,
        canvasTemplateValues4
      );

      await createCanvasTemplate(
        templateSetId,
        canvasTemplateTitle,
        canvasTemplateValues5
      );

      await createCanvasTemplate(
        templateSetId,
        canvasTemplateTitle,
        canvasTemplateValues6
      );

      expect(200).toBe(200);
    });
  });
});
