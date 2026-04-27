import {
  createVirtualContributorOnAccountKnowledgeBasedWithCallout,
  createVirtualContributorOnAccountSpaceBased,
  deleteVirtualContributorOnAccount,
  queryVCData,
  queryVCStorageConfig,
  updateVirtualContributor,
  updateVirtualContributorSettings,
} from './vc.request.params';
import {
  createSpaceAndGetData,
  deleteSpace,
  updateSpacePlatformSettings,
} from '../../journey/space/space.request.params';
import {
  assignRoleToUser,
  readPrivilege,
  sorted__create_read_update_delete_contribute_fileDelete_fileUpload_receiveNotifications,
  sorted__create_read_update_delete_contribute_readAbout_receiveNotifications,
  sorted__create_read_update_delete_grant_fileUp_fileDel,
  sorted__create_read_update_delete_grant_platformAdmin_readAbout,
  sorted_read_readAbout,
  TestScenarioConfig,
  TestScenarioFactory,
  TestUser,
  TestUserManager,
  updateSpaceSettings,
} from '@alkemio/tests-lib';

import {
  assignLicensePlanToAccount,
  getLicensePlanByName,
} from '@functional-api/license/license.params.request';
import { UniqueIDGenerator } from '@alkemio/tests-lib';
import { getAccountMainEntities } from '@functional-api/account/account.params.request';
import {
  CommunityMembershipPolicy,
  SearchVisibility,
  SpacePrivacyMode,
  SpaceVisibility,
} from '@alkemio/client-lib/dist/types/alkemio-schema';
import { OrganizationWithSpaceModel } from '@alkemio/tests-lib/scenario/models/OrganizationWithSpaceModel';
import { RoleName } from '@alkemio/tests-lib/core/generated/alkemio-schema';
const uniqueId = UniqueIDGenerator.getID();

const spaceNameId = 'appl-eco-nameid' + uniqueId;
let vcSpaceId = '';
let vcLicensePlanId = '';
const spaceNameVC = 'appl-sp-name' + uniqueId;
const spaceNameIdVC = 'appl-sp-nameid' + uniqueId;

let vcKnowledgeBasedId = '';
let vcSpaceBasedId = '';
let vcSpaceAccountId = '';
const vcSpaceName = 'vcSpaceName1' + uniqueId;
const vcKnowledgeName = 'vcKnowledgeName1' + uniqueId;

let baseScenario: OrganizationWithSpaceModel;

const scenarioConfig: TestScenarioConfig = {
  name: 'virtual-contributor-access',
  space: {
    collaboration: {
      addPostCallout: true,
      addPostCollectionCallout: true,
      addWhiteboardCallout: true,
    },
    community: {
      members: [TestUser.SPACE_MEMBER, TestUser.SPACE_ADMIN],
      admins: [TestUser.SPACE_ADMIN],
    },
    settings: {
      privacy: {
        mode: SpacePrivacyMode.Public,
      },
      membership: {
        policy: CommunityMembershipPolicy.Applications,
      },
    },
  },
};

beforeAll(async () => {
  baseScenario = await TestScenarioFactory.createBaseScenario(scenarioConfig);

  const vcLicensePlan = await getLicensePlanByName(
    'FEATURE_VIRTUAL_CONTRIBUTORS'
  );
  vcLicensePlanId = vcLicensePlan[0].id;

  await assignLicensePlanToAccount(
    baseScenario.organization.accountId,
    vcLicensePlanId
  );

  await updateSpacePlatformSettings(
    baseScenario.space.id,
    spaceNameId,
    SpaceVisibility.Active
  );

  const responceVcSpace = await createSpaceAndGetData(
    spaceNameVC,
    spaceNameIdVC,
    TestUserManager.users.betaTester.accountId
  );
  const vcSpaceData = responceVcSpace?.data?.lookup?.space;
  vcSpaceId = vcSpaceData?.id ?? '';
  vcSpaceAccountId = vcSpaceData?.account?.id ?? '';
  await updateSpaceSettings(vcSpaceId, {
    privacy: { mode: SpacePrivacyMode.Public },
  });

  await assignRoleToUser(
    TestUserManager.users.spaceAdmin.id,
    vcSpaceData?.community.roleSet.id ?? '',
    RoleName.Member
  );

  await assignRoleToUser(
    TestUserManager.users.spaceMember.id,
    vcSpaceData?.community.roleSet.id ?? '',
    RoleName.Member
  );

  await assignRoleToUser(
    TestUserManager.users.spaceAdmin.id,
    vcSpaceData?.community.roleSet.id ?? '',
    RoleName.Admin
  );

  const vcSpaceBasedData = await createVirtualContributorOnAccountSpaceBased(
    vcSpaceName,
    vcSpaceAccountId,
    vcSpaceId,
    TestUser.GLOBAL_BETA_TESTER
  );
  vcSpaceBasedId = vcSpaceBasedData?.data?.createVirtualContributor?.id ?? '';

  const vcKnowledgeBasedData =
    await createVirtualContributorOnAccountKnowledgeBasedWithCallout(
      vcKnowledgeName,
      TestUserManager.users.betaTester.accountId,
      TestUser.GLOBAL_BETA_TESTER
    );

  vcKnowledgeBasedId = vcKnowledgeBasedData;

  await updateVirtualContributor(vcSpaceBasedId, SearchVisibility.Public);
});

afterAll(async () => {
  const getVirtualContributors = await getAccountMainEntities(
    TestUserManager.users.betaTester.accountId
  );
  const returnedVcs =
    getVirtualContributors.data?.lookup.account?.virtualContributors ?? [];
  for (const entity of returnedVcs) {
    await deleteVirtualContributorOnAccount(entity.id).catch();
  }
  await deleteSpace(vcSpaceId);

  await TestScenarioFactory.cleanUpBaseScenario(baseScenario);
});

/** @testCase TC-1504 */
describe('Virtual Contributor ACCESS - All Public - Visibility Public / BoK / Public', () => {
  beforeAll(async () => {
    await updateVirtualContributor(vcSpaceBasedId, SearchVisibility.Public);
    await updateVirtualContributor(vcKnowledgeBasedId, SearchVisibility.Public);

    await updateVirtualContributorSettings(vcSpaceBasedId, true);
    await updateVirtualContributorSettings(vcKnowledgeBasedId, true);
  });

  describe('Virtual contributor', () => {
    //   failing    ${undefined}                   | ${readPrivilege}
    test.each`
      userRole                       | privileges
      ${TestUser.NON_SPACE_MEMBER}   | ${sorted_read_readAbout}
      ${TestUser.SPACE_ADMIN}        | ${sorted_read_readAbout}
      ${TestUser.SPACE_MEMBER}       | ${sorted_read_readAbout}
      ${TestUser.GLOBAL_ADMIN}       | ${sorted__create_read_update_delete_grant_platformAdmin_readAbout}
      ${TestUser.GLOBAL_BETA_TESTER} | ${sorted__create_read_update_delete_contribute_readAbout_receiveNotifications}
    `(
      'User: "$userRole" has this privileges: "$privileges" to spaceBasedVC',
      async ({ userRole, privileges }) => {
        const res = await queryVCData(vcSpaceBasedId, userRole);
        const data =
          res.data?.lookup?.virtualContributor?.authorization?.myPrivileges;

        expect(data?.sort()).toEqual(privileges);
      }
    );
    //   failing    ${undefined}                   | ${readPrivilege}
    test.each`
      userRole                       | privileges
      ${TestUser.NON_SPACE_MEMBER}   | ${sorted_read_readAbout}
      ${TestUser.SPACE_ADMIN}        | ${sorted_read_readAbout}
      ${TestUser.SPACE_MEMBER}       | ${sorted_read_readAbout}
      ${TestUser.GLOBAL_ADMIN}       | ${sorted__create_read_update_delete_grant_platformAdmin_readAbout}
      ${TestUser.GLOBAL_BETA_TESTER} | ${sorted__create_read_update_delete_contribute_readAbout_receiveNotifications}
    `(
      'User: "$userRole" has this privileges: "$privileges" to knowledgeBasedVC',
      async ({ userRole, privileges }) => {
        const res = await queryVCData(vcKnowledgeBasedId, userRole);
        const data =
          res.data?.lookup?.virtualContributor?.authorization?.myPrivileges;

        expect(data?.sort()).toEqual(privileges);
      }
    );
  });

  describe('VC storageBucket', () => {
    //   failing    ${undefined}                   | ${readPrivilege}
    test.each`
      userRole                       | privileges
      ${TestUser.NON_SPACE_MEMBER}   | ${readPrivilege}
      ${TestUser.SPACE_ADMIN}        | ${readPrivilege}
      ${TestUser.SPACE_MEMBER}       | ${readPrivilege}
      ${TestUser.GLOBAL_ADMIN}       | ${sorted__create_read_update_delete_grant_fileUp_fileDel}
      ${TestUser.GLOBAL_BETA_TESTER} | ${sorted__create_read_update_delete_contribute_fileDelete_fileUpload_receiveNotifications}
    `(
      'User: "$userRole" has this privileges: "$privileges" to spaceBasedVC',
      async ({ userRole, privileges }) => {
        const res = await queryVCStorageConfig(vcSpaceBasedId, userRole);
        const data =
          res.data?.lookup?.virtualContributor?.profile?.storageBucket
            .authorization?.myPrivileges;

        expect(data?.sort()).toEqual(privileges);
      }
    );
    //   failing    ${undefined}                   | ${readPrivilege}

    test.each`
      userRole                       | privileges
      ${TestUser.NON_SPACE_MEMBER}   | ${readPrivilege}
      ${TestUser.SPACE_ADMIN}        | ${readPrivilege}
      ${TestUser.SPACE_MEMBER}       | ${readPrivilege}
      ${TestUser.GLOBAL_ADMIN}       | ${sorted__create_read_update_delete_grant_fileUp_fileDel}
      ${TestUser.GLOBAL_BETA_TESTER} | ${sorted__create_read_update_delete_contribute_fileDelete_fileUpload_receiveNotifications}
    `(
      'User: "$userRole" has this privileges: "$privileges" to knowledgeBasedVC',
      async ({ userRole, privileges }) => {
        const res = await queryVCStorageConfig(vcKnowledgeBasedId, userRole);
        const data =
          res.data?.lookup?.virtualContributor?.profile?.storageBucket
            .authorization?.myPrivileges;

        expect(data?.sort()).toEqual(privileges);
      }
    );
  });
});

describe('Virtual Contributor Access - All Private - Visibility Private / BoK / Private', () => {
  beforeAll(async () => {
    await updateVirtualContributor(vcSpaceBasedId, SearchVisibility.Account);
    await updateVirtualContributor(
      vcKnowledgeBasedId,
      SearchVisibility.Account
    );

    await updateVirtualContributorSettings(vcSpaceBasedId, false);
    await updateVirtualContributorSettings(vcKnowledgeBasedId, false);
  });

  describe('Virtualcontributor ', () => {
    //   failing    ${undefined}                   | ${readPrivilege}
    test.each`
      userRole                       | privileges
      ${TestUser.NON_SPACE_MEMBER}   | ${undefined}
      ${TestUser.SPACE_ADMIN}        | ${sorted_read_readAbout}
      ${TestUser.SPACE_MEMBER}       | ${sorted_read_readAbout}
      ${TestUser.GLOBAL_ADMIN}       | ${sorted__create_read_update_delete_grant_platformAdmin_readAbout}
      ${TestUser.GLOBAL_BETA_TESTER} | ${sorted__create_read_update_delete_contribute_readAbout_receiveNotifications}
    `(
      'User: "$userRole" has this privileges: "$privileges" to spaceBasedVC',
      async ({ userRole, privileges }) => {
        const res = await queryVCData(vcSpaceBasedId, userRole);
        const data =
          res.data?.lookup?.virtualContributor?.authorization?.myPrivileges;

        expect(data?.sort()).toEqual(privileges);
      }
    );
    //   failing    ${undefined}                   | ${readPrivilege}
    test.each`
      userRole                       | privileges
      ${TestUser.NON_SPACE_MEMBER}   | ${undefined}
      ${TestUser.SPACE_ADMIN}        | ${sorted_read_readAbout}
      ${TestUser.SPACE_MEMBER}       | ${sorted_read_readAbout}
      ${TestUser.GLOBAL_ADMIN}       | ${sorted__create_read_update_delete_grant_platformAdmin_readAbout}
      ${TestUser.GLOBAL_BETA_TESTER} | ${sorted__create_read_update_delete_contribute_readAbout_receiveNotifications}
    `(
      'User: "$userRole" has this privileges: "$privileges" to knowledgeBasedVC',
      async ({ userRole, privileges }) => {
        const res = await queryVCData(vcKnowledgeBasedId, userRole);
        const data =
          res.data?.lookup?.virtualContributor?.authorization?.myPrivileges;

        expect(data?.sort()).toEqual(privileges);
      }
    );
  });

  describe('VC storageBucket', () => {
    //   failing    ${undefined}                   | ${readPrivilege}
    test.each`
      userRole                       | privileges
      ${TestUser.NON_SPACE_MEMBER}   | ${undefined}
      ${TestUser.SPACE_ADMIN}        | ${readPrivilege}
      ${TestUser.SPACE_MEMBER}       | ${readPrivilege}
      ${TestUser.GLOBAL_ADMIN}       | ${sorted__create_read_update_delete_grant_fileUp_fileDel}
      ${TestUser.GLOBAL_BETA_TESTER} | ${sorted__create_read_update_delete_contribute_fileDelete_fileUpload_receiveNotifications}
    `(
      'User: "$userRole" has this privileges: "$privileges" to spaceBasedVC',
      async ({ userRole, privileges }) => {
        const res = await queryVCStorageConfig(vcSpaceBasedId, userRole);
        const data =
          res.data?.lookup?.virtualContributor?.profile?.storageBucket
            .authorization?.myPrivileges;

        expect(data?.sort()).toEqual(privileges);
      }
    );
    //   failing    ${undefined}                   | ${readPrivilege}

    test.each`
      userRole                       | privileges
      ${TestUser.NON_SPACE_MEMBER}   | ${undefined}
      ${TestUser.SPACE_ADMIN}        | ${readPrivilege}
      ${TestUser.SPACE_MEMBER}       | ${readPrivilege}
      ${TestUser.GLOBAL_ADMIN}       | ${sorted__create_read_update_delete_grant_fileUp_fileDel}
      ${TestUser.GLOBAL_BETA_TESTER} | ${sorted__create_read_update_delete_contribute_fileDelete_fileUpload_receiveNotifications}
    `(
      'User: "$userRole" has this privileges: "$privileges" to knowledgeBasedVC',
      async ({ userRole, privileges }) => {
        const res = await queryVCStorageConfig(vcKnowledgeBasedId, userRole);
        const data =
          res.data?.lookup?.virtualContributor?.profile?.storageBucket
            .authorization?.myPrivileges;

        expect(data?.sort()).toEqual(privileges);
      }
    );
  });
});

describe('Virtual Contributor Access - All Private - Visibility Private / BoK / Public', () => {
  beforeAll(async () => {
    await updateVirtualContributor(vcSpaceBasedId, SearchVisibility.Account);
    await updateVirtualContributor(
      vcKnowledgeBasedId,
      SearchVisibility.Account
    );

    await updateVirtualContributorSettings(vcSpaceBasedId, true);
    await updateVirtualContributorSettings(vcKnowledgeBasedId, true);
  });

  describe('Virtualcontributor ', () => {
    //   failing    ${undefined}                   | ${readPrivilege}
    test.each`
      userRole                       | privileges
      ${TestUser.NON_SPACE_MEMBER}   | ${undefined}
      ${TestUser.SPACE_ADMIN}        | ${sorted_read_readAbout}
      ${TestUser.SPACE_MEMBER}       | ${sorted_read_readAbout}
      ${TestUser.GLOBAL_ADMIN}       | ${sorted__create_read_update_delete_grant_platformAdmin_readAbout}
      ${TestUser.GLOBAL_BETA_TESTER} | ${sorted__create_read_update_delete_contribute_readAbout_receiveNotifications}
    `(
      'User: "$userRole" has this privileges: "$privileges" to spaceBasedVC',
      async ({ userRole, privileges }) => {
        const res = await queryVCData(vcSpaceBasedId, userRole);
        const data =
          res.data?.lookup?.virtualContributor?.authorization?.myPrivileges;

        expect(data?.sort()).toEqual(privileges);
      }
    );
    //   failing    ${undefined}                   | ${readPrivilege}
    test.each`
      userRole                       | privileges
      ${TestUser.NON_SPACE_MEMBER}   | ${undefined}
      ${TestUser.SPACE_ADMIN}        | ${sorted_read_readAbout}
      ${TestUser.SPACE_MEMBER}       | ${sorted_read_readAbout}
      ${TestUser.GLOBAL_ADMIN}       | ${sorted__create_read_update_delete_grant_platformAdmin_readAbout}
      ${TestUser.GLOBAL_BETA_TESTER} | ${sorted__create_read_update_delete_contribute_readAbout_receiveNotifications}
    `(
      'User: "$userRole" has this privileges: "$privileges" to knowledgeBasedVC',
      async ({ userRole, privileges }) => {
        const res = await queryVCData(vcKnowledgeBasedId, userRole);
        const data =
          res.data?.lookup?.virtualContributor?.authorization?.myPrivileges;

        expect(data?.sort()).toEqual(privileges);
      }
    );
  });

  describe('VC storageBucket', () => {
    //   failing    ${undefined}                   | ${readPrivilege}
    test.each`
      userRole                       | privileges
      ${TestUser.NON_SPACE_MEMBER}   | ${undefined}
      ${TestUser.SPACE_ADMIN}        | ${readPrivilege}
      ${TestUser.SPACE_MEMBER}       | ${readPrivilege}
      ${TestUser.GLOBAL_ADMIN}       | ${sorted__create_read_update_delete_grant_fileUp_fileDel}
      ${TestUser.GLOBAL_BETA_TESTER} | ${sorted__create_read_update_delete_contribute_fileDelete_fileUpload_receiveNotifications}
    `(
      'User: "$userRole" has this privileges: "$privileges" to spaceBasedVC',
      async ({ userRole, privileges }) => {
        const res = await queryVCStorageConfig(vcSpaceBasedId, userRole);
        const data =
          res.data?.lookup?.virtualContributor?.profile?.storageBucket
            .authorization?.myPrivileges;

        expect(data?.sort()).toEqual(privileges);
      }
    );
    //   failing    ${undefined}                   | ${readPrivilege}

    test.each`
      userRole                       | privileges
      ${TestUser.NON_SPACE_MEMBER}   | ${undefined}
      ${TestUser.SPACE_ADMIN}        | ${readPrivilege}
      ${TestUser.SPACE_MEMBER}       | ${readPrivilege}
      ${TestUser.GLOBAL_ADMIN}       | ${sorted__create_read_update_delete_grant_fileUp_fileDel}
      ${TestUser.GLOBAL_BETA_TESTER} | ${sorted__create_read_update_delete_contribute_fileDelete_fileUpload_receiveNotifications}
    `(
      'User: "$userRole" has this privileges: "$privileges" to knowledgeBasedVC',
      async ({ userRole, privileges }) => {
        const res = await queryVCStorageConfig(vcKnowledgeBasedId, userRole);
        const data =
          res.data?.lookup?.virtualContributor?.profile?.storageBucket
            .authorization?.myPrivileges;

        expect(data?.sort()).toEqual(privileges);
      }
    );
  });
});

describe('Virtual Contributor Access - All Private - Visibility Public / BoK / Private', () => {
  beforeAll(async () => {
    await updateVirtualContributor(vcSpaceBasedId, SearchVisibility.Public);
    await updateVirtualContributor(vcKnowledgeBasedId, SearchVisibility.Public);

    await updateVirtualContributorSettings(vcSpaceBasedId, false);
    await updateVirtualContributorSettings(vcKnowledgeBasedId, false);
  });

  describe('Virtualcontributor ', () => {
    //   failing    ${undefined}                   | ${readPrivilege}
    test.each`
      userRole                       | privileges
      ${TestUser.NON_SPACE_MEMBER}   | ${sorted_read_readAbout}
      ${TestUser.SPACE_ADMIN}        | ${sorted_read_readAbout}
      ${TestUser.SPACE_MEMBER}       | ${sorted_read_readAbout}
      ${TestUser.GLOBAL_ADMIN}       | ${sorted__create_read_update_delete_grant_platformAdmin_readAbout}
      ${TestUser.GLOBAL_BETA_TESTER} | ${sorted__create_read_update_delete_contribute_readAbout_receiveNotifications}
    `(
      'User: "$userRole" has this privileges: "$privileges" to spaceBasedVC',
      async ({ userRole, privileges }) => {
        const res = await queryVCData(vcSpaceBasedId, userRole);
        const data =
          res.data?.lookup?.virtualContributor?.authorization?.myPrivileges;

        expect(data?.sort()).toEqual(privileges);
      }
    );
    //   failing    ${undefined}                   | ${readPrivilege}
    test.each`
      userRole                       | privileges
      ${TestUser.NON_SPACE_MEMBER}   | ${sorted_read_readAbout}
      ${TestUser.SPACE_ADMIN}        | ${sorted_read_readAbout}
      ${TestUser.SPACE_MEMBER}       | ${sorted_read_readAbout}
      ${TestUser.GLOBAL_ADMIN}       | ${sorted__create_read_update_delete_grant_platformAdmin_readAbout}
      ${TestUser.GLOBAL_BETA_TESTER} | ${sorted__create_read_update_delete_contribute_readAbout_receiveNotifications}
    `(
      'User: "$userRole" has this privileges: "$privileges" to knowledgeBasedVC',
      async ({ userRole, privileges }) => {
        const res = await queryVCData(vcKnowledgeBasedId, userRole);
        const data =
          res.data?.lookup?.virtualContributor?.authorization?.myPrivileges;

        expect(data?.sort()).toEqual(privileges);
      }
    );
  });

  describe('VC storageBucket', () => {
    //   failing    ${undefined}                   | ${readPrivilege}
    test.each`
      userRole                       | privileges
      ${TestUser.NON_SPACE_MEMBER}   | ${readPrivilege}
      ${TestUser.SPACE_ADMIN}        | ${readPrivilege}
      ${TestUser.SPACE_MEMBER}       | ${readPrivilege}
      ${TestUser.GLOBAL_ADMIN}       | ${sorted__create_read_update_delete_grant_fileUp_fileDel}
      ${TestUser.GLOBAL_BETA_TESTER} | ${sorted__create_read_update_delete_contribute_fileDelete_fileUpload_receiveNotifications}
    `(
      'User: "$userRole" has this privileges: "$privileges" to spaceBasedVC',
      async ({ userRole, privileges }) => {
        const res = await queryVCStorageConfig(vcSpaceBasedId, userRole);
        const data =
          res.data?.lookup?.virtualContributor?.profile?.storageBucket
            .authorization?.myPrivileges;

        expect(data?.sort()).toEqual(privileges);
      }
    );
    //   failing    ${undefined}                   | ${readPrivilege}

    test.each`
      userRole                       | privileges
      ${TestUser.NON_SPACE_MEMBER}   | ${readPrivilege}
      ${TestUser.SPACE_ADMIN}        | ${readPrivilege}
      ${TestUser.SPACE_MEMBER}       | ${readPrivilege}
      ${TestUser.GLOBAL_ADMIN}       | ${sorted__create_read_update_delete_grant_fileUp_fileDel}
      ${TestUser.GLOBAL_BETA_TESTER} | ${sorted__create_read_update_delete_contribute_fileDelete_fileUpload_receiveNotifications}
    `(
      'User: "$userRole" has this privileges: "$privileges" to knowledgeBasedVC',
      async ({ userRole, privileges }) => {
        const res = await queryVCStorageConfig(vcKnowledgeBasedId, userRole);
        const data =
          res.data?.lookup?.virtualContributor?.profile?.storageBucket
            .authorization?.myPrivileges;

        expect(data?.sort()).toEqual(privileges);
      }
    );
  });
});
