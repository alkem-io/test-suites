import { entitiesId } from '@test/functional-api/zcommunications/communications-helper';
import {
  createOrgAndHub,
  createChallengeForOrgHub,
  createOpportunityForChallenge,
} from '@test/functional-api/zcommunications/create-entities-with-users-helper';
import { uniqueId } from '@test/utils/mutations/create-mutation';
import { removeChallenge } from '../challenge/challenge.request.params';
import { getHubData, removeHub } from '../hub/hub.request.params';
import { removeOpportunity } from '../opportunity/opportunity.request.params';
import { deleteOrganization } from '../organization/organization.request.params';

const organizationName = 'aspect-org-name' + uniqueId;
const hostNameId = 'aspect-org-nameid' + uniqueId;
const hubName = 'aspect-eco-name' + uniqueId;
const hubNameId = 'aspect-eco-nameid' + uniqueId;
const opportunityName = 'aspect-opp';
const challengeName = 'aspect-chal';

const counterOfHubMemberTypes = async (
  hubId: string
): Promise<[
  string | undefined,
  string | undefined,
  string | undefined,
  string | undefined
]> => {
  const responseQuery = await getHubData(hubId);

  const hubUesrsMembers = responseQuery.body.data.hub.community.memberUsers;
  const hubOrganizationMembers =
    responseQuery.body.data.hub.community.memberOrganizations;
  const hubLeadUsers = responseQuery.body.data.hub.community.leadUsers;
  const hubLeadOrganizations =
    responseQuery.body.data.hub.community.leadOrganizations;

  return [
    hubUesrsMembers,
    hubOrganizationMembers,
    hubLeadUsers,
    hubLeadOrganizations,
  ];
};

beforeAll(async () => {
  await createOrgAndHub(organizationName, hostNameId, hubName, hubNameId);
  await createChallengeForOrgHub(challengeName);
  await createOpportunityForChallenge(opportunityName);
});

afterAll(async () => {
  await removeOpportunity(entitiesId.opportunityId);
  await removeChallenge(entitiesId.challengeId);
  await removeHub(entitiesId.hubId);
  await deleteOrganization(entitiesId.organizationId);
});

describe('Community', () => {
  describe('Assign / Remove members to community', () => {
    test('Assign user as member to hub', async () => {
      // Act
    });
    test('Assign user as member to challenge', async () => {
      // Act
    });
    test('Assign user as member to opportunity', async () => {
      // Act
    });

    test('Assign organization as member to hub', async () => {
      // Act
    });
    test('Assign organization as member to challenge', async () => {
      // Act
    });
    test('Assign organization as member to opportunity', async () => {
      // Act
    });

    test('Remove user as member from opportunity', async () => {
      // Act
    });
    test('Remove user as member from challenge', async () => {
      // Act
    });
    test('Remove user as member from hub', async () => {
      // Act
    });

    test('Remove organization as member from opportunity', async () => {
      // Act
    });
    test('Remove organization as member from challenge', async () => {
      // Act
    });
    test('Remove organization as member from hub', async () => {
      // Act
    });
  });

  describe('Assign / Remove leads to entities', () => {
    test('Assign user as lead to hub', async () => {
      // Act
    });
    test('Assign user as lead to challenge', async () => {
      // Act
    });
    test('Assign user as lead to opportunity', async () => {
      // Act
    });

    test('Assign organization as lead to hub', async () => {
      // Act
    });
    test('Assign organization as lead to challenge', async () => {
      // Act
    });
    test('Assign organization as lead to opportunity', async () => {
      // Act
    });

    test('Remove user as lead from opportunity', async () => {
      // Act
    });
    test('Remove user as lead from challenge', async () => {
      // Act
    });
    test('Remove user as lead from hub', async () => {
      // Act
    });

    test('Remove organization as lead from opportunity', async () => {
      // Act
    });
    test('Remove organization as lead from challenge', async () => {
      // Act
    });
    test('Remove organization as lead from hub', async () => {
      // Act
    });
  });

  describe('Assign / Remove to community - specials', () => {
    describe('Users', () => {
      test('Assign same user as member twice to hub community', async () => {
        // Act
      });

      test('Assign same user as member and lead to same hub community', async () => {
        // Act
      });

      test('Assign 2 different user as members to same hub community', async () => {
        // Act
      });

      test('Remove all users as members and leads from a community', async () => {
        // Act
      });
    });
    describe('Organizations', () => {
      test('Assign same user as member twice to hub community', async () => {
        // Act
      });

      test('Assign same user as member and lead to same hub community', async () => {
        // Act
      });

      test('Assign 2 different user as members to same hub community', async () => {
        // Act
      });

      test('Remove all users as members and leads from a community', async () => {
        // Act
      });
    });
  });
});
