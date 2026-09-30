import {
  delay,
  getGraphqlClient,
  postGraphqlRaw,
  SubscriptionClient,
  TestScenarioConfig,
  TestScenarioFactory,
  TestUser,
  TestUserManager,
  UniqueIDGenerator,
} from '@alkemio/tests-lib';
import {
  CalloutFormResponseVisibility,
  SearchCategory,
} from '@alkemio/tests-lib/core/generated/alkemio-schema';
import { OrganizationWithSpaceModel } from '@alkemio/tests-lib/scenario/models/OrganizationWithSpaceModel';
import { graphqlErrorWrapper } from '@alkemio/tests-lib/utils/graphql.wrapper';
import { getActivityLogOnCollaboration } from '../../activity-logs/activity-log-params';
import { createPostOnCallout } from '../post/post.request.params';
import { adminSearchIngestFromScratch } from '../../search/search.request.params';
import {
  answersFor,
  createFormCallout,
  FormCallout,
  getFormResponses,
  submitFormResponse,
  uniqueFormName,
} from './form.request.params';

/**
 * A Form response is not a contribution: it must not show up where
 * contributions, activity, search and subscriptions surface content, and the
 * GraphQL schema must not let it be reached from a callout. Every negative is
 * paired with a positive control on a POST contribution that carries the same
 * marker, so "nothing found" can never mean "the channel is broken".
 */

const uniqueId = UniqueIDGenerator.getID();
const MARKER = `fmarker${uniqueId}`.toLowerCase();

const scenarioConfig: TestScenarioConfig = {
  name: 'form-never-appears',
  space: {
    collaboration: {
      addPostCallout: false,
      addPostCollectionCallout: true,
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
let form: FormCallout;
let postId = '';
let responseId = '';
let activityBefore: string[] = [];
let activityAfter: string[] = [];
let formSubscription: SubscriptionClient;
let postSubscription: SubscriptionClient;

const postCalloutId = () =>
  baseScenario.space.collaboration.calloutPostCollectionId;

const SUBSCRIPTION = `subscription CalloutPostCreated($calloutID: UUID!) {
  calloutPostCreated(calloutID: $calloutID) {
    calloutID
    contributionID
    post { id }
  }
}`;

const activityEntries = async () => {
  const log = await getActivityLogOnCollaboration(
    baseScenario.space.collaboration.id,
    100
  );
  if (log.error) {
    throw new Error(`activity log failed: ${JSON.stringify(log.error)}`);
  }
  return (log.data?.activityLogOnCollaboration ?? []).map(
    entry => `${entry.type}|${entry.triggeredBy.id}|${entry.description}`
  );
};

const counts = async (calloutId: string) => {
  const client = getGraphqlClient();
  const result = await graphqlErrorWrapper(
    (authToken: string | undefined) =>
      client.calloutContributionCounts(
        { calloutId },
        { authorization: `Bearer ${authToken}` }
      ),
    TestUser.GLOBAL_ADMIN
  );
  const callout = result.data?.lookup.callout;
  if (!callout) {
    throw new Error(
      `callout ${calloutId} unreadable: ${JSON.stringify(
        result.error?.errors ?? result
      )}`
    );
  }
  return callout;
};

const searchMarker = async () => {
  const client = getGraphqlClient();
  const result = await graphqlErrorWrapper(
    (authToken: string | undefined) =>
      client.search(
        {
          searchData: {
            terms: [MARKER],
            searchInSpaceFilter: baseScenario.space.id,
            filters: [
              { category: SearchCategory.Contributions, size: 20 },
              { category: SearchCategory.CollaborationTools, size: 20 },
              { category: SearchCategory.Framings, size: 20 },
            ],
          },
        },
        { authorization: `Bearer ${authToken}` }
      ),
    TestUser.GLOBAL_ADMIN
  );
  return JSON.stringify(result.data?.search ?? {});
};

beforeAll(async () => {
  baseScenario = await TestScenarioFactory.createBaseScenario(scenarioConfig);
  form = await createFormCallout(
    baseScenario.space.collaboration.calloutsSetId,
    {
      displayName: uniqueFormName(`never-${uniqueId}`),
    }
  );

  formSubscription = new SubscriptionClient();
  postSubscription = new SubscriptionClient();
  await postSubscription.subscribe(
    {
      operationName: 'CalloutPostCreated',
      query: SUBSCRIPTION,
      variables: { calloutID: postCalloutId() },
    },
    TestUser.GLOBAL_ADMIN
  );
  await formSubscription.subscribe(
    {
      operationName: 'CalloutPostCreated',
      query: SUBSCRIPTION,
      variables: { calloutID: form.calloutId },
    },
    TestUser.GLOBAL_ADMIN,
    { recordErrors: true }
  );

  activityBefore = await activityEntries();

  // The Form response carries the marker in its short answer ...
  const submitted = await submitFormResponse(
    form.formId,
    answersFor(form.questions, { 0: { text: MARKER } }),
    CalloutFormResponseVisibility.Admins,
    TestUser.SPACE_MEMBER
  );
  responseId = submitted.data?.submitCalloutFormResponse.id ?? '';
  if (!responseId) {
    throw new Error(
      `Form response failed: ${JSON.stringify(submitted.error?.errors)}`
    );
  }

  // ... and the control is a POST contribution with the marker as its title.
  const post = await createPostOnCallout(
    postCalloutId(),
    { displayName: MARKER, description: `control ${MARKER}` },
    undefined,
    TestUser.SPACE_MEMBER
  );
  postId = post.data?.createContributionOnCallout.post?.id ?? '';
  if (!postId) {
    throw new Error(
      `POST control failed: ${JSON.stringify(post.error?.errors)}`
    );
  }

  // Activity entries are written asynchronously: wait until the control's
  // entry has landed, then everything the response could have written has too.
  const deadline = Date.now() + 30_000;
  do {
    await delay(1_000);
    activityAfter = await activityEntries();
  } while (
    activityAfter.length <= activityBefore.length &&
    Date.now() < deadline
  );
  await delay(2_000);
  activityAfter = await activityEntries();
});

afterAll(async () => {
  formSubscription?.terminate();
  postSubscription?.terminate();
  await TestScenarioFactory.cleanUpBaseScenario(baseScenario);
});

describe('Form response — never a contribution', () => {
  test('the Form callout has no contributions and a zero count', async () => {
    const callout = await counts(form.calloutId);

    expect(callout.contributions).toHaveLength(0);
    expect(callout.contributionsCount).toEqual({
      post: 0,
      whiteboard: 0,
      link: 0,
      memo: 0,
      collaboraDocument: 0,
    });
  });

  test('positive control: the POST callout shows the contribution with the marker', async () => {
    const callout = await counts(postCalloutId());

    expect(callout.contributions.length).toBeGreaterThanOrEqual(1);
    expect(callout.contributionsCount.post).toBeGreaterThanOrEqual(1);
  });

  test('the response exists and is readable, so the absence above is real', async () => {
    const result = await getFormResponses(form.formId, TestUser.SPACE_ADMIN);

    expect(
      result.data?.lookup.calloutFormResponses.all.responses.map(r => r.id)
    ).toContain(responseId);
  });
});

describe('Form response — never in the activity log', () => {
  test('the control POST wrote exactly one new activity entry and the response none', () => {
    const before = [...activityBefore].sort();
    const added = activityAfter.filter(entry => {
      const index = before.indexOf(entry);
      if (index >= 0) {
        before.splice(index, 1);
        return false;
      }
      return true;
    });

    // Positive control: the POST contribution is in the feed ...
    expect(
      added.filter(entry => entry.startsWith('CALLOUT_POST_CREATED'))
    ).toHaveLength(1);
    // ... and nothing else was added: no entry came from the Form response.
    expect(added).toHaveLength(1);
    expect(activityAfter.join('\n')).not.toContain(responseId);
  });
});

describe('Form response — never in search', () => {
  test('the marker finds the POST contribution and never the Form or its response', async () => {
    await adminSearchIngestFromScratch();

    let hits = '';
    const deadline = Date.now() + 90_000;
    do {
      await delay(3_000);
      hits = await searchMarker();
    } while (!hits.includes(postId) && Date.now() < deadline);

    // Guard: a control that finds nothing means the stack cannot search at
    // all (ES index templates missing), which would make the negatives vacuous.
    if (!hits.includes(postId)) {
      throw new Error(
        'Search control returned no hit for the POST contribution: ES templates missing on the stack — the negative assertions would be vacuous.'
      );
    }
    expect(hits).not.toContain(form.calloutId);
    expect(hits).not.toContain(form.formId);
    expect(hits).not.toContain(responseId);
  });
});

describe('Form response — never in subscriptions', () => {
  test('calloutPostCreated fires for the POST contribution and is refused for the Form callout', async () => {
    const deadline = Date.now() + 20_000;
    while (
      postSubscription.getMessages().length === 0 &&
      Date.now() < deadline
    ) {
      await delay(500);
    }
    await delay(1_000);

    // Positive control: the POST callout's subscription received the event.
    expect(postSubscription.getMessages().length).toBeGreaterThanOrEqual(1);
    expect(JSON.stringify(postSubscription.getMessages())).toContain(postId);
    // The Form callout has no POST contributions enabled, so the server refuses
    // the subscription outright: the refusal must have been received.
    const refusalDeadline = Date.now() + 10_000;
    while (
      formSubscription.getErrors().length === 0 &&
      Date.now() < refusalDeadline
    ) {
      await delay(250);
    }
    // The ws transport may deliver the refusal as a close/non-Error event, so
    // the server's message text is not reliably available: assert only that a
    // refusal was recorded.
    expect(formSubscription.getErrors().length).toBeGreaterThanOrEqual(1);
  });
});

describe('Form response — unreachable from the schema', () => {
  const TYPE_FIELDS = `query($name: String!) {
    __type(name: $name) {
      name
      fields {
        name
        type { kind name ofType { kind name ofType { kind name ofType { kind name } } } }
      }
    }
  }`;

  const RESPONSE_TYPES = [
    'CalloutFormResponse',
    'CalloutFormResponses',
    'PaginatedCalloutFormResponses',
  ];

  const fieldsOf = async (typeName: string) => {
    const bearer = TestUserManager.getUserModelByType(
      TestUser.GLOBAL_ADMIN
    ).authToken;
    const result = await postGraphqlRaw<{
      __type: { fields: { name: string; type: unknown }[] } | null;
    }>(TYPE_FIELDS, { variables: { name: typeName }, bearerToken: bearer });
    return result.body.data?.__type?.fields ?? null;
  };

  test('positive control: the lookup root is the only entry point', async () => {
    const fields = await fieldsOf('LookupQueryResults');

    expect(fields?.map(field => field.name)).toContain('calloutFormResponses');
  });

  test.each([
    'Callout',
    'CalloutFraming',
    'CalloutForm',
    'CalloutFormQuestion',
    'CalloutPostCreated',
    'ActivityCreatedSubscriptionResult',
  ])(
    '%s references no response type and exposes no response count',
    async typeName => {
      const fields = await fieldsOf(typeName);

      expect(fields).not.toBeNull();
      const serialized = JSON.stringify(fields);
      for (const responseType of RESPONSE_TYPES) {
        expect(serialized).not.toContain(responseType);
      }
      expect(fields?.map(field => field.name)).not.toContain('responsesTotal');
      expect(fields?.map(field => field.name)).not.toContain('responseCount');
    }
  );
});
