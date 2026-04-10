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
import { getSpaceLicenseSubscriptions } from '@functional-api/license/license.params.request';
import { sendMessageToRoom } from '@functional-api/communications/communication.params';
import {
  createCalendarEventOnCalendar,
  getCalendarEvents,
  getSpaceCalendarId,
} from '@functional-api/calendar/calendar.request.params';
import { CalendarEventType } from '@alkemio/tests-lib/core/generated/alkemio-schema';
import {
  sortArraysInObject,
  stripProfileUrls,
  collectProfileUrls,
} from '@utils/array.matcher';

// eslint-disable-next-line @typescript-eslint/no-unused-vars -- used once alkem-io/client-web#9481 is fixed
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
let sortedLicenseBefore: unknown;
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

  test('collaboration is preserved (excluding profile urls)', () => {
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

  // Skip: Wrong endpoints set for promoted L1 to L0 — alkem-io/client-web#9481
  test.skip('all entity profile urls are updated after promotion to L0', () => {
    const urlsBefore = collectProfileUrls(
      subspaceBefore.data?.lookup.space
    );
    const urlsAfter = collectProfileUrls(subspaceAfter);

    // Every profile url should be non-empty
    for (const entry of urlsAfter) {
      expect(entry.url, `${entry.path} should not be empty`).not.toBe('');
    }

    // Same number of profile urls before and after
    expect(urlsAfter.length).toEqual(urlsBefore.length);

    // Each url should have changed (hierarchy changed)
    for (let i = 0; i < urlsAfter.length; i++) {
      expect(
        urlsAfter[i].url,
        `${urlsAfter[i].path} should differ after conversion`
      ).not.toEqual(urlsBefore[i].url);
    }
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
        stripProfileUrls(
          subspaceBefore.data?.lookup.space?.subspaces
        )
      )
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
      commData.data?.lookup.space?.community.communication.updates
        .messages ?? [];
    const messageTexts = updatesMessages.map(m => m.message);

    expect(messageTexts).toContain('Update before convert L1 to L0');
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
