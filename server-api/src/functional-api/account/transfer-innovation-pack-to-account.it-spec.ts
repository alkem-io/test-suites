import {
  TestScenarioFactory,
  TestScenarioNoPreCreationConfig,
  TestUser,
  TestUserManager,
  UniqueIDGenerator,
} from '@alkemio/tests-lib';
import {
  createOrganization,
  deleteOrganization,
} from '@functional-api/contributor-management/organization/organization.request.params';
import {
  createInnovationPack,
  deleteInnovationPack,
} from '@functional-api/innovation-pack/innovation_pack.request.params';

import {
  getAccountMainEntities,
  transferInnovationPackToAccount,
} from './account.params.request';
import {
  assignPlatformRole,
  removePlatformRole,
} from '@functional-api/platform/authorization-platform-mutation';
import { RoleName } from '@alkemio/tests-lib/core/generated/alkemio-schema';
import {
  NEUTRAL_ERROR_CODE,
  NEUTRAL_ERROR_MESSAGE,
} from '@functional-api/error-response/error-response.constants';
const uniqueId = UniqueIDGenerator.getID();

/** The transfer is refused with the generic code and sentence. */
const expectRefused = (res: {
  error?: { errors: Array<Record<string, unknown>> };
}) => {
  expect(res.error?.errors[0]?.code).toBe(NEUTRAL_ERROR_CODE);
  expect(
    res.error?.errors[0]?.message === NEUTRAL_ERROR_MESSAGE,
    'refusal carries the generic sentence'
  ).toBe(true);
};

const organizationName = 'Organization packs' + uniqueId;
const orgNameId = 'org-packs' + uniqueId;
const packName = `Default Innovation Pack Name ${uniqueId}`;
const packNameId = `pack-nameid-${uniqueId}`;
let orgId = '';
let orgAccountId = '';
let innovationPackId = '';
const scenarioConfig: TestScenarioNoPreCreationConfig = {
  name: 'transfer-innovation-pack-to-account',
};

beforeAll(async () => {
  await TestScenarioFactory.createBaseScenarioEmpty(scenarioConfig);
  const res = await createOrganization(organizationName, orgNameId);
  const orgData = res?.data?.createOrganization;
  orgId = orgData?.id ?? '';
  orgAccountId = orgData?.account?.id ?? '';
});

afterAll(async () => {
  await deleteOrganization(orgId);
});

describe('Transfer innovation pack to Account', () => {
  afterEach(async () => {
    await deleteInnovationPack(innovationPackId);
  });
  test('Global Admin transfer innovation pack from Organization account to User account without valid entitlements', async () => {
    // Arrange
    const packData = await createInnovationPack(
      packName,
      packNameId,
      orgAccountId
    );
    innovationPackId = packData?.data?.createInnovationPack?.id ?? '';

    // Act
    const transferData = await transferInnovationPackToAccount(
      innovationPackId,
      TestUserManager.users.qaUser.accountId
    );

    const transferedData = transferData.data?.transferInnovationPackToAccount;
    const targetAccountData = await getAccountMainEntities(
      TestUserManager.users.qaUser.accountId,
      TestUser.QA_USER
    );
    // Assert
    expect(targetAccountData.data?.lookup.account?.innovationPacks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: transferedData?.id,
          nameID: transferedData?.nameID,
          provider: {
            id: TestUserManager.users.qaUser.id,
            nameID: TestUserManager.users.qaUser.nameId,
          },
        }),
      ])
    );
  });
  test('Support Admin cannot transfer an innovation pack (Slice B: transfers are Platform Resource Admin\'s); the pack stays', async () => {
    // Arrange
    const packData = await createInnovationPack(
      packName,
      packNameId,
      TestUserManager.users.betaTester.accountId,
      TestUser.GLOBAL_BETA_TESTER
    );
    innovationPackId = packData?.data?.createInnovationPack?.id ?? '';
    // Act — workspace#027 Slice B: TRANSFER_RESOURCE_OFFER / ACCEPT on accounts
    // belong to Platform Resource Admin; Support lost the legacy cascade.
    const transferData = await transferInnovationPackToAccount(
      innovationPackId,
      TestUserManager.users.qaUser.accountId,
      TestUser.GLOBAL_SUPPORT_ADMIN
    );
    const sourceAccountData = await getAccountMainEntities(
      TestUserManager.users.betaTester.accountId,
      TestUser.GLOBAL_BETA_TESTER
    );
    // Assert
    expectRefused(transferData);
    expect(transferData.data?.transferInnovationPackToAccount).toBeUndefined();
    expect(sourceAccountData.data?.lookup.account?.innovationPacks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: innovationPackId }),
      ])
    );
  });

  test('BetaTester FAILS to transfer innovation pack from own account to another user account', async () => {
    // Arrange
    const packData = await createInnovationPack(
      packName,
      packNameId,
      TestUserManager.users.betaTester.accountId,
      TestUser.GLOBAL_BETA_TESTER
    );
    innovationPackId = packData?.data?.createInnovationPack?.id ?? '';

    // Act
    const transferData = await transferInnovationPackToAccount(
      innovationPackId,
      TestUserManager.users.qaUser.accountId,
      TestUser.GLOBAL_BETA_TESTER
    );

    const transferedData = transferData.data?.transferInnovationPackToAccount;
    const targetAccountData = await getAccountMainEntities(
      TestUserManager.users.qaUser.accountId,
      TestUser.QA_USER
    );

    // Assert
    expectRefused(transferData);
    expect(targetAccountData.data?.lookup.account?.innovationPacks).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: transferedData?.id,
          nameID: transferedData?.nameID,
          provider: {
            id: TestUserManager.users.qaUser.id,
            nameID: TestUserManager.users.qaUser.nameId,
          },
        }),
      ])
    );
  });

  test('BetaTester FAILS to transfer innovation pack from own account to another user account without valid entitlements', async () => {
    // Arrange
    await assignPlatformRole(
      TestUserManager.users.nonSpaceMember.id,
      RoleName.FeatureVcCampaign
    );
    const packData = await createInnovationPack(
      packName,
      packNameId,
      TestUserManager.users.betaTester.accountId,
      TestUser.GLOBAL_BETA_TESTER
    );
    innovationPackId = packData?.data?.createInnovationPack?.id ?? '';

    // Act
    const transferData = await transferInnovationPackToAccount(
      innovationPackId,
      TestUserManager.users.nonSpaceMember.accountId,
      TestUser.GLOBAL_BETA_TESTER
    );

    const transferedData = transferData.data?.transferInnovationPackToAccount;
    const targetAccountData = await getAccountMainEntities(
      TestUserManager.users.nonSpaceMember.accountId,
      TestUser.NON_SPACE_MEMBER
    );

    // Assert
    expectRefused(transferData);
    expect(targetAccountData.data?.lookup.account?.innovationPacks).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: transferedData?.id,
          nameID: transferedData?.nameID,
          provider: {
            id: TestUserManager.users.qaUser.id,
            nameID: TestUserManager.users.qaUser.nameId,
          },
        }),
      ])
    );
    await removePlatformRole(
      TestUserManager.users.nonSpaceMember.id,
      RoleName.FeatureVcCampaign
    );
  });

  test('Registered user FAILS to transfer innovation pack from another account to its own account', async () => {
    // Arrange
    const packData = await createInnovationPack(
      packName,
      packNameId,
      TestUserManager.users.betaTester.accountId,
      TestUser.GLOBAL_BETA_TESTER
    );
    innovationPackId = packData?.data?.createInnovationPack?.id ?? '';

    // Act
    const transferData = await transferInnovationPackToAccount(
      innovationPackId,
      TestUserManager.users.qaUser.accountId,
      TestUser.QA_USER
    );

    const transferedData = transferData.data?.transferInnovationPackToAccount;
    const targetAccountData = await getAccountMainEntities(
      TestUserManager.users.qaUser.accountId,
      TestUser.QA_USER
    );

    // Assert
    expectRefused(transferData);
    expect(targetAccountData.data?.lookup.account?.innovationPacks).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: transferedData?.id,
          nameID: transferedData?.nameID,
          provider: {
            id: TestUserManager.users.qaUser.id,
            nameID: TestUserManager.users.qaUser.nameId,
          },
        }),
      ])
    );
  });
});
