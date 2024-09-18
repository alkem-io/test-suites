import { createPostOnCalloutCodegen } from '@test/functional-api/callout/post/post.request.params';
import { deleteChallengeCodegen } from '@test/functional-api/journey/challenge/challenge.request.params';
import { deleteSpaceCodegen } from '@test/functional-api/journey/space/space.request.params';
import {
  deleteOpportunityCodegen,
  getOpportunityDataCodegen,
} from '@test/functional-api/journey/opportunity/opportunity.request.params';
import { createRelationCodegen } from '@test/functional-api/relations/relations.request.params';
import { TestUser } from '@test/utils';
import { uniqueId } from '@test/utils/mutations/create-mutation';
import { changePreferenceSpaceCodegen } from '@test/utils/mutations/preferences-mutation';
import { users } from '@test/utils/queries/users-data';
import {
  createChallengeForOrgSpaceCodegen,
  createOpportunityForChallengeCodegen,
  createOrgAndSpaceCodegen,
} from '@test/utils/data-setup/entities';
import { deleteOrganizationCodegen } from '@test/functional-api/organization/organization.request.params';
import { SpacePreferenceType } from '@alkemio/client-lib';
import { sendMessageToRoomCodegen } from '@test/functional-api/communications/communication.params';
import { entitiesId } from '@test/functional-api/roles/community/communications-helper';
import { assignCommunityRoleToUserCodegen } from '@test/functional-api/roles/roles-request.params';
import { CommunityRole } from '@test/generated/alkemio-schema';

const organizationName = 'auth-ga-org-name' + uniqueId;
const hostNameId = 'auth-ga-org-nameid' + uniqueId;
const spaceName = 'auth-ga-eco-name' + uniqueId;
const spaceNameId = 'auth-ga-eco-nameid' + uniqueId;
const opportunityName = 'auth-ga-opp';
const challengeName = 'auth-ga-chal';

beforeAll(async () => {
  await createOrgAndSpaceCodegen(
    organizationName,
    hostNameId,
    spaceName,
    spaceNameId
  );
  await createChallengeForOrgSpaceCodegen(challengeName);
  await createOpportunityForChallengeCodegen(opportunityName);

  await changePreferenceSpaceCodegen(
    entitiesId.spaceId,
    SpacePreferenceType.AuthorizationAnonymousReadAccess,
    'false'
  );

  await assignCommunityRoleToUserCodegen(
    users.qaUser.id,
    entitiesId.space.communityId,
    CommunityRole.Member
  );

  await sendMessageToRoomCodegen(
    entitiesId.opportunity.updatesId,
    'test',
    TestUser.GLOBAL_ADMIN
  );

  await createRelationCodegen(
    entitiesId.opportunity.collaborationId,
    'incoming',
    'relationDescription',
    'relationActorName',
    'relationActorRole',
    'relationActorType',
    TestUser.GLOBAL_ADMIN
  );

  await createPostOnCalloutCodegen(
    entitiesId.opportunity.calloutId,
    { displayName: 'postDisplayName' },
    'postnameid',
    TestUser.GLOBAL_ADMIN
  );
});
afterAll(async () => {
  await deleteOpportunityCodegen(entitiesId.opportunity.id);
  await deleteChallengeCodegen(entitiesId.challenge.id);
  await deleteSpaceCodegen(entitiesId.spaceId);
  await deleteOrganizationCodegen(entitiesId.organization.id);
});

describe('myPrivileges - Opportunity of Public Space', () => {
  test('RegisteredUser privileges to Opportunity', async () => {
    // Act
    const response = await getOpportunityDataCodegen(
      entitiesId.opportunity.id,
      TestUser.NON_HUB_MEMBER
    );

    // Assert
    expect(response.error?.errors[0].message).toContain(
      // eslint-disable-next-line prettier/prettier
      "User (non.space@alkem.io) does not have credentials that grant 'read' access to Space.opportunity"
    );
  });
});
