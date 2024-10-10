import '@test/utils/array.matcher';
import { deleteSpace } from '@test/functional-api/journey/space/space.request.params';
import { uniqueId } from '@test/utils/mutations/create-mutation';
import {
  createChallengeForOrgSpace,
  createOpportunityForChallenge,
  createOrgAndSpace,
} from '@test/utils/data-setup/entities';
import { GetTemplateById } from '@test/functional-api/templates/template.request.params';
import { deleteOrganization } from '@test/functional-api/contributor-management/organization/organization.request.params';
import { entitiesId } from '@test/types/entities-helper';
import {
  createWhiteboardTemplate,
  getWhiteboardTemplatesCount,
} from './whiteboard-templates.request.params';
import { deleteTemplate } from '../template.request.params';

let opportunityName = 'post-opp';
let challengeName = 'post-chal';
let postNameID = '';
let postDisplayName = '';
const organizationName = 'post-org-name' + uniqueId;
const hostNameId = 'post-org-nameid' + uniqueId;
const spaceName = 'post-eco-name' + uniqueId;
const spaceNameId = 'post-eco-nameid' + uniqueId;
let templateId = '';

beforeAll(async () => {
  await createOrgAndSpace(organizationName, hostNameId, spaceName, spaceNameId);
  await createChallengeForOrgSpace(challengeName);
  await createOpportunityForChallenge(opportunityName);
});

afterAll(async () => {
  await deleteSpace(entitiesId.opportunity.id);
  await deleteSpace(entitiesId.challenge.id);
  await deleteSpace(entitiesId.spaceId);
  await deleteOrganization(entitiesId.organization.id);
});

beforeEach(async () => {
  challengeName = `testChallenge ${uniqueId}`;
  opportunityName = `opportunityName ${uniqueId}`;
  postNameID = `post-name-id-${uniqueId}`;
  postDisplayName = `post-d-name-${uniqueId}`;
});

describe('WHITEBOARD templates - CRUD', () => {
  afterEach(async () => {
    await deleteTemplate(templateId);
  });
  test('Create Whiteboard template', async () => {
    // Arrange
    const countBefore = await getWhiteboardTemplatesCount(
      entitiesId.space.templateSetId
    );
    // Act
    const resCreateTemplate = await createWhiteboardTemplate(
      entitiesId.space.templateSetId
    );
    const whiteboardData = resCreateTemplate?.data?.createTemplate;
    templateId = whiteboardData?.id ?? '';
    const countAfter = await getWhiteboardTemplatesCount(
      entitiesId.space.templateSetId
    );

    const getTemplate = await GetTemplateById(templateId);
    const templateData = getTemplate?.data?.lookup.template;

    // Assert
    expect(countAfter).toEqual((countBefore as number) + 1);
    expect(whiteboardData).toEqual(
      expect.objectContaining({
        id: templateData?.id,
        type: templateData?.type,
      })
    );
  });

  test('Delete Whiteboard template', async () => {
    // Arrange
    const resCreatePostTempl = await createWhiteboardTemplate(
      entitiesId.space.templateSetId
    );
    templateId = resCreatePostTempl?.data?.createTemplate.id ?? '';
    const countBefore = await getWhiteboardTemplatesCount(entitiesId.space.templateSetId);

    // Act
    const remove = await deleteTemplate(templateId);
    const countAfter = await getWhiteboardTemplatesCount(entitiesId.space.templateSetId);

    // Assert
    expect(countAfter).toEqual((countBefore as number) - 1);
    expect(remove?.data?.deleteTemplate.id).toEqual(templateId);
  });
});
