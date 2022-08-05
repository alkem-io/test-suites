import '@test/utils/array.matcher';
import { removeChallenge } from '@test/functional-api/integration/challenge/challenge.request.params';
import { removeOpportunity } from '@test/functional-api/integration/opportunity/opportunity.request.params';
import { deleteOrganization } from '../organization/organization.request.params';
import { removeHub } from '../hub/hub.request.params';
import {
  assignUsersForAspectTests,
  entitiesId,
} from '@test/functional-api/zcommunications/communications-helper';
import { uniqueId } from '@test/utils/mutations/create-mutation';
import {
  createChallengeForOrgHub,
  createOpportunityForChallenge,
  createOrgAndHub,
} from '@test/functional-api/zcommunications/create-entities-with-users-helper';
import { createCalloutOnCollaboration } from './callouts.request.params';

let opportunityName = 'aspect-opp';
let challengeName = 'aspect-chal';
const hubAspect = '';
const challengeAspect = '';
const opportunityAspect = '';
let calloutNameID = '';
let calloutDisplayName = '';
let calloutDescription = '';
const organizationName = 'callout-org-name' + uniqueId;
const hostNameId = 'callout-org-nameid' + uniqueId;
const hubName = 'callout-eco-name' + uniqueId;
const hubNameId = 'callout-eco-nameid' + uniqueId;

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
  calloutNameID = `callout-name-id-${uniqueId}`;
  calloutDisplayName = `callout-d-name-${uniqueId}`;
  calloutDescription = `calloutDescription-${uniqueId}`;
});

describe('Callouts - Create', () => {
  afterEach(async () => {
    // await removeAspect(hubAspectId);
    // await removeAspect(challengeAspectId);
    // await removeAspect(opportunityAspectId);
  });
  test.only('GA should create aspect on hub context', async () => {
    // Act
    const res = await createCalloutOnCollaboration(
      entitiesId.hubCollaborationId,
      calloutDisplayName,
      calloutNameID
    );
    console.log(res.body);
    // aspectDataCreate = resAspectonHub.body.data.createAspectOnCallout;
    // hubAspectId = resAspectonHub.body.data.createAspectOnCallout.id;

    // const aspectsData = await aspectDataPerContext(
    //   entitiesId.hubId,
    //   entitiesId.challengeId,
    //   entitiesId.opportunityId
    // );
    // const data = aspectsData.hubAspect;
    // // Assert
    // expect(data).toEqual([aspectDataCreate]);
  });
});
