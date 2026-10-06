import {
  getGraphqlClient,
  TestUser,
  UniqueIDGenerator,
} from '@alkemio/tests-lib';
import {
  CalloutContributionType,
  CalloutFormDetailsFragment,
  CalloutFramingType,
  CalloutVisibility,
  CreateCalloutFormQuestionInput,
  CreateCalloutFormSettingsInput,
  CreateCalloutInput,
  PollDefinitionFragment,
  PollSettingsInput,
} from '@alkemio/tests-lib/core/generated/alkemio-schema';
import { graphqlErrorWrapper } from '@alkemio/tests-lib/utils/graphql.wrapper';
import { updateCalloutVisibility } from '../callout/callouts.request.params';

/**
 * Helpers for Polls and Forms carried by templates (workspace#080, ruling R25,
 * server#6435): callout templates with a Poll / Form framing, space templates
 * whose content space holds them, and the (sub)spaces created from those
 * templates. Every helper goes through `graphqlErrorWrapper`, so a rejection
 * comes back as `result.error.errors` (read its reason code with the Form
 * helpers' `errorCode`).
 */

export const uniqueTemplateName = (tag: string): string =>
  `r25-${tag}-${UniqueIDGenerator.getID()}`;

// ---------------------------------------------------------------------------
// Callout definitions
// ---------------------------------------------------------------------------

export type PollDefinitionInput = {
  title?: string;
  options: string[];
  settings?: PollSettingsInput;
};

const calloutSettings = {
  visibility: CalloutVisibility.Published,
  contribution: { enabled: false },
  framing: { commentsEnabled: false },
};

/** A POLL callout as a template's (or a set's) callout data. */
export const pollCalloutData = (
  displayName: string,
  poll: PollDefinitionInput
): CreateCalloutInput => ({
  framing: {
    type: CalloutFramingType.Poll,
    profile: { displayName, description: 'Poll callout framing' },
    poll,
  },
  settings: calloutSettings,
});

export type FormDefinitionInput = {
  title?: string;
  description?: string;
  questions: CreateCalloutFormQuestionInput[];
  settings?: CreateCalloutFormSettingsInput;
};

/** A FORM callout as a template's (or a set's) callout data. */
export const formCalloutData = (
  displayName: string,
  form: FormDefinitionInput,
  contributionTypes?: CalloutContributionType[]
): CreateCalloutInput => ({
  framing: {
    type: CalloutFramingType.Form,
    profile: { displayName, description: 'Form callout framing' },
    form,
  },
  settings: contributionTypes
    ? {
        ...calloutSettings,
        contribution: { enabled: true, allowedTypes: contributionTypes },
      }
    : calloutSettings,
});

/** A NONE callout — the positive control of every carrier refusal. */
export const noneCalloutData = (displayName: string): CreateCalloutInput => ({
  framing: {
    type: CalloutFramingType.None,
    profile: { displayName, description: 'Plain callout' },
  },
  settings: calloutSettings,
});

// ---------------------------------------------------------------------------
// Comparable shapes (ids stripped)
// ---------------------------------------------------------------------------

/** A Poll definition with every id stripped and options in their sort order. */
export const pollShape = (poll: PollDefinitionFragment) => ({
  title: poll.title,
  options: [...poll.options]
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map(option => option.text),
  settings: {
    minResponses: poll.settings.minResponses,
    maxResponses: poll.settings.maxResponses,
    resultsVisibility: poll.settings.resultsVisibility,
    resultsDetail: poll.settings.resultsDetail,
    allowContributorsAddOptions: poll.settings.allowContributorsAddOptions,
  },
});

/** A Form definition with every question/option id stripped. */
export const formShape = (form: CalloutFormDetailsFragment) => ({
  title: form.title ?? null,
  description: form.description ?? null,
  questions: form.questions.map(question => ({
    prompt: question.prompt,
    explanation: question.explanation ?? null,
    type: question.type,
    required: question.required,
    options: (question.options ?? []).map(option => option.label),
  })),
  settings: {
    visibility: form.settings.visibility,
    responseMode: form.settings.responseMode,
    state: form.settings.state,
    defaultCollapsed: form.settings.defaultCollapsed,
  },
});

/** Every question id and option id of a Form. */
export const formIds = (form: CalloutFormDetailsFragment): string[] =>
  form.questions.flatMap(question => [
    question.id,
    ...(question.options ?? []).map(option => option.id),
  ]);

// ---------------------------------------------------------------------------
// Callout templates
// ---------------------------------------------------------------------------

/** createTemplate (CALLOUT) whose read-back carries the Poll / Form definition. */
export const createCalloutTemplateWithFraming = async (
  templatesSetId: string,
  displayName: string,
  calloutData: CreateCalloutInput,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.CreateCalloutTemplateWithFraming(
      { templatesSetId, profileData: { displayName }, calloutData },
      { authorization: `Bearer ${authToken}` }
    );
  return graphqlErrorWrapper(callback, userRole);
};

/** A callout template's callout with its Poll / Form definition. */
export const getTemplateCalloutFraming = async (
  templateId: string,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.templateCalloutFraming(
      { templateId },
      { authorization: `Bearer ${authToken}` }
    );
  return graphqlErrorWrapper(callback, userRole);
};

// ---------------------------------------------------------------------------
// Polls on a live callouts set
// ---------------------------------------------------------------------------

export type PollCallout = {
  calloutId: string;
  pollId: string;
  displayName: string;
  poll: PollDefinitionFragment;
};

/** Creates (and publishes) a POLL callout. Throws when creation fails. */
export const createPollCallout = async (
  calloutsSetID: string,
  displayName: string,
  poll: PollDefinitionInput,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
): Promise<PollCallout> => {
  const graphqlClient = getGraphqlClient();
  const created = await graphqlErrorWrapper(
    (authToken: string | undefined) =>
      graphqlClient.createPollCalloutOnCalloutsSet(
        {
          calloutData: {
            calloutsSetID,
            ...pollCalloutData(displayName, poll),
            settings: {
              ...calloutSettings,
              visibility: CalloutVisibility.Draft,
            },
          },
        },
        { authorization: `Bearer ${authToken}` }
      ),
    userRole
  );
  const callout = created.data?.createCalloutOnCalloutsSet;
  const createdPoll = callout?.framing.poll;
  if (!callout || !createdPoll) {
    throw new Error(
      `createPollCallout failed for ${userRole}: ${JSON.stringify(
        created.error?.errors ?? created
      )}`
    );
  }
  const published = await updateCalloutVisibility(
    callout.id,
    CalloutVisibility.Published,
    userRole,
    false
  );
  if (published.error) {
    throw new Error(
      `publishing Poll callout ${callout.id} failed: ${JSON.stringify(
        published.error
      )}`
    );
  }
  return {
    calloutId: callout.id,
    pollId: createdPoll.id,
    displayName: callout.framing.profile.displayName,
    poll: createdPoll,
  };
};

export const castPollVote = async (
  pollID: string,
  selectedOptionIDs: string[],
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.castPollVote(
      { voteData: { pollID, selectedOptionIDs } },
      { authorization: `Bearer ${authToken}` }
    );
  return graphqlErrorWrapper(callback, userRole);
};

// ---------------------------------------------------------------------------
// Reading what a space template holds / created
// ---------------------------------------------------------------------------

/** The callouts of a template's content space, with their Poll / Form definitions. */
export const getTemplateContentSpaceCallouts = async (
  templateId: string,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const graphqlClient = getGraphqlClient();
  const result = await graphqlErrorWrapper(
    (authToken: string | undefined) =>
      graphqlClient.templateContentSpaceCallouts(
        { templateId },
        { authorization: `Bearer ${authToken}` }
      ),
    userRole
  );
  const callouts =
    result.data?.lookup.template?.contentSpace?.collaboration.calloutsSet
      .callouts;
  if (!callouts) {
    throw new Error(
      `unable to read the content-space callouts of template ${templateId}: ${JSON.stringify(
        result.error?.errors ?? result
      )}`
    );
  }
  return callouts;
};

/** The callouts of a callouts set, with their Poll / Form definitions. */
export const getCalloutsSetFramingDefinitions = async (
  calloutsSetId: string,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const graphqlClient = getGraphqlClient();
  const result = await graphqlErrorWrapper(
    (authToken: string | undefined) =>
      graphqlClient.calloutsSetFramingDefinitions(
        { calloutsSetId },
        { authorization: `Bearer ${authToken}` }
      ),
    userRole
  );
  const callouts = result.data?.lookup.calloutsSet?.callouts;
  if (!callouts) {
    throw new Error(
      `unable to read the callouts of set ${calloutsSetId}: ${JSON.stringify(
        result.error?.errors ?? result
      )}`
    );
  }
  return callouts;
};

// ---------------------------------------------------------------------------
// (Sub)spaces from a space template
// ---------------------------------------------------------------------------

/**
 * createSubspace under `parentSpaceId`, optionally from a space template
 * (`spaceTemplateID`) and with callouts of the request's own. A space-creation
 * request requires every callout to carry a classification; an empty tagset
 * list lets the server assign the default flow state.
 */
export const createSubspaceFromTemplate = async (
  parentSpaceId: string,
  tag: string,
  options: {
    spaceTemplateID?: string;
    calloutsData?: CreateCalloutInput[];
    addCallouts?: boolean;
  } = {},
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const graphqlClient = getGraphqlClient();
  const nameID = uniqueTemplateName(tag).toLowerCase().slice(0, 25);
  const callback = (authToken: string | undefined) =>
    graphqlClient.CreateSubspace(
      {
        subspaceData: {
          nameID,
          spaceID: parentSpaceId,
          spaceTemplateID: options.spaceTemplateID,
          about: {
            profileData: { displayName: nameID, tagline: 'R25 templates' },
          },
          collaborationData: {
            addCallouts: options.addCallouts,
            calloutsSetData: {
              calloutsData: (options.calloutsData ?? []).map(callout => ({
                ...callout,
                classification: callout.classification ?? { tagsets: [] },
              })),
            },
          },
        },
      },
      { authorization: `Bearer ${authToken}` }
    );
  return graphqlErrorWrapper(callback, userRole);
};
