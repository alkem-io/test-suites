import { LogManager, UniqueIDGenerator } from '@alkemio/tests-lib';
import { createInnovationPack } from './innovation_pack.request.params';
import { createWhiteboardTemplate } from '@functional-api/templates/whiteboard/whiteboard-templates.request.params';
import { getOrganizations } from '@functional-api/contributor-management/organization/organization.request.params';

const uniqueId = UniqueIDGenerator.getID();

const packName =
  process.env.PACK_NAME || `Default Innovation Pack Name ${uniqueId}`;
const packNameId = `pack-nameid-${uniqueId}`;

const main = async () => {
  const organizationsData = await getOrganizations();
  const firstAvailableOrganizationId =
    organizationsData.data?.organizations[0].id;
  const providerId = process.env.ORG_ID || firstAvailableOrganizationId || '';
  const packData = await createInnovationPack(packName, packNameId, providerId);
  const templateSetId =
    packData?.data?.createInnovationPack.templatesSet?.id ?? '';
  // Since server#6399 templates are created with an empty whiteboard
  // (inline content is server-internal; seed via sourceWhiteboardID).
  await createWhiteboardTemplate(templateSetId);
};

main().catch(error => {
  LogManager.getLogger().error(error);
});
