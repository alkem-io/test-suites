import {
  TestScenarioConfig,
  TestScenarioFactory,
  TestUser,
} from '@alkemio/tests-lib';
import {
  CalloutContributionType,
  CalloutFormDetailsFragment,
  CalloutFormResponseMode,
  CalloutFormResponseVisibility,
  CalloutFormState,
  CalloutFramingType,
  PollResultsDetail,
  PollResultsVisibility,
} from '@alkemio/tests-lib/core/generated/alkemio-schema';
import { OrganizationWithSpaceModel } from '@alkemio/tests-lib/scenario/models/OrganizationWithSpaceModel';
import { deleteTemplate } from '../template.request.params';
import {
  answersFor,
  createFormCallout,
  defaultFormQuestions,
  errorClass,
  errorCode,
  FormQuestion,
  isForbiddenByPolicy,
  questionsAsUpdate,
  submitFormResponse,
  updateCalloutForm,
} from '../../callout/form/form.request.params';
import {
  createCalloutTemplateWithFraming,
  FormDefinitionInput,
  formCalloutData,
  formShape,
  getTemplateCalloutFraming,
  PollDefinitionInput,
  pollCalloutData,
  pollShape,
  uniqueTemplateName,
} from '../poll-form-template.request.params';

/**
 * workspace#080, ruling R25 (server#6435) — US5-AS1/AS2/AS5/AS6, FR-025–FR-027b.
 *
 * A callout template may carry a Poll or a Form. The template keeps the
 * definition only: a template Form is never respondable
 * (`FORM_TEMPLATE_NOT_RESPONDABLE`) and its definition is edited by whoever may
 * update the template callout. Every negative is paired with a positive control
 * that runs the same operation on a live callout (or by an authorized persona)
 * and succeeds.
 */

const scenarioConfig: TestScenarioConfig = {
  name: 'r25-callout-templates',
  space: {
    collaboration: {
      addPostCallout: false,
      addPostCollectionCallout: false,
      addWhiteboardCallout: false,
      addTutorialCallouts: false,
    },
    community: {
      admins: [TestUser.SPACE_ADMIN],
      members: [TestUser.SPACE_MEMBER, TestUser.SPACE_ADMIN],
    },
  },
};

let baseScenario: OrganizationWithSpaceModel;
const templateIds: string[] = [];

const POLL: PollDefinitionInput = {
  title: 'Which colour for the logo?',
  options: ['Red', 'Green', 'Blue', 'Yellow'],
  settings: {
    minResponses: 1,
    maxResponses: 2,
    resultsVisibility: PollResultsVisibility.TotalOnly,
    resultsDetail: PollResultsDetail.Count,
    allowContributorsAddOptions: true,
  },
};

// Every setting but `state` is a non-default, so "copied" can never be
// "defaulted"; OPEN is the default, and CLOSED is pinned by the edit case below.
const FORM: FormDefinitionInput = {
  title: 'Intake form',
  description: 'Tell us about your project',
  questions: defaultFormQuestions(),
  settings: {
    visibility: CalloutFormResponseVisibility.Members,
    responseMode: CalloutFormResponseMode.Multiple,
    state: CalloutFormState.Open,
    defaultCollapsed: true,
  },
};

const expectedPollShape = {
  title: POLL.title,
  options: POLL.options,
  settings: POLL.settings,
};

const expectedFormShape = {
  title: FORM.title,
  description: FORM.description,
  questions: FORM.questions.map(question => ({
    prompt: question.prompt,
    explanation: question.explanation ?? null,
    type: question.type,
    required: question.required,
    options: (question.options ?? []).map(option => option.label),
  })),
  settings: FORM.settings,
};

const templatesSetId = () => baseScenario.space.templateSetId;

const createFormTemplate = async (
  tag: string,
  userRole: TestUser = TestUser.GLOBAL_ADMIN,
  contributionTypes?: CalloutContributionType[]
): Promise<{ templateId: string; form: CalloutFormDetailsFragment }> => {
  const created = await createCalloutTemplateWithFraming(
    templatesSetId(),
    uniqueTemplateName(tag),
    formCalloutData(uniqueTemplateName(`${tag}-post`), FORM, contributionTypes),
    userRole
  );
  const template = created.data?.createTemplate;
  const form = template?.callout?.framing.form;
  if (!template || !form) {
    throw new Error(
      `creating a Form callout template failed for ${userRole}: ${JSON.stringify(
        created.error?.errors ?? created
      )}`
    );
  }
  templateIds.push(template.id);
  return { templateId: template.id, form };
};

beforeAll(async () => {
  baseScenario = await TestScenarioFactory.createBaseScenario(scenarioConfig);
});

afterAll(async () => {
  for (const id of templateIds) {
    await deleteTemplate(id);
  }
  await TestScenarioFactory.cleanUpBaseScenario(baseScenario);
});

describe('R25 — a callout template carries a Poll (US5-AS5, FR-027)', () => {
  test('createTemplate (CALLOUT) keeps the poll title, options in order and settings, with no votes', async () => {
    const created = await createCalloutTemplateWithFraming(
      templatesSetId(),
      uniqueTemplateName('poll-tpl'),
      pollCalloutData(uniqueTemplateName('poll-post'), POLL),
      TestUser.SPACE_ADMIN
    );

    expect(created.error).toBeUndefined();
    const templateId = created.data?.createTemplate.id ?? '';
    expect(templateId).not.toBe('');
    templateIds.push(templateId);

    // Read back through lookup: what was persisted, not what was echoed.
    const read = await getTemplateCalloutFraming(templateId);
    const callout = read.data?.lookup.template?.callout;
    expect(callout?.isTemplate).toBe(true);
    expect(callout?.framing.type).toBe(CalloutFramingType.Poll);
    const poll = callout?.framing.poll;
    expect(poll).toBeDefined();
    if (!poll) throw new Error('the template POLL callout carries no poll');
    expect(pollShape(poll)).toEqual(expectedPollShape);
    expect(poll.totalVotes).toBe(0);
  });
});

describe('R25 — a callout template carries a Form (US5-AS1/AS2, FR-025–FR-027)', () => {
  test('createTemplate (CALLOUT) keeps the Form title, description, questions (types, options, required) and settings', async () => {
    const { templateId, form: echoed } = await createFormTemplate(
      'form-tpl',
      TestUser.SPACE_ADMIN
    );
    expect(formShape(echoed)).toEqual(expectedFormShape);

    const read = await getTemplateCalloutFraming(templateId);
    const callout = read.data?.lookup.template?.callout;
    expect(callout?.isTemplate).toBe(true);
    expect(callout?.framing.type).toBe(CalloutFramingType.Form);
    const form = callout?.framing.form;
    expect(form).toBeDefined();
    if (!form) throw new Error('the template FORM callout carries no form');
    expect(formShape(form)).toEqual(expectedFormShape);
    expect(form.id).toBe(echoed.id);
  });
});

describe('R25 — a template Form never accepts responses (US5-AS6, FR-027b)', () => {
  let templateForm: CalloutFormDetailsFragment;

  beforeAll(async () => {
    // LINK contributions grant CONTRIBUTE to the template's creators, so the
    // submit passes the privilege check and reaches the template rule itself.
    templateForm = (
      await createFormTemplate('form-norespond', TestUser.GLOBAL_ADMIN, [
        CalloutContributionType.Link,
      ])
    ).form;
  });

  test('submitCalloutFormResponse on a callout template Form is refused with FORM_TEMPLATE_NOT_RESPONDABLE', async () => {
    const result = await submitFormResponse(
      templateForm.id,
      answersFor(templateForm.questions as FormQuestion[]),
      CalloutFormResponseVisibility.Members,
      TestUser.GLOBAL_ADMIN
    );

    expect(errorCode(result)).toBe('FORM_TEMPLATE_NOT_RESPONDABLE');
    expect(result.data).toBeUndefined();
  });

  test('positive control: the same definition on a live Post accepts the same answers from the same persona', async () => {
    const live = await createFormCallout(
      baseScenario.space.collaboration.calloutsSetId,
      {
        displayName: uniqueTemplateName('form-live'),
        title: FORM.title,
        description: FORM.description,
        questions: FORM.questions,
        settings: FORM.settings,
      }
    );

    const result = await submitFormResponse(
      live.formId,
      answersFor(live.questions),
      CalloutFormResponseVisibility.Members,
      TestUser.GLOBAL_ADMIN
    );

    expect(result.error).toBeUndefined();
    expect(result.data?.submitCalloutFormResponse.id).toBeDefined();
  });
});

describe('R25 — a template Form definition is edited by the template admin (FR-027b, R25d)', () => {
  let templateId: string;
  let templateForm: CalloutFormDetailsFragment;

  beforeAll(async () => {
    ({ templateId, form: templateForm } = await createFormTemplate(
      'form-edit',
      TestUser.SPACE_ADMIN
    ));
  });

  test('a space member (no UPDATE on the template) cannot edit the template Form, and it is left unchanged', async () => {
    const result = await updateCalloutForm(
      templateForm.id,
      { title: 'Hijacked title' },
      TestUser.SPACE_MEMBER
    );

    expect(isForbiddenByPolicy(result)).toBe(true);
    expect(result.data).toBeUndefined();
    const read = await getTemplateCalloutFraming(templateId);
    const form = read.data?.lookup.template?.callout?.framing.form;
    expect(form?.title).toBe(FORM.title);
  });

  test('positive control: the template admin (space admin) edits the title, a question and a setting', async () => {
    const questions = questionsAsUpdate(
      templateForm.questions as FormQuestion[]
    );
    questions[0] = { ...questions[0], prompt: 'What is your full name?' };

    const result = await updateCalloutForm(
      templateForm.id,
      {
        title: 'Intake form v2',
        questions,
        settings: { state: CalloutFormState.Closed },
      },
      TestUser.SPACE_ADMIN
    );

    expect(result.error).toBeUndefined();
    const read = await getTemplateCalloutFraming(templateId);
    const form = read.data?.lookup.template?.callout?.framing.form;
    expect(form?.title).toBe('Intake form v2');
    expect(form?.questions[0].prompt).toBe('What is your full name?');
    expect(form?.questions).toHaveLength(FORM.questions.length);
    expect(form?.settings.state).toBe(CalloutFormState.Closed);
  });
});

describe('R25 — a Form callout template is removed like any template (server#6435)', () => {
  test('deleteTemplate by the template admin removes the Form template: it can no longer be read', async () => {
    const { templateId, form } = await createFormTemplate(
      'form-delete',
      TestUser.SPACE_ADMIN
    );
    // Control: before the delete it reads back with its Form.
    const before = await getTemplateCalloutFraming(templateId);
    expect(before.data?.lookup.template?.callout?.framing.form?.id).toBe(
      form.id
    );

    const deleted = await deleteTemplate(templateId, TestUser.SPACE_ADMIN);
    expect(deleted.error).toBeUndefined();
    expect(deleted.data?.deleteTemplate.id).toBe(templateId);
    templateIds.splice(templateIds.indexOf(templateId), 1);

    const after = await getTemplateCalloutFraming(templateId);
    expect(errorClass(after)).toBe('ENTITY_NOT_FOUND');
    expect(after.data?.lookup.template?.callout).toBeUndefined();
  });
});
