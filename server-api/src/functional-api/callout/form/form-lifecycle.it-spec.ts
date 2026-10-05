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
  FormQuestion,
  getFormResponses,
  getSpaceSets,
  isForbiddenByPolicy,
  questionsAsUpdate,
  responsesView,
  submitFormResponse,
  submitFormResponseWithBearer,
  uniqueFormName,
  updateCalloutForm,
} from './form.request.params';

/**
 * Lifecycle, concurrency and moderation of the Form framing: what may change
 * while responses exist (since R19 — response mode, visibility and answer type
 * all stay editable), what the submit lock guarantees under parallel
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

/** The viewer's own responses from a lookup result. */
const mineOf = (result: Awaited<ReturnType<typeof getFormResponses>>) =>
  result.data?.lookup.calloutFormResponses.mine ?? [];

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

  // R19a: MULTIPLE -> SINGLE is always allowed and keeps every response; the
  // SINGLE check at submit ("holds any response") does the rest.
  test('MULTIPLE back to SINGLE is allowed while a member holds two responses, and keeps both', async () => {
    const before = await totalSeenByAdmin(form);

    const switched = await updateCalloutForm(form.formId, {
      settings: { responseMode: SINGLE },
    });

    expect(switched.error).toBeUndefined();
    expect(errorCode(switched)).toBeUndefined();
    expect(switched.data?.updateCalloutForm.settings.responseMode).toBe(SINGLE);
    expect(
      mineOf(await getFormResponses(form.formId, TestUser.SPACE_MEMBER))
    ).toHaveLength(2);
    expect(await totalSeenByAdmin(form)).toBe(before);
  });

  test('under SINGLE a member holding two responses cannot submit a third', async () => {
    const rejected = await submitFormResponse(
      form.formId,
      answersFor(form.questions),
      ADMINS,
      TestUser.SPACE_MEMBER
    );

    expect(errorCode(rejected)).toBe('FORM_RESPONSE_ALREADY_EXISTS');
    expect(
      mineOf(await getFormResponses(form.formId, TestUser.SPACE_MEMBER))
    ).toHaveLength(2);
  });

  test('withdrawing one of the two still blocks a new submit', async () => {
    const [first] = mineOf(
      await getFormResponses(form.formId, TestUser.SPACE_MEMBER)
    );
    const withdrawn = await deleteFormResponse(first.id, TestUser.SPACE_MEMBER);
    expect(withdrawn.error).toBeUndefined();

    const rejected = await submitFormResponse(
      form.formId,
      answersFor(form.questions),
      ADMINS,
      TestUser.SPACE_MEMBER
    );

    expect(errorCode(rejected)).toBe('FORM_RESPONSE_ALREADY_EXISTS');
    expect(
      mineOf(await getFormResponses(form.formId, TestUser.SPACE_MEMBER))
    ).toHaveLength(1);
  });

  test('withdrawing the last one lets the member submit exactly one again', async () => {
    const [last] = mineOf(
      await getFormResponses(form.formId, TestUser.SPACE_MEMBER)
    );
    const withdrawn = await deleteFormResponse(last.id, TestUser.SPACE_MEMBER);
    expect(withdrawn.error).toBeUndefined();

    expect(await respond(form, ADMINS)).toBeDefined();

    expect(
      mineOf(await getFormResponses(form.formId, TestUser.SPACE_MEMBER))
    ).toHaveLength(1);
  });
});

describe('Form lifecycle — visibility changes', () => {
  // R19b: visibility changes freely in both directions and the current
  // setting applies to every response, past and future. SUBSPACE_MEMBER is a
  // member of this (L0) space, so under MEMBERS it reads every response.
  test('widening ADMINS to MEMBERS with a response applies to that response; narrowing back takes it away', async () => {
    const form = await newForm('widen', { visibility: ADMINS });
    const responseId = await respond(form, ADMINS);
    const reader = TestUser.SUBSPACE_MEMBER;
    const readerSees = async () => {
      const result = await getFormResponses(form.formId, reader);
      return {
        canReadAll: result.data?.lookup.calloutFormResponses.canReadAll,
        ids:
          result.data?.lookup.calloutFormResponses.all.responses.map(
            r => r.id
          ) ?? [],
        total: result.data?.lookup.calloutFormResponses.all.total,
      };
    };

    // Before: the member reads only their own rows (none).
    expect(await readerSees()).toEqual({
      canReadAll: false,
      ids: [],
      total: 0,
    });

    const widened = await updateCalloutForm(form.formId, {
      settings: { visibility: MEMBERS },
    });
    expect(widened.error).toBeUndefined();
    expect(errorCode(widened)).toBeUndefined();
    expect(widened.data?.updateCalloutForm.settings.visibility).toBe(MEMBERS);

    // After: the earlier response, submitted under ADMINS, is now readable.
    expect(await readerSees()).toEqual({
      canReadAll: true,
      ids: [responseId],
      total: 1,
    });

    // Positive control: a registered user who is not a member of this space
    // still reads only their own rows after the widening.
    expect(
      responsesView(
        await getFormResponses(form.formId, TestUser.NON_SPACE_MEMBER)
      )
    ).toEqual({
      mine: 0,
      total: 0,
      listed: 0,
      canReadAll: false,
      canModerate: false,
    });

    const narrowed = await updateCalloutForm(form.formId, {
      settings: { visibility: ADMINS },
    });
    expect(narrowed.error).toBeUndefined();

    expect(await readerSees()).toEqual({
      canReadAll: false,
      ids: [],
      total: 0,
    });
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

  // R19c: the answer type can change at any time; stored answers keep their
  // snapshot (prompt, type, labels), new answers follow the new type.
  describe('answer type changes while responses exist', () => {
    let form: FormCallout;
    let responseId: string;

    const storedAnswer = async (questionID: string) => {
      const view = await getFormResponses(form.formId, TestUser.SPACE_ADMIN);
      return view.data?.lookup.calloutFormResponses.all.responses
        .find(r => r.id === responseId)
        ?.answers.find(a => a.questionID === questionID);
    };

    beforeAll(async () => {
      // MULTIPLE, so the new-type submissions below are not stopped by the
      // SINGLE check before the answers are validated.
      form = await newForm('type-change', { responseMode: MULTIPLE });
      responseId = await respond(form, ADMINS);
    });

    test('short text -> single choice with 2 options succeeds and the old answer keeps its text', async () => {
      const shortText = form.questions[0];
      const changed = questionsAsUpdate(form.questions).map(
        (question, index) =>
          index === 0
            ? {
                ...question,
                type: CalloutFormQuestionType.SingleChoice,
                options: [{ label: 'Yes' }, { label: 'No' }],
              }
            : question
      );

      const result = await updateCalloutForm(form.formId, {
        questions: changed,
      });

      expect(result.error).toBeUndefined();
      expect(errorCode(result)).toBeUndefined();
      const updated = result.data?.updateCalloutForm.questions ?? [];
      expect(updated[0].type).toBe(CalloutFormQuestionType.SingleChoice);
      expect(updated[0].options?.map(o => o.label)).toEqual(['Yes', 'No']);

      const answer = await storedAnswer(shortText.id);
      expect(answer?.type).toBe(CalloutFormQuestionType.ShortText);
      expect(answer?.text).toBe('a short answer');
      expect(answer?.prompt).toBe(shortText.prompt);
      expect(answer?.selectedOptions ?? []).toHaveLength(0);

      form = { ...form, questions: updated as FormQuestion[] };
    });

    test('a new submission must now answer that question with option ids', async () => {
      const mismatch = await submitFormResponse(
        form.formId,
        answersFor(form.questions, {
          0: { text: 'a short answer', selectedOptionIDs: undefined },
        }),
        ADMINS,
        TestUser.SPACE_MEMBER
      );
      expect(errorCode(mismatch)).toBe('FORM_ANSWER_TYPE_MISMATCH');

      // Positive control: the same submission with an option id is stored.
      const stored = await submitFormResponse(
        form.formId,
        answersFor(form.questions),
        ADMINS,
        TestUser.SPACE_MEMBER
      );
      expect(stored.error).toBeUndefined();
      const answer = stored.data?.submitCalloutFormResponse.answers.find(
        a => a.questionID === form.questions[0].id
      );
      expect(answer?.type).toBe(CalloutFormQuestionType.SingleChoice);
      expect(answer?.selectedOptions?.map(o => o.label)).toEqual(['Yes']);
    });

    test('single choice -> long text is rejected while options are still sent', async () => {
      const changed = questionsAsUpdate(form.questions).map(
        (question, index) =>
          index === 2
            ? { ...question, type: CalloutFormQuestionType.LongText }
            : question
      );

      const result = await updateCalloutForm(form.formId, {
        questions: changed,
      });

      expect(errorCode(result)).toBe('FORM_OPTIONS_COUNT');
    });

    test('single choice -> long text without options succeeds and the old answer keeps its option label', async () => {
      const singleChoice = form.questions[2];
      const changed = questionsAsUpdate(form.questions).map(
        (question, index) =>
          index === 2
            ? {
                ...question,
                type: CalloutFormQuestionType.LongText,
                options: undefined,
              }
            : question
      );

      const result = await updateCalloutForm(form.formId, {
        questions: changed,
      });

      expect(result.error).toBeUndefined();
      const updated = result.data?.updateCalloutForm.questions ?? [];
      expect(updated[2].type).toBe(CalloutFormQuestionType.LongText);

      const answer = await storedAnswer(singleChoice.id);
      expect(answer?.type).toBe(CalloutFormQuestionType.SingleChoice);
      expect(answer?.prompt).toBe(singleChoice.prompt);
      expect(answer?.selectedOptions?.map(o => o.label)).toEqual([
        singleChoice.options?.[0]?.label,
      ]);

      form = { ...form, questions: updated as FormQuestion[] };
    });

    test('text -> choice with a single option is rejected', async () => {
      const changed = questionsAsUpdate(form.questions).map(
        (question, index) =>
          index === 1
            ? {
                ...question,
                type: CalloutFormQuestionType.SingleChoice,
                options: [{ label: 'Only' }],
              }
            : question
      );

      const result = await updateCalloutForm(form.formId, {
        questions: changed,
      });

      expect(errorCode(result)).toBe('FORM_OPTIONS_COUNT');
    });
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

  test('toggling required is allowed with responses and binds new submissions only', async () => {
    const form = await newForm('required-toggle');
    const existing = await respond(form, ADMINS);
    const toggled = questionsAsUpdate(form.questions).map((question, index) =>
      index === 1 ? { ...question, required: true } : question
    );

    const result = await updateCalloutForm(form.formId, { questions: toggled });

    expect(result.error).toBeUndefined();
    expect(result.data?.updateCalloutForm.questions[1].required).toBe(true);
    // R9: a new submission must now answer the question ...
    const missing = await submitFormResponse(
      form.formId,
      answersFor(form.questions, { 1: null }),
      ADMINS,
      TestUser.SUBSPACE_MEMBER
    );
    expect(errorCode(missing)).toBe('FORM_ANSWER_REQUIRED');
    // ... while the response collected before the toggle is untouched.
    expect(await idsSeenByAdmin(form)).toEqual([existing]);
  });

  test('a plain member cannot edit the definition', async () => {
    const form = await newForm('member-edit');

    const result = await updateCalloutForm(
      form.formId,
      { settings: { state: CalloutFormState.Closed } },
      TestUser.SPACE_MEMBER
    );

    expect(isForbiddenByPolicy(result)).toBe(true);
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

    expect(isForbiddenByPolicy(attempt)).toBe(true);
    expect(await stillThere()).toBe(true);
  });

  test('the ex-admin creator cannot delete a response on their own Form either', async () => {
    const otherResponse = await respond(exAdminForm, MEMBERS);

    const attempt = await deleteFormResponse(
      otherResponse,
      TestUser.SUBSUBSPACE_ADMIN
    );

    expect(isForbiddenByPolicy(attempt)).toBe(true);
    expect(await totalSeenByAdmin(exAdminForm)).toBe(1);
  });

  test('the ex-admin creator cannot delete their Form Post, and so its responses', async () => {
    const attempt = await deleteCallout(
      exAdminForm.calloutId,
      TestUser.SUBSUBSPACE_ADMIN
    );

    expect(isForbiddenByPolicy(attempt)).toBe(true);
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
