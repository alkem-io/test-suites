import {
  getGraphqlClient,
  postGraphqlRaw,
  TestUser,
  UniqueIDGenerator,
} from '@alkemio/tests-lib';
import {
  CalloutFormAnswerInput,
  CalloutFormQuestionType,
  CalloutFormResponseVisibility,
  CalloutFramingType,
  CalloutVisibility,
  CreateCalloutFormQuestionInput,
  CreateCalloutFormSettingsInput,
  RoleName,
  UpdateCalloutFormInput,
} from '@alkemio/tests-lib/core/generated/alkemio-schema';
import { graphqlErrorWrapper } from '@alkemio/tests-lib/utils/graphql.wrapper';
import { updateCalloutVisibility } from '../callouts.request.params';

/**
 * Request helpers for the Form callout framing. Every helper goes through
 * `graphqlErrorWrapper`, so a rejection comes back as `result.error.errors`
 * and the stable reason code of a validation rejection is read with
 * `errorCode(result)` (it lives in `extensions.details.code`, never in the
 * message).
 */

export type FormQuestion = {
  id: string;
  prompt: string;
  explanation?: string | null;
  type: CalloutFormQuestionType;
  required: boolean;
  options?: { id: string; label: string }[] | null;
};

export type FormCallout = {
  calloutId: string;
  formId: string;
  displayName: string;
  url: string;
  title: string | null;
  description: string | null;
  questions: FormQuestion[];
};

type ErrorCarrier = {
  error?: { errors?: Array<Record<string, unknown>> };
};

type RawErrorCarrier = {
  body?: { errors?: Array<Record<string, unknown>> };
};

const firstError = (
  result: ErrorCarrier | RawErrorCarrier | undefined
): Record<string, unknown> | undefined => {
  const errors =
    (result as ErrorCarrier | undefined)?.error?.errors ??
    (result as RawErrorCarrier | undefined)?.body?.errors;
  return errors?.[0];
};

/** The stable reason code of a Form validation rejection, when there is one. */
export const errorCode = (
  result: ErrorCarrier | RawErrorCarrier | undefined
): string | undefined => {
  const extensions = firstError(result)?.extensions as
    | { details?: { code?: string } }
    | undefined;
  return extensions?.details?.code;
};

/** The GraphQL error class code (BAD_USER_INPUT, FORBIDDEN_POLICY, ...). */
export const errorClass = (
  result: ErrorCarrier | RawErrorCarrier | undefined
): string | undefined => {
  const first = firstError(result);
  const extensions = first?.extensions as { code?: string } | undefined;
  return extensions?.code ?? (first?.code as string | undefined);
};

const DENIED_CLASSES = new Set([
  'FORBIDDEN',
  'FORBIDDEN_POLICY',
  'UNAUTHENTICATED',
  'UNAUTHORIZED',
]);

/** True when the request was rejected by authorization (or authentication). */
export const isDenied = (
  result: ErrorCarrier | RawErrorCarrier | undefined
): boolean => {
  const code = errorClass(result);
  return code !== undefined && DENIED_CLASSES.has(code);
};

/** The whole error payload as text — used to assert an answer never leaks. */
export const errorText = (
  result: ErrorCarrier | RawErrorCarrier | undefined
): string => JSON.stringify(firstError(result) ?? {});

// ---------------------------------------------------------------------------
// Definitions
// ---------------------------------------------------------------------------

/** One question of every type: required short, optional long, single 3, multiple 4. */
export const defaultFormQuestions = (): CreateCalloutFormQuestionInput[] => [
  {
    prompt: 'What is your name?',
    explanation: 'Your full name',
    type: CalloutFormQuestionType.ShortText,
    required: true,
  },
  {
    prompt: 'Tell us more',
    type: CalloutFormQuestionType.LongText,
    required: false,
  },
  {
    prompt: 'Pick one',
    type: CalloutFormQuestionType.SingleChoice,
    required: false,
    options: [{ label: 'Alpha' }, { label: 'Beta' }, { label: 'Gamma' }],
  },
  {
    prompt: 'Pick several',
    type: CalloutFormQuestionType.MultipleChoice,
    required: false,
    options: [
      { label: 'One' },
      { label: 'Two' },
      { label: 'Three' },
      { label: 'Four' },
    ],
  },
];

export const uniqueFormName = (tag: string): string =>
  `form-${tag}-${UniqueIDGenerator.getID()}`;

type FormCalloutOptions = {
  /** The optional Form title (R17) — distinct from the Post's display name. */
  title?: string;
  /** The optional Form description (R17) — distinct from the Post's description. */
  description?: string;
  questions?: CreateCalloutFormQuestionInput[];
  settings?: CreateCalloutFormSettingsInput;
  displayName?: string;
  /** Publish right after creation (default) — a DRAFT Form rejects responses. */
  publish?: boolean;
};

/**
 * Creates a FORM callout. Returns the raw wrapper result so a rejection can be
 * asserted; nothing is published here (see `createFormCallout`).
 */
export const createFormCalloutRaw = async (
  calloutsSetID: string,
  options: FormCalloutOptions = {},
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.createFormCalloutOnCalloutsSet(
      {
        calloutData: {
          calloutsSetID,
          framing: {
            type: CalloutFramingType.Form,
            profile: {
              displayName: options.displayName ?? uniqueFormName('callout'),
              description: 'Form callout framing',
            },
            form: {
              title: options.title,
              description: options.description,
              questions: options.questions ?? defaultFormQuestions(),
              settings: options.settings,
            },
          },
          settings: {
            visibility: CalloutVisibility.Draft,
            contribution: { enabled: false },
            framing: { commentsEnabled: false },
          },
        },
      },
      { authorization: `Bearer ${authToken}` }
    );
  return graphqlErrorWrapper(callback, userRole);
};

/**
 * Creates a FORM callout and (by default) publishes it without notifying, then
 * returns the ids the specs need. Throws when creation fails, so a spec never
 * continues on a half-built fixture.
 */
export const createFormCallout = async (
  calloutsSetID: string,
  options: FormCalloutOptions = {},
  userRole: TestUser = TestUser.GLOBAL_ADMIN
): Promise<FormCallout> => {
  const created = await createFormCalloutRaw(calloutsSetID, options, userRole);
  const callout = created.data?.createCalloutOnCalloutsSet;
  const form = callout?.framing.form;
  if (!callout || !form) {
    throw new Error(
      `createFormCallout failed for ${userRole}: ${JSON.stringify(
        created.error?.errors ?? created
      )}`
    );
  }
  if (options.publish ?? true) {
    const published = await updateCalloutVisibility(
      callout.id,
      CalloutVisibility.Published,
      userRole,
      false
    );
    if (published.error) {
      throw new Error(
        `publishing Form callout ${callout.id} failed: ${JSON.stringify(
          published.error
        )}`
      );
    }
  }
  return {
    calloutId: callout.id,
    formId: form.id,
    displayName: callout.framing.profile.displayName,
    url: callout.framing.profile.url,
    title: form.title ?? null,
    description: form.description ?? null,
    questions: form.questions as FormQuestion[],
  };
};

export const getFormDefinition = async (
  calloutId: string,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.calloutFormDefinition(
      { calloutId },
      { authorization: `Bearer ${authToken}` }
    );
  return graphqlErrorWrapper(callback, userRole);
};

export const updateCalloutForm = async (
  formID: string,
  input: Omit<UpdateCalloutFormInput, 'formID'>,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.updateCalloutForm(
      { formData: { formID, ...input } },
      { authorization: `Bearer ${authToken}` }
    );
  return graphqlErrorWrapper(callback, userRole);
};

/**
 * Turns the current definition back into a full-replacement question list that
 * keeps every id (an update replaces the list; omitted questions are removed).
 */
export const questionsAsUpdate = (
  questions: FormQuestion[]
): NonNullable<UpdateCalloutFormInput['questions']> =>
  questions.map(question => ({
    id: question.id,
    prompt: question.prompt,
    explanation: question.explanation ?? undefined,
    type: question.type,
    required: question.required,
    options: question.options?.map(option => ({
      id: option.id,
      label: option.label,
    })),
  }));

// ---------------------------------------------------------------------------
// Responses
// ---------------------------------------------------------------------------

export const submitFormResponse = async (
  formID: string,
  answers: CalloutFormAnswerInput[],
  acknowledgedVisibility: CalloutFormResponseVisibility,
  userRole: TestUser = TestUser.SUBSPACE_MEMBER
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.submitCalloutFormResponse(
      { responseData: { formID, acknowledgedVisibility, answers } },
      { authorization: `Bearer ${authToken}` }
    );
  return graphqlErrorWrapper(callback, userRole);
};

export const deleteFormResponse = async (
  responseID: string,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.deleteCalloutFormResponse(
      { deleteData: { responseID } },
      { authorization: `Bearer ${authToken}` }
    );
  return graphqlErrorWrapper(callback, userRole);
};

export const getFormResponses = async (
  formID: string,
  userRole: TestUser = TestUser.GLOBAL_ADMIN,
  first?: number,
  after?: string
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.calloutFormResponses(
      { formID, first, after },
      { authorization: `Bearer ${authToken}` }
    );
  return graphqlErrorWrapper(callback, userRole);
};

/** The viewer-scoped summary of a lookup, flattened for assertions. */
export const responsesView = (
  result: Awaited<ReturnType<typeof getFormResponses>>
) => {
  const view = result.data?.lookup.calloutFormResponses;
  if (!view) {
    throw new Error(
      `lookup.calloutFormResponses returned no data: ${JSON.stringify(
        result.error?.errors ?? result
      )}`
    );
  }
  return {
    mine: view.mine.length,
    total: view.all.total,
    listed: view.all.responses.length,
    canReadAll: view.canReadAll,
    canModerate: view.canModerate,
  };
};

// ---------------------------------------------------------------------------
// Anonymous access (no bearer at all)
// ---------------------------------------------------------------------------

const RESPONSE_FIELDS = `id createdDate createdBy { id }
  answers { questionID prompt type text selectedOptions { id label } }`;

const LOOKUP_RESPONSES_QUERY = `query($formID: UUID!) {
  lookup { calloutFormResponses(formID: $formID) {
    formID canReadAll canModerate
    mine { ${RESPONSE_FIELDS} }
    all { total responses { ${RESPONSE_FIELDS} } }
  } }
}`;

const SUBMIT_MUTATION = `mutation($responseData: SubmitCalloutFormResponseInput!) {
  submitCalloutFormResponse(responseData: $responseData) { ${RESPONSE_FIELDS} }
}`;

type LookupData = {
  lookup: {
    calloutFormResponses: {
      canReadAll: boolean;
      canModerate: boolean;
      mine: unknown[];
      all: { total: number; responses: unknown[] };
    };
  };
};

export const getFormResponsesAnonymous = (formID: string) =>
  postGraphqlRaw<LookupData>(LOOKUP_RESPONSES_QUERY, {
    variables: { formID },
  });

export const submitFormResponseAnonymous = (
  formID: string,
  answers: CalloutFormAnswerInput[],
  acknowledgedVisibility: CalloutFormResponseVisibility
) =>
  postGraphqlRaw<{ submitCalloutFormResponse: { id: string } }>(
    SUBMIT_MUTATION,
    {
      variables: {
        responseData: { formID, acknowledgedVisibility, answers },
      },
    }
  );

/** The same lookup with an arbitrary bearer (e.g. a disposable user). */
export const getFormResponsesWithBearer = (
  formID: string,
  bearerToken: string
) =>
  postGraphqlRaw<LookupData>(LOOKUP_RESPONSES_QUERY, {
    variables: { formID },
    bearerToken,
  });

export const submitFormResponseWithBearer = (
  formID: string,
  answers: CalloutFormAnswerInput[],
  acknowledgedVisibility: CalloutFormResponseVisibility,
  bearerToken: string
) =>
  postGraphqlRaw<{ submitCalloutFormResponse: { id: string } }>(
    SUBMIT_MUTATION,
    {
      variables: {
        responseData: { formID, acknowledgedVisibility, answers },
      },
      bearerToken,
    }
  );

// ---------------------------------------------------------------------------
// Answers
// ---------------------------------------------------------------------------

/**
 * A valid answer set for `questions`: required and optional questions alike are
 * answered (text -> a short text, single choice -> first option, multiple ->
 * first two). `overrides` is keyed by question index: a value replaces that
 * question's answer, `null` omits it.
 */
export const answersFor = (
  questions: FormQuestion[],
  overrides: Record<number, Partial<CalloutFormAnswerInput> | null> = {}
): CalloutFormAnswerInput[] => {
  const answers: CalloutFormAnswerInput[] = [];
  questions.forEach((question, index) => {
    const override = overrides[index];
    if (override === null) {
      return;
    }
    let base: CalloutFormAnswerInput;
    switch (question.type) {
      case CalloutFormQuestionType.ShortText:
        base = { questionID: question.id, text: 'a short answer' };
        break;
      case CalloutFormQuestionType.LongText:
        base = { questionID: question.id, text: 'a longer answer' };
        break;
      case CalloutFormQuestionType.SingleChoice:
        base = {
          questionID: question.id,
          selectedOptionIDs: [question.options?.[0]?.id ?? ''],
        };
        break;
      default:
        base = {
          questionID: question.id,
          selectedOptionIDs: (question.options ?? [])
            .slice(0, 2)
            .map(option => option.id),
        };
    }
    answers.push({ ...base, ...(override ?? {}) });
  });
  return answers;
};

/** Only the required questions, answered minimally. */
export const requiredAnswersOnly = (
  questions: FormQuestion[]
): CalloutFormAnswerInput[] => {
  const keep: Record<number, Partial<CalloutFormAnswerInput> | null> = {};
  questions.forEach((question, index) => {
    if (!question.required) {
      keep[index] = null;
    }
  });
  return answersFor(questions, keep);
};

// ---------------------------------------------------------------------------
// Platform roles
// ---------------------------------------------------------------------------

export const removePlatformRole = async (
  actorID: string,
  role: RoleName,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.removePlatformRoleFromUser(
      { roleData: { actorID, role } },
      { authorization: `Bearer ${authToken}` }
    );
  return graphqlErrorWrapper(callback, userRole);
};

/**
 * Grants a platform role to a persona for the duration of a spec. The Platform
 * Spaces Reader role can only be held by a service-profile user, so the marker
 * is set first. Pair with `revokePlatformRole` in `afterAll`.
 */
export const grantPlatformRole = async (
  actorID: string,
  role: RoleName,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const graphqlClient = getGraphqlClient();
  if (role === RoleName.PlatformSpacesReader) {
    const marked = await graphqlErrorWrapper(
      (authToken: string | undefined) =>
        graphqlClient.updateUserServiceProfile(
          { userData: { ID: actorID, serviceProfile: true } },
          { authorization: `Bearer ${authToken}` }
        ),
      userRole
    );
    if (marked.error) {
      throw new Error(
        `unable to mark ${actorID} as a service profile: ${JSON.stringify(
          marked.error
        )}`
      );
    }
  }
  const callback = (authToken: string | undefined) =>
    graphqlClient.assignPlatformRoleToUser(
      { roleData: { actorID, role } },
      { authorization: `Bearer ${authToken}` }
    );
  const result = await graphqlErrorWrapper(callback, userRole);
  if (result.error) {
    throw new Error(
      `unable to grant ${role} to ${actorID}: ${JSON.stringify(result.error)}`
    );
  }
  return result;
};

/** Takes the role back (and clears the service-profile marker it needed). */
export const revokePlatformRole = async (
  actorID: string,
  role: RoleName,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const result = await removePlatformRole(actorID, role, userRole);
  if (role === RoleName.PlatformSpacesReader) {
    const graphqlClient = getGraphqlClient();
    await graphqlErrorWrapper(
      (authToken: string | undefined) =>
        graphqlClient.updateUserServiceProfile(
          { userData: { ID: actorID, serviceProfile: false } },
          { authorization: `Bearer ${authToken}` }
        ),
      userRole
    );
  }
  return result;
};

/** The callouts set and role set of a space, for fixtures built outside the scenario factory. */
export const getSpaceSets = async (
  spaceId: string,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const graphqlClient = getGraphqlClient();
  const result = await graphqlErrorWrapper(
    (authToken: string | undefined) =>
      graphqlClient.spaceCalloutsSetAndRoleSet(
        { spaceId },
        { authorization: `Bearer ${authToken}` }
      ),
    userRole
  );
  const space = result.data?.lookup.space;
  const calloutsSetId = space?.collaboration.calloutsSet.id;
  const roleSetId = space?.community.roleSet.id;
  if (!calloutsSetId || !roleSetId) {
    throw new Error(
      `unable to resolve the sets of space ${spaceId}: ${JSON.stringify(
        result.error?.errors ?? result
      )}`
    );
  }
  return { calloutsSetId, roleSetId };
};
