import { LogManager, UniqueIDGenerator } from '@alkemio/tests-lib';
import { createInnovationPack } from './innovation_pack.request.params';
import { whiteboardTemplateValues1 } from './whiteboard-values-fixed';
import { createWhiteboardTemplate } from '@functional-api/templates/whiteboard/whiteboard-templates.request.params';
import { getOrganizations } from '@functional-api/contributor-management/organization/organization.request.params';

const uniqueId = UniqueIDGenerator.getID();

const packName =
  process.env.PACK_NAME || `Default Innovation Pack Name ${uniqueId}`;
export const whiteboardTemplateValues =
  process.env.WHITEBOARD_TEMPLATE_VALUE || whiteboardTemplateValues1;

const packNameId = `pack-nameid-${uniqueId}`;

const main = async () => {
  const organizationsData = await getOrganizations();
  const firstAvailableOrganizationId =
    organizationsData.data?.organizations[0].id;
  const providerId = process.env.ORG_ID || firstAvailableOrganizationId || '';
  const packData = await createInnovationPack(packName, packNameId, providerId);
  const templateSetId =
    packData?.data?.createInnovationPack.templatesSet?.id ?? '';
  await createWhiteboardTemplate(templateSetId, whiteboardTemplateValues);
};

main().catch(error => {
  LogManager.getLogger().error(error);
});
