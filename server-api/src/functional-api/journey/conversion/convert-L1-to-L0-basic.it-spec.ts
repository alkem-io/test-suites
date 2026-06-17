/**
 * Convert L1 to L0 — basic properties, profile URLs (alkem-io/server#6020) and
 * license (alkem-io/server#6022)
 *
 * Scenarios:
 * - Basic properties preserved/updated: level, innovation flow states, visibility, about,
 *   account host, settings, subspaces, community roleSet members/leads/admins.
 * - Calendar events and community updates are preserved after conversion.
 * - Profile URLs (#6020): about URL points to the promoted L0 root; account host org URL is
 *   unchanged; innovationFlow URL points to the promoted L0 root (skipped — client-web#9481).
 * - License (#6022): parent L0 seeded with Plus; promoted L0 has a Free license and does NOT
 *   inherit the parent's Plus license.
 * - Collaboration preserved excluding profile URLs (skipped — client-web#9528).
 * - Authorization: Space Admin / Space Member cannot execute the conversion.
 */
import {
  TestScenarioConfig,
  TestScenarioFactory,
  TestUser,
} from '@alkemio/tests-lib';
import { convertSpaceL1ToSpaceL0 } from './conversion.request.params';
import {
  getSpaceData,
  getSpaceCommunication,
} from '../space/space.request.params';
import {
  getSpaceLicenseSubscriptions,
  getLicensePlanByName,
  assignLicensePlanToSpace,
} from '@functional-api/license/license.params.request';
import { sendMessageToRoom } from '@functional-api/communications/communication.params';
import {
  createCalendarEventOnCalendar,
  getCalendarEvents,
  getSpaceCalendarId,
} from '@functional-api/calendar/calendar.request.params';
import {
  CalendarEventType,
  LicensingCredentialBasedCredentialType,
} from '@alkemio/tests-lib/core/generated/alkemio-schema';
import { sortArraysInObject, stripProfileUrls } from '@utils/array.matcher';

const { ALKEMIO_BASE_URL } = process.env;
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
let parentSubscriptionsBefore: LicensingCredentialBasedCredentialType[];
let convertResult: Awaited<ReturnType<typeof convertSpaceL1ToSpaceL0>>;
let subspaceAfter:
  | NonNullable<typeof convertResult.data>['convertSpaceL1ToSpaceL0']
  | undefined;
let calendarEventId: string;

beforeAll(async () => {
  baseScenario = await TestScenarioFactory.createBaseScenario(scenarioConfig);

  // Create calendar event on the subspace before conversion
  const calendarRes = await getSpaceCalendarId(baseScenario.subspace.id);
  const calendarId =
    calendarRes.data?.lookup?.space?.collaboration?.timeline?.calendar?.id ??
    '';
  const calEventRes = await createCalendarEventOnCalendar(calendarId, {
    displayName: 'Event before convert L1 to L0',
    startDate: '2026-06-01T10:00:00.000Z',
    durationMinutes: 60,
    multipleDays: false,
    wholeDay: false,
    type: CalendarEventType.Event,
  });
  calendarEventId = calEventRes.data?.createEventOnCalendar?.id ?? '';

  // Send message to updates room before conversion
  await sendMessageToRoom(
    baseScenario.subspace.communication.updatesId,
    'Update before convert L1 to L0'
  );

  // alkem-io/server#6022 — seed the parent L0 with a non-Free (Plus) license so we can prove
  // the L1 promoted out of it receives a fresh Free license instead of inheriting the Plus.
  const plusPlan = await getLicensePlanByName('SPACE_LICENSE_PLUS');
  const plusPlanId = plusPlan[0]?.id ?? '';
  await assignLicensePlanToSpace(baseScenario.space.id, plusPlanId);

  // Capture state before conversion. License subscriptions are only exposed on L0 spaces,
  // so the Plus license is read from the parent L0 (the space the L1 is promoted out of).
  spaceBefore = await getSpaceData(baseScenario.space.id);
  subspaceBefore = await getSpaceData(baseScenario.subspace.id);
  const parentLicenseBefore = await getSpaceLicenseSubscriptions(
    baseScenario.space.id
  );
  parentSubscriptionsBefore =
    parentLicenseBefore.data?.lookup.space?.subscriptions.map(s => s.name) ??
    [];

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

  // Skipped until bug is fixed: BUG: Converted L1 to L0 sets flow states to defaults for Space, instead of moving the flow states from L1#9528
  test.skip('collaboration is preserved (excluding profile urls)', () => {
    expect(stripProfileUrls(subspaceAfter?.collaboration)).toEqual(
      stripProfileUrls(subspaceBefore.data?.lookup.space?.collaboration)
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

  test('about fields are preserved after same-L0 conversion', () => {
    const aboutBefore = subspaceBefore.data?.lookup.space?.about;

    // profile: id and displayName preserved, url points to new hierarchy
    // Skip url check: Wrong endpoints set for promoted L1 to L0 — alkem-io/client-web#9481
    expect(subspaceAfter?.about.profile).toEqual(
      expect.objectContaining({
        id: aboutBefore?.profile?.id,
        displayName: aboutBefore?.profile?.displayName,
        // url: `${ALKEMIO_BASE_URL}/${baseScenario.subspace.nameId}`,
      })
    );

    // authorization, who, why, provider, metrics are preserved
    expect(subspaceAfter?.about.authorization).toEqual(
      aboutBefore?.authorization
    );
    expect(subspaceAfter?.about.who).toEqual(aboutBefore?.who);
    expect(subspaceAfter?.about.why).toEqual(aboutBefore?.why);
    expect(subspaceAfter?.about.provider).toEqual(aboutBefore?.provider);
  });

  // A promoted L0 is a root space, so its own entity url is `${BASE_URL}/<nameId>`.
  const promotedSpaceUrl = () =>
    `${ALKEMIO_BASE_URL}/${baseScenario.subspace.nameId}`;

  test('about profile url points to the promoted L0 root after promotion', () => {
    expect(subspaceAfter?.about.profile.url).toEqual(promotedSpaceUrl());
  });

  test('account host org url points to the host organization after promotion', () => {
    expect(subspaceAfter?.account.host?.profile?.url).toEqual(
      `${ALKEMIO_BASE_URL}/organization/${baseScenario.organization.nameId}`
    );
  });

  // alkem-io/client-web#9481 — innovationFlow url is not rebased: it still points to the
  // old L1 path (.../challenges/<l1nameid>) instead of the promoted L0 root. Unskip when fixed.
  test.skip('innovationFlow profile url points to the promoted L0 root after promotion', () => {
    expect(subspaceAfter?.collaboration.innovationFlow.profile.url).toEqual(
      promotedSpaceUrl()
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

  test('subspaces are preserved (excluding profile urls)', () => {
    expect(
      sortArraysInObject(stripProfileUrls(subspaceAfter?.subspaces))
    ).toEqual(
      sortArraysInObject(
        stripProfileUrls(subspaceBefore.data?.lookup.space?.subspaces)
      )
    );
  });

  test('community roleSet members are preserved', () => {
    const membersBefore =
      subspaceBefore.data?.lookup.space?.community.roleSet.memberUsers;
    const membersAfter = subspaceAfter?.community.roleSet.memberUsers;

    const sortedBefore = membersBefore?.map(u => u.id).sort();
    const sortedAfter = membersAfter?.map(u => u.id).sort();

    expect(sortedAfter).toEqual(sortedBefore);
  });

  test('community roleSet leads are preserved', () => {
    const leadsBefore =
      subspaceBefore.data?.lookup.space?.community.roleSet.leadUsers;
    const leadsAfter = subspaceAfter?.community.roleSet.leadUsers;

    const sortedBefore = leadsBefore?.map(u => u.id).sort();
    const sortedAfter = leadsAfter?.map(u => u.id).sort();

    expect(sortedAfter).toEqual(sortedBefore);
  });

  test('community roleSet admins are preserved', () => {
    const adminsBefore =
      subspaceBefore.data?.lookup.space?.community.roleSet.adminUsers;
    const adminsAfter = subspaceAfter?.community.roleSet.adminUsers;

    const sortedBefore = adminsBefore?.map(u => u.id).sort();
    const sortedAfter = adminsAfter?.map(u => u.id).sort();

    expect(sortedAfter).toEqual(sortedBefore);
  });

  // alkem-io/server#6022 — sanity: the parent L0 carried a Plus license before conversion,
  // so the no-inheritance assertion below is meaningful (not trivially passing).
  test('parent L0 carried a Plus license before conversion', () => {
    expect(parentSubscriptionsBefore).toContain(
      LicensingCredentialBasedCredentialType.SpaceLicensePlus
    );
  });

  // alkem-io/server#6022 — a space promoted from L1 to L0 must receive its own fresh Free
  // license and must NOT inherit the Plus license of the parent L0 it was promoted out of.
  test('promoted L0 has a Free license and does not inherit the parent Plus license', async () => {
    const licenseAfterConversion = await getSpaceLicenseSubscriptions(
      baseScenario.subspace.id
    );
    const subscriptionNames =
      licenseAfterConversion.data?.lookup.space?.subscriptions.map(
        s => s.name
      ) ?? [];

    expect(subscriptionNames).toContain(
      LicensingCredentialBasedCredentialType.SpaceLicenseFree
    );
    expect(subscriptionNames).not.toContain(
      LicensingCredentialBasedCredentialType.SpaceLicensePlus
    );
  });

  test('calendar events are preserved after conversion', async () => {
    const calendarRes = await getCalendarEvents(baseScenario.subspace.id);
    const events =
      calendarRes.data?.lookup?.space?.collaboration?.timeline?.calendar
        ?.events ?? [];

    const preserved = events.find(e => e.id === calendarEventId);
    expect(preserved).toBeDefined();
    expect(preserved?.profile.displayName).toBe(
      'Event before convert L1 to L0'
    );
  });

  test('community updates messages are preserved after conversion', async () => {
    const commData = await getSpaceCommunication(baseScenario.subspace.id);
    const updatesMessages =
      commData.data?.lookup.space?.community.communication.updates.messages ??
      [];
    const messageTexts = updatesMessages.map(m => m.message);

    expect(messageTexts).toContain('Update before convert L1 to L0');
  });
});

describe('Convert L1 to L0 - authorization', () => {
  test('Space Admin cannot execute conversion', async () => {
    // Create a fresh scenario for this test
    const authScenario = await TestScenarioFactory.createBaseScenario({
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
    const authScenario = await TestScenarioFactory.createBaseScenario({
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
