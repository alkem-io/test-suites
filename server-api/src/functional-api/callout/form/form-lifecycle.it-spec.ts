import {
  createSpaceBasicData,
  harnessPostgresConfigured,
  queryHarnessDb,
  TestScenarioConfig,
  TestScenarioFactory,
  TestUser,
  TestUserManager,
  UniqueIDGenerator,
  updateSpaceSettings,
} from '@alkemio/tests-lib';
import { SpacePrivacyMode } from '@alkemio/client-lib';
import {
  CalloutFormQuestionType,
  CalloutFormResponseMode,
  CalloutFormResponseVisibility,
  CalloutFormState,
  CreateCalloutFormSettingsInput,
  RoleName,
} from '@alkemio/tests-lib/core/generated/alkemio-schema';
import { OrganizationWithSpaceModel } from '@alkemio/tests-lib/scenario/models/OrganizationWithSpaceModel';
import {
  createDisposableVerifiedUser,
  deleteUserTolerant,
  deleteUserWithOptions,
} from '../../graphql-guard/me-degradation.request.params';
import { deleteSpace } from '../../journey/space/space.request.params';
import {
  assignRoleToUser,
  removeRoleFromUser,
} from '../../roleset/roles-request.params';
import { deleteCallout } from '../callouts.request.params';
import {
  answersFor,
  createFormCallout,
  deleteFormResponse,
  errorCode,
  FormCallout,
  getFormResponses,
  getSpaceSets,
  isDenied,
  questionsAsUpdate,
  responsesView,
  submitFormResponse,
  submitFormResponseWithBearer,
  uniqueFormName,
  updateCalloutForm,
} from './form.request.params';

/**
 * Lifecycle, concurrency and moderation of the Form framing: what may change
 * while responses exist, what the submit lock guarantees under parallel
 * requests, and who may withdraw or delete which response.
 */

const uniqueId = UniqueIDGenerator.getID();

const ADMINS = CalloutFormResponseVisibility.Admins;
const MEMBERS = CalloutFormResponseVisibility.Members;
const SINGLE = CalloutFormResponseMode.Single;
const MULTIPLE = CalloutFormResponseMode.Multiple;

const scenarioConfig: TestScenarioConfig = {
  name: 'form-lifecycle',
  space: {
    collaboration: {
      addPostCallout: false,
      addPostCollectionCallout: false,
      addWhiteboardCallout: false,
      addTutorialCallouts: false,
    },
    community: {
      // SUBSUBSPACE_ADMIN is the ex-admin creator of the moderation cases.
      admins: [TestUser.SPACE_ADMIN, TestUser.SUBSUBSPACE_ADMIN],
      members: [
        TestUser.SPACE_MEMBER,
        TestUser.SUBSPACE_MEMBER,
        TestUser.SPACE_ADMIN,
        TestUser.SUBSUBSPACE_ADMIN,
      ],
    },
  },
};

let baseScenario: OrganizationWithSpaceModel;
let otherSpaceId = '';

const setId = () => baseScenario.space.collaboration.calloutsSetId;
const roleSetId = () => baseScenario.space.community.roleSetId;

const newForm = (
  tag: string,
  settings: CreateCalloutFormSettingsInput = {},
  user: TestUser = TestUser.GLOBAL_ADMIN
) =>
  createFormCallout(
    setId(),
    { displayName: uniqueFormName(`${tag}-${uniqueId}`), settings },
    user
  );

/** Submits as `user` and returns the response id, or throws with the reason. */
const respond = async (
  form: FormCallout,
  visibility: CalloutFormResponseVisibility,
  user: TestUser = TestUser.SPACE_MEMBER
) => {
  const result = await submitFormResponse(
    form.formId,
    answersFor(form.questions),
    visibility,
    user
  );
  const id = result.data?.submitCalloutFormResponse.id;
  if (!id) {
    throw new Error(
      `${user} could not respond: ${JSON.stringify(
        result.error?.errors ?? result
      )}`
    );
  }
  return id;
};

const totalSeenByAdmin = async (form: FormCallout) =>
  responsesView(await getFormResponses(form.formId, TestUser.SPACE_ADMIN))
    .total;

const idsSeenByAdmin = async (form: FormCallout) =>
  (
    await getFormResponses(form.formId, TestUser.SPACE_ADMIN)
  ).data?.lookup.calloutFormResponses.all.responses.map(r => r.id) ?? [];

beforeAll(async () => {
  baseScenario = await TestScenarioFactory.createBaseScenario(scenarioConfig);

  // Pin the platform-support flag off in one call (the scenario factory resets
  // it whenever it applies another settings block).
  const pinned = await updateSpaceSettings(baseScenario.space.id, {
    privacy: {
      mode: SpacePrivacyMode.Public,
      allowPlatformSupportAsAdmin: false,
    },
  });
  expect(pinned.error).toBeUndefined();

  // A second, unrelated space whose admin is NON_SPACE_MEMBER, for the IDOR cases.
  const other = await createSpaceBasicData(
    `form-other-${uniqueId}`,
    `form-other-${uniqueId}`.toLowerCase().slice(0, 25),
    baseScenario.organization.accountId
  );
  otherSpaceId = other.data?.createSpace.id ?? '';
  expect(otherSpaceId).not.toBe('');
  const otherRoleSet = (await getSpaceSets(otherSpaceId)).roleSetId;
  for (const role of [RoleName.Member, RoleName.Admin]) {
    const granted = await assignRoleToUser(
      TestUserManager.users.nonSpaceMember.id,
      otherRoleSet,
      role
    );
    expect(granted.error).toBeUndefined();
  }
});

afterAll(async () => {
  await deleteSpace(otherSpaceId);
  await TestScenarioFactory.cleanUpBaseScenario(baseScenario);
});

describe('Form lifecycle — SINGLE response mode under concurrency', () => {
  // The tests below share one Form and run in order: each leaves the state the
  // next one starts from.
  let form: FormCallout;

  beforeAll(async () => {
    form = await newForm('single', { responseMode: SINGLE });
  });

  test('five parallel submits by one member store exactly one response', async () => {
    const attempts = await Promise.all(
      Array.from({ length: 5 }, () =>
        submitFormResponse(
          form.formId,
          answersFor(form.questions),
          ADMINS,
          TestUser.SPACE_MEMBER
        )
      )
    );

    const stored = attempts.filter(a => !a.error);
    const rejected = attempts.filter(a => a.error);
    expect(stored).toHaveLength(1);
    expect(rejected).toHaveLength(4);
    for (const attempt of rejected) {
      expect(errorCode(attempt)).toBe('FORM_RESPONSE_ALREADY_EXISTS');
    }
    expect(await totalSeenByAdmin(form)).toBe(1);
  });

  test('withdrawing lets the member respond again', async () => {
    const [existing] = await idsSeenByAdmin(form);
    const withdrawn = await deleteFormResponse(existing, TestUser.SPACE_MEMBER);
    expect(withdrawn.error).toBeUndefined();
    expect(await totalSeenByAdmin(form)).toBe(0);

    const again = await respond(form, ADMINS);

    expect(again).toBeDefined();
    expect(await totalSeenByAdmin(form)).toBe(1);
  });

  test('switching to MULTIPLE lets the same member respond a second time', async () => {
    const switched = await updateCalloutForm(form.formId, {
      settings: { responseMode: MULTIPLE },
    });
    expect(switched.error).toBeUndefined();

    await respond(form, ADMINS);

    const view = responsesView(
      await getFormResponses(form.formId, TestUser.SPACE_MEMBER)
    );
    expect(view.mine).toBe(2);
  });

  test('MULTIPLE back to SINGLE is blocked while a member holds two responses', async () => {
    const blocked = await updateCalloutForm(form.formId, {
      settings: { responseMode: SINGLE },
    });

    expect(errorCode(blocked)).toBe('FORM_RESPONSE_MODE_SWITCH_BLOCKED');
  });

  test('MULTIPLE back to SINGLE is allowed once the member holds only one', async () => {
    const mine =
      (await getFormResponses(form.formId, TestUser.SPACE_MEMBER)).data?.lookup
        .calloutFormResponses.mine ?? [];
    const withdrawn = await deleteFormResponse(
      mine[0].id,
      TestUser.SPACE_MEMBER
    );
    expect(withdrawn.error).toBeUndefined();

    const allowed = await updateCalloutForm(form.formId, {
      settings: { responseMode: SINGLE },
    });

    expect(allowed.error).toBeUndefined();
    expect(allowed.data?.updateCalloutForm.settings.responseMode).toBe(SINGLE);
  });
});

describe('Form lifecycle — visibility changes', () => {
  test('widening ADMINS to MEMBERS is blocked once a response exists', async () => {
    const form = await newForm('widen', { visibility: ADMINS });
    await respond(form, ADMINS);

    const blocked = await updateCalloutForm(form.formId, {
      settings: { visibility: MEMBERS },
    });

    expect(errorCode(blocked)).toBe('FORM_VISIBILITY_WIDENING_BLOCKED');
  });

  test('positive control: the same widening is allowed while the Form has no response', async () => {
    const form = await newForm('widen-empty', { visibility: ADMINS });

    const allowed = await updateCalloutForm(form.formId, {
      settings: { visibility: MEMBERS },
    });

    expect(allowed.error).toBeUndefined();
    expect(allowed.data?.updateCalloutForm.settings.visibility).toBe(MEMBERS);
  });

  test('narrowing MEMBERS to ADMINS is allowed even with responses', async () => {
    const form = await newForm('narrow', { visibility: MEMBERS });
    await respond(form, MEMBERS);

    const allowed = await updateCalloutForm(form.formId, {
      settings: { visibility: ADMINS },
    });

    expect(allowed.error).toBeUndefined();
    expect(allowed.data?.updateCalloutForm.settings.visibility).toBe(ADMINS);
  });
});

describe('Form lifecycle — editing the definition under existing responses', () => {
  test('a question type can change on a Form without responses', async () => {
    const form = await newForm('type-fresh');
    const changed = questionsAsUpdate(form.questions).map((question, index) =>
      index === 0
        ? { ...question, type: CalloutFormQuestionType.LongText }
        : question
    );

    const result = await updateCalloutForm(form.formId, { questions: changed });

    expect(result.error).toBeUndefined();
    expect(result.data?.updateCalloutForm.questions[0].type).toBe(
      CalloutFormQuestionType.LongText
    );
  });

  test('a question type is locked once a response exists', async () => {
    const form = await newForm('type-locked');
    await respond(form, ADMINS);
    const changed = questionsAsUpdate(form.questions).map((question, index) =>
      index === 1
        ? { ...question, type: CalloutFormQuestionType.ShortText }
        : question
    );

    const result = await updateCalloutForm(form.formId, { questions: changed });

    expect(errorCode(result)).toBe('FORM_QUESTION_TYPE_LOCKED');
  });

  test('removing an answered question keeps its snapshot in the old response', async () => {
    const form = await newForm('remove-answered');
    const responseId = await respond(form, ADMINS);
    const removed = form.questions[3];
    const remaining = questionsAsUpdate(form.questions).filter(
      question => question.id !== removed.id
    );

    const updated = await updateCalloutForm(form.formId, {
      questions: remaining,
    });
    expect(updated.error).toBeUndefined();
    expect(updated.data?.updateCalloutForm.questions).toHaveLength(3);

    const view = await getFormResponses(form.formId, TestUser.SPACE_ADMIN);
    const response = view.data?.lookup.calloutFormResponses.all.responses.find(
      r => r.id === responseId
    );
    const snapshot = response?.answers.find(a => a.questionID === removed.id);
    expect(snapshot?.prompt).toBe(removed.prompt);
    expect(snapshot?.selectedOptions?.map(o => o.label)).toEqual(
      removed.options?.slice(0, 2).map(o => o.label)
    );
  });

  test('toggling required is allowed with responses', async () => {
    const form = await newForm('required-toggle');
    await respond(form, ADMINS);
    const toggled = questionsAsUpdate(form.questions).map((question, index) =>
      index === 1 ? { ...question, required: true } : question
    );

    const result = await updateCalloutForm(form.formId, { questions: toggled });

    expect(result.error).toBeUndefined();
    expect(result.data?.updateCalloutForm.questions[1].required).toBe(true);
  });

  test('a plain member cannot edit the definition', async () => {
    const form = await newForm('member-edit');

    const result = await updateCalloutForm(
      form.formId,
      { settings: { state: CalloutFormState.Closed } },
      TestUser.SPACE_MEMBER
    );

    expect(isDenied(result)).toBe(true);
  });
});

describe('Form lifecycle — closing and reopening', () => {
  test('a closed Form still lets the author withdraw, rejects new responses, and accepts them again once reopened', async () => {
    const form = await newForm('close-reopen', { responseMode: SINGLE });
    const responseId = await respond(form, ADMINS);

    const closed = await updateCalloutForm(form.formId, {
      settings: { state: CalloutFormState.Closed },
    });
    expect(closed.error).toBeUndefined();

    const withdrawn = await deleteFormResponse(
      responseId,
      TestUser.SPACE_MEMBER
    );
    expect(withdrawn.error).toBeUndefined();

    const rejected = await submitFormResponse(
      form.formId,
      answersFor(form.questions),
      ADMINS,
      TestUser.SPACE_MEMBER
    );
    expect(errorCode(rejected)).toBe('FORM_CLOSED');

    const reopened = await updateCalloutForm(form.formId, {
      settings: { state: CalloutFormState.Open },
    });
    expect(reopened.error).toBeUndefined();

    expect(await respond(form, ADMINS)).toBeDefined();
  });
});

describe('Form lifecycle — deleting the Post', () => {
  test('the responses lookup fails once the Post is gone', async () => {
    const form = await newForm('delete-post');
    await respond(form, ADMINS);
    // Positive control: the lookup works and sees the response before deletion.
    expect(await totalSeenByAdmin(form)).toBe(1);

    const deleted = await deleteCallout(form.calloutId);
    expect(deleted.error).toBeUndefined();

    const after = await getFormResponses(form.formId, TestUser.GLOBAL_ADMIN);
    expect(after.error).toBeDefined();
    expect(after.data?.lookup?.calloutFormResponses).toBeUndefined();
  });

  test.skipIf(!harnessPostgresConfigured())(
    'the response rows are removed with the Post',
    async () => {
      const form = await newForm('delete-rows');
      await respond(form, ADMINS);
      const count = async () =>
        (
          await queryHarnessDb<{ n: number }>(
            'SELECT count(*)::int AS n FROM callout_form_response WHERE "formId" = $1',
            [form.formId]
          )
        )[0].n;
      expect(await count()).toBe(1);

      const deleted = await deleteCallout(form.calloutId);
      expect(deleted.error).toBeUndefined();

      expect(await count()).toBe(0);
    }
  );
});

describe('Form lifecycle — who may delete which response', () => {
  let form: FormCallout;
  let responseId: string;
  let exAdminForm: FormCallout;

  beforeAll(async () => {
    form = await newForm('moderation', {
      visibility: MEMBERS,
      responseMode: MULTIPLE,
    });
    responseId = await respond(form, MEMBERS);

    // Created while an admin, then demoted before the cases run.
    exAdminForm = await newForm(
      'ex-admin',
      { visibility: MEMBERS, responseMode: MULTIPLE },
      TestUser.SUBSUBSPACE_ADMIN
    );
    const demoted = await removeRoleFromUser(
      TestUserManager.users.subsubspaceAdmin.id,
      roleSetId(),
      RoleName.Admin
    );
    expect(demoted.error).toBeUndefined();
  });

  const stillThere = async () =>
    (await idsSeenByAdmin(form)).includes(responseId);

  test('positive control: the response exists and the admin sees it', async () => {
    expect(await stillThere()).toBe(true);
  });

  test.each([
    {
      who: 'a member of the unrelated space (admin there)',
      user: TestUser.NON_SPACE_MEMBER,
    },
    {
      who: 'another member under MEMBERS visibility',
      user: TestUser.SUBSPACE_MEMBER,
    },
    { who: 'the ex-admin creator', user: TestUser.SUBSUBSPACE_ADMIN },
    {
      who: 'Global Support where support-as-admin is off',
      user: TestUser.GLOBAL_SUPPORT_ADMIN,
    },
  ])('$who cannot delete or withdraw it', async ({ user }) => {
    const attempt = await deleteFormResponse(responseId, user);

    expect(isDenied(attempt)).toBe(true);
    expect(await stillThere()).toBe(true);
  });

  test('the ex-admin creator cannot delete a response on their own Form either', async () => {
    const otherResponse = await respond(exAdminForm, MEMBERS);

    const attempt = await deleteFormResponse(
      otherResponse,
      TestUser.SUBSUBSPACE_ADMIN
    );

    expect(isDenied(attempt)).toBe(true);
    expect(await totalSeenByAdmin(exAdminForm)).toBe(1);
  });

  test('the parent space admin can delete it', async () => {
    const attempt = await deleteFormResponse(responseId, TestUser.SPACE_ADMIN);

    expect(attempt.error).toBeUndefined();
    expect(await stillThere()).toBe(false);
  });

  test('Global Admin can delete a response too', async () => {
    const fresh = await respond(form, MEMBERS);

    const attempt = await deleteFormResponse(fresh, TestUser.GLOBAL_ADMIN);

    expect(attempt.error).toBeUndefined();
    expect((await idsSeenByAdmin(form)).includes(fresh)).toBe(false);
  });
});

describe('Form lifecycle — an account deleted after responding', () => {
  test('the response stays with its answers and no author', async () => {
    const form = await newForm('deleted-author', { visibility: MEMBERS });
    const disposable = await createDisposableVerifiedUser('form-author');
    try {
      const granted = await assignRoleToUser(
        disposable.userId,
        roleSetId(),
        RoleName.Member
      );
      expect(granted.error).toBeUndefined();

      const submitted = await submitFormResponseWithBearer(
        form.formId,
        answersFor(form.questions),
        MEMBERS,
        disposable.token
      );
      const responseId = submitted.body.data?.submitCalloutFormResponse.id;
      expect(responseId).toBeDefined();

      const before = (
        await getFormResponses(form.formId, TestUser.GLOBAL_ADMIN)
      ).data?.lookup.calloutFormResponses.all.responses.find(
        r => r.id === responseId
      );
      // Positive control: while the account exists the response names its author.
      expect(before?.createdBy?.id).toBe(disposable.userId);

      const deleted = await deleteUserWithOptions(disposable.userId, {
        deleteIdentity: true,
      });
      expect(deleted.error).toBeUndefined();

      const after = (
        await getFormResponses(form.formId, TestUser.GLOBAL_ADMIN)
      ).data?.lookup.calloutFormResponses.all.responses.find(
        r => r.id === responseId
      );
      expect(after).toBeDefined();
      expect(after?.createdBy).toBeNull();
      expect(after?.answers).toEqual(before?.answers);
    } finally {
      await deleteUserTolerant(disposable.userId);
    }
  });
});
