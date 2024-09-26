import { getOrganizationsData } from '../contributor-management/organization/organization.request.params';
import { createWhiteboardTemplateCodegen } from '../templates/whiteboard/templates.request.params';
import { createInnovationPackOnLibraryCodegen } from './innovation_pack.request.params';
import { whiteboardTemplateValues1 } from './whiteboard-values-fixed';
export const uniqueId = Math.random()
  .toString(12)
  .slice(-6);

const packName =
  process.env.PACK_NAME || `Default Innovation Pack Name ${uniqueId}`;
export const whiteboardTemplateValues =
  process.env.WHITEBOARD_TEMPLATE_VALUE || whiteboardTemplateValues1;
const whiteboardTemplateTitle =
  process.env.WHITEBOARD_TEMPLATE_NAME ||
  `Default Whiteboard Template Title ${uniqueId}`;

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
    packData?.data?.createInnovationPack.templatesSet?.id ?? '';
  await createWhiteboardTemplate(
    templateSetId,
    whiteboardTemplateTitle,
    whiteboardTemplateValues
  );
};

main().catch(error => {
  console.error(error);
});
