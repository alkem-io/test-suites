import {
  TestScenarioConfig,
  TestScenarioFactory,
  TestUser,
} from '@alkemio/tests-lib';
import {
  CalloutContributionType,
  CalloutFormResponseMode,
  CalloutFormResponseVisibility,
  CalloutFormState,
  CalloutFramingType,
  CalloutVisibility,
  PollResultsDetail,
  PollResultsVisibility,
  PollStatus,
} from '@alkemio/tests-lib/core/generated/alkemio-schema';
import { OrganizationWithSpaceModel } from '@alkemio/tests-lib/scenario/models/OrganizationWithSpaceModel';
import { deleteSpace } from '../../journey/space/space.request.params';
import { updateCalloutVisibility } from '../../callout/callouts.request.params';
import {
  answersFor,
  createFormCallout,
  defaultFormQuestions,
  errorCode,
  FormCallout,
  FormQuestion,
  getFormResponses,
  responsesView,
  submitFormResponse,
} from '../../callout/form/form.request.params';
import { deleteTemplate } from '../template.request.params';
import {
  createTemplateFromSpace,
  updateCollaborationFromSpaceTemplate,
} from './space-template.request.params';
import {
  castPollVote,
  createPollCallout,
  createSpaceFromTemplate,
  createSpaceTemplateWithCallouts,
  createSubspaceFromTemplate,
  createTemplateFromContentSpace,
  formCalloutData,
  FormDefinitionInput,
  formIds,
  formShape,
  getCalloutsSetFramingDefinitions,
  getSpaceCalloutsSetId,
  getTemplateContentSpaceCallouts,
  getTemplateContentSpaceId,
  noneCalloutData,
  PollCallout,
  PollDefinitionInput,
  pollShape,
  uniqueTemplateName,
  updatePollStatus,
  updateTemplateFromSpace,
} from '../poll-form-template.request.params';

/**
 * workspace#080, ruling R25 (server#6435) — US5-AS3/AS5/AS6, FR-027/FR-027a/FR-027b.
 *
 * A space template made from a space that holds a voted Poll and an answered
 * Form keeps both DEFINITIONS and nothing else: no votes, no responses, no
 * poll status. A (sub)space created from that template — and a collaboration
 * updated from it — gets a Poll that is OPEN with no votes and a Form with
 * the same questions and settings, fresh question ids and an empty response
 * set. Only the template's callouts may carry a Form: a Form sent in the
 * create request itself stays refused (`FORM_FRAMING_NOT_ALLOWED`).
 */

const noCallouts = {
  addPostCallout: false,
  addPostCollectionCallout: false,
  addWhiteboardCallout: false,
  addTutorialCallouts: false,
};

const scenarioConfig: TestScenarioConfig = {
  name: 'r25-space-templates',
  space: {
    collaboration: noCallouts,
    community: {
      admins: [TestUser.SPACE_ADMIN],
      members: [
        TestUser.SPACE_MEMBER,
        TestUser.SPACE_ADMIN,
        TestUser.SUBSPACE_MEMBER,
      ],
    },
    subspace: {
      collaboration: noCallouts,
      community: {
        members: [TestUser.SUBSPACE_MEMBER],
      },
    },
  },
};

const POLL: PollDefinitionInput = {
  title: 'Where should we meet?',
  options: ['Amsterdam', 'Berlin', 'Copenhagen'],
  settings: {
    minResponses: 1,
    maxResponses: 2,
    resultsVisibility: PollResultsVisibility.Visible,
    resultsDetail: PollResultsDetail.Percentage,
    allowContributorsAddOptions: true,
  },
};

// Non-default settings except `state` (OPEN is the default); CLOSED_FORM
// below holds the other class of every setting.
const FORM: FormDefinitionInput = {
  title: 'Event registration',
  description: 'Register for the meetup',
  questions: defaultFormQuestions(),
  settings: {
    visibility: CalloutFormResponseVisibility.Members,
    responseMode: CalloutFormResponseMode.Multiple,
    state: CalloutFormState.Open,
    defaultCollapsed: true,
  },
};

// The other class of every Form setting, CLOSED included: a copy that reset
// the state to OPEN (as a Poll's is) would lose it. Settings are copied as-is.
const CLOSED_FORM: FormDefinitionInput = {
  title: 'Closed registration',
  description: 'Registration has closed',
  questions: defaultFormQuestions(),
  settings: {
    visibility: CalloutFormResponseVisibility.Admins,
    responseMode: CalloutFormResponseMode.Single,
    state: CalloutFormState.Closed,
    defaultCollapsed: false,
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

const expectedClosedFormShape = {
  ...expectedFormShape,
  title: CLOSED_FORM.title,
  description: CLOSED_FORM.description,
  settings: CLOSED_FORM.settings,
};

let baseScenario: OrganizationWithSpaceModel;
let sourcePoll: PollCallout;
let sourceForm: FormCallout;
let sourceClosedForm: FormCallout;
let templateId = '';
const spaceIds: string[] = [];
const extraTemplateIds: string[] = [];

type FramedCallout = Awaited<
  ReturnType<typeof getCalloutsSetFramingDefinitions>
>[number];

const byName = <T extends { framing: { profile: { displayName: string } } }>(
  callouts: T[],
  displayName: string
): T => {
  const found = callouts.find(
    callout => callout.framing.profile.displayName === displayName
  );
  if (!found) {
    throw new Error(
      `no callout named ${displayName} among ${JSON.stringify(
        callouts.map(callout => callout.framing.profile.displayName)
      )}`
    );
  }
  return found;
};

const sourceIds = () => ({
  poll: sourcePoll.pollId,
  pollOptions: sourcePoll.poll.options.map(option => option.id),
  form: sourceForm.formId,
  formQuestions: sourceForm.questions.flatMap(question => [
    question.id,
    ...(question.options ?? []).map(option => option.id),
  ]),
});

/**
 * The Poll / Form a template created in a live callouts set: definitions equal
 * the source's, ids fresh, Poll OPEN with no votes, Form with no responses.
 */
const expectFreshCopies = async (calloutsSetId: string) => {
  const callouts = await getCalloutsSetFramingDefinitions(calloutsSetId);
  const pollCallout = byName(callouts, sourcePoll.displayName);
  const formCallout = byName(callouts, sourceForm.displayName);

  expect(pollCallout.isTemplate).toBe(false);
  expect(pollCallout.framing.type).toBe(CalloutFramingType.Poll);
  const poll = pollCallout.framing.poll;
  expect(poll).toBeDefined();
  if (!poll) throw new Error('no poll');
  expect(pollShape(poll)).toEqual(expectedPollShape);
  expect(poll.status).toBe(PollStatus.Open);
  expect(poll.totalVotes).toBe(0);
  expect(poll.deadline ?? null).toBeNull();
  expect(poll.id).not.toBe(sourceIds().poll);
  for (const option of poll.options) {
    expect(sourceIds().pollOptions).not.toContain(option.id);
  }

  expect(formCallout.isTemplate).toBe(false);
  expect(formCallout.framing.type).toBe(CalloutFramingType.Form);
  const form = formCallout.framing.form;
  expect(form).toBeDefined();
  if (!form) throw new Error('no form');
  expect(formShape(form)).toEqual(expectedFormShape);
  expect(form.id).not.toBe(sourceIds().form);
  for (const id of formIds(form)) {
    expect(sourceIds().formQuestions).not.toContain(id);
  }
  expect(responsesView(await getFormResponses(form.id)).total).toBe(0);

  // The CLOSED Form keeps the other class of every setting: not reopened.
  const closedForm = byName(callouts, sourceClosedForm.displayName).framing
    .form;
  if (!closedForm) throw new Error('no closed form');
  expect(formShape(closedForm)).toEqual(expectedClosedFormShape);
  expect(closedForm.id).not.toBe(sourceClosedForm.formId);

  return { pollCallout, formCallout, poll, form };
};

/** Publishes a template-created callout when it came in as a draft. */
const ensurePublished = async (callout: FramedCallout) => {
  if (callout.settings.visibility !== CalloutVisibility.Published) {
    const published = await updateCalloutVisibility(
      callout.id,
      CalloutVisibility.Published,
      TestUser.GLOBAL_ADMIN,
      false
    );
    expect(published.error).toBeUndefined();
  }
};

beforeAll(async () => {
  baseScenario = await TestScenarioFactory.createBaseScenario(scenarioConfig);
  const sourceSetId = baseScenario.subspace.collaboration.calloutsSetId;

  // A Poll with a vote ...
  sourcePoll = await createPollCallout(
    sourceSetId,
    uniqueTemplateName('src-poll'),
    POLL
  );
  const options = [...sourcePoll.poll.options].sort(
    (a, b) => a.sortOrder - b.sortOrder
  );
  const voted = await castPollVote(
    sourcePoll.pollId,
    [options[0].id, options[1].id],
    TestUser.SUBSPACE_MEMBER
  );
  if (voted.error || voted.data?.castPollVote.totalVotes !== 1) {
    throw new Error(`fixture vote failed: ${JSON.stringify(voted)}`);
  }
  // ... then CLOSED, so a copy that kept the status would differ from the
  // OPEN status a Poll created from a template must start with.
  const closed = await updatePollStatus(sourcePoll.pollId, PollStatus.Closed);
  if (
    closed.error ||
    closed.data?.updatePollStatus.status !== PollStatus.Closed
  ) {
    throw new Error(`fixture poll close failed: ${JSON.stringify(closed)}`);
  }

  // ... and a Form with a response.
  sourceForm = await createFormCallout(sourceSetId, {
    displayName: uniqueTemplateName('src-form'),
    title: FORM.title,
    description: FORM.description,
    questions: FORM.questions,
    settings: FORM.settings,
    // LINK contributions carry into the template copy, so its CONTRIBUTE check passes
    // and the template rule itself is what refuses a response there.
    contributionTypes: [CalloutContributionType.Link],
  });
  const answered = await submitFormResponse(
    sourceForm.formId,
    answersFor(sourceForm.questions),
    CalloutFormResponseVisibility.Members,
    TestUser.SUBSPACE_MEMBER
  );
  if (answered.error) {
    throw new Error(`fixture response failed: ${JSON.stringify(answered)}`);
  }

  // ... and a CLOSED Form with the other class of every setting.
  sourceClosedForm = await createFormCallout(sourceSetId, {
    displayName: uniqueTemplateName('src-closed-form'),
    title: CLOSED_FORM.title,
    description: CLOSED_FORM.description,
    questions: CLOSED_FORM.questions,
    settings: CLOSED_FORM.settings,
  });

  const created = await createTemplateFromSpace(
    baseScenario.subspace.id,
    baseScenario.space.templateSetId,
    uniqueTemplateName('space-tpl')
  );
  templateId = created.data?.createTemplateFromSpace.id ?? '';
  if (!templateId) {
    throw new Error(
      `createTemplateFromSpace failed: ${JSON.stringify(created.error ?? created)}`
    );
  }
});

afterAll(async () => {
  for (const id of spaceIds) {
    await deleteSpace(id);
  }
  for (const id of [templateId, ...extraTemplateIds].filter(Boolean)) {
    await deleteTemplate(id);
  }
  await TestScenarioFactory.cleanUpBaseScenario(baseScenario);
});

describe('R25 — a space template keeps Poll and Form definitions only (FR-027)', () => {
  test('the template content space holds the poll (title, options in order, settings) with no votes', async () => {
    const callouts = await getTemplateContentSpaceCallouts(templateId);
    const pollCallout = byName(callouts, sourcePoll.displayName);

    expect(pollCallout.isTemplate).toBe(true);
    expect(pollCallout.framing.type).toBe(CalloutFramingType.Poll);
    const poll = pollCallout.framing.poll;
    expect(poll).toBeDefined();
    if (!poll) throw new Error('the template POLL callout carries no poll');
    expect(pollShape(poll)).toEqual(expectedPollShape);
    expect(poll.totalVotes).toBe(0);
    expect(poll.status).toBe(PollStatus.Open);
    expect(poll.id).not.toBe(sourcePoll.pollId);
  });

  test('the template content space holds the Form (questions without the source ids, settings as-is) with no responses', async () => {
    const callouts = await getTemplateContentSpaceCallouts(templateId);
    const formCallout = byName(callouts, sourceForm.displayName);

    expect(formCallout.isTemplate).toBe(true);
    expect(formCallout.framing.type).toBe(CalloutFramingType.Form);
    const form = formCallout.framing.form;
    expect(form).toBeDefined();
    if (!form) throw new Error('the template FORM callout carries no form');
    expect(formShape(form)).toEqual(expectedFormShape);
    expect(form.id).not.toBe(sourceForm.formId);
    for (const id of formIds(form)) {
      expect(sourceIds().formQuestions).not.toContain(id);
    }
    expect(responsesView(await getFormResponses(form.id)).total).toBe(0);
  });

  test('the template content space keeps the CLOSED Form with the other class of every setting, as-is', async () => {
    const callouts = await getTemplateContentSpaceCallouts(templateId);
    const form = byName(callouts, sourceClosedForm.displayName).framing.form;
    if (!form) throw new Error('the template FORM callout carries no form');

    expect(formShape(form)).toEqual(expectedClosedFormShape);
    expect(form.id).not.toBe(sourceClosedForm.formId);
  });

  test('positive control: the source keeps its vote, its CLOSED status and its response', async () => {
    const source = await getCalloutsSetFramingDefinitions(
      baseScenario.subspace.collaboration.calloutsSetId
    );

    const sourcePollRead = byName(source, sourcePoll.displayName).framing.poll;
    expect(sourcePollRead?.totalVotes).toBe(1);
    expect(sourcePollRead?.status).toBe(PollStatus.Closed);
    expect(responsesView(await getFormResponses(sourceForm.formId)).total).toBe(
      1
    );
  });
});

describe('R25 — a Form inside a template content space never accepts responses (US5-AS6, FR-027b)', () => {
  test('submitCalloutFormResponse on the template content-space Form is refused with FORM_TEMPLATE_NOT_RESPONDABLE', async () => {
    const callouts = await getTemplateContentSpaceCallouts(templateId);
    const form = byName(callouts, sourceForm.displayName).framing.form;
    expect(form).toBeDefined();
    if (!form) throw new Error('the template FORM callout carries no form');

    const result = await submitFormResponse(
      form.id,
      answersFor(form.questions as FormQuestion[]),
      CalloutFormResponseVisibility.Members,
      TestUser.GLOBAL_ADMIN
    );

    expect(errorCode(result)).toBe('FORM_TEMPLATE_NOT_RESPONDABLE');
    expect(result.data).toBeUndefined();
    expect(responsesView(await getFormResponses(form.id)).total).toBe(0);
  });

  test('positive control: the source Form accepts the same answers from the same persona', async () => {
    const result = await submitFormResponse(
      sourceForm.formId,
      answersFor(sourceForm.questions),
      CalloutFormResponseVisibility.Members,
      TestUser.GLOBAL_ADMIN
    );

    expect(result.error).toBeUndefined();
    expect(result.data?.submitCalloutFormResponse.id).toBeDefined();
  });

  test('a Form brought into a template by updateTemplateFromSpace is refused with FORM_TEMPLATE_NOT_RESPONDABLE', async () => {
    // A space template with no Form: made from the L0, which holds no callouts.
    const created = await createTemplateFromSpace(
      baseScenario.space.id,
      baseScenario.space.templateSetId,
      uniqueTemplateName('upd-from-space')
    );
    const target = created.data?.createTemplateFromSpace.id ?? '';
    expect(target).not.toBe('');
    extraTemplateIds.push(target);
    const before = await getTemplateContentSpaceCallouts(target);
    expect(before.map(callout => callout.framing.type)).not.toContain(
      CalloutFramingType.Form
    );

    const updated = await updateTemplateFromSpace(
      target,
      baseScenario.subspace.id
    );
    expect(updated.error).toBeUndefined();

    const formCallout = byName(
      await getTemplateContentSpaceCallouts(target),
      sourceForm.displayName
    );
    const form = formCallout.framing.form;
    if (!form) throw new Error('the template FORM callout carries no form');
    const result = await submitFormResponse(
      form.id,
      answersFor(form.questions as FormQuestion[]),
      CalloutFormResponseVisibility.Members,
      TestUser.GLOBAL_ADMIN
    );

    expect(errorCode(result)).toBe('FORM_TEMPLATE_NOT_RESPONDABLE');
    expect(result.data).toBeUndefined();
    expect(responsesView(await getFormResponses(form.id)).total).toBe(0);
  });
});

describe('R25 — a subspace created from the template (US5-AS3/AS5)', () => {
  let calloutsSetId = '';

  beforeAll(async () => {
    const created = await createSubspaceFromTemplate(
      baseScenario.space.id,
      'from-tpl',
      { spaceTemplateID: templateId }
    );
    const subspace = created.data?.createSubspace;
    if (!subspace) {
      throw new Error(
        `createSubspace from template failed: ${JSON.stringify(
          created.error ?? created
        )}`
      );
    }
    spaceIds.push(subspace.id);
    calloutsSetId = subspace.collaboration.calloutsSet.id;
  });

  test('holds the poll with the same options, OPEN, 0 votes, and the Form with the same questions/settings, fresh ids, 0 responses', async () => {
    await expectFreshCopies(calloutsSetId);
  });

  test('positive control: the new poll takes a vote and the new Form takes a response (they are live, not templates)', async () => {
    const { pollCallout, formCallout, poll, form } =
      await expectFreshCopies(calloutsSetId);
    await ensurePublished(pollCallout);
    await ensurePublished(formCallout);

    const voted = await castPollVote(
      poll.id,
      [poll.options[0].id],
      TestUser.GLOBAL_ADMIN
    );
    expect(voted.error).toBeUndefined();
    expect(voted.data?.castPollVote.totalVotes).toBe(1);

    const answered = await submitFormResponse(
      form.id,
      answersFor(form.questions as FormQuestion[]),
      CalloutFormResponseVisibility.Members,
      TestUser.GLOBAL_ADMIN
    );
    expect(answered.error).toBeUndefined();
    expect(responsesView(await getFormResponses(form.id)).total).toBe(1);
  });
});

describe('R25 — updateCollaborationFromSpaceTemplate adds the Poll and the Form', () => {
  let collaborationId = '';
  let calloutsSetId = '';

  beforeAll(async () => {
    const created = await createSubspaceFromTemplate(
      baseScenario.space.id,
      'upd-target',
      { addCallouts: false }
    );
    const subspace = created.data?.createSubspace;
    if (!subspace) {
      throw new Error(
        `createSubspace failed: ${JSON.stringify(created.error ?? created)}`
      );
    }
    spaceIds.push(subspace.id);
    collaborationId = subspace.collaboration.id;
    calloutsSetId = subspace.collaboration.calloutsSet.id;
  });

  test('the target holds neither before the update (control)', async () => {
    const callouts = await getCalloutsSetFramingDefinitions(calloutsSetId);
    const types = callouts.map(callout => callout.framing.type);

    expect(types).not.toContain(CalloutFramingType.Poll);
    expect(types).not.toContain(CalloutFramingType.Form);
  });

  test('after the update the target holds an OPEN poll with no votes and a Form with fresh ids and no responses', async () => {
    const result = await updateCollaborationFromSpaceTemplate(
      collaborationId,
      templateId,
      TestUser.GLOBAL_ADMIN,
      { addCallouts: true }
    );

    expect(result.error).toBeUndefined();
    await expectFreshCopies(calloutsSetId);
  });
});

describe('R25 — only the template may carry a Form into a new subspace (FR-027a)', () => {
  test('a FORM in the create-subspace request itself is refused even when a template is used', async () => {
    const result = await createSubspaceFromTemplate(
      baseScenario.space.id,
      'req-form',
      {
        spaceTemplateID: templateId,
        calloutsData: [
          formCalloutData(uniqueTemplateName('req-form-post'), FORM),
        ],
      }
    );

    expect(errorCode(result)).toBe('FORM_FRAMING_NOT_ALLOWED');
    expect(result.data?.createSubspace).toBeUndefined();
  });

  test('positive control: the same template with a NONE callout in the request creates the subspace with the template Form', async () => {
    const plainName = uniqueTemplateName('req-none-post');
    const result = await createSubspaceFromTemplate(
      baseScenario.space.id,
      'req-none',
      {
        spaceTemplateID: templateId,
        calloutsData: [noneCalloutData(plainName)],
      }
    );

    expect(result.error).toBeUndefined();
    const subspace = result.data?.createSubspace;
    expect(subspace?.id).toBeDefined();
    if (!subspace) throw new Error('no subspace');
    spaceIds.push(subspace.id);
    const callouts = await getCalloutsSetFramingDefinitions(
      subspace.collaboration.calloutsSet.id
    );
    const names = callouts.map(callout => callout.framing.profile.displayName);
    expect(names).toContain(plainName);
    expect(byName(callouts, sourceForm.displayName).framing.type).toBe(
      CalloutFramingType.Form
    );
  });
});

describe('R25 — the other template carriers carry a Form (FR-027a, R25c)', () => {
  /** A template content space's Form: the expected definition, never respondable. */
  const expectTemplateFormDefinition = async (
    tplId: string,
    displayName: string
  ) => {
    const callouts = await getTemplateContentSpaceCallouts(tplId);
    const form = byName(callouts, displayName).framing.form;
    if (!form) throw new Error('the template FORM callout carries no form');
    expect(formShape(form)).toEqual(expectedFormShape);

    const result = await submitFormResponse(
      form.id,
      answersFor(form.questions as FormQuestion[]),
      CalloutFormResponseVisibility.Members,
      TestUser.GLOBAL_ADMIN
    );
    expect(errorCode(result)).toBe('FORM_TEMPLATE_NOT_RESPONDABLE');
    expect(responsesView(await getFormResponses(form.id)).total).toBe(0);
  };

  test('createTemplateFromContentSpace copies the Form definition into the new template, never respondable', async () => {
    const created = await createTemplateFromContentSpace(
      await getTemplateContentSpaceId(templateId),
      baseScenario.space.templateSetId,
      uniqueTemplateName('from-content')
    );

    expect(created.error).toBeUndefined();
    const id = created.data?.createTemplateFromContentSpace.id ?? '';
    expect(id).not.toBe('');
    extraTemplateIds.push(id);
    await expectTemplateFormDefinition(id, sourceForm.displayName);
  });

  test('createTemplate (SPACE) accepts a FORM in its own content space, as a never-respondable definition', async () => {
    const displayName = uniqueTemplateName('tpl-own-form');
    const created = await createSpaceTemplateWithCallouts(
      baseScenario.space.templateSetId,
      uniqueTemplateName('space-tpl-form'),
      [formCalloutData(displayName, FORM, [CalloutContributionType.Link])]
    );

    expect(created.error).toBeUndefined();
    const id = created.data?.createTemplate.id ?? '';
    expect(id).not.toBe('');
    extraTemplateIds.push(id);
    await expectTemplateFormDefinition(id, displayName);
  });

  test('an L0 created from the template holds an OPEN poll with no votes and Forms as-is with fresh ids and no responses', async () => {
    const created = await createSpaceFromTemplate(
      baseScenario.organization.accountId,
      'l0-from-tpl',
      templateId
    );

    expect(created.error).toBeUndefined();
    const id = created.data?.createSpace.id ?? '';
    expect(id).not.toBe('');
    spaceIds.push(id);
    await expectFreshCopies(await getSpaceCalloutsSetId(id));
  });

  test('a FORM in the create-space (L0) request itself is refused even when a template is used', async () => {
    const result = await createSpaceFromTemplate(
      baseScenario.organization.accountId,
      'l0-req-form',
      templateId,
      [formCalloutData(uniqueTemplateName('l0-req-form-post'), FORM)]
    );

    expect(errorCode(result)).toBe('FORM_FRAMING_NOT_ALLOWED');
    expect(result.data?.createSpace).toBeUndefined();
  });
});
