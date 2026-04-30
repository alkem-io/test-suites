import {
  TestScenarioConfig,
  TestScenarioFactory,
  TestUser,
  TestUserManager,
} from '@alkemio/tests-lib';
import { convertSpaceL2ToSpaceL1 } from './conversion.request.params';
import {
  getSpaceData,
  getSpaceCommunication,
} from '../space/space.request.params';
import { sendMessageToRoom } from '@functional-api/communications/communication.params';
import {
  createCalendarEventOnCalendar,
  getCalendarEvents,
  getSpaceCalendarId,
} from '@functional-api/calendar/calendar.request.params';
import {
  sortArraysInObject,
  stripProfileUrls,
  collectProfileUrls,
} from '@utils/array.matcher';

// eslint-disable-next-line @typescript-eslint/no-unused-vars -- used once alkem-io/client-web#9481 is fixed
const { ALKEMIO_BASE_URL } = process.env;

import { inviteForEntryRoleOnRoleSet } from '@functional-api/roleset/invitations/invitation.request.params';
import { createApplication } from '@functional-api/roleset/application/application.request.params';
import {
  eventOnRoleSetApplication,
  eventOnRoleSetInvitation,
} from '@functional-api/roleset/roleset-events.request.params';
import { getSingleInvitationResult } from '@functional-api/roleset/roleset.request.params';
import {
  CommunityMembershipPolicy,
  SpacePrivacyMode,
} from '@alkemio/client-lib';
import { OrganizationWithSpaceModel } from '@alkemio/tests-lib/scenario/models/OrganizationWithSpaceModel';
import {
  CalendarEventType,
  RoleName,
  SpaceLevel,
} from '@alkemio/tests-lib/core/generated/alkemio-schema';

let baseScenario: OrganizationWithSpaceModel;

const scenarioConfig: TestScenarioConfig = {
  name: 'convert-l2-to-l1',
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
      subspace: {
        collaboration: {
          addPostCallout: true,
          addPostCollectionCallout: true,
          addWhiteboardCallout: true,
        },
        community: {
          admins: [TestUser.SUBSUBSPACE_ADMIN],
          members: [TestUser.SUBSUBSPACE_MEMBER, TestUser.SUBSUBSPACE_ADMIN],
        },
        settings: {
          membership: { policy: CommunityMembershipPolicy.Applications },
          privacy: { mode: SpacePrivacyMode.Private },
        },
      },
    },
  },
};

let subsubspaceBefore: Awaited<ReturnType<typeof getSpaceData>>;
let promotedSpace:
  | NonNullable<
      Awaited<ReturnType<typeof convertSpaceL2ToSpaceL1>>['data']
    >['convertSpaceL2ToSpaceL1']
  | undefined;
let invitationId: string;
let applicationId: string;
let calendarEventId: string;

beforeAll(async () => {
  baseScenario = await TestScenarioFactory.createBaseScenario(scenarioConfig);

  // Create calendar event on the subsubspace before conversion
  const calendarRes = await getSpaceCalendarId(baseScenario.subsubspace.id);
  const calendarId =
    calendarRes.data?.lookup?.space?.collaboration?.timeline?.calendar?.id ??
    '';
  const calEventRes = await createCalendarEventOnCalendar(calendarId, {
    displayName: 'Event before convert L2 to L1',
    startDate: '2026-06-01T10:00:00.000Z',
    durationMinutes: 60,
    multipleDays: false,
    wholeDay: false,
    type: CalendarEventType.Event,
  });
  calendarEventId = calEventRes.data?.createEventOnCalendar?.id ?? '';

  // Send message to updates room before conversion
  await sendMessageToRoom(
    baseScenario.subsubspace.communication.updatesId,
    'Update before convert L2 to L1'
  );

  // Create pending invitation on L2 subsubspace
  const invitationData = await inviteForEntryRoleOnRoleSet(
    baseScenario.subsubspace.community.roleSetId,
    [TestUserManager.users.nonSpaceMember.id],
    [],
    'welcome',
    [RoleName.Member],
    TestUser.GLOBAL_ADMIN
  );
  const invitationResult = getSingleInvitationResult(invitationData);
  invitationId = invitationResult?.invitation?.id ?? '';

  // Create pending application on L2 subsubspace
  const applicationData = await createApplication(
    baseScenario.subsubspace.community.roleSetId,
    TestUser.SUBSPACE_MEMBER
  );
  applicationId = applicationData?.data?.applyForEntryRoleOnRoleSet?.id ?? '';

  // Capture state before conversion
  subsubspaceBefore = await getSpaceData(baseScenario.subsubspace.id);

  // Execute conversion — note: using subsubspace.id (L2), not subspace.id
  const res = await convertSpaceL2ToSpaceL1(baseScenario.subsubspace.id);
  promotedSpace = res.data?.convertSpaceL2ToSpaceL1;
});

afterAll(async () => {
  await TestScenarioFactory.cleanUpBaseScenario(baseScenario);
});

/** @testCase TC-1304 */
describe('Convert L2 to L1', () => {
  describe('basic properties after promotion', () => {
    test('level is promoted to L1', () => {
      expect(promotedSpace?.level).toEqual(SpaceLevel.L1);
    });

    test('collaboration is preserved (excluding profile urls)', () => {
      expect(stripProfileUrls(promotedSpace?.collaboration)).toEqual(
        stripProfileUrls(
          subsubspaceBefore.data?.lookup.space?.collaboration
        )
      );
    });

    test('innovation flow states are preserved', () => {
      expect(promotedSpace?.collaboration.innovationFlow.states).toEqual(
        subsubspaceBefore.data?.lookup.space?.collaboration.innovationFlow
          .states
      );
    });

    test('visibility is preserved', () => {
      expect(promotedSpace?.visibility).toEqual(
        subsubspaceBefore.data?.lookup.space?.visibility
      );
    });

    test('about fields are preserved after same-L0 conversion', () => {
      const aboutBefore = subsubspaceBefore.data?.lookup.space?.about;

      // profile: id and displayName preserved, url points to new hierarchy
      // Skip url check: Wrong endpoints set for promoted L1 to L0 — alkem-io/client-web#9481
      expect(promotedSpace?.about.profile).toEqual(
        expect.objectContaining({
          id: aboutBefore?.profile?.id,
          displayName: aboutBefore?.profile?.displayName,
          // url: `${ALKEMIO_BASE_URL}/${baseScenario.space.nameId}/challenges/${baseScenario.subsubspace.nameId}`,
        })
      );

      // authorization, who, why, provider are preserved
      expect(promotedSpace?.about.authorization).toEqual(
        aboutBefore?.authorization
      );
      expect(promotedSpace?.about.who).toEqual(aboutBefore?.who);
      expect(promotedSpace?.about.why).toEqual(aboutBefore?.why);
      expect(promotedSpace?.about.provider).toEqual(aboutBefore?.provider);
    });

    // Skip: Wrong endpoints set for promoted L1 to L0 — alkem-io/client-web#9481
    test.skip('all entity profile urls are updated after promotion to L1', () => {
      const urlsBefore = collectProfileUrls(
        subsubspaceBefore.data?.lookup.space
      );
      const urlsAfter = collectProfileUrls(promotedSpace);

      for (const entry of urlsAfter) {
        expect(entry.url, `${entry.path} should not be empty`).not.toBe(
          ''
        );
      }

      expect(urlsAfter.length).toEqual(urlsBefore.length);

      for (let i = 0; i < urlsAfter.length; i++) {
        expect(
          urlsAfter[i].url,
          `${urlsAfter[i].path} should differ after conversion`
        ).not.toEqual(urlsBefore[i].url);
      }
    });

    test('account host is preserved', () => {
      expect(promotedSpace?.account.host).toEqual(
        subsubspaceBefore.data?.lookup.space?.account.host
      );
    });

    test('settings are preserved', () => {
      expect(promotedSpace?.settings).toEqual(
        subsubspaceBefore.data?.lookup.space?.settings
      );
    });

    test('community members are preserved', () => {
      const membersBefore =
        subsubspaceBefore.data?.lookup.space?.community.roleSet.memberUsers
          ?.map(u => u.id)
          .sort();
      const membersAfter = promotedSpace?.community.roleSet.memberUsers
        ?.map(u => u.id)
        .sort();

      expect(membersAfter).toEqual(membersBefore);
    });

    test('community admins are preserved', () => {
      const adminsBefore =
        subsubspaceBefore.data?.lookup.space?.community.roleSet.adminUsers
          ?.map(u => u.id)
          .sort();
      const adminsAfter = promotedSpace?.community.roleSet.adminUsers
        ?.map(u => u.id)
        .sort();

      expect(adminsAfter).toEqual(adminsBefore);
    });

    test('subspaces are preserved (excluding profile urls)', () => {
      expect(
        sortArraysInObject(stripProfileUrls(promotedSpace?.subspaces))
      ).toEqual(
        sortArraysInObject(
          stripProfileUrls(
            subsubspaceBefore.data?.lookup.space?.subspaces
          )
        )
      );
    });
  });

  describe('calendar events and community updates after promotion', () => {
    test('calendar events are preserved after conversion', async () => {
      const calendarRes = await getCalendarEvents(
        baseScenario.subsubspace.id
      );
      const events =
        calendarRes.data?.lookup?.space?.collaboration?.timeline?.calendar
          ?.events ?? [];

      const preserved = events.find(e => e.id === calendarEventId);
      expect(preserved).toBeDefined();
      expect(preserved?.profile.displayName).toBe(
        'Event before convert L2 to L1'
      );
    });

    test('community updates messages are preserved after conversion', async () => {
      const commData = await getSpaceCommunication(
        baseScenario.subsubspace.id
      );
      const updatesMessages =
        commData.data?.lookup.space?.community.communication.updates
          .messages ?? [];
      const messageTexts = updatesMessages.map(m => m.message);

      expect(messageTexts).toContain('Update before convert L2 to L1');
    });
  });

  describe('pending invitations and applications after promotion', () => {
    test('pending invitation can be accepted after promotion', async () => {
      const acceptResult = await eventOnRoleSetInvitation(
        invitationId,
        'ACCEPT',
        TestUser.NON_SPACE_MEMBER
      );

      expect(acceptResult.status).toBe(200);
    });

    test('pending application can be approved after promotion', async () => {
      const approveResult = await eventOnRoleSetApplication(
        applicationId,
        'APPROVE'
      );

      expect(approveResult.status).toBe(200);
      expect(approveResult?.data?.eventOnApplication?.state).toContain(
        'approved'
      );
    });
  });
});
