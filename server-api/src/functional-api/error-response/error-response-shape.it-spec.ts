/**
 * Error response shape: what an error body carries on a server running with
 * error-response debug detail off, the condition of every deployed
 * environment. Every comparison goes through `error-response.checks.ts`, so a
 * failing check reports its name and never a response.
 */
import { randomUUID } from 'node:crypto';
import axios from 'axios';
import {
  TestScenarioConfig,
  TestScenarioFactory,
  TestUser,
  postGraphqlRawAs,
  testConfiguration,
} from '@alkemio/tests-lib';
import { OrganizationWithSpaceModel } from '@alkemio/tests-lib/scenario/models/OrganizationWithSpaceModel';
import { CommunityMembershipPolicy } from '@alkemio/tests-lib/core/generated/alkemio-schema';
import { UniqueIDGenerator } from '@alkemio/tests-lib';
import { createPostOnCallout } from '@functional-api/callout/post/post.request.params';
import { deleteApplication } from '@functional-api/roleset/application/application.request.params';
import {
  NEUTRAL_ERROR_CODE,
  NEUTRAL_ERROR_MESSAGE,
} from './error-response.constants';
import {
  getMemoPdf,
  graphqlErrors,
  holdsNone,
  holdsNoUuid,
  idsOf,
  isUuid,
  keysWithin,
} from './error-response.checks';

const uniqueId = UniqueIDGenerator.getID();
const caller = TestUser.NON_SPACE_MEMBER;
const PUBLIC_KEYS = [
  'code',
  'numericCode',
  'userMessage',
  'errorId',
  'details',
];

const DELETE_POST = `
  mutation DeletePost($id: UUID!) {
    deletePost(deleteData: { ID: $id }) { id }
  }
`;

const APPLY = `
  mutation Apply($roleSetID: UUID!) {
    applyForEntryRoleOnRoleSet(applicationData: { roleSetID: $roleSetID, questions: [] }) { id }
  }
`;

let baseScenario: OrganizationWithSpaceModel;
let postId = '';
let applicationId = '';

const scenarioConfig: TestScenarioConfig = {
  name: 'error-response-shape',
  space: {
    collaboration: {
      addPostCollectionCallout: true,
      addTutorialCallouts: false,
    },
    settings: {
      membership: { policy: CommunityMembershipPolicy.Applications },
    },
  },
};

beforeAll(async () => {
  baseScenario = await TestScenarioFactory.createBaseScenario(scenarioConfig);
  const created = await createPostOnCallout(
    baseScenario.space.collaboration.calloutPostCollectionId,
    { displayName: `error-shape-post-${uniqueId}` },
    `error-shape-post-${uniqueId}`
  );
  postId = created.data?.createContributionOnCallout.post?.id ?? '';
  if (!postId) throw new Error('set-up: the post was not created');
});

afterAll(async () => {
  if (applicationId) await deleteApplication(applicationId);
  await TestScenarioFactory.cleanUpBaseScenario(baseScenario);
});

describe('Error response shape', () => {
  test('a query that does not parse keeps its own code and carries no stack trace', async () => {
    const response = await postGraphqlRawAs(caller, 'query { me { id ');
    const errors = graphqlErrors(response);

    expect(errors.length).toBeGreaterThan(0);
    for (const error of errors) {
      expect(error.extensions?.code).toBe('GRAPHQL_PARSE_FAILED');
    }
    expect(
      holdsNone(response.body, ['stacktrace']),
      'a parse error carries no stack trace'
    ).toBe(true);
  });

  test('a variable value its declared type refuses keeps its own code and carries no stack trace', async () => {
    const response = await postGraphqlRawAs(
      caller,
      'query Post($id: UUID!) { lookup { post(ID: $id) { id } } }',
      { id: null }
    );
    const errors = graphqlErrors(response);

    expect(errors.length).toBeGreaterThan(0);
    for (const error of errors) {
      expect(error.extensions?.code).toBe('BAD_USER_INPUT');
    }
    expect(
      holdsNone(response.body, ['stacktrace']),
      'a variable error carries no stack trace'
    ).toBe(true);
  });

  test('a refused mutation carries only the public extensions and a reference number', async () => {
    const response = await postGraphqlRawAs(caller, DELETE_POST, {
      id: postId,
    });
    const errors = graphqlErrors(response);

    expect(errors.length).toBe(1);
    expect(
      keysWithin(errors[0].extensions, PUBLIC_KEYS),
      'a refusal carries no extension outside the public set'
    ).toBe(true);
    expect(
      holdsNone(response.body, ['stacktrace']),
      'a refusal carries no stack trace'
    ).toBe(true);
    expect(
      isUuid(errors[0].extensions?.errorId),
      'a refusal carries a reference number'
    ).toBe(true);
  });

  test("a refused mutation does not carry the caller's ids", async () => {
    const response = await postGraphqlRawAs(caller, DELETE_POST, {
      id: postId,
    });

    expect(graphqlErrors(response).length).toBe(1);
    expect(
      holdsNone(response.body, idsOf(caller)),
      "a refusal names neither the caller's user nor its actor"
    ).toBe(true);
  });

  test('a refused mutation carries the one generic sentence', async () => {
    const response = await postGraphqlRawAs(caller, DELETE_POST, {
      id: postId,
    });
    const errors = graphqlErrors(response);
    const message = errors[0]?.message;

    expect(errors.length).toBe(1);
    expect(errors[0].extensions?.code).toBe(NEUTRAL_ERROR_CODE);
    expect(
      message === NEUTRAL_ERROR_MESSAGE,
      'a refusal carries the generic sentence'
    ).toBe(true);
    expect(
      holdsNone(message, [
        ...idsOf(caller),
        postId,
        'privilege',
        'delete',
        'Authorization:',
      ]),
      'the refusal sentence names no id, privilege or operation'
    ).toBe(true);
  });

  test('an error with its own code keeps the code and its message holds no id', async () => {
    const roleSetID = baseScenario.space.community.roleSetId;
    const first = await postGraphqlRawAs<{
      applyForEntryRoleOnRoleSet?: { id: string };
    }>(caller, APPLY, { roleSetID });
    applicationId = first.body.data?.applyForEntryRoleOnRoleSet?.id ?? '';
    expect(isUuid(applicationId), 'the first application is accepted').toBe(
      true
    );

    const second = await postGraphqlRawAs(caller, APPLY, { roleSetID });
    const errors = graphqlErrors(second);
    const message = errors[0]?.message;

    expect(errors.length).toBe(1);
    expect(errors[0].extensions?.code).toBe('ROLE_SET_OPEN_APPLICATION_EXISTS');
    expect(
      holdsNoUuid(message),
      'the message of an error with its own code holds no id'
    ).toBe(true);
    expect(
      holdsNone(message, [...idsOf(caller), roleSetID]),
      'the message names neither the caller nor the role set'
    ).toBe(true);
  });

  test('a REST error body carries no diagnostic fields', async () => {
    const response = await getMemoPdf(randomUUID(), caller);
    const body = response.body as Record<string, unknown> | undefined;

    expect(response.status).toBe(404);
    expect(
      body !== undefined &&
        typeof body === 'object' &&
        !['context', 'details', 'stack'].some(key => key in body),
      'a REST error body has no context, details or stack'
    ).toBe(true);
  });

  test('a refused credential keeps its transport status and its code', async () => {
    const response = await axios.post(
      testConfiguration.endPoints.graphql.private,
      { query: 'query { me { id } }' },
      {
        headers: {
          Authorization: 'Bearer not-a-valid-token',
          'Content-Type': 'application/json',
        },
        validateStatus: () => true,
      }
    );
    const errors = graphqlErrors({
      status: response.status,
      body: response.data,
    });

    expect(response.status).toBe(401);
    expect(errors[0]?.extensions?.code).toBe('UNAUTHENTICATED');
    expect(
      keysWithin(errors[0]?.extensions, [
        'code',
        'numericCode',
        'userMessage',
        'errorId',
        'error_code',
      ]),
      'a refused credential carries no extension outside the public set'
    ).toBe(true);
    expect(
      holdsNone(response.data, ['"http"', 'stacktrace']),
      'a refused credential carries neither transport data nor a stack trace'
    ).toBe(true);
  });
});
