import {
  TestScenarioConfig,
  TestScenarioFactory,
  TestUser,
} from '@alkemio/tests-lib';
import { convertSpaceL1ToSpaceL0 } from './conversion.request.params';
import { getSpaceData } from '../space/space.request.params';
import { getSpaceLicenseSubscriptions } from '@functional-api/license/license.params.request';
import { sortArraysInObject } from '@utils/array.matcher';
import { OrganizationWithSpaceModel } from '@alkemio/tests-lib/scenario/models/OrganizationWithSpaceModel';
import { SpaceLevel } from '@alkemio/tests-lib/core/generated/alkemio-schema';

let baseScenario: OrganizationWithSpaceModel;

const scenarioConfig: TestScenarioConfig = {
  name: 'convert-l1-to-l0-basic',
  space: {
    collaboration: {
      addPostCallout: true,
      addPostCollectionCallout: true,
      addWhiteboardCallout: true,
    },
    community: {
      admins: [TestUser.SPACE_ADMIN],
      members: [
        TestUser.SPACE_MEMBER,
        TestUser.SPACE_ADMIN,
        TestUser.SUBSPACE_MEMBER,
        TestUser.SUBSPACE_ADMIN,
        TestUser.SUBSUBSPACE_MEMBER,
        TestUser.SUBSUBSPACE_ADMIN,
      ],
    },
    subspace: {
      collaboration: {
        addPostCallout: true,
        addPostCollectionCallout: true,
        addWhiteboardCallout: true,
      },
      community: {
        admins: [TestUser.SUBSPACE_ADMIN],
        members: [
          TestUser.SUBSPACE_MEMBER,
          TestUser.SUBSPACE_ADMIN,
          TestUser.SUBSUBSPACE_MEMBER,
          TestUser.SUBSUBSPACE_ADMIN,
        ],
      },
    },
  },
};

let subspaceBefore: Awaited<ReturnType<typeof getSpaceData>>;
let spaceBefore: Awaited<ReturnType<typeof getSpaceData>>;
let sortedLicenseBefore: unknown;
let convertResult: Awaited<ReturnType<typeof convertSpaceL1ToSpaceL0>>;
let subspaceAfter:
  | NonNullable<typeof convertResult.data>['convertSpaceL1ToSpaceL0']
  | undefined;

beforeAll(async () => {
  baseScenario = await TestScenarioFactory.createBaseScenario(scenarioConfig);

  // Capture state before conversion
  spaceBefore = await getSpaceData(baseScenario.space.id);
  subspaceBefore = await getSpaceData(baseScenario.subspace.id);
  const licenseSpace = await getSpaceLicenseSubscriptions(
    baseScenario.space.id
  );
  sortedLicenseBefore =
    licenseSpace.data?.lookup.space?.subscriptions?.sort((a, b) =>
      a.name.localeCompare(b.name)
    );

  // Execute conversion
  convertResult = await convertSpaceL1ToSpaceL0(baseScenario.subspace.id);
  subspaceAfter = convertResult.data?.convertSpaceL1ToSpaceL0;
});

afterAll(async () => {
  await TestScenarioFactory.cleanUpBaseScenario(baseScenario);
});

describe('Convert L1 to L0 - basic', () => {
  test('space level is promoted to L0', () => {
    expect(subspaceAfter?.level).toEqual(SpaceLevel.L0);
  });

  test('collaboration calloutsSet is preserved', () => {
    expect(subspaceAfter?.collaboration.calloutsSet).toEqual(
      subspaceBefore.data?.lookup.space?.collaboration.calloutsSet
    );
  });

  test('innovation flow states match L0 template', () => {
    expect(subspaceAfter?.collaboration.innovationFlow.states).toEqual(
      spaceBefore.data?.lookup.space?.collaboration.innovationFlow.states
    );
  });

  test('visibility is preserved', () => {
    expect(subspaceAfter?.visibility).toEqual(
      subspaceBefore.data?.lookup.space?.visibility
    );
  });

  test('about/profile is preserved', () => {
    expect(subspaceAfter?.about).toEqual(
      subspaceBefore.data?.lookup.space?.about
    );
  });

  test('account host is preserved', () => {
    expect(subspaceAfter?.account.host).toEqual(
      subspaceBefore.data?.lookup.space?.account.host
    );
  });

  test('settings are preserved', () => {
    expect(subspaceAfter?.settings).toEqual(
      subspaceBefore.data?.lookup.space?.settings
    );
  });

  test('subspaces are preserved', () => {
    expect(sortArraysInObject(subspaceAfter?.subspaces)).toEqual(
      sortArraysInObject(subspaceBefore.data?.lookup.space?.subspaces)
    );
  });

  test('community roleSet members are preserved', () => {
    const membersBefore =
      subspaceBefore.data?.lookup.space?.community.roleSet.memberUsers;
    const membersAfter = subspaceAfter?.community.roleSet.memberUsers;

    const sortedBefore = membersBefore
      ?.map(u => u.id)
      .sort();
    const sortedAfter = membersAfter
      ?.map(u => u.id)
      .sort();

    expect(sortedAfter).toEqual(sortedBefore);
  });

  test('community roleSet leads are preserved', () => {
    const leadsBefore =
      subspaceBefore.data?.lookup.space?.community.roleSet.leadUsers;
    const leadsAfter = subspaceAfter?.community.roleSet.leadUsers;

    const sortedBefore = leadsBefore
      ?.map(u => u.id)
      .sort();
    const sortedAfter = leadsAfter
      ?.map(u => u.id)
      .sort();

    expect(sortedAfter).toEqual(sortedBefore);
  });

  test('community roleSet admins are preserved', () => {
    const adminsBefore =
      subspaceBefore.data?.lookup.space?.community.roleSet.adminUsers;
    const adminsAfter = subspaceAfter?.community.roleSet.adminUsers;

    const sortedBefore = adminsBefore
      ?.map(u => u.id)
      .sort();
    const sortedAfter = adminsAfter
      ?.map(u => u.id)
      .sort();

    expect(sortedAfter).toEqual(sortedBefore);
  });

  test('license subscriptions are preserved', async () => {
    const licenseAfterConversion = await getSpaceLicenseSubscriptions(
      baseScenario.subspace.id
    );
    const sortedLicenseAfter =
      licenseAfterConversion.data?.lookup.space?.subscriptions.sort((a, b) =>
        a.name.localeCompare(b.name)
      );

    expect(sortedLicenseAfter).toEqual(sortedLicenseBefore);
  });
});

describe('Convert L1 to L0 - authorization', () => {
  test('Space Admin cannot execute conversion', async () => {
    // Create a fresh scenario for this test
    const authScenario =
      await TestScenarioFactory.createBaseScenario({
        ...scenarioConfig,
        name: 'convert-l1-to-l0-auth',
      });

    const res = await convertSpaceL1ToSpaceL0(
      authScenario.subspace.id,
      TestUser.SPACE_ADMIN
    );

    expect(res.error?.errors?.length).toBeGreaterThan(0);

    await TestScenarioFactory.cleanUpBaseScenario(authScenario);
  });

  test('Space Member cannot execute conversion', async () => {
    const authScenario =
      await TestScenarioFactory.createBaseScenario({
        ...scenarioConfig,
        name: 'convert-l1-to-l0-auth2',
      });

    const res = await convertSpaceL1ToSpaceL0(
      authScenario.subspace.id,
      TestUser.SPACE_MEMBER
    );

    expect(res.error?.errors?.length).toBeGreaterThan(0);

    await TestScenarioFactory.cleanUpBaseScenario(authScenario);
  });
});
