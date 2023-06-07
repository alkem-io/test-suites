import { uniqueId } from '@test/utils/mutations/create-mutation';
import { deleteMailSlurperMails } from '@test/utils/mailslurper.rest.requests';
import { createOrgAndHubWithUsers } from '../create-entities-with-users-helper';
import { entitiesId, getMailsData } from '../communications-helper';
import { removeHub } from '@test/functional-api/integration/hub/hub.request.params';
import { deleteOrganization } from '@test/functional-api/integration/organization/organization.request.params';
import { delay } from '@test/utils/delay';
import { users } from '@test/utils/queries/users-data';
import {
  inviteExistingUser,
  removeInvitation,
} from '@test/functional-api/user-management/invitations/invitation.request.params';
import { TestUser } from '@test/utils';

const organizationName = 'not-app-org-name' + uniqueId;
const hostNameId = 'not-app-org-nameid' + uniqueId;
const hubName = 'not-app-eco-name' + uniqueId;
const hubNameId = 'not-app-eco-nameid' + uniqueId;

const ecoName = hubName;

let invitationId = '';

beforeAll(async () => {
  await deleteMailSlurperMails();

  await createOrgAndHubWithUsers(
    organizationName,
    hostNameId,
    hubName,
    hubNameId
  );
});

afterAll(async () => {
  await removeHub(entitiesId.hubId);
  await deleteOrganization(entitiesId.organizationId);
});

describe('Notifications - invitations', () => {
  afterEach(async () => {
    await removeInvitation(invitationId);
  });

  beforeEach(async () => {
    await deleteMailSlurperMails();
  });

  test.only('non hub user receive invitation for hub community from hub admin', async () => {
    // Act
    const invitationData = await inviteExistingUser(
      entitiesId.hubCommunityId,
      users.nonHubMemberId,
      TestUser.HUB_ADMIN
    );
    const invitationInfo =
      invitationData.body.data.inviteExistingUserForCommunityMembership;
    invitationId = invitationInfo.id;

    await delay(6000);

    const getEmailsData = await getMailsData();
    // Assert
    expect(getEmailsData[1]).toEqual(1);
    expect(getEmailsData[0]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          subject: `Invitation to join ${ecoName}`,
          toAddresses: [users.nonHubMemberEmail],
        }),
      ])
    );
  });
});
