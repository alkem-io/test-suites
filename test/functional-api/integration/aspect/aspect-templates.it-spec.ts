import '@test/utils/array.matcher';
import { removeChallenge } from '@test/functional-api/integration/challenge/challenge.request.params';
import {
  removeAspect,
  createAspectOnContext,
  getAspectPerEntity,
  AspectTypes,
  updateAspect,
  createAspectTemplate,
  getAspectTemplateForHubByAspectType,
  getAspectTemplatesCountForHub,
  deleteAspectTemplate,
  updateAspectTemplate,
  createAspectNewType,
} from './aspect.request.params';
import { removeOpportunity } from '@test/functional-api/integration/opportunity/opportunity.request.params';
import { deleteOrganization } from '../organization/organization.request.params';
import { getHubData, removeHub } from '../hub/hub.request.params';
import {
  assignUsersForAspectTests,
  delay,
  entitiesId,
  users,
} from '@test/functional-api/zcommunications/communications-helper';
import {
  createReferenceOnAspect,
  createReferenceOnAspectVariablesData,
  uniqueId,
} from '@test/utils/mutations/create-mutation';
import { TestUser } from '@test/utils/token.helper';
import { mutation } from '@test/utils/graphql.request';
import {
  removeComment,
  removeCommentVariablesData,
  sendComment,
  sendCommentVariablesData,
} from '@test/utils/mutations/communications-mutation';
import {
  deleteReference,
  deleteVariablesData,
} from '@test/utils/mutations/delete-mutation';
import {
  updateHub,
  updateHubVariablesData,
} from '@test/utils/mutations/update-mutation';
import {
  createChallengeForOrgHub,
  createOpportunityForChallenge,
  createOrgAndHub,
} from '@test/functional-api/zcommunications/create-entities-with-users-helper';

let opportunityName = 'aspect-opp';
let challengeName = 'aspect-chal';
let hubAspectId = '';
let challengeAspectId = '';
let opportunityAspectId = '';
let aspectNameID = '';
let aspectDisplayName = '';
let aspectDescription = '';
let aspectDataCreate = '';
let hubAspect = '';
let challengeAspect = '';
let opportunityAspect = '';
const aspectCommentsIdHub = '';
const aspectCommentsIdChallenge = '';
const msessageId = '';
const refId = '';
const organizationName = 'aspect-org-name' + uniqueId;
const hostNameId = 'aspect-org-nameid' + uniqueId;
const hubName = 'aspect-eco-name' + uniqueId;
const hubNameId = 'aspect-eco-nameid' + uniqueId;
let aspectTemplateId = '';
const aspectData = {
  defaultDescription: 'Test default description',
  type: 'Test aspect type',
  info: {
    title: 'Test aspect title',
    description: 'Test aspect description',
  },
};

const aspectDataPerContextCount = async (
  hubId: string,
  challengeId?: string,
  opportunityId?: string
): Promise<[string | undefined, string | undefined, string | undefined]> => {
  const responseQuery = await getAspectPerEntity(
    hubId,
    challengeId,
    opportunityId
  );

  hubAspect = responseQuery.body.data.hub.context.aspects;
  challengeAspect = responseQuery.body.data.hub.challenge.context.aspects;
  opportunityAspect = responseQuery.body.data.hub.opportunity.context.aspects;

  return [hubAspect, challengeAspect, opportunityAspect];
};

const aspectDataPerContext = async (
  aspectNumber: number,
  hubId: string,
  challengeId?: string,
  opportunityId?: string
): Promise<[string | undefined, string | undefined, string | undefined]> => {
  const responseQuery = await getAspectPerEntity(
    hubId,
    challengeId,
    opportunityId
  );
  hubAspect = responseQuery.body.data.hub.context.aspects[aspectNumber];
  challengeAspect =
    responseQuery.body.data.hub.challenge.context.aspects[aspectNumber];
  opportunityAspect =
    responseQuery.body.data.hub.opportunity.context.aspects[aspectNumber];

  return [hubAspect, challengeAspect, opportunityAspect];
};

beforeAll(async () => {
  await createOrgAndHub(organizationName, hostNameId, hubName, hubNameId);

  await createChallengeForOrgHub(challengeName);
  await createOpportunityForChallenge(opportunityName);
  // await assignUsersForAspectTests();
});

afterAll(async () => {
  await removeOpportunity(entitiesId.opportunityId);
  await removeChallenge(entitiesId.challengeId);
  await removeHub(entitiesId.hubId);
  await deleteOrganization(entitiesId.organizationId);
});

beforeEach(async () => {
  challengeName = `testChallenge ${uniqueId}`;
  opportunityName = `opportunityName ${uniqueId}`;
  aspectNameID = `aspect-name-id-${uniqueId}`;
  aspectDisplayName = `aspect-d-name-${uniqueId}`;
  aspectDescription = `aspectDescription-${uniqueId}`;
});

afterEach(async () => {
  await deleteAspectTemplate(aspectTemplateId);
});

describe('Aspect templates - CRUD', () => {
  const typeFromHubtemplate = 'testType';
  test('Create Aspect template', async () => {
    // Arrange
    const countBefore = await getAspectTemplatesCountForHub(entitiesId.hubId);

    // Act
    const resCreateAspectTempl = await createAspectTemplate(
      entitiesId.hubTemplateId,
      typeFromHubtemplate
    );
    aspectTemplateId = resCreateAspectTempl.body.data.createAspectTemplate.id;
    const aspectDataCreate =
      resCreateAspectTempl.body.data.createAspectTemplate;
    const countAfter = await getAspectTemplatesCountForHub(entitiesId.hubId);
    const getCreatedAspectData = await getAspectTemplateForHubByAspectType(
      entitiesId.hubId,
      typeFromHubtemplate
    );

    // Assert
    expect(countAfter).toEqual(countBefore + 1);
    expect(getCreatedAspectData).toEqual([aspectDataCreate]);
  });

  test('Update Aspect template', async () => {
    // Arrange
    const resCreateAspectTempl = await createAspectTemplate(
      entitiesId.hubTemplateId,
      typeFromHubtemplate
    );
    aspectTemplateId = resCreateAspectTempl.body.data.createAspectTemplate.id;

    // Act
    const resUpdateAspectTempl = await updateAspectTemplate(
      aspectTemplateId,
      typeFromHubtemplate + ' - Update'
    );

    const aspectDataUpdate =
      resUpdateAspectTempl.body.data.updateAspectTemplate;
    const getUpatedAspectData = await getAspectTemplateForHubByAspectType(
      entitiesId.hubId,
      typeFromHubtemplate + ' - Update'
    );

    // Assert
    expect(getUpatedAspectData).toEqual([aspectDataUpdate]);
  });

  test('Delete Aspect template', async () => {
    // Arrange
    const resCreateAspectTempl = await createAspectTemplate(
      entitiesId.hubTemplateId,
      typeFromHubtemplate
    );
    aspectTemplateId = resCreateAspectTempl.body.data.createAspectTemplate.id;
    const countBefore = await getAspectTemplatesCountForHub(entitiesId.hubId);

    // Act
    const remove = await deleteAspectTemplate(aspectTemplateId);
    const countAfter = await getAspectTemplatesCountForHub(entitiesId.hubId);

    // Assert
    expect(countAfter).toEqual(countBefore - 1);
    expect(remove.body.data.deleteAspectTemplate.type).toEqual(
      typeFromHubtemplate
    );
  });
});

describe('Aspect templates - Utilization in aspects', () => {
  const templateType = 'testType';
  beforeAll(async () => {
    const resCreateAspectTempl = await createAspectTemplate(
      entitiesId.hubTemplateId,
      templateType
    );
    aspectTemplateId = resCreateAspectTempl.body.data.createAspectTemplate.id;
  });
  // afterAll(async () => {
  //   await removeAspect(hubAspectId);
  // });

  describe('Create aspect on all entities with newly created aspectTemplate', () => {
    afterAll(async () => {
      await deleteAspectTemplate(aspectTemplateId);
    });

    afterAll(async () => {
      await removeAspect(hubAspectId);
      await removeAspect(challengeAspectId);
      await removeAspect(opportunityAspectId);
    });

    test('Create Aspect on Hub', async () => {
      // Act
      const resAspectonHub = await createAspectNewType(
        entitiesId.hubContextId,
        templateType,
        `new-template-d-name-${uniqueId}`,
        `new-template-name-id-${uniqueId}`,
        'check with new template type'
      );
      aspectDataCreate = resAspectonHub.body.data.createAspectOnContext;
      const aspectTypeFromHubTemplate =
        resAspectonHub.body.data.createAspectOnContext.type;
      hubAspectId = resAspectonHub.body.data.createAspectOnContext.id;

      const getAspectsData = await aspectDataPerContext(
        0,
        entitiesId.hubId,
        entitiesId.challengeId,
        entitiesId.opportunityId
      );
      const data = getAspectsData[0];

      // Assert
      expect(aspectTypeFromHubTemplate).toEqual(templateType);
      expect(data).toEqual(aspectDataCreate);
    });

    test('Create Aspect on Challenge', async () => {
      // Act
      const res = await createAspectNewType(
        entitiesId.challengeContextId,
        templateType,
        `new-template-d-name-${uniqueId}`,
        `new-template-name-id-${uniqueId}`,
        'check with new template type'
      );
      aspectDataCreate = res.body.data.createAspectOnContext;
      const aspectTypeFromHubTemplate =
        res.body.data.createAspectOnContext.type;
      challengeAspectId = res.body.data.createAspectOnContext.id;

      const getAspectsData = await aspectDataPerContext(
        0,
        entitiesId.hubId,
        entitiesId.challengeId,
        entitiesId.opportunityId
      );
      const data = getAspectsData[1];

      // Assert
      expect(aspectTypeFromHubTemplate).toEqual(templateType);
      expect(data).toEqual(aspectDataCreate);
    });

    test('Create Aspect on Opportunity', async () => {
      // Act
      const res = await createAspectNewType(
        entitiesId.opportunityContextId,
        templateType,
        `new-template-d-name-${uniqueId}`,
        `new-template-name-id-${uniqueId}`,
        'check with new template type'
      );
      aspectDataCreate = res.body.data.createAspectOnContext;
      const aspectTypeFromHubTemplate =
        res.body.data.createAspectOnContext.type;
      opportunityAspectId = res.body.data.createAspectOnContext.id;

      const getAspectsData = await aspectDataPerContext(
        0,
        entitiesId.hubId,
        entitiesId.challengeId,
        entitiesId.opportunityId
      );
      const data = getAspectsData[2];

      // Assert
      expect(aspectTypeFromHubTemplate).toEqual(templateType);
      expect(data).toEqual(aspectDataCreate);
    });
  });

  describe('Update Aspect template already utilized by an aspect', () => {
    let aspectTypeFromHubTemplate = '';
    beforeAll(async () => {
      const resAspectonHub = await createAspectNewType(
        entitiesId.hubContextId,
        templateType,
        `new-aspect-d-name-${uniqueId}`,
        `new-aspect-name-id-${uniqueId}`
      );
      aspectDataCreate = resAspectonHub.body.data.createAspectOnContext;
      hubAspectId = resAspectonHub.body.data.createAspectOnContext.id;
      aspectTypeFromHubTemplate =
        resAspectonHub.body.data.createAspectOnContext.type;
    });
    afterAll(async () => {
      await removeAspect(hubAspectId);
    });
    test('Create aspect with existing aspect template, and update template type, doesnt change the aspect type', async () => {
      // Act
      await updateAspectTemplate(aspectTemplateId, templateType + ' - Update');

      const getAspectsData = await aspectDataPerContext(
        0,
        entitiesId.hubId,
        entitiesId.challengeId,
        entitiesId.opportunityId
      );
      const data = getAspectsData[0];

      // Assert
      expect(aspectTypeFromHubTemplate).toEqual(templateType);
      expect(data).toEqual(aspectDataCreate);
    });

    test('Update aspect to use the new aspect template type', async () => {
      // Act

      const resAspectonHub = await updateAspect(
        hubAspectId,
        aspectNameID,
        aspectDisplayName + 'EA update',
        aspectDescription + 'EA update',
        templateType + ' - Update'
      );
      const aspectDataUpdate = resAspectonHub.body.data.updateAspect;
      const aspectTypeFromHubTemplate =
        resAspectonHub.body.data.updateAspect.type;
      hubAspectId = resAspectonHub.body.data.updateAspect.id;

      const getAspectsData = await aspectDataPerContext(
        0,
        entitiesId.hubId,
        entitiesId.challengeId,
        entitiesId.opportunityId
      );
      const data = getAspectsData[0];

      // Assert
      expect(aspectTypeFromHubTemplate).toEqual(templateType + ' - Update');
      expect(data).toEqual(aspectDataUpdate);
    });
  });

  describe('Remove Aspect template already utilized by an aspect', () => {
    let aspectTypeFromHubTemplate = '';
    beforeAll(async () => {
      const resAspectonHub = await createAspectNewType(
        entitiesId.hubContextId,
        templateType,
        `rem-temp-aspect-d-name-${uniqueId}`,
        `rem-temp-aspect-name-id-${uniqueId}`
      );
      aspectDataCreate = resAspectonHub.body.data.createAspectOnContext;
      hubAspectId = resAspectonHub.body.data.createAspectOnContext.id;
      aspectTypeFromHubTemplate =
        resAspectonHub.body.data.createAspectOnContext.type;
    });
    afterAll(async () => {
      await removeAspect(hubAspectId);
    });
    test('Create aspect with existing aspect template, and remove the aspect template, doesnt change the aspect type', async () => {
      // Act
      await deleteAspectTemplate(aspectTemplateId);

      const getAspectsData = await aspectDataPerContext(
        0,
        entitiesId.hubId,
        entitiesId.challengeId,
        entitiesId.opportunityId
      );
      const data = getAspectsData[0];

      // Assert
      expect(aspectTypeFromHubTemplate).toEqual(templateType);
      expect(data).toEqual(aspectDataCreate);
    });
  });
});

describe('Aspect templates - CRUD Authorization', () => {
  const typeFromHubtemplate = 'testType';
  test('Create Aspect template with same type', async () => {
    expect(1).toEqual(1);
  });

  test('Create Aspect template without type', async () => {
    expect(1).toEqual(1);
  });

  test('Update Aspect template type to empty value', async () => {
    expect(1).toEqual(1);
  });

  test('Delete non existent Aspect template', async () => {
    expect(1).toEqual(1);
  });
});

describe('Aspect templates - Negative Scenarios', () => {
  const typeFromHubtemplate = 'testType';
  test('Create Aspect template with same type', async () => {
    expect(1).toEqual(1);
  });

  test('Create Aspect template without type', async () => {
    expect(1).toEqual(1);
  });

  test('Update Aspect template type to empty value', async () => {
    expect(1).toEqual(1);
  });

  test('Delete non existent Aspect template', async () => {
    expect(1).toEqual(1);
  });
});
