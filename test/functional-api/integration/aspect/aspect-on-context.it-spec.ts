import '@test/utils/array.matcher';
import { removeChallenge } from '@test/functional-api/integration/challenge/challenge.request.params';
import {
  removeAspect,
  createAspectOnContext,
  getAspectPerEntity,
  AspectTypes,
  updateAspect,
} from './aspect.request.params';
import { removeOpportunity } from '@test/functional-api/integration/opportunity/opportunity.request.params';
import { deleteOrganization } from '../organization/organization.request.params';
import { removeEcoverse } from '../ecoverse/ecoverse.request.params';
import {
  entitiesId,
  prepareData,
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
  updateEcoverse,
  updateEcoverseVariablesData,
} from '@test/utils/mutations/update-mutation';

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
let aspectCommentsIdHub = '';
let aspectCommentsIdChallenge = '';
let msessageId = '';
let refId = '';

let aspectDataPerContextCount = async (
  ecoverseId: string,
  challengeId?: string,
  opportunityId?: string
): Promise<[string | undefined, string | undefined, string | undefined]> => {
  const responseQuery = await getAspectPerEntity(
    ecoverseId,
    challengeId,
    opportunityId
  );

  hubAspect = responseQuery.body.data.ecoverse.context.aspects;
  challengeAspect = responseQuery.body.data.ecoverse.challenge.context.aspects;
  opportunityAspect =
    responseQuery.body.data.ecoverse.opportunity.context.aspects;

  return [hubAspect, challengeAspect, opportunityAspect];
};

let aspectDataPerContext = async (
  aspectNumber: number,
  ecoverseId: string,
  challengeId?: string,
  opportunityId?: string
): Promise<[string | undefined, string | undefined, string | undefined]> => {
  const responseQuery = await getAspectPerEntity(
    ecoverseId,
    challengeId,
    opportunityId
  );
  hubAspect = responseQuery.body.data.ecoverse.context.aspects[aspectNumber];
  challengeAspect =
    responseQuery.body.data.ecoverse.challenge.context.aspects[aspectNumber];
  opportunityAspect =
    responseQuery.body.data.ecoverse.opportunity.context.aspects[aspectNumber];

  return [hubAspect, challengeAspect, opportunityAspect];
};

beforeAll(async () => {
  await prepareData(challengeName, opportunityName);
});

afterAll(async () => {
  await removeOpportunity(entitiesId.opportunityId);
  await removeChallenge(entitiesId.challengeId);
  await removeEcoverse(entitiesId.ecoverseId);
  await deleteOrganization(entitiesId.organizationId);
});

beforeEach(async () => {
  challengeName = `testChallenge ${uniqueId}`;
  opportunityName = `opportunityName ${uniqueId}`;
  aspectNameID = `aspect-name-id-${uniqueId}`;
  aspectDisplayName = `aspect-d-name-${uniqueId}`;
  aspectDescription = `aspectDescription-${uniqueId}`;
});

describe('Aspects - Create', () => {
  afterEach(async () => {
    await removeAspect(hubAspectId);
    await removeAspect(challengeAspectId);
    await removeAspect(opportunityAspectId);
  });
  test('EM should create aspect on hub context', async () => {
    // Act
    let resAspectonHub = await createAspectOnContext(
      entitiesId.hubContextId,

      aspectDisplayName,
      aspectNameID,
      aspectDescription,
      AspectTypes.KNOWLEDGE,
      TestUser.ECOVERSE_MEMBER
    );
    aspectDataCreate = resAspectonHub.body.data.createAspectOnContext;
    hubAspectId = resAspectonHub.body.data.createAspectOnContext.id;

    let getAspectsData = await aspectDataPerContext(
      0,
      entitiesId.ecoverseId,
      entitiesId.challengeId,
      entitiesId.opportunityId
    );
    let data = getAspectsData[0];
    // Assert
    expect(data).toEqual(aspectDataCreate);
  });

  test('GA should create aspect on hub context without setting nameId', async () => {
    // Act
    let resAspectonHub = await createAspectOnContext(
      entitiesId.hubContextId,
      aspectDisplayName
    );
    hubAspectId = resAspectonHub.body.data.createAspectOnContext.id;
    let hubAspectNameId = resAspectonHub.body.data.createAspectOnContext.nameID;

    // Assert
    expect(hubAspectNameId).toContain(aspectDisplayName);
  });

  test('NON-EM should NOT create aspect on hub context', async () => {
    // Act
    let resAspectonHub = await createAspectOnContext(
      entitiesId.hubContextId,
      aspectDisplayName,
      aspectNameID,
      aspectDescription,
      AspectTypes.ACTOR,
      TestUser.NON_ECOVERSE_MEMBER
    );

    // Assert
    expect(resAspectonHub.text).toContain(
      `Authorization: unable to grant 'create-aspect' privilege: create aspect on context: ${entitiesId.hubContextId}`
    );
  });

  test('ChA should create aspect on challenge context', async () => {
    // Act
    let resAspectonChallenge = await createAspectOnContext(
      entitiesId.challengeContextId,
      aspectDisplayName + 'ch',
      aspectNameID + 'ch',
      aspectDescription,
      AspectTypes.RELATED_INITIATIVE,
      TestUser.ECOVERSE_MEMBER
    );

    aspectDataCreate = resAspectonChallenge.body.data.createAspectOnContext;
    challengeAspectId = resAspectonChallenge.body.data.createAspectOnContext.id;

    let getAspectsData = await aspectDataPerContext(
      0,
      entitiesId.ecoverseId,
      entitiesId.challengeId,
      entitiesId.opportunityId
    );
    let data = getAspectsData[1];

    // Assert
    expect(data).toEqual(aspectDataCreate);
  });

  test('GA should create aspect on opportunity context', async () => {
    // Act
    let resAspectonOpportunity = await createAspectOnContext(
      entitiesId.opportunityContextId,
      aspectDisplayName + 'op',
      aspectNameID + 'op'
    );

    aspectDataCreate = resAspectonOpportunity.body.data.createAspectOnContext;
    opportunityAspectId =
      resAspectonOpportunity.body.data.createAspectOnContext.id;

    let getAspectsData = await aspectDataPerContext(
      0,
      entitiesId.ecoverseId,
      entitiesId.challengeId,
      entitiesId.opportunityId
    );
    let data = getAspectsData[2];

    // Assert
    expect(data).toEqual(aspectDataCreate);
  });
});

describe('Aspects - Update', () => {
  beforeAll(async () => {
    let resAspectonHub = await createAspectOnContext(
      entitiesId.hubContextId,
      aspectDisplayName + 'forUpdates',
      `aspect-name-id-up-${uniqueId}`
    );
    hubAspectId = resAspectonHub.body.data.createAspectOnContext.id;
  });

  afterAll(async () => {
    await removeAspect(hubAspectId);
  });

  test('EM should NOT update aspect created on hub context from GA', async () => {
    // Act
    let resAspectonHub = await updateAspect(
      hubAspectId,
      aspectNameID,
      aspectDisplayName + 'EM update',
      aspectDescription + 'EM update',
      TestUser.ECOVERSE_MEMBER
    );

    // Assert
    expect(resAspectonHub.text).toContain(
      `Authorization: unable to grant 'update' privilege: update aspect: `
    );
  });

  test('NON-EM should NOT update aspect created on hub context from GA', async () => {
    // Arrange
    let resAspectonHub = await updateAspect(
      hubAspectId,
      aspectNameID,
      aspectDisplayName + 'Non-EM update',
      aspectDescription + 'Non-EM update',
      TestUser.NON_ECOVERSE_MEMBER
    );

    // Act
    expect(resAspectonHub.text).toContain(
      `Authorization: unable to grant 'update' privilege: update aspect: `
    );
  });

  test('EA should update aspect created on hub context from GA', async () => {
    // Arrange
    let resAspectonHub = await updateAspect(
      hubAspectId,
      aspectNameID,
      aspectDisplayName + 'EA update',
      aspectDescription + 'EA update',
      TestUser.ECOVERSE_ADMIN
    );
    let aspectDataUpdate = resAspectonHub.body.data.updateAspect;

    // Act
    let getAspectsData = await aspectDataPerContext(
      0,
      entitiesId.ecoverseId,
      entitiesId.challengeId,
      entitiesId.opportunityId
    );

    let data = getAspectsData[0];
    // Assert
    expect(data).toEqual(aspectDataUpdate);
  });
});

test('EM should update aspect created on hub context from EM', async () => {
  // Arrange
  let resAspectonHubEM = await createAspectOnContext(
    entitiesId.hubContextId,
    aspectDisplayName + 'EM',
    `aspect-name-id-up-em${uniqueId}`,
    aspectDescription,
    AspectTypes.KNOWLEDGE,
    TestUser.ECOVERSE_MEMBER
  );

  let hubAspectIdEM = resAspectonHubEM.body.data.createAspectOnContext.id;

  // Act
  let resAspectonHub = await updateAspect(
    hubAspectIdEM,
    aspectNameID,
    aspectDisplayName + 'EM update',
    aspectDescription + 'EM update',
    TestUser.ECOVERSE_MEMBER
  );

  let aspectDataUpdate = resAspectonHub.body.data.updateAspect;

  // Act
  let getAspectsData = await aspectDataPerContext(
    0,
    entitiesId.ecoverseId,
    entitiesId.challengeId,
    entitiesId.opportunityId
  );
  let data = getAspectsData[0];
  // Assert
  expect(data).toEqual(aspectDataUpdate);

  await removeAspect(hubAspectIdEM);
});

describe('Aspects - Delete', () => {
  test('EM should NOT delete aspect created on hub context from GA', async () => {
    // Arrange
    let resAspectonHub = await createAspectOnContext(
      entitiesId.hubContextId,
      aspectDisplayName,
      aspectNameID
    );

    hubAspectId = resAspectonHub.body.data.createAspectOnContext.id;

    // Act
    let responseRemove = await removeAspect(
      hubAspectId,
      TestUser.ECOVERSE_MEMBER
    );
    let getAspectsData = await aspectDataPerContextCount(
      entitiesId.ecoverseId,
      entitiesId.challengeId,
      entitiesId.opportunityId
    );
    let data = getAspectsData[0];
    // Assert
    expect(responseRemove.text).toContain(
      `Authorization: unable to grant 'delete' privilege: delete aspect: ${aspectDisplayName}`
    );
    expect(data).toHaveLength(1);
    await removeAspect(hubAspectId);
  });

  // Check if member who created aspect, should be able to delete it
  test.skip('EM should delete aspect created on hub context from Himself', async () => {
    // Arrange
    let resAspectonHub = await createAspectOnContext(
      entitiesId.hubContextId,
      aspectDisplayName,
      aspectNameID,
      aspectDescription,
      AspectTypes.RELATED_INITIATIVE,
      TestUser.ECOVERSE_MEMBER
    );

    hubAspectId = resAspectonHub.body.data.createAspectOnContext.id;

    // Act
    await removeAspect(hubAspectId, TestUser.ECOVERSE_MEMBER);
    let getAspectsData = await aspectDataPerContextCount(
      entitiesId.ecoverseId,
      entitiesId.challengeId,
      entitiesId.opportunityId
    );
    let data = getAspectsData[0];
    // Assert
    expect(data).toHaveLength(0);
  });

  test('NON-EM should NOT delete aspect created on hub context from Himself', async () => {
    // Arrange
    let resAspectonHub = await createAspectOnContext(
      entitiesId.hubContextId,
      aspectDisplayName,
      aspectNameID,
      aspectDescription,
      AspectTypes.RELATED_INITIATIVE,
      TestUser.ECOVERSE_MEMBER
    );

    hubAspectId = resAspectonHub.body.data.createAspectOnContext.id;

    // Act
    let responseRemove = await removeAspect(
      hubAspectId,
      TestUser.NON_ECOVERSE_MEMBER
    );

    let getAspectsData = await aspectDataPerContextCount(
      entitiesId.ecoverseId,
      entitiesId.challengeId,
      entitiesId.opportunityId
    );
    let data = getAspectsData[0];
    // Assert
    expect(responseRemove.text).toContain(
      `Authorization: unable to grant 'delete' privilege: delete aspect: ${aspectDisplayName}`
    );
    expect(data).toHaveLength(1);
    await removeAspect(hubAspectId);
  });

  test('ChA should delete aspect created on challenge context from GA', async () => {
    // Arrange
    let resAspectonChallenge = await createAspectOnContext(
      entitiesId.challengeContextId,
      aspectDisplayName + 'ch',
      aspectNameID + 'ch'
    );

    challengeAspectId = resAspectonChallenge.body.data.createAspectOnContext.id;

    // Act
    await removeAspect(challengeAspectId, TestUser.ECOVERSE_MEMBER);

    let getAspectsData = await aspectDataPerContextCount(
      entitiesId.ecoverseId,
      entitiesId.challengeId,
      entitiesId.opportunityId
    );
    let data = getAspectsData[1];

    // Assert
    expect(data).toHaveLength(0);
  });

  // Check if member who created aspect, should be able to delete it
  test.skip('OM should delete own aspect on opportunity context', async () => {
    // Act
    let resAspectonOpportunity = await createAspectOnContext(
      entitiesId.opportunityContextId,

      aspectDisplayName + 'op',
      aspectNameID + 'op',
      aspectDescription,
      AspectTypes.RELATED_INITIATIVE,
      TestUser.QA_USER
    );
    opportunityAspectId =
      resAspectonOpportunity.body.data.createAspectOnContext.id;

    // Act
    await removeAspect(opportunityAspectId, TestUser.QA_USER);
    let getAspectsData = await aspectDataPerContextCount(
      entitiesId.ecoverseId,
      entitiesId.challengeId,
      entitiesId.opportunityId
    );
    let data = getAspectsData[2];

    // Assert
    expect(data).toHaveLength(0);
  });
});

describe('Aspects - Messages', () => {
  beforeAll(async () => {
    let resAspectonHub = await createAspectOnContext(
      entitiesId.hubContextId,

      `aspectDisplayName-mess-${uniqueId}`,
      `aspect-name-id-mess-${uniqueId}`
    );

    hubAspectId = resAspectonHub.body.data.createAspectOnContext.id;
    aspectCommentsIdHub =
      resAspectonHub.body.data.createAspectOnContext.comments.id;

    let resAspectonChallenge = await createAspectOnContext(
      entitiesId.challengeContextId,

      `aspectDisplayName-mess-${uniqueId}`,
      `aspect-name-id-mess-${uniqueId}`
    );
    challengeAspectId = resAspectonChallenge.body.data.createAspectOnContext.id;
    aspectCommentsIdChallenge =
      resAspectonChallenge.body.data.createAspectOnContext.comments.id;
  });

  afterAll(async () => {
    await removeAspect(hubAspectId);
    await removeAspect(challengeAspectId);
  });

  afterEach(async () => {
    await mutation(
      removeComment,
      removeCommentVariablesData(aspectCommentsIdHub, msessageId),
      TestUser.GLOBAL_ADMIN
    );
  });

  test('EM should send comment on aspect created on hub context from GA', async () => {
    // Arrange
    let messageRes = await mutation(
      sendComment,
      sendCommentVariablesData(aspectCommentsIdHub, 'test message'),
      TestUser.ECOVERSE_MEMBER
    );

    msessageId = messageRes.body.data.sendComment.id;

    let getAspectsData = await aspectDataPerContext(
      0,
      entitiesId.ecoverseId,
      entitiesId.challengeId,
      entitiesId.opportunityId
    );
    let data = getAspectsData[0];

    // Assert
    expect(data).toEqual(
      expect.objectContaining({
        comments: {
          id: aspectCommentsIdHub,
          messages: [
            {
              id: msessageId,
              message: `test message`,
              sender: users.ecoverseMemberId,
            },
          ],
        },
      })
    );
  });

  test('NON-EM should NOT send comment on aspect created on hub context from GA', async () => {
    // Arrange
    let messageRes = await mutation(
      sendComment,
      sendCommentVariablesData(aspectCommentsIdHub, 'test message'),
      TestUser.NON_ECOVERSE_MEMBER
    );

    // Assert
    expect(messageRes.text).toContain(
      `Authorization: unable to grant 'create-comment' privilege: comments send message: aspect-comments-aspectDisplayName-mess-${uniqueId}`
    );
  });
  describe('Messages - GA Send/Remove flow', () => {
    test('GA should send comment on aspect created on hub context from GA', async () => {
      // Act
      let messageRes = await mutation(
        sendComment,
        sendCommentVariablesData(aspectCommentsIdHub, 'test message'),
        TestUser.GLOBAL_ADMIN
      );
      msessageId = messageRes.body.data.sendComment.id;

      let getAspectsData = await aspectDataPerContext(
        0,
        entitiesId.ecoverseId,
        entitiesId.challengeId,
        entitiesId.opportunityId
      );
      let data = getAspectsData[0];

      // Assert
      expect(data).toEqual(
        expect.objectContaining({
          comments: {
            id: aspectCommentsIdHub,
            messages: [
              {
                id: msessageId,
                message: `test message`,
                sender: users.globalAdminId,
              },
            ],
          },
        })
      );
    });

    test('GA should remove comment on aspect created on hub context from GA', async () => {
      // Act
      await mutation(
        removeComment,
        removeCommentVariablesData(aspectCommentsIdHub, msessageId),
        TestUser.GLOBAL_ADMIN
      );

      let getAspectsData = await aspectDataPerContext(
        0,
        entitiesId.ecoverseId,
        entitiesId.challengeId,
        entitiesId.opportunityId
      );
      let data = getAspectsData[0];

      // Assert
      expect(data).not.toEqual(
        expect.objectContaining({
          comments: {
            id: aspectCommentsIdHub,
            messages: [
              {
                id: msessageId,
                message: `test message`,
                sender: users.globalAdminId,
              },
            ],
          },
        })
      );
    });
  });

  test('ChA should send comment on aspect created on hub context from GA', async () => {
    // Arrange
    let messageRes = await mutation(
      sendComment,
      sendCommentVariablesData(
        aspectCommentsIdChallenge,
        'test message on challenge aspect'
      ),
      TestUser.ECOVERSE_MEMBER
    );
    msessageId = messageRes.body.data.sendComment.id;

    let getAspectsData = await aspectDataPerContext(
      0,
      entitiesId.ecoverseId,
      entitiesId.challengeId,
      entitiesId.opportunityId
    );
    let data = getAspectsData[1];

    // Assert
    expect(data).toEqual(
      expect.objectContaining({
        comments: {
          id: aspectCommentsIdChallenge,
          messages: [
            {
              id: msessageId,
              message: `test message on challenge aspect`,
              sender: users.ecoverseMemberId,
            },
          ],
        },
      })
    );
  });
});

describe('Aspects - References', () => {
  let refname = 'brum';
  let refuri = 'https://brum.io';
  let refdescription = 'Brum like a brum.';
  beforeAll(async () => {
    let resAspectonHub = await createAspectOnContext(
      entitiesId.hubContextId,

      aspectDisplayName,
      `aspect-name-id-up-${uniqueId}`
    );
    hubAspectId = resAspectonHub.body.data.createAspectOnContext.id;
  });

  afterAll(async () => {
    await removeAspect(hubAspectId);
  });

  // Is it expected behavior???
  test('EM should NOT add reference to aspect created on hub context from GA', async () => {
    // Arrange
    let createRef = await mutation(
      createReferenceOnAspect,
      createReferenceOnAspectVariablesData(
        hubAspectId,
        refname,
        refuri,
        refdescription
      ),
      TestUser.ECOVERSE_MEMBER
    );

    // Act
    expect(createRef.text).toContain(
      `Authorization: unable to grant 'create' privilege: create reference on aspect: ${hubAspectId}`
    );
  });

  test('NON-EM should NOT add reference to aspect created on hub context from GA', async () => {
    // Arrange
    let createRef = await mutation(
      createReferenceOnAspect,
      createReferenceOnAspectVariablesData(
        hubAspectId,
        refname,
        refuri,
        refdescription
      ),
      TestUser.NON_ECOVERSE_MEMBER
    );

    // Act
    expect(createRef.text).toContain(
      `Authorization: unable to grant 'create' privilege: create reference on aspect: ${hubAspectId}`
    );
  });

  describe('References - EA Create/Remove flow', () => {
    test('EA should add reference to aspect created on hub context from GA', async () => {
      // Arrange
      let createRef = await mutation(
        createReferenceOnAspect,
        createReferenceOnAspectVariablesData(
          hubAspectId,
          refname,
          refuri,
          refdescription
        ),
        TestUser.ECOVERSE_ADMIN
      );
      let refId = createRef.body.data.createReferenceOnAspect.id;

      // Act
      let getAspectsData = await aspectDataPerContext(
        0,
        entitiesId.ecoverseId,
        entitiesId.challengeId,
        entitiesId.opportunityId
      );
      let data = getAspectsData[0];

      // Assert
      expect(data).toEqual(
        expect.objectContaining({
          references: [
            {
              id: refId,
              name: refname,
              uri: refuri,
            },
          ],
        })
      );
    });

    test('EA should remove reference from aspect created EA', async () => {
      // Arrange
      await mutation(
        deleteReference,
        deleteVariablesData(refId),
        TestUser.ECOVERSE_ADMIN
      );

      // Act
      let getAspectsData = await aspectDataPerContext(
        0,
        entitiesId.ecoverseId,
        entitiesId.challengeId,
        entitiesId.opportunityId
      );
      let data = getAspectsData[0];

      // Assert
      expect(data).not.toEqual(
        expect.objectContaining({
          references: [
            {
              id: refId,
              name: refname,
              uri: refuri,
            },
          ],
        })
      );
    });
  });
});

describe('Aspects - using New Hub templates', () => {
  test('Hub aspect template created and utilized by aspect', async () => {
    // Arrange
    const typeFromHubtemplate = 'testType';
    let hubUpdate = await mutation(
      updateEcoverse,
      updateEcoverseVariablesData(
        entitiesId.ecoverseId,
        `neweconame-${uniqueId}`,
        `neweconame-${uniqueId}`,
        {
          aspectTemplates: [
            {
              type: typeFromHubtemplate,
              description: 'aspect template description',
            },
          ],
        }
      ),
      TestUser.ECOVERSE_ADMIN
    );
    let newType =
      hubUpdate.body.data.updateEcoverse.template.aspectTemplates[0].type;

    // Act
    let resAspectonHub = await createAspectOnContext(
      entitiesId.hubContextId,

      `new-template-d-name-${uniqueId}`,
      `new-template-name-id-${uniqueId}`,
      'check with new template type',
      newType
    );
    aspectDataCreate = resAspectonHub.body.data.createAspectOnContext;
    let aspectTypeFromHubTemplate =
      resAspectonHub.body.data.createAspectOnContext.type;
    hubAspectId = resAspectonHub.body.data.createAspectOnContext.id;

    let getAspectsData = await aspectDataPerContext(
      0,
      entitiesId.ecoverseId,
      entitiesId.challengeId,
      entitiesId.opportunityId
    );
    let data = getAspectsData[0];
    // Assert
    expect(aspectTypeFromHubTemplate).toEqual(typeFromHubtemplate);
    expect(data).toEqual(aspectDataCreate);
  });
});
