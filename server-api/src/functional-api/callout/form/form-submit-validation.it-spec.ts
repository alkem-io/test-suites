import {
  TestScenarioConfig,
  TestScenarioFactory,
  TestUser,
  UniqueIDGenerator,
} from '@alkemio/tests-lib';
import {
  CalloutFormAnswerInput,
  CalloutFormQuestionType,
  CalloutFormResponseMode,
  CalloutFormResponseVisibility,
  CalloutFormState,
  CreateCalloutFormQuestionInput,
} from '@alkemio/tests-lib/core/generated/alkemio-schema';
import { OrganizationWithSpaceModel } from '@alkemio/tests-lib/scenario/models/OrganizationWithSpaceModel';
import { randomUUID } from 'crypto';
import {
  answersFor,
  createFormCallout,
  createFormCalloutRaw,
  errorCode,
  errorText,
  FormCallout,
  getFormResponses,
  isDenied,
  responsesView,
  submitFormResponse,
  submitFormResponseAnonymous,
  uniqueFormName,
  updateCalloutForm,
} from './form.request.params';

/**
 * Submit-side and definition-side validation of the Form framing. Every
 * rejection is asserted on its stable reason code (`extensions.details.code`)
 * and never on the message, and every submit rejection also proves the
 * submitted text is not echoed back in the error.
 */

const uniqueId = UniqueIDGenerator.getID();
const MARKER = `secret-answer-${uniqueId}`;

const scenarioConfig: TestScenarioConfig = {
  name: 'form-submit-validation',
  space: {
    collaboration: {
      addPostCallout: false,
      addPostCollectionCallout: false,
      addWhiteboardCallout: false,
      addTutorialCallouts: false,
    },
    community: {
      admins: [TestUser.SPACE_ADMIN],
      // SUBSUBSPACE_MEMBER holds the earlier response of the R19b race variant.
      members: [
        TestUser.SPACE_MEMBER,
        TestUser.SPACE_ADMIN,
        TestUser.SUBSUBSPACE_MEMBER,
      ],
    },
  },
};

const ADMINS = CalloutFormResponseVisibility.Admins;
const MEMBERS = CalloutFormResponseVisibility.Members;

let baseScenario: OrganizationWithSpaceModel;
let form: FormCallout; // the four default questions, MULTIPLE so valid submits can repeat
let choiceForm: FormCallout; // a required single choice and a required multiple choice

const setId = () => baseScenario.space.collaboration.calloutsSetId;

const choiceQuestions = (): CreateCalloutFormQuestionInput[] => [
  {
    prompt: 'Required single',
    type: CalloutFormQuestionType.SingleChoice,
    required: true,
    options: [{ label: 'Red' }, { label: 'Green' }, { label: 'Blue' }],
  },
  {
    prompt: 'Required multiple',
    type: CalloutFormQuestionType.MultipleChoice,
    required: true,
    options: [{ label: 'North' }, { label: 'South' }, { label: 'East' }],
  },
];

/** A valid answer set where every text answer carries the marker. */
const markedAnswers = (
  target: FormCallout,
  overrides: Parameters<typeof answersFor>[1] = {}
): CalloutFormAnswerInput[] => {
  const marked: Parameters<typeof answersFor>[1] = {};
  target.questions.forEach((question, index) => {
    if (
      question.type === CalloutFormQuestionType.ShortText ||
      question.type === CalloutFormQuestionType.LongText
    ) {
      marked[index] = { text: MARKER };
    }
  });
  return answersFor(target.questions, { ...marked, ...overrides });
};

const submit = (
  target: FormCallout,
  answers: CalloutFormAnswerInput[],
  visibility = ADMINS,
  user: TestUser = TestUser.SPACE_MEMBER
) => submitFormResponse(target.formId, answers, visibility, user);

const astral = (codePoints: number) => '😀'.repeat(codePoints);

beforeAll(async () => {
  baseScenario = await TestScenarioFactory.createBaseScenario(scenarioConfig);
  form = await createFormCallout(setId(), {
    displayName: uniqueFormName(`validation-${uniqueId}`),
    settings: { responseMode: CalloutFormResponseMode.Multiple },
  });
  choiceForm = await createFormCallout(setId(), {
    displayName: uniqueFormName(`choices-${uniqueId}`),
    questions: choiceQuestions(),
    settings: { responseMode: CalloutFormResponseMode.Multiple },
  });
});

afterAll(async () => {
  await TestScenarioFactory.cleanUpBaseScenario(baseScenario);
});

describe('Form submit — the positive control', () => {
  test('a fully valid submission stores snapshots with the prompts and option labels', async () => {
    const result = await submit(form, markedAnswers(form));

    expect(result.error).toBeUndefined();
    const answers = result.data?.submitCalloutFormResponse.answers ?? [];
    expect(answers).toHaveLength(form.questions.length);
    for (const question of form.questions) {
      const answer = answers.find(a => a.questionID === question.id);
      expect(answer?.prompt).toBe(question.prompt);
      expect(answer?.type).toBe(question.type);
    }
    const single = answers.find(a => a.questionID === form.questions[2].id);
    expect(single?.selectedOptions?.map(o => o.label)).toEqual([
      form.questions[2].options?.[0].label,
    ]);
    const multiple = answers.find(a => a.questionID === form.questions[3].id);
    expect(multiple?.selectedOptions?.map(o => o.label)).toEqual(
      form.questions[3].options?.slice(0, 2).map(o => o.label)
    );
  });

  test('a response with only the required answer is accepted', async () => {
    const result = await submit(
      form,
      answersFor(form.questions, { 1: null, 2: null, 3: null })
    );

    expect(result.error).toBeUndefined();
    expect(result.data?.submitCalloutFormResponse.answers).toHaveLength(1);
  });
});

describe('Form submit — answer validation', () => {
  const cases: {
    name: string;
    target: () => FormCallout;
    answers: () => CalloutFormAnswerInput[];
    code: string;
  }[] = [
    {
      name: 'required short text is empty',
      target: () => form,
      answers: () => markedAnswers(form, { 0: { text: '' } }),
      code: 'FORM_ANSWER_REQUIRED',
    },
    {
      name: 'required short text is whitespace only',
      target: () => form,
      answers: () => markedAnswers(form, { 0: { text: '   \t ' } }),
      code: 'FORM_ANSWER_REQUIRED',
    },
    {
      name: 'required short text is not answered at all',
      target: () => form,
      answers: () => markedAnswers(form, { 0: null }),
      code: 'FORM_ANSWER_REQUIRED',
    },
    {
      name: 'required single choice has no selection',
      target: () => choiceForm,
      answers: () =>
        markedAnswers(choiceForm, { 0: { selectedOptionIDs: [] } }),
      code: 'FORM_ANSWER_REQUIRED',
    },
    {
      name: 'required single choice is not answered at all',
      target: () => choiceForm,
      answers: () => markedAnswers(choiceForm, { 0: null }),
      code: 'FORM_ANSWER_REQUIRED',
    },
    {
      name: 'required multiple choice has an empty selection',
      target: () => choiceForm,
      answers: () =>
        markedAnswers(choiceForm, { 1: { selectedOptionIDs: [] } }),
      code: 'FORM_ANSWER_REQUIRED',
    },
    {
      name: 'short text is 513 characters',
      target: () => form,
      answers: () =>
        markedAnswers(form, {
          0: { text: MARKER + 'x'.repeat(513 - MARKER.length) },
        }),
      code: 'FORM_ANSWER_TOO_LONG',
    },
    {
      name: 'long text is 2049 characters',
      target: () => form,
      answers: () =>
        markedAnswers(form, {
          1: { text: MARKER + 'x'.repeat(2049 - MARKER.length) },
        }),
      code: 'FORM_ANSWER_TOO_LONG',
    },
    {
      name: 'short text of 257 astral characters is 514 UTF-16 units',
      target: () => form,
      answers: () => markedAnswers(form, { 0: { text: astral(257) } }),
      code: 'FORM_ANSWER_TOO_LONG',
    },
    {
      name: 'an answer refers to an unknown question',
      target: () => form,
      answers: () => [
        ...markedAnswers(form),
        { questionID: randomUUID(), text: MARKER },
      ],
      code: 'FORM_ANSWER_UNKNOWN_QUESTION',
    },
    {
      name: 'the same question is answered twice',
      target: () => form,
      answers: () => [
        ...markedAnswers(form),
        { questionID: form.questions[0].id, text: MARKER },
      ],
      code: 'FORM_ANSWER_DUPLICATE_QUESTION',
    },
    {
      name: 'text is given for a choice question',
      target: () => form,
      answers: () =>
        markedAnswers(form, {
          2: { selectedOptionIDs: undefined, text: MARKER },
        }),
      code: 'FORM_ANSWER_TYPE_MISMATCH',
    },
    {
      name: 'option ids are given for a text question',
      target: () => form,
      answers: () =>
        markedAnswers(form, {
          1: {
            text: undefined,
            selectedOptionIDs: [form.questions[2].options?.[0].id ?? ''],
          },
        }),
      code: 'FORM_ANSWER_TYPE_MISMATCH',
    },
    {
      name: 'an option id belongs to another question',
      target: () => form,
      answers: () =>
        markedAnswers(form, {
          2: { selectedOptionIDs: [form.questions[3].options?.[0].id ?? ''] },
        }),
      code: 'FORM_ANSWER_INVALID_OPTION',
    },
    {
      name: 'an option id does not exist at all',
      target: () => form,
      answers: () =>
        markedAnswers(form, { 2: { selectedOptionIDs: [randomUUID()] } }),
      code: 'FORM_ANSWER_INVALID_OPTION',
    },
    {
      name: 'two options are picked on a single choice question',
      target: () => form,
      answers: () =>
        markedAnswers(form, {
          2: {
            selectedOptionIDs: (form.questions[2].options ?? [])
              .slice(0, 2)
              .map(o => o.id),
          },
        }),
      code: 'FORM_ANSWER_SELECTION_COUNT',
    },
    {
      name: 'the same option is picked twice on a multiple choice question',
      target: () => form,
      answers: () => {
        const optionId = form.questions[3].options?.[0].id ?? '';
        return markedAnswers(form, {
          3: { selectedOptionIDs: [optionId, optionId] },
        });
      },
      code: 'FORM_ANSWER_SELECTION_COUNT',
    },
  ];

  test.each(cases)('rejects: $name', async ({ target, answers, code }) => {
    const result = await submit(target(), answers());

    expect(errorCode(result)).toBe(code);
    // The reason code carries no answer: the submitted text is never echoed.
    expect(errorText(result)).not.toContain(MARKER);
  });

  test.each([
    { name: '512 short-text characters', question: 0, text: 'a'.repeat(512) },
    { name: '2048 long-text characters', question: 1, text: 'b'.repeat(2048) },
    {
      name: '256 astral characters (512 UTF-16 units) of short text',
      question: 0,
      text: astral(256),
    },
    {
      name: '1024 astral characters (2048 UTF-16 units) of long text',
      question: 1,
      text: astral(1024),
    },
  ])('accepts exactly $name', async ({ question, text }) => {
    const result = await submit(
      form,
      markedAnswers(form, { [question]: { text } })
    );

    expect(result.error).toBeUndefined();
    const stored = result.data?.submitCalloutFormResponse.answers.find(
      answer => answer.questionID === form.questions[question].id
    );
    expect(stored?.text).toBe(text);
  });
});

describe('Form submit — state and access', () => {
  test('a DRAFT callout rejects responses', async () => {
    const draft = await createFormCallout(setId(), {
      displayName: uniqueFormName(`draft-${uniqueId}`),
      publish: false,
    });

    const result = await submit(
      draft,
      markedAnswers(draft),
      ADMINS,
      TestUser.SPACE_ADMIN
    );

    expect(errorCode(result)).toBe('CALLOUT_NOT_PUBLISHED');
  });

  test('a closed Form rejects responses', async () => {
    const closed = await createFormCallout(setId(), {
      displayName: uniqueFormName(`closed-${uniqueId}`),
      settings: { state: CalloutFormState.Closed },
    });

    const result = await submit(closed, markedAnswers(closed));

    expect(errorCode(result)).toBe('FORM_CLOSED');
  });

  test('a user without CONTRIBUTE on the Post is forbidden', async () => {
    const result = await submit(
      form,
      markedAnswers(form),
      ADMINS,
      TestUser.NON_SPACE_MEMBER
    );

    expect(isDenied(result)).toBe(true);
    expect(errorText(result)).not.toContain(MARKER);
  });

  test('an anonymous caller is forbidden', async () => {
    const result = await submitFormResponseAnonymous(
      form.formId,
      markedAnswers(form),
      ADMINS
    );

    expect(isDenied(result)).toBe(true);
    expect(result.body.data?.submitCalloutFormResponse).toBeFalsy();
  });
});

describe('Form submit — the acknowledged visibility', () => {
  test('a widened Form rejects a response acknowledged against the old audience', async () => {
    const widening = await createFormCallout(setId(), {
      displayName: uniqueFormName(`widen-${uniqueId}`),
      settings: { visibility: ADMINS },
    });
    const widened = await updateCalloutForm(widening.formId, {
      settings: { visibility: MEMBERS },
    });
    expect(widened.error).toBeUndefined();

    const stale = await submit(widening, markedAnswers(widening), ADMINS);
    expect(errorCode(stale)).toBe('FORM_VISIBILITY_CHANGED');

    const fresh = await submit(widening, markedAnswers(widening), MEMBERS);
    expect(fresh.error).toBeUndefined();
    expect(fresh.data?.submitCalloutFormResponse.id).toBeDefined();
  });

  // R19b: widening is no longer blocked once responses exist, so the same race
  // applies to a Form that already holds a response.
  test('a widened Form that already holds a response rejects a response acknowledged against the old audience', async () => {
    const widening = await createFormCallout(setId(), {
      displayName: uniqueFormName(`widen-answered-${uniqueId}`),
      settings: { visibility: ADMINS },
    });
    const earlier = await submit(
      widening,
      markedAnswers(widening),
      ADMINS,
      TestUser.SUBSUBSPACE_MEMBER
    );
    expect(earlier.error).toBeUndefined();
    const earlierId = earlier.data?.submitCalloutFormResponse.id;
    expect(earlierId).toBeDefined();

    // The member has the Form open under ADMINS; the admin now widens.
    const widened = await updateCalloutForm(widening.formId, {
      settings: { visibility: MEMBERS },
    });
    expect(widened.error).toBeUndefined();
    expect(errorCode(widened)).toBeUndefined();
    expect(widened.data?.updateCalloutForm.settings.visibility).toBe(MEMBERS);

    const stale = await submit(widening, markedAnswers(widening), ADMINS);
    expect(errorCode(stale)).toBe('FORM_VISIBILITY_CHANGED');
    expect(errorText(stale)).not.toContain(MARKER);

    const fresh = await submit(widening, markedAnswers(widening), MEMBERS);
    expect(fresh.error).toBeUndefined();
    expect(fresh.data?.submitCalloutFormResponse.id).toBeDefined();

    // Both responses are stored: the earlier one and the re-acknowledged one.
    const asAdmin = await getFormResponses(
      widening.formId,
      TestUser.SPACE_ADMIN
    );
    expect(responsesView(asAdmin).total).toBe(2);
    expect(
      asAdmin.data?.lookup.calloutFormResponses.all.responses.map(r => r.id)
    ).toEqual(
      expect.arrayContaining([
        earlierId,
        fresh.data?.submitCalloutFormResponse.id,
      ])
    );
  });

  test('a narrowed Form still accepts a response acknowledged against the wider audience', async () => {
    const narrowing = await createFormCallout(setId(), {
      displayName: uniqueFormName(`narrow-${uniqueId}`),
      settings: { visibility: MEMBERS },
    });
    const narrowed = await updateCalloutForm(narrowing.formId, {
      settings: { visibility: ADMINS },
    });
    expect(narrowed.error).toBeUndefined();

    const result = await submit(narrowing, markedAnswers(narrowing), MEMBERS);

    expect(result.error).toBeUndefined();
    expect(result.data?.submitCalloutFormResponse.id).toBeDefined();
  });
});

describe('Form definition — limits', () => {
  const shortQuestions = (count: number): CreateCalloutFormQuestionInput[] =>
    Array.from({ length: count }, (_, index) => ({
      prompt: `Question ${index}`,
      type: CalloutFormQuestionType.ShortText,
    }));

  const choiceWith = (labels: string[]): CreateCalloutFormQuestionInput[] => [
    {
      prompt: 'Choice',
      type: CalloutFormQuestionType.SingleChoice,
      options: labels.map(label => ({ label })),
    },
  ];

  const labels = (count: number) =>
    Array.from({ length: count }, (_, index) => `Option ${index}`);

  test.each([
    { name: '0 questions', questions: () => [], code: 'FORM_QUESTIONS_COUNT' },
    {
      name: '51 questions',
      questions: () => shortQuestions(51),
      code: 'FORM_QUESTIONS_COUNT',
    },
    {
      name: 'a choice question with 1 option',
      questions: () => choiceWith(labels(1)),
      code: 'FORM_OPTIONS_COUNT',
    },
    {
      name: 'a choice question with 21 options',
      questions: () => choiceWith(labels(21)),
      code: 'FORM_OPTIONS_COUNT',
    },
    {
      name: 'duplicate option labels',
      questions: () => choiceWith(['Same', 'Same']),
      code: 'FORM_OPTIONS_DUPLICATE',
    },
    {
      name: 'option labels that only differ by surrounding whitespace',
      questions: () => choiceWith(['Same', '  Same  ']),
      code: 'FORM_OPTIONS_DUPLICATE',
    },
  ])('a new Form with $name is rejected', async ({ questions, code }) => {
    const result = await createFormCalloutRaw(setId(), {
      displayName: uniqueFormName(`limits-${uniqueId}`),
      questions: questions(),
    });

    expect(errorCode(result)).toBe(code);
    expect(result.data).toBeUndefined();
  });

  test.each([
    { name: '50 questions', questions: () => shortQuestions(50) },
    {
      name: 'a choice question with 2 options',
      questions: () => choiceWith(labels(2)),
    },
    {
      name: 'a choice question with 20 options',
      questions: () => choiceWith(labels(20)),
    },
  ])(
    'boundary control: a new Form with $name is accepted',
    async ({ questions }) => {
      const result = await createFormCalloutRaw(setId(), {
        displayName: uniqueFormName(`limits-ok-${uniqueId}`),
        questions: questions(),
      });

      expect(result.error).toBeUndefined();
      expect(
        result.data?.createCalloutOnCalloutsSet.framing.form
      ).toBeDefined();
    }
  );

  test('an update that names an unknown question id is rejected', async () => {
    const result = await updateCalloutForm(form.formId, {
      questions: [
        {
          id: randomUUID(),
          prompt: 'Not one of ours',
          type: CalloutFormQuestionType.ShortText,
          required: false,
        },
      ],
    });

    expect(errorCode(result)).toBe('FORM_UNKNOWN_QUESTION_ID');
  });

  test('an update may not remove every question', async () => {
    const result = await updateCalloutForm(form.formId, { questions: [] });

    expect(errorCode(result)).toBe('FORM_QUESTIONS_COUNT');
  });
});
