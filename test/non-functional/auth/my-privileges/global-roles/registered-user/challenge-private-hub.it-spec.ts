import { createPostOnCallout } from '@test/functional-api/callout/post/post.request.params';
import {
  deleteChallenge,
  getChallengeData,
} from '@test/functional-api/journey/challenge/challenge.request.params';
import { deleteSpace } from '@test/functional-api/journey/space/space.request.params';
import { createRelation } from '@test/functional-api/relations/relations.request.params';
import { createApplication } from '@test/functional-api/roleset/application/application.request.params';
import { TestUser } from '@test/utils';
import { uniqueId } from '@test/utils/mutations/create-mutation';
import {
  changePreferenceChallenge,
  changePreferenceSpace,
} from '@test/utils/mutations/preferences-mutation';
import { users } from '@test/utils/queries/users-data';
import {
  createChallengeForOrgSpace,
  createOrgAndSpace,
} from '@test/utils/data-setup/entities';
import { deleteOrganization } from '@test/functional-api/contributor-management/organization/organization.request.params';
import { sendMessageToRoom } from '@test/functional-api/communications/communication.params';
import {
  ChallengePreferenceType,
  SpacePreferenceType,
} from '@alkemio/client-lib';
import { entitiesId } from '@test/types/entities-helper';
import { assignRoleToUser } from '@test/functional-api/roleset/roles-request.params';
import { CommunityRole } from '@test/generated/alkemio-schema';

const organizationName = 'auth-ga-org-name' + uniqueId;
const hostNameId = 'auth-ga-org-nameid' + uniqueId;
const spaceName = 'auth-ga-eco-name' + uniqueId;
const spaceNameId = 'auth-ga-eco-nameid' + uniqueId;
const challengeName = 'auth-ga-chal';

beforeAll(async () => {
  await createOrgAndSpace(
    organizationName,
    hostNameId,
    spaceName,
    spaceNameId
  );
  await changePreferenceSpace(
    entitiesId.spaceId,
    SpacePreferenceType.AuthorizationAnonymousReadAccess,
    'false'
  );
  await createChallengeForOrgSpace(challengeName);
  await changePreferenceChallenge(
    entitiesId.challenge.id,
    ChallengePreferenceType.MembershipApplyChallengeFromSpaceMembers,
    'true'
  );

  await changePreferenceChallenge(
    entitiesId.challenge.id,
    ChallengePreferenceType.MembershipJoinChallengeFromSpaceMembers,
    'true'
  );

  await assignRoleToUser(
    users.qaUser.id,
    entitiesId.space.communityId,
    CommunityRoleType.Member
  );
  await assignRoleToUser(
    users.qaUser.id,
    entitiesId.space.communityId,
    CommunityRoleType.Lead
  );

  await createApplication(
    entitiesId.challenge.communityId,
    TestUser.QA_USER
  );

  await sendMessageToRoom(
    entitiesId.challenge.updatesId,
    'test',
    TestUser.GLOBAL_ADMIN
  );

  await createRelation(
    entitiesId.challenge.collaborationId,
    'incoming',
    'relationDescription',
    'relationActorName',
    'relationActorRole',
    'relationActorType',
    TestUser.GLOBAL_ADMIN
  );

  await createPostOnCallout(
    entitiesId.challenge.calloutId,
    { displayName: 'postDisplayName' },
    'postnameid',
    TestUser.GLOBAL_ADMIN
  );
});
afterAll(async () => {
  await deleteChallenge(entitiesId.challenge.id);
  await deleteSpace(entitiesId.spaceId);
  await deleteOrganization(entitiesId.organization.id);
});

describe('myPrivileges - Challenge of Private Space', () => {
  test('RegisteredUser privileges to Challenge', async () => {
    // Act
    const response = await getChallengeData(
      entitiesId.challenge.id,
      TestUser.NON_HUB_MEMBER
    );

    // Assert
    expect(JSON.stringify(response)).toContain(
      // eslint-disable-next-line prettier/prettier
      "Authorization: unable to grant 'read' privilege: lookup Challenge"
    );
    expect(response.data?.lookup).toEqual(undefined);
  });
});
