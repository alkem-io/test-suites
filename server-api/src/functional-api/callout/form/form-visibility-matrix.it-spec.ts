import {
  createSpaceBasicData,
  TestScenarioConfig,
  TestScenarioFactory,
  TestUser,
  TestUserManager,
  UniqueIDGenerator,
  updateSpaceSettings,
} from '@alkemio/tests-lib';
import { SpacePrivacyMode } from '@alkemio/client-lib';
import {
  CalloutFormResponseMode,
  CalloutFormResponseVisibility,
  RoleName,
} from '@alkemio/tests-lib/core/generated/alkemio-schema';
import { OrganizationWithSpaceModel } from '@alkemio/tests-lib/scenario/models/OrganizationWithSpaceModel';
import { deleteSpace } from '../../journey/space/space.request.params';
import {
  assignRoleToUser,
  removeRoleFromUser,
} from '../../roleset/roles-request.params';
import {
  answersFor,
  createFormCallout,
  deleteFormResponse,
  FormCallout,
  getFormResponses,
  getFormResponsesAnonymous,
  getSpaceSets,
  grantPlatformRole,
  isDenied,
  responsesView,
  revokePlatformRole,
  submitFormResponse,
  uniqueFormName,
} from './form.request.params';

/**
 * SC-003 — who can read a Form's responses, per role, per visibility.
 *
 * The Form lives in a SUBSPACE of a public space whose `allowPlatformSupportAsAdmin`
 * is off, so Global Support reads by the draft-Post rule but never moderates.
 * A separate space with the flag on covers the positive Global Support cell.
 * Every response is written by SUBSPACE_MEMBER; the other readers are told apart
 * by what they see of that one response:
 *   ALL  -> `all.total == 1` and `canReadAll`
 *   OWN  -> `all.total == 0` (they wrote nothing) and `!canReadAll`
 * The submitter (mine == 1) is the positive control that the row exists at all.
 */

const uniqueId = UniqueIDGenerator.getID();

const noCallouts = {
  addPostCallout: false,
  addPostCollectionCallout: false,
  addWhiteboardCallout: false,
  addTutorialCallouts: false,
};

const scenarioConfig: TestScenarioConfig = {
  name: 'form-visibility-matrix',
  space: {
    collaboration: noCallouts,
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
      collaboration: noCallouts,
      community: {
        // SUBSUBSPACE_ADMIN is the ex-admin creator: an admin while it creates
        // the third Form, then demoted. A dedicated persona keeps the reader
        // cells below independent of the order the describes run in.
        admins: [TestUser.SUBSPACE_ADMIN, TestUser.SUBSUBSPACE_ADMIN],
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

type View = {
  mine: number;
  total: number;
  listed: number;
  canReadAll: boolean;
  canModerate: boolean;
};

/** Reads only the viewer's own rows. `mine` is what the viewer wrote. */
const own = (mine: number, canModerate = false): View => ({
  mine,
  total: mine,
  listed: mine,
  canReadAll: false,
  canModerate,
});

/** Reads every response (the one written by SUBSPACE_MEMBER). */
const everything = (mine: number, canModerate: boolean): View => ({
  mine,
  total: 1,
  listed: 1,
  canReadAll: true,
  canModerate,
});

type Reader = {
  label: string;
  user: TestUser;
  admins: View;
  members: View;
  /** Can delete the response of another member (moderation). */
  deletesOthers: boolean;
};

// Moderation is CREATE on the current callouts set. Platform Content Full Access
// holds it through the root policy cascade, which is why QA_USER can moderate
// while it still only READS its own responses; Global Support does not while
// the space keeps allowPlatformSupportAsAdmin off.
const readers: Reader[] = [
  {
    label: 'Global Admin',
    user: TestUser.GLOBAL_ADMIN,
    admins: everything(0, true),
    members: everything(0, true),
    deletesOthers: true,
  },
  {
    label: 'Global Support (reads by the draft-Post rule, cannot moderate)',
    user: TestUser.GLOBAL_SUPPORT_ADMIN,
    admins: everything(0, false),
    members: everything(0, false),
    deletesOthers: false,
  },
  {
    label: 'subspace admin',
    user: TestUser.SUBSPACE_ADMIN,
    admins: everything(0, true),
    members: everything(0, true),
    deletesOthers: true,
  },
  {
    label: 'parent space admin',
    user: TestUser.SPACE_ADMIN,
    admins: everything(0, true),
    members: everything(0, true),
    deletesOthers: true,
  },
  {
    label: 'submitting member',
    user: TestUser.SUBSPACE_MEMBER,
    admins: own(1),
    members: everything(1, false),
    deletesOthers: false,
  },
  {
    label: 'other subspace member',
    user: TestUser.SUBSUBSPACE_MEMBER,
    admins: own(0),
    members: everything(0, false),
    deletesOthers: false,
  },
  {
    label: 'parent space member (not a member of the subspace)',
    user: TestUser.SPACE_MEMBER,
    admins: own(0),
    members: own(0),
    deletesOthers: false,
  },
  {
    label: 'registered non-member',
    user: TestUser.NON_SPACE_MEMBER,
    admins: own(0),
    members: own(0),
    deletesOthers: false,
  },
  {
    label: 'Platform Content Full Access',
    user: TestUser.QA_USER,
    admins: own(0, true),
    members: own(0, true),
    deletesOthers: true,
  },
  {
    label: 'Platform Support (support-as-admin off)',
    user: TestUser.GLOBAL_BETA_TESTER,
    admins: own(0),
    members: own(0),
    deletesOthers: false,
  },
  {
    label: 'Global Spaces Reader',
    user: TestUser.ORGANIZATION_ADMIN,
    admins: own(0),
    members: own(0),
    deletesOthers: false,
  },
  {
    label: 'Platform Spaces Reader',
    user: TestUser.GLOBAL_LICENSE_ADMIN,
    admins: own(0),
    members: own(0),
    deletesOthers: false,
  },
];

// The four personas that carry a platform role only for the duration of the file.
const platformGrants: { user: () => string; role: RoleName }[] = [
  {
    user: () => TestUserManager.users.qaUser.id,
    role: RoleName.PlatformContentFullAccess,
  },
  {
    user: () => TestUserManager.users.betaTester.id,
    role: RoleName.PlatformSupport,
  },
  {
    user: () => TestUserManager.users.organizationAdmin.id,
    role: RoleName.GlobalSpacesReader,
  },
  {
    user: () => TestUserManager.users.globalLicenseAdmin.id,
    role: RoleName.PlatformSpacesReader,
  },
];

let baseScenario: OrganizationWithSpaceModel;
let adminsForm: FormCallout;
let membersForm: FormCallout;
let deletionForm: FormCallout;

const subspaceSetId = () => baseScenario.subspace.collaboration.calloutsSetId;

const submitAs = async (
  form: FormCallout,
  visibility: CalloutFormResponseVisibility,
  user: TestUser = TestUser.SUBSPACE_MEMBER
) => {
  const submitted = await submitFormResponse(
    form.formId,
    answersFor(form.questions),
    visibility,
    user
  );
  const id = submitted.data?.submitCalloutFormResponse.id;
  if (!id) {
    throw new Error(
      `${user} could not submit to ${form.calloutId}: ${JSON.stringify(
        submitted.error?.errors ?? submitted
      )}`
    );
  }
  return id;
};

beforeAll(async () => {
  baseScenario = await TestScenarioFactory.createBaseScenario(scenarioConfig);

  // The scenario factory applies each settings block in a separate call and
  // every call resets the platform-support flag; pin the final state in one call
  // per space so the flag really is off.
  for (const space of [baseScenario.space, baseScenario.subspace]) {
    const updated = await updateSpaceSettings(space.id, {
      privacy: {
        mode: SpacePrivacyMode.Public,
        allowPlatformSupportAsAdmin: false,
      },
      collaboration: { inheritMembershipRights: true },
    });
    if (updated.error) {
      throw new Error(
        `unable to pin space settings: ${JSON.stringify(updated.error)}`
      );
    }
  }

  for (const grant of platformGrants) {
    await grantPlatformRole(grant.user(), grant.role);
  }

  adminsForm = await createFormCallout(subspaceSetId(), {
    displayName: uniqueFormName(`admins-${uniqueId}`),
    settings: {
      visibility: CalloutFormResponseVisibility.Admins,
      responseMode: CalloutFormResponseMode.Single,
    },
  });
  membersForm = await createFormCallout(subspaceSetId(), {
    displayName: uniqueFormName(`members-${uniqueId}`),
    settings: {
      visibility: CalloutFormResponseVisibility.Members,
      responseMode: CalloutFormResponseMode.Single,
    },
  });
  // MULTIPLE + MEMBERS so a fresh response can be written for every deletion attempt.
  deletionForm = await createFormCallout(subspaceSetId(), {
    displayName: uniqueFormName(`delete-${uniqueId}`),
    settings: {
      visibility: CalloutFormResponseVisibility.Members,
      responseMode: CalloutFormResponseMode.Multiple,
    },
  });

  await submitAs(adminsForm, CalloutFormResponseVisibility.Admins);
  await submitAs(membersForm, CalloutFormResponseVisibility.Members);
});

afterAll(async () => {
  await Promise.allSettled(
    platformGrants.map(grant => revokePlatformRole(grant.user(), grant.role))
  );
  await TestScenarioFactory.cleanUpBaseScenario(baseScenario);
});

describe('Form responses — read scope per role', () => {
  describe.each([
    { visibility: 'ADMINS', pick: (r: Reader) => r.admins },
    { visibility: 'MEMBERS', pick: (r: Reader) => r.members },
  ])('visibility $visibility', ({ visibility, pick }) => {
    const formOf = () => (visibility === 'ADMINS' ? adminsForm : membersForm);

    test.each(readers)('$label', async reader => {
      const result = await getFormResponses(formOf().formId, reader.user);

      expect(responsesView(result)).toEqual(pick(reader));
    });

    test('anonymous reads nothing', async () => {
      const result = await getFormResponsesAnonymous(formOf().formId);

      const view = result.body.data?.lookup.calloutFormResponses;
      // The Post is public, so the lookup itself succeeds and is simply empty.
      expect(result.body.errors).toBeUndefined();
      expect(view?.canReadAll).toBe(false);
      expect(view?.canModerate).toBe(false);
      expect(view?.mine).toHaveLength(0);
      expect(view?.all.total).toBe(0);
      expect(view?.all.responses).toHaveLength(0);
    });
  });

  test('positive control: the submitter sees exactly their own row, the subspace admin sees the same single row', async () => {
    const asMember = responsesView(
      await getFormResponses(adminsForm.formId, TestUser.SUBSPACE_MEMBER)
    );
    const asAdmin = responsesView(
      await getFormResponses(adminsForm.formId, TestUser.SUBSPACE_ADMIN)
    );

    expect(asMember.mine).toBe(1);
    expect(asMember.total).toBe(1);
    expect(asAdmin.total).toBe(1);
    // Same row for both, so the OWN cells above are not vacuous zeros.
    const memberRow = (
      await getFormResponses(adminsForm.formId, TestUser.SUBSPACE_MEMBER)
    ).data?.lookup.calloutFormResponses.mine[0]?.id;
    const adminRow = (
      await getFormResponses(adminsForm.formId, TestUser.SUBSPACE_ADMIN)
    ).data?.lookup.calloutFormResponses.all.responses[0]?.id;
    expect(memberRow).toBeDefined();
    expect(adminRow).toBe(memberRow);
  });
});

describe('Form responses — who can delete another member’s response', () => {
  test.each(readers.filter(reader => reader.user !== TestUser.SUBSPACE_MEMBER))(
    '$label',
    async reader => {
      const responseId = await submitAs(
        deletionForm,
        CalloutFormResponseVisibility.Members
      );

      const attempt = await deleteFormResponse(responseId, reader.user);

      const stillThere = (
        await getFormResponses(deletionForm.formId, TestUser.GLOBAL_ADMIN)
      ).data?.lookup.calloutFormResponses.all.responses.some(
        response => response.id === responseId
      );
      if (reader.deletesOthers) {
        expect(attempt.error).toBeUndefined();
        expect(attempt.data?.deleteCalloutFormResponse.id).toBe(responseId);
        expect(stillThere).toBe(false);
      } else {
        expect(isDenied(attempt)).toBe(true);
        // Positive control: the denied attempt left the row in place.
        expect(stillThere).toBe(true);
        const cleanup = await deleteFormResponse(
          responseId,
          TestUser.SUBSPACE_MEMBER
        );
        expect(cleanup.error).toBeUndefined();
      }
    }
  );

  test('the author can always withdraw their own response', async () => {
    const responseId = await submitAs(
      deletionForm,
      CalloutFormResponseVisibility.Members
    );

    const withdrawn = await deleteFormResponse(
      responseId,
      TestUser.SUBSPACE_MEMBER
    );

    expect(withdrawn.error).toBeUndefined();
  });
});

describe('Form responses — the ex-admin creator', () => {
  let exAdminForm: FormCallout;

  beforeAll(async () => {
    // Created while an admin of the subspace...
    exAdminForm = await createFormCallout(
      subspaceSetId(),
      {
        displayName: uniqueFormName(`ex-admin-${uniqueId}`),
        settings: { visibility: CalloutFormResponseVisibility.Admins },
      },
      TestUser.SUBSUBSPACE_ADMIN
    );
    await submitAs(exAdminForm, CalloutFormResponseVisibility.Admins);

    // ...then demoted: reads are derived from the CURRENT credentials.
    const removed = await removeRoleFromUser(
      TestUserManager.users.subsubspaceAdmin.id,
      baseScenario.subspace.community.roleSetId,
      RoleName.Admin
    );
    expect(removed.error).toBeUndefined();
  });

  test('reads only their own responses and cannot moderate', async () => {
    const result = await getFormResponses(
      exAdminForm.formId,
      TestUser.SUBSUBSPACE_ADMIN
    );

    expect(responsesView(result)).toEqual(own(0, false));
  });

  test('cannot delete another member’s response', async () => {
    const asAdmin = await getFormResponses(
      exAdminForm.formId,
      TestUser.SUBSPACE_ADMIN
    );
    const responseId =
      asAdmin.data?.lookup.calloutFormResponses.all.responses[0]?.id ?? '';
    expect(responseId).not.toBe('');

    const attempt = await deleteFormResponse(
      responseId,
      TestUser.SUBSUBSPACE_ADMIN
    );

    expect(isDenied(attempt)).toBe(true);
  });

  test('positive control: the current subspace admin still reads the one response', async () => {
    const result = await getFormResponses(
      exAdminForm.formId,
      TestUser.SUBSPACE_ADMIN
    );

    expect(responsesView(result)).toEqual(everything(0, true));
  });
});

describe('Form responses — a private space', () => {
  let privateSpaceId = '';
  let privateForm: FormCallout;

  beforeAll(async () => {
    const created = await createSpaceBasicData(
      `form-private-${uniqueId}`,
      `form-private-${uniqueId}`.toLowerCase().slice(0, 25),
      baseScenario.organization.accountId
    );
    privateSpaceId = created.data?.createSpace.id ?? '';
    expect(privateSpaceId).not.toBe('');

    const updated = await updateSpaceSettings(privateSpaceId, {
      privacy: {
        mode: SpacePrivacyMode.Private,
        allowPlatformSupportAsAdmin: false,
      },
    });
    expect(updated.error).toBeUndefined();

    const { calloutsSetId, roleSetId } = await getSpaceSets(privateSpaceId);

    const member = await assignRoleToUser(
      TestUserManager.users.spaceMember.id,
      roleSetId,
      RoleName.Member
    );
    expect(member.error).toBeUndefined();

    privateForm = await createFormCallout(calloutsSetId, {
      displayName: uniqueFormName(`private-${uniqueId}`),
      settings: { visibility: CalloutFormResponseVisibility.Admins },
    });
    await submitAs(
      privateForm,
      CalloutFormResponseVisibility.Admins,
      TestUser.SPACE_MEMBER
    );
  });

  afterAll(async () => {
    await deleteSpace(privateSpaceId);
  });

  test('Global Support cannot read the Post, so the lookup is forbidden', async () => {
    const result = await getFormResponses(
      privateForm.formId,
      TestUser.GLOBAL_SUPPORT_ADMIN
    );

    expect(isDenied(result)).toBe(true);
    expect(result.data?.lookup.calloutFormResponses).toBeUndefined();
  });

  test('Global Admin reads every response', async () => {
    const result = await getFormResponses(
      privateForm.formId,
      TestUser.GLOBAL_ADMIN
    );

    expect(responsesView(result)).toEqual({
      mine: 0,
      total: 1,
      listed: 1,
      canReadAll: true,
      canModerate: true,
    });
  });

  test('positive control: the member who wrote the response sees it', async () => {
    const result = await getFormResponses(
      privateForm.formId,
      TestUser.SPACE_MEMBER
    );

    expect(responsesView(result)).toEqual(own(1));
  });
});

describe('Form responses — a space that allows platform support as admin', () => {
  let supportSpaceId = '';
  let supportForm: FormCallout;

  beforeAll(async () => {
    const created = await createSpaceBasicData(
      `form-support-${uniqueId}`,
      `form-support-${uniqueId}`.toLowerCase().slice(0, 25),
      baseScenario.organization.accountId
    );
    supportSpaceId = created.data?.createSpace.id ?? '';
    expect(supportSpaceId).not.toBe('');

    const updated = await updateSpaceSettings(supportSpaceId, {
      privacy: {
        mode: SpacePrivacyMode.Public,
        allowPlatformSupportAsAdmin: true,
      },
    });
    expect(updated.error).toBeUndefined();

    const { calloutsSetId, roleSetId } = await getSpaceSets(supportSpaceId);

    const member = await assignRoleToUser(
      TestUserManager.users.spaceMember.id,
      roleSetId,
      RoleName.Member
    );
    expect(member.error).toBeUndefined();

    supportForm = await createFormCallout(calloutsSetId, {
      displayName: uniqueFormName(`support-${uniqueId}`),
      settings: {
        visibility: CalloutFormResponseVisibility.Admins,
        responseMode: CalloutFormResponseMode.Multiple,
      },
    });
    await submitAs(
      supportForm,
      CalloutFormResponseVisibility.Admins,
      TestUser.SPACE_MEMBER
    );
  });

  afterAll(async () => {
    await deleteSpace(supportSpaceId);
  });

  test('Global Support reads every response and can moderate', async () => {
    const result = await getFormResponses(
      supportForm.formId,
      TestUser.GLOBAL_SUPPORT_ADMIN
    );

    expect(responsesView(result)).toEqual(everything(0, true));
  });

  test('Global Support deletes another member’s response', async () => {
    const responseId = await submitAs(
      supportForm,
      CalloutFormResponseVisibility.Admins,
      TestUser.SPACE_MEMBER
    );

    const attempt = await deleteFormResponse(
      responseId,
      TestUser.GLOBAL_SUPPORT_ADMIN
    );

    expect(attempt.error).toBeUndefined();
    expect(attempt.data?.deleteCalloutFormResponse.id).toBe(responseId);
  });

  test('control: a registered non-member still reads nothing here', async () => {
    const result = await getFormResponses(
      supportForm.formId,
      TestUser.NON_SPACE_MEMBER
    );

    expect(responsesView(result)).toEqual(own(0));
  });
});
