/**
 * Convert L1 to L0 with cascading L2 to L1 (alkem-io/server#6019)
 *
 * Scenarios (in addition to basic-properties / calendar / updates preservation):
 * - A pending invitation on the promoted L1 is no longer available after cascade conversion.
 * - A pending application on the promoted L1 is no longer available after cascade conversion.
 */
import {
  TestScenarioConfig,
  TestScenarioFactory,
  TestUser,
  TestUserManager,
} from '@alkemio/tests-lib';
import { convertSpaceL1ToSpaceL0 } from './conversion.request.params';
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

const { ALKEMIO_BASE_URL } = process.env;

// A conversion only rebases urls of entities inside the converted space subtree.
// Users and organizations referenced from it keep their own urls.
const isExternalEntityUrl = (url: string) =>
  url.startsWith(`${ALKEMIO_BASE_URL}/user/`) ||
  url.startsWith(`${ALKEMIO_BASE_URL}/organization/`);

import { inviteForEntryRoleOnRoleSet } from '@functional-api/roleset/invitations/invitation.request.params';
import { createApplication } from '@functional-api/roleset/application/application.request.params';
import {
  getSingleInvitationResult,
  getCommunityApplicationsInvitations,
} from '@functional-api/roleset/roleset.request.params';
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
  name: 'convert-l1-to-l0-with-l2-to-l1',
  space: {
    collaboration: {
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
      settings: {
        membership: { policy: CommunityMembershipPolicy.Applications },
        privacy: { mode: SpacePrivacyMode.Private },
      },
      subspace: {
        collaboration: {
          addPostCollectionCallout: true,
          addWhiteboardCallout: true,
        },
        community: {
          admins: [TestUser.SUBSUBSPACE_ADMIN],
          members: [TestUser.SUBSUBSPACE_MEMBER, TestUser.SUBSUBSPACE_ADMIN],
        },
      },
    },
  },
};

let subspaceBefore: Awaited<ReturnType<typeof getSpaceData>>;
let subsubspaceBefore: Awaited<ReturnType<typeof getSpaceData>>;
let convertedL0:
  | NonNullable<
      Awaited<ReturnType<typeof convertSpaceL1ToSpaceL0>>['data']
    >['convertSpaceL1ToSpaceL0']
  | undefined;
let promotedL1Data: NonNullable<
  Awaited<ReturnType<typeof getSpaceData>>['data']
>['lookup']['space'];
let invitationId: string;
let applicationId: string;
let subspaceCalendarEventId: string;
let subsubspaceCalendarEventId: string;

beforeAll(async () => {
  baseScenario = await TestScenarioFactory.createBaseScenario(scenarioConfig);

  // Create calendar event on the L1 subspace before conversion
  const subCalRes = await getSpaceCalendarId(baseScenario.subspace.id);
  const subCalId =
    subCalRes.data?.lookup?.space?.collaboration?.timeline?.calendar?.id ?? '';
  const subCalEventRes = await createCalendarEventOnCalendar(subCalId, {
    displayName: 'Event on L1 before cascade convert',
    startDate: '2026-06-01T10:00:00.000Z',
    durationMinutes: 60,
    multipleDays: false,
    wholeDay: false,
    type: CalendarEventType.Event,
  });
  subspaceCalendarEventId =
    subCalEventRes.data?.createEventOnCalendar?.id ?? '';

  // Create calendar event on the L2 subsubspace before conversion
  const subsubCalRes = await getSpaceCalendarId(baseScenario.subsubspace.id);
  const subsubCalId =
    subsubCalRes.data?.lookup?.space?.collaboration?.timeline?.calendar?.id ??
    '';
  const subsubCalEventRes = await createCalendarEventOnCalendar(subsubCalId, {
    displayName: 'Event on L2 before cascade convert',
    startDate: '2026-06-02T10:00:00.000Z',
    durationMinutes: 90,
    multipleDays: false,
    wholeDay: false,
    type: CalendarEventType.Event,
  });
  subsubspaceCalendarEventId =
    subsubCalEventRes.data?.createEventOnCalendar?.id ?? '';

  // Send messages to updates rooms before conversion
  await sendMessageToRoom(
    baseScenario.subspace.communication.updatesId,
    'Update on L1 before cascade convert'
  );
  await sendMessageToRoom(
    baseScenario.subsubspace.communication.updatesId,
    'Update on L2 before cascade convert'
  );

  // Create pending invitation on L1 subspace
  const invitationData = await inviteForEntryRoleOnRoleSet(
    baseScenario.subspace.community.roleSetId,
    [TestUserManager.users.nonSpaceMember.id],
    [],
    'welcome',
    [RoleName.Member],
    TestUser.GLOBAL_ADMIN
  );
  const invitationResult = getSingleInvitationResult(invitationData);
  invitationId = invitationResult?.invitation?.id ?? '';

  // Create pending application on L1 subspace
  const applicationData = await createApplication(
    baseScenario.subspace.community.roleSetId,
    TestUser.SPACE_MEMBER
  );
  applicationId = applicationData?.data?.applyForEntryRoleOnRoleSet?.id ?? '';

  // Capture state before conversion
  subspaceBefore = await getSpaceData(baseScenario.subspace.id);
  subsubspaceBefore = await getSpaceData(baseScenario.subsubspace.id);

  // Execute conversion
  const res = await convertSpaceL1ToSpaceL0(baseScenario.subspace.id);
  convertedL0 = res.data?.convertSpaceL1ToSpaceL0;

  const subsubspaceAfter = await getSpaceData(baseScenario.subsubspace.id);
  promotedL1Data = subsubspaceAfter.data?.lookup.space;
});

afterAll(async () => {
  await TestScenarioFactory.cleanUpBaseScenario(baseScenario);
});

describe('Convert L1 to L0 with cascading L2 to L1', () => {
  describe('parent L1 promoted to L0', () => {
    test('level is L0', () => {
      expect(convertedL0?.level).toEqual(SpaceLevel.L0);
    });

    test('visibility is preserved', () => {
      expect(convertedL0?.visibility).toEqual(
        subspaceBefore.data?.lookup.space?.visibility
      );
    });

    test('about fields are preserved after same-L0 conversion to L0', () => {
      const aboutBefore = subspaceBefore.data?.lookup.space?.about;

      expect(convertedL0?.about.profile).toEqual(
        expect.objectContaining({
          id: aboutBefore?.profile?.id,
          displayName: aboutBefore?.profile?.displayName,
          url: `${ALKEMIO_BASE_URL}/${baseScenario.subspace.nameId}`,
        })
      );

      expect(convertedL0?.about.authorization).toEqual(
        aboutBefore?.authorization
      );
      expect(convertedL0?.about.who).toEqual(aboutBefore?.who);
      expect(convertedL0?.about.why).toEqual(aboutBefore?.why);
      expect(convertedL0?.about.provider).toEqual(aboutBefore?.provider);
    });

    test('all entity profile urls are updated after promotion to L0', () => {
      const urlsBefore = collectProfileUrls(subspaceBefore.data?.lookup.space);
      const urlsAfter = collectProfileUrls(convertedL0);

      for (const entry of urlsAfter) {
        expect(entry.url, `${entry.path} should not be empty`).not.toBe('');
      }

      expect(urlsAfter.length).toEqual(urlsBefore.length);

      for (let i = 0; i < urlsAfter.length; i++) {
        const { path, url } = urlsAfter[i];
        // urls pointing at a user or organization belong to entities the conversion
        // does not touch (host org, message senders), so they stay identical;
        // every space-scoped url must rebase onto the new hierarchy
        if (isExternalEntityUrl(url)) {
          expect(url, `${path} should be unchanged by conversion`).toEqual(
            urlsBefore[i].url
          );
          continue;
        }
        expect(url, `${path} should differ after conversion`).not.toEqual(
          urlsBefore[i].url
        );
      }
    });

    test('account host is preserved', () => {
      expect(convertedL0?.account.host).toEqual(
        subspaceBefore.data?.lookup.space?.account.host
      );
    });

    test('settings are preserved', () => {
      expect(convertedL0?.settings).toEqual(
        subspaceBefore.data?.lookup.space?.settings
      );
    });

    test('community members are preserved', () => {
      const membersBefore =
        subspaceBefore.data?.lookup.space?.community.roleSet.memberUsers
          ?.map(u => u.id)
          .sort();
      const membersAfter = convertedL0?.community.roleSet.memberUsers
        ?.map(u => u.id)
        .sort();

      expect(membersAfter).toEqual(membersBefore);
    });

    test('subspaces are preserved (excluding profile urls)', () => {
      expect(
        sortArraysInObject(stripProfileUrls(convertedL0?.subspaces))
      ).toEqual(
        sortArraysInObject(
          stripProfileUrls(subspaceBefore.data?.lookup.space?.subspaces)
        )
      );
    });
  });

  describe('child L2 promoted to L1', () => {
    test('level is L1', () => {
      expect(promotedL1Data?.level).toEqual(SpaceLevel.L1);
    });

    test('visibility is preserved', () => {
      expect(promotedL1Data?.visibility).toEqual(
        subsubspaceBefore.data?.lookup.space?.visibility
      );
    });

    test('about fields are preserved after cascading conversion to L1', () => {
      const aboutBefore = subsubspaceBefore.data?.lookup.space?.about;

      expect(promotedL1Data?.about.profile).toEqual(
        expect.objectContaining({
          id: aboutBefore?.profile?.id,
          displayName: aboutBefore?.profile?.displayName,
          url: `${ALKEMIO_BASE_URL}/${baseScenario.subspace.nameId}/challenges/${baseScenario.subsubspace.nameId}`,
        })
      );

      expect(promotedL1Data?.about.authorization).toEqual(
        aboutBefore?.authorization
      );
      expect(promotedL1Data?.about.who).toEqual(aboutBefore?.who);
      expect(promotedL1Data?.about.why).toEqual(aboutBefore?.why);
      expect(promotedL1Data?.about.provider).toEqual(aboutBefore?.provider);
    });

    test('all entity profile urls are updated after cascading promotion to L1', () => {
      const urlsBefore = collectProfileUrls(
        subsubspaceBefore.data?.lookup.space
      );
      const urlsAfter = collectProfileUrls(promotedL1Data);

      for (const entry of urlsAfter) {
        expect(entry.url, `${entry.path} should not be empty`).not.toBe('');
      }

      expect(urlsAfter.length).toEqual(urlsBefore.length);

      for (let i = 0; i < urlsAfter.length; i++) {
        const { path, url } = urlsAfter[i];
        // urls pointing at a user or organization belong to entities the conversion
        // does not touch (host org, message senders), so they stay identical;
        // every space-scoped url must rebase onto the new hierarchy
        if (isExternalEntityUrl(url)) {
          expect(url, `${path} should be unchanged by conversion`).toEqual(
            urlsBefore[i].url
          );
          continue;
        }
        expect(url, `${path} should differ after conversion`).not.toEqual(
          urlsBefore[i].url
        );
      }
    });

    test('account host is preserved', () => {
      expect(promotedL1Data?.account.host).toEqual(
        subsubspaceBefore.data?.lookup.space?.account.host
      );
    });

    test('settings are preserved', () => {
      expect(promotedL1Data?.settings).toEqual(
        subsubspaceBefore.data?.lookup.space?.settings
      );
    });

    test('community members are preserved', () => {
      const membersBefore =
        subsubspaceBefore.data?.lookup.space?.community.roleSet.memberUsers
          ?.map(u => u.id)
          .sort();
      const membersAfter = promotedL1Data?.community.roleSet.memberUsers
        ?.map(u => u.id)
        .sort();

      expect(membersAfter).toEqual(membersBefore);
    });

    test('subspaces are preserved (excluding profile urls)', () => {
      expect(
        sortArraysInObject(stripProfileUrls(promotedL1Data?.subspaces))
      ).toEqual(
        sortArraysInObject(
          stripProfileUrls(subsubspaceBefore.data?.lookup.space?.subspaces)
        )
      );
    });
  });

  describe('calendar events and community updates after cascade', () => {
    test('calendar events on parent L1 are preserved after promotion to L0', async () => {
      const calendarRes = await getCalendarEvents(baseScenario.subspace.id);
      const events =
        calendarRes.data?.lookup?.space?.collaboration?.timeline?.calendar
          ?.events ?? [];

      const preserved = events.find(e => e.id === subspaceCalendarEventId);
      expect(preserved).toBeDefined();
      expect(preserved?.profile.displayName).toBe(
        'Event on L1 before cascade convert'
      );
    });

    test('calendar events on child L2 are preserved after promotion to L1', async () => {
      const calendarRes = await getCalendarEvents(baseScenario.subsubspace.id);
      const events =
        calendarRes.data?.lookup?.space?.collaboration?.timeline?.calendar
          ?.events ?? [];

      const preserved = events.find(e => e.id === subsubspaceCalendarEventId);
      expect(preserved).toBeDefined();
      expect(preserved?.profile.displayName).toBe(
        'Event on L2 before cascade convert'
      );
    });

    test('community updates on parent L1 are preserved after promotion to L0', async () => {
      const commData = await getSpaceCommunication(baseScenario.subspace.id);
      const updatesMessages =
        commData.data?.lookup.space?.community.communication.updates.messages ??
        [];
      const messageTexts = updatesMessages.map(m => m.message);

      expect(messageTexts).toContain('Update on L1 before cascade convert');
    });

    test('community updates on child L2 are preserved after promotion to L1', async () => {
      const commData = await getSpaceCommunication(baseScenario.subsubspace.id);
      const updatesMessages =
        commData.data?.lookup.space?.community.communication.updates.messages ??
        [];
      const messageTexts = updatesMessages.map(m => m.message);

      expect(messageTexts).toContain('Update on L2 before cascade convert');
    });
  });

  describe('pending invitations and applications after cascade', () => {
    // alkem-io/server#6019 — pending invitations on the L1 must be removed when it
    // is promoted to L0, so recipients cannot accept a stale invite (alkem-io/server#5069).
    test('pending invitation on L1 is no longer available after conversion', async () => {
      const result = await getCommunityApplicationsInvitations(
        baseScenario.subspace.community.roleSetId
      );

      const invitationIds =
        result.data?.lookup.roleSet?.invitations.map(i => i.id) ?? [];

      expect(invitationIds).not.toContain(invitationId);
    });

    // alkem-io/server#6019 — pending applications on the L1 must be removed on promotion to L0.
    test('pending application on L1 is no longer available after conversion', async () => {
      const result = await getCommunityApplicationsInvitations(
        baseScenario.subspace.community.roleSetId
      );

      const applicationIds =
        result.data?.lookup.roleSet?.applications.map(a => a.id) ?? [];

      expect(applicationIds).not.toContain(applicationId);
    });
  });
});
