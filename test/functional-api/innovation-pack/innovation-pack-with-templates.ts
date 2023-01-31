import { getOrganizationsData } from '../integration/organization/organization.request.params';
import { createCanvasTemplate } from '../templates/templates.request.params';
import { canvasTemplateValues1 } from './canvase-values';
import { createInnovationPackOnLibrary } from './innovation_pack.request.params';
export const uniqueId = Math.random()
  .toString(12)
  .slice(-6);

const packName =
  process.env.PACK_NAME || `Default Innovation Pack Name ${uniqueId}`;
export const canvasTemplateValues =
  process.env.CANVAS_TEMPLATE_VALUE || canvasTemplateValues1;
const canvasTemplateTitle =
  process.env.CANVAS_TEMPLATE_NAME ||
  `Default Canvas Template Title ${uniqueId}`;

const packNameId = `pack-nameid-${uniqueId}`;

const main = async () => {
  const organizationsData = await getOrganizationsData();
  const firstAvailableOrganizationId =
    organizationsData.body.data.organizations[0].id;
  const providerId = process.env.ORG_ID || firstAvailableOrganizationId;
  const packData = await createInnovationPackOnLibrary(
    packName,
    packNameId,
    providerId
  );
  const templateSetId =
    packData.body.data.createInnovationPackOnLibrary.templates.id;
  await createCanvasTemplate(
    templateSetId,
    canvasTemplateTitle,
    canvasTemplateValues
  );
};

main().catch(error => {
  console.error(error);
});
