import '@test/utils/array.matcher';
import { removeChallenge } from '@test/functional-api/integration/challenge/challenge.request.params';
import {
  removeAspect,
  AspectTypes,
  updateAspect,
  createAspectOnCallout,
  getDataPerHubCallout,
  getDataPerChallengeCallout,
  getDataPerOpportunityCallout,
  cardDataPerHubCalloutCount,
  cardDataPerChallengeCalloutCount,
  cardDataPerOpportunityCalloutCount,
} from './aspect.request.params';
import { removeOpportunity } from '@test/functional-api/integration/opportunity/opportunity.request.params';
import { deleteOrganization } from '../organization/organization.request.params';
import { removeHub } from '../hub/hub.request.params';
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
  createChallengeForOrgHub,
  createOpportunityForChallenge,
  createOrgAndHub,
} from '@test/functional-api/zcommunications/create-entities-with-users-helper';
import { errorAuthUpdateAspect } from './aspect-template-testdata';
import {
  deleteReference,
  deleteVariablesData,
} from '@test/utils/mutations/delete-mutation';

let opportunityName = 'aspect-opp';
let challengeName = 'aspect-chal';
let hubAspectId = '';
let challengeAspectId = '';
let opportunityAspectId = '';
let aspectNameID = '';
let aspectDisplayName = '';
let aspectDataCreate = '';
let aspectCommentsIdHub = '';
let aspectCommentsIdChallenge = '';
let msessageId = '';
const hubCalloutId = '';

const organizationName = 'aspect-org-name' + uniqueId;
const hostNameId = 'aspect-org-nameid' + uniqueId;
const hubName = 'aspect-eco-name' + uniqueId;
const hubNameId = 'aspect-eco-nameid' + uniqueId;

beforeAll(async () => {
  await createOrgAndHub(organizationName, hostNameId, hubName, hubNameId);

  await createChallengeForOrgHub(challengeName);
  await createOpportunityForChallenge(opportunityName);

  await assignUsersForAspectTests();
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
});

describe('Aspects - Create', () => {
  afterEach(async () => {
    await removeAspect(hubAspectId);
    await removeAspect(challengeAspectId);
    await removeAspect(opportunityAspectId);
  });
  test('EM should create aspect on hub callout', async () => {
    // Act
    const resAspectonHub = await createAspectOnCallout(
      entitiesId.hubCalloutId,
      aspectDisplayName,
      aspectNameID,
      AspectTypes.KNOWLEDGE,
      TestUser.HUB_MEMBER
    );
    aspectDataCreate = resAspectonHub.body.data.createAspectOnCallout;
    hubAspectId = resAspectonHub.body.data.createAspectOnCallout.id;

    const aspectsData = await getDataPerHubCallout(
      entitiesId.hubId,
      entitiesId.hubCalloutId,
      TestUser.HUB_MEMBER
    );
    const data = aspectsData.body.data.hub.collaboration.callouts[0].aspects[0];

    // Assert
    expect(data).toEqual(aspectDataCreate);
  });

  test('GA should create aspect on hub callout without setting nameId', async () => {
    // Act
    const resAspectonHub = await createAspectOnCallout(
      entitiesId.hubCalloutId,
      aspectDisplayName,
      aspectNameID
    );

    hubAspectId = resAspectonHub.body.data.createAspectOnCallout.id;
    const hubAspectNameId =
      resAspectonHub.body.data.createAspectOnCallout.nameID;

    // Assert
    expect(hubAspectNameId).toContain(aspectNameID);
  });

  test('NON-EM should NOT create aspect on hub callout', async () => {
    // Act
    const resAspectonHub = await createAspectOnCallout(
      entitiesId.hubCalloutId,
      aspectDisplayName,
      aspectNameID,
      AspectTypes.ACTOR,
      TestUser.NON_HUB_MEMBER
    );

    // Assert
    expect(resAspectonHub.text).toContain(
      `Authorization: unable to grant 'create-aspect' privilege: create aspect on callout: ${hubCalloutId}`
    );
  });

  test('ChA should create card on challenge callout', async () => {
    // Act
    const resAspectonChallenge = await createAspectOnCallout(
      entitiesId.challengeCalloutId,
      aspectDisplayName + 'ch',
      aspectNameID + 'ch',
      AspectTypes.RELATED_INITIATIVE,
      TestUser.HUB_MEMBER
    );

    aspectDataCreate = resAspectonChallenge.body.data.createAspectOnCallout;
    challengeAspectId = resAspectonChallenge.body.data.createAspectOnCallout.id;

    const aspectsData = await getDataPerChallengeCallout(
      entitiesId.hubId,
      entitiesId.challengeId,
      entitiesId.challengeCalloutId,
      TestUser.HUB_MEMBER
    );
    const data =
      aspectsData.body.data.hub.challenge.collaboration.callouts[0].aspects[0];

    // Assert
    expect(data).toEqual(aspectDataCreate);
  });

  test('GA should create aspect on opportunity callout', async () => {
    // Act
    const resAspectonOpportunity = await createAspectOnCallout(
      entitiesId.opportunityCalloutId,
      aspectDisplayName + 'op',
      aspectNameID + 'op'
    );
    aspectDataCreate = resAspectonOpportunity.body.data.createAspectOnCallout;
    opportunityAspectId =
      resAspectonOpportunity.body.data.createAspectOnCallout.id;

    const aspectsData = await getDataPerOpportunityCallout(
      entitiesId.hubId,
      entitiesId.opportunityId,
      entitiesId.opportunityCalloutId
    );
    const data =
      aspectsData.body.data.hub.opportunity.collaboration.callouts[0]
        .aspects[0];

    // Assert
    expect(data).toEqual(aspectDataCreate);
  });
});

describe('Aspects - Update', () => {
  beforeAll(async () => {
    const resAspectonHub = await createAspectOnCallout(
      entitiesId.hubCalloutId,
      aspectDisplayName + 'forUpdates',
      `aspect-name-id-up-${uniqueId}`
    );
    hubAspectId = resAspectonHub.body.data.createAspectOnCallout.id;
  });

  afterAll(async () => {
    await removeAspect(hubAspectId);
  });

  test('EM should NOT update aspect created on hub callout from GA', async () => {
    // Act
    const resAspectonHub = await updateAspect(
      hubAspectId,
      aspectNameID,
      aspectDisplayName + 'EM update',
      AspectTypes.KNOWLEDGE,
      TestUser.HUB_MEMBER
    );

    // Assert
    expect(resAspectonHub.text).toContain(errorAuthUpdateAspect);
  });

  test('NON-EM should NOT update aspect created on hub callout from GA', async () => {
    // Arrange
    const resAspectonHub = await updateAspect(
      hubAspectId,
      aspectNameID,
      aspectDisplayName + 'Non-EM update',
      AspectTypes.KNOWLEDGE,
      TestUser.NON_HUB_MEMBER
    );

    // Act
    expect(resAspectonHub.text).toContain(errorAuthUpdateAspect);
  });

  test('EA should update aspect created on hub callout from GA', async () => {
    // Arrange
    const resAspectonHub = await updateAspect(
      hubAspectId,
      aspectNameID,
      aspectDisplayName + 'EA update',
      AspectTypes.KNOWLEDGE,
      TestUser.HUB_ADMIN
    );
    const aspectDataUpdate = resAspectonHub.body.data.updateAspect;

    // Act
    const aspectsData = await getDataPerHubCallout(
      entitiesId.hubId,
      entitiesId.hubCalloutId,
      TestUser.HUB_ADMIN
    );
    const data = aspectsData.body.data.hub.collaboration.callouts[0].aspects[0];

    // Assert
    expect(data).toEqual(aspectDataUpdate);
  });
  test('GA should update aspect created on hub callout from GA', async () => {
    // Arrange
    const resAspectonHub = await updateAspect(
      hubAspectId,
      aspectNameID,
      aspectDisplayName + 'EA update',
      AspectTypes.KNOWLEDGE,
      TestUser.GLOBAL_ADMIN
    );
    const aspectDataUpdate = resAspectonHub.body.data.updateAspect;

    // Act
    const aspectsData = await getDataPerHubCallout(
      entitiesId.hubId,
      entitiesId.hubCalloutId
    );
    const data = aspectsData.body.data.hub.collaboration.callouts[0].aspects[0];

    // Assert
    expect(data).toEqual(aspectDataUpdate);
  });
});

test('EM should update aspect created on hub callout from EM', async () => {
  // Arrange
  const resAspectonHubEM = await createAspectOnCallout(
    entitiesId.hubCalloutId,
    aspectDisplayName + 'EM',
    `asp-nid-up-em${uniqueId}`,
    AspectTypes.KNOWLEDGE,
    TestUser.HUB_MEMBER
  );
  const hubAspectIdEM = resAspectonHubEM.body.data.createAspectOnCallout.id;

  // Act
  const resAspectonHub = await updateAspect(
    hubAspectIdEM,
    aspectNameID,
    aspectDisplayName + 'EM update',
    AspectTypes.ACTOR,
    TestUser.HUB_MEMBER
  );

  const aspectDataUpdate = resAspectonHub.body.data.updateAspect;

  // Act
  const aspectsData = await getDataPerHubCallout(
    entitiesId.hubId,
    entitiesId.hubCalloutId,
    TestUser.HUB_MEMBER
  );
  const data = aspectsData.body.data.hub.collaboration.callouts[0].aspects[0];

  // Assert
  expect(data).toEqual(aspectDataUpdate);

  await removeAspect(hubAspectIdEM);
});

describe('Aspects - Delete', () => {
  test('EM should NOT delete aspect created on hub callout from GA', async () => {
    // Arrange
    const resAspectonHub = await createAspectOnCallout(
      entitiesId.hubCalloutId,
      aspectDisplayName,
      aspectNameID
    );

    hubAspectId = resAspectonHub.body.data.createAspectOnCallout.id;

    // Act
    const responseRemove = await removeAspect(hubAspectId, TestUser.HUB_MEMBER);

    const aspectsData = await cardDataPerHubCalloutCount(
      entitiesId.hubId,
      entitiesId.hubCalloutId
    );

    // Assert
    expect(responseRemove.text).toContain(
      `Authorization: unable to grant 'delete' privilege: delete aspect: ${aspectDisplayName}`
    );
    expect(aspectsData).toHaveLength(1);
    await removeAspect(hubAspectId);
  });

  test('EM should delete aspect created on hub callout from Himself', async () => {
    // Arrange
    const resAspectonHub = await createAspectOnCallout(
      entitiesId.hubCalloutId,
      aspectDisplayName,
      aspectNameID,
      AspectTypes.RELATED_INITIATIVE,
      TestUser.HUB_MEMBER
    );

    hubAspectId = resAspectonHub.body.data.createAspectOnCallout.id;

    // Act
    await removeAspect(hubAspectId, TestUser.HUB_MEMBER);
    const aspectsData = await cardDataPerHubCalloutCount(
      entitiesId.hubId,
      entitiesId.hubCalloutId
    );

    // Assert
    expect(aspectsData).toHaveLength(0);
  });

  test('HM should delete aspect created on hub callout from EM', async () => {
    // Arrange
    const resAspectonHub = await createAspectOnCallout(
      entitiesId.hubCalloutId,
      aspectDisplayName,
      aspectNameID,
      AspectTypes.RELATED_INITIATIVE,
      TestUser.HUB_MEMBER
    );
    hubAspectId = resAspectonHub.body.data.createAspectOnCallout.id;

    // Act
    await removeAspect(hubAspectId, TestUser.GLOBAL_ADMIN);
    const aspectsData = await cardDataPerHubCalloutCount(
      entitiesId.hubId,
      entitiesId.hubCalloutId
    );
    // Assert
    expect(aspectsData).toHaveLength(0);
  });

  test('NON-EM should NOT delete aspect created on hub callout from Himself', async () => {
    // Arrange
    const resAspectonHub = await createAspectOnCallout(
      entitiesId.hubCalloutId,
      aspectDisplayName,
      aspectNameID,
      AspectTypes.RELATED_INITIATIVE,
      TestUser.HUB_MEMBER
    );

    hubAspectId = resAspectonHub.body.data.createAspectOnCallout.id;

    // Act
    const responseRemove = await removeAspect(
      hubAspectId,
      TestUser.NON_HUB_MEMBER
    );

    const aspectsData = await cardDataPerHubCalloutCount(
      entitiesId.hubId,
      entitiesId.hubCalloutId
    );
    // Assert
    expect(responseRemove.text).toContain(
      `Authorization: unable to grant 'delete' privilege: delete aspect: ${aspectDisplayName}`
    );
    expect(aspectsData).toHaveLength(1);
    await removeAspect(hubAspectId);
  });

  test('ChA should delete aspect created on challenge callout from GA', async () => {
    // Arrange
    const resAspectonChallenge = await createAspectOnCallout(
      entitiesId.challengeCalloutId,
      aspectDisplayName + 'ch',
      aspectNameID + 'ch'
    );
    challengeAspectId = resAspectonChallenge.body.data.createAspectOnCallout.id;

    // Act
    await removeAspect(challengeAspectId, TestUser.HUB_MEMBER);
    const data = await cardDataPerChallengeCalloutCount(
      entitiesId.hubId,
      entitiesId.challengeId,
      entitiesId.challengeCalloutId
    );

    // Assert
    expect(data).toHaveLength(0);
  });

  test('HA should delete aspect created on challenge callout from ChA', async () => {
    // Arrange
    const resAspectonChallenge = await createAspectOnCallout(
      entitiesId.challengeCalloutId,
      aspectDisplayName + 'ch',
      aspectNameID + 'ch',
      AspectTypes.RELATED_INITIATIVE,
      TestUser.HUB_MEMBER
    );

    challengeAspectId = resAspectonChallenge.body.data.createAspectOnCallout.id;

    // Act
    await removeAspect(challengeAspectId, TestUser.HUB_MEMBER);

    const data = await cardDataPerChallengeCalloutCount(
      entitiesId.hubId,
      entitiesId.challengeId,
      entitiesId.challengeCalloutId
    );

    // Assert
    expect(data).toHaveLength(0);
  });

  test('ChA should delete aspect created on opportunity callout from OM', async () => {
    // Act
    const resAspectonOpportunity = await createAspectOnCallout(
      entitiesId.opportunityCalloutId,
      aspectDisplayName + 'opm',
      aspectNameID + 'opm',
      AspectTypes.RELATED_INITIATIVE,
      TestUser.QA_USER
    );
    opportunityAspectId =
      resAspectonOpportunity.body.data.createAspectOnCallout.id;

    // Act
    await removeAspect(opportunityAspectId, TestUser.HUB_MEMBER);
    const data = await cardDataPerOpportunityCalloutCount(
      entitiesId.hubId,
      entitiesId.opportunityId,
      entitiesId.opportunityCalloutId
    );

    // Assert
    expect(data).toHaveLength(0);
  });

  test('ChM should not delete aspect created on challenge callout from ChA', async () => {
    // Arrange
    const resAspectonChallenge = await createAspectOnCallout(
      entitiesId.challengeCalloutId,
      aspectDisplayName + 'ch',
      aspectNameID + 'ch',
      AspectTypes.RELATED_INITIATIVE,
      TestUser.HUB_MEMBER
    );

    challengeAspectId = resAspectonChallenge.body.data.createAspectOnCallout.id;

    // Act
    const responseRemove = await removeAspect(
      challengeAspectId,
      TestUser.QA_USER
    );

    const data = await cardDataPerChallengeCalloutCount(
      entitiesId.hubId,
      entitiesId.challengeId,
      entitiesId.challengeCalloutId
    );
    // Assert
    expect(responseRemove.text).toContain(
      `Authorization: unable to grant 'delete' privilege: delete aspect: ${aspectDisplayName}`
    );
    expect(data).toHaveLength(1);
    await removeAspect(challengeAspectId);
  });

  test('OM should delete own aspect on opportunity callout', async () => {
    // Act
    const resAspectonOpportunity = await createAspectOnCallout(
      entitiesId.opportunityCalloutId,
      aspectDisplayName + 'op',
      aspectNameID + 'op',
      AspectTypes.RELATED_INITIATIVE,
      TestUser.QA_USER
    );
    opportunityAspectId =
      resAspectonOpportunity.body.data.createAspectOnCallout.id;

    // Act
    await removeAspect(opportunityAspectId, TestUser.QA_USER);
    const data = await cardDataPerOpportunityCalloutCount(
      entitiesId.hubId,
      entitiesId.opportunityId,
      entitiesId.opportunityCalloutId
    );

    // Assert
    expect(data).toHaveLength(0);
  });

  test('GA should delete own aspect on opportunity callout', async () => {
    // Act
    const resAspectonOpportunity = await createAspectOnCallout(
      entitiesId.opportunityCalloutId,
      aspectDisplayName + 'op',
      aspectNameID + 'op',
      AspectTypes.RELATED_INITIATIVE,
      TestUser.GLOBAL_ADMIN
    );
    opportunityAspectId =
      resAspectonOpportunity.body.data.createAspectOnCallout.id;

    // Act
    await removeAspect(opportunityAspectId, TestUser.GLOBAL_ADMIN);
    const data = await cardDataPerOpportunityCalloutCount(
      entitiesId.hubId,
      entitiesId.opportunityId,
      entitiesId.opportunityCalloutId
    );

    // Assert
    expect(data).toHaveLength(0);
  });
});

describe('Aspects - Messages', () => {
  describe('Send Message - Aspect created by GA on Hub callout', () => {
    beforeAll(async () => {
      const resAspectonHub = await createAspectOnCallout(
        entitiesId.hubCalloutId,

        `asp-dhub-mess-${uniqueId}`,
        `asp-nhub-mess-${uniqueId}`
      );

      hubAspectId = resAspectonHub.body.data.createAspectOnCallout.id;
      aspectCommentsIdHub =
        resAspectonHub.body.data.createAspectOnCallout.comments.id;

      const resAspectonChallenge = await createAspectOnCallout(
        entitiesId.challengeCalloutId,
        `asp-dchal-mess-${uniqueId}`,
        `asp-nchal-mess-${uniqueId}`
      );

      challengeAspectId =
        resAspectonChallenge.body.data.createAspectOnCallout.id;
      aspectCommentsIdChallenge =
        resAspectonChallenge.body.data.createAspectOnCallout.comments.id;
    });

    afterAll(async () => {
      await removeAspect(hubAspectId);
      await removeAspect(challengeAspectId);
    });

    afterEach(async () => {
      await delay(3000);
      await mutation(
        removeComment,
        removeCommentVariablesData(aspectCommentsIdHub, msessageId),
        TestUser.GLOBAL_ADMIN
      );
    });

    test('ChA should send comment on aspect created on challenge callout from GA', async () => {
      // Arrange
      const messageRes = await mutation(
        sendComment,
        sendCommentVariablesData(
          aspectCommentsIdChallenge,
          'test message on challenge aspect'
        ),
        TestUser.HUB_MEMBER
      );
      msessageId = messageRes.body.data.sendComment.id;

      const aspectsData = await getDataPerChallengeCallout(
        entitiesId.hubId,
        entitiesId.challengeId,
        entitiesId.challengeCalloutId
      );
      const data =
        aspectsData.body.data.hub.challenge.collaboration.callouts[0].aspects[0]
          .comments;

      // Assert
      expect(data).toEqual({
        id: aspectCommentsIdChallenge,
        messages: [
          {
            id: msessageId,
            message: 'test message on challenge aspect',
            sender: { id: users.hubMemberId },
          },
        ],
      });
    });

    test('EM should send comment on aspect created on hub callout from GA', async () => {
      // Arrange
      const messageRes = await mutation(
        sendComment,
        sendCommentVariablesData(aspectCommentsIdHub, 'test message'),
        TestUser.HUB_MEMBER
      );
      msessageId = messageRes.body.data.sendComment.id;

      const aspectsData = await getDataPerHubCallout(
        entitiesId.hubId,
        entitiesId.hubCalloutId
      );
      const data =
        aspectsData.body.data.hub.collaboration.callouts[0].aspects[0].comments;

      // Assert
      expect(data).toEqual({
        id: aspectCommentsIdHub,
        messages: [
          {
            id: msessageId,
            message: 'test message',
            sender: { id: users.hubMemberId },
          },
        ],
      });
    });

    test('NON-EM should NOT send comment on aspect created on hub callout from GA', async () => {
      // Arrange
      const messageRes = await mutation(
        sendComment,
        sendCommentVariablesData(aspectCommentsIdHub, 'test message'),
        TestUser.NON_HUB_MEMBER
      );

      // Assert
      expect(messageRes.text).toContain(
        `Authorization: unable to grant 'create-comment' privilege: comments send message: aspect-comments-asp-dhub-mess-${uniqueId}`
      );
    });
    describe('Messages - GA Send/Remove flow', () => {
      test('GA should send comment on aspect created on hub callout from GA', async () => {
        // Act
        const messageRes = await mutation(
          sendComment,
          sendCommentVariablesData(aspectCommentsIdHub, 'test message'),
          TestUser.GLOBAL_ADMIN
        );
        msessageId = messageRes.body.data.sendComment.id;

        const aspectsData = await getDataPerHubCallout(
          entitiesId.hubId,
          entitiesId.hubCalloutId
        );
        const data =
          aspectsData.body.data.hub.collaboration.callouts[0].aspects[0]
            .comments;

        // Assert
        expect(data).toEqual({
          id: aspectCommentsIdHub,
          messages: [
            {
              id: msessageId,
              message: 'test message',
              sender: { id: users.globalAdminId },
            },
          ],
        });
      });

      test('GA should remove comment on aspect created on hub callout from GA', async () => {
        // Act
        await mutation(
          removeComment,
          removeCommentVariablesData(aspectCommentsIdHub, msessageId),
          TestUser.GLOBAL_ADMIN
        );

        const aspectsData = await getDataPerHubCallout(
          entitiesId.hubId,
          entitiesId.hubCalloutId
        );
        const data =
          aspectsData.body.data.hub.collaboration.callouts[0].aspects[0]
            .comments.messages;

        // Assert
        expect(data).toHaveLength(0);
      });
    });
  });
  describe('Delete Message - Aspect created by EM on Hub callout', () => {
    beforeAll(async () => {
      const resAspectonHub = await createAspectOnCallout(
        entitiesId.hubCalloutId,
        `em-asp-d-hub-mess-${uniqueId}`,
        `em-asp-n-hub-mess-${uniqueId}`,
        AspectTypes.RELATED_INITIATIVE,
        TestUser.HUB_MEMBER
      );
      hubAspectId = resAspectonHub.body.data.createAspectOnCallout.id;
      aspectCommentsIdHub =
        resAspectonHub.body.data.createAspectOnCallout.comments.id;

      const messageRes = await mutation(
        sendComment,
        sendCommentVariablesData(aspectCommentsIdHub, 'test message'),
        TestUser.GLOBAL_ADMIN
      );

      msessageId = messageRes.body.data.sendComment.id;
      await delay(1000);
    });

    afterAll(async () => {
      await removeAspect(hubAspectId);
    });

    test('EM should NOT delete comment sent from GA', async () => {
      // Act
      const removeMessageRes = await mutation(
        removeComment,
        removeCommentVariablesData(aspectCommentsIdHub, msessageId),
        TestUser.HUB_MEMBER
      );

      // Assert
      expect(removeMessageRes.text).toContain(
        `Authorization: unable to grant 'delete' privilege: comments remove message: aspect-comments-em-asp-d-hub-mess-${uniqueId}`
      );
    });

    test('NON-EM should NOT delete comment sent from GA', async () => {
      // Act
      const removeMessageRes = await mutation(
        removeComment,
        removeCommentVariablesData(aspectCommentsIdHub, msessageId),
        TestUser.NON_HUB_MEMBER
      );

      // Assert
      expect(removeMessageRes.text).toContain(
        `Authorization: unable to grant 'delete' privilege: comments remove message: aspect-comments-em-asp-d-hub-mess-${uniqueId}`
      );
    });

    test('GA should remove comment sent from GA', async () => {
      // Act
      await mutation(
        removeComment,
        removeCommentVariablesData(aspectCommentsIdHub, msessageId),
        TestUser.GLOBAL_ADMIN
      );

      const aspectsData = await getDataPerHubCallout(
        entitiesId.hubId,
        entitiesId.hubCalloutId
      );
      const data =
        aspectsData.body.data.hub.collaboration.callouts[0].aspects[0].comments
          .messages;

      // Assert
      expect(data).toHaveLength(0);
    });

    test('EM should delete own comment', async () => {
      const messageRes = await mutation(
        sendComment,
        sendCommentVariablesData(aspectCommentsIdHub, 'test message'),
        TestUser.HUB_MEMBER
      );

      msessageId = messageRes.body.data.sendComment.id;
      await delay(1000);

      // Act
      const removeMessageRes = await mutation(
        removeComment,
        removeCommentVariablesData(aspectCommentsIdHub, msessageId),
        TestUser.HUB_MEMBER
      );
      const aspectsData = await getDataPerHubCallout(
        entitiesId.hubId,
        entitiesId.hubCalloutId
      );

      const dataCount =
        aspectsData.body.data.hub.collaboration.callouts[0].aspects[0].comments
          .messages;

      // Assert
      expect(dataCount).toHaveLength(0);
      expect(removeMessageRes.text).not.toContain(
        `Authorization: unable to grant 'delete' privilege: comments remove message: em-asp-d-hub-mess-${uniqueId}`
      );
    });
  });
});

describe('Aspects - References', () => {
  const refname = 'brum';
  const refuri = 'https://brum.io';
  const refdescription = 'Brum like a brum.';
  let refId = '';
  let cardProfileId = '';

  beforeAll(async () => {
    const resAspectonHub = await createAspectOnCallout(
      entitiesId.hubCalloutId,
      'test',
      `asp-n-id-up-${uniqueId}`
    );
    hubAspectId = resAspectonHub.body.data.createAspectOnCallout.id;
    cardProfileId = resAspectonHub.body.data.createAspectOnCallout.profile.id;
  });

  afterAll(async () => {
    await removeAspect(hubAspectId);
  });

  test('EM should NOT add reference to aspect created on hub callout from GA', async () => {
    // Arrange
    const createRef = await mutation(
      createReferenceOnAspect,
      createReferenceOnAspectVariablesData(
        cardProfileId,
        refname,
        refuri,
        refdescription
      ),
      TestUser.HUB_MEMBER
    );
    // Act
    expect(createRef.text).toContain(
      `Authorization: unable to grant 'create' privilege: cardProfile: ${cardProfileId}`
    );
  });

  test('NON-EM should NOT add reference to aspect created on hub callout from GA', async () => {
    // Arrange
    const createRef = await mutation(
      createReferenceOnAspect,
      createReferenceOnAspectVariablesData(
        cardProfileId,
        refname,
        refuri,
        refdescription
      ),
      TestUser.NON_HUB_MEMBER
    );

    // Act
    expect(createRef.text).toContain(
      `Authorization: unable to grant 'create' privilege: cardProfile: ${cardProfileId}`
    );
  });

  describe('References - EA Create/Remove flow', () => {
    test('EA should add reference to aspect created on hub callout from GA', async () => {
      // Arrange
      const createRef = await mutation(
        createReferenceOnAspect,
        createReferenceOnAspectVariablesData(
          cardProfileId,
          refname,
          refuri,
          refdescription
        ),

        TestUser.HUB_ADMIN
      );
      refId = createRef.body.data.createReferenceOnCardProfile.id;

      // Ac
      const aspectsData = await getDataPerHubCallout(
        entitiesId.hubId,
        entitiesId.hubCalloutId
      );
      const data =
        aspectsData.body.data.hub.collaboration.callouts[0].aspects[0].profile
          .references[0];

      // Assert
      expect(data).toEqual({
        id: refId,
        name: refname,
        uri: refuri,
      });
    });

    test('EA should remove reference from aspect created EA', async () => {
      // Arrange
      await mutation(
        deleteReference,
        deleteVariablesData(refId),
        TestUser.HUB_ADMIN
      );

      // Act
      const aspectsData = await getDataPerHubCallout(
        entitiesId.hubId,
        entitiesId.hubCalloutId
      );
      const data =
        aspectsData.body.data.hub.collaboration.callouts[0].aspects[0].profile
          .references;

      // Assert
      expect(data).toHaveLength(0);
    });
  });
});
