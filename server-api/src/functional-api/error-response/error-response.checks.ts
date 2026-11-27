import { isDeepStrictEqual } from 'node:util';
import axios from 'axios';
import {
  TestUser,
  TestUserManager,
  testConfiguration,
} from '@alkemio/tests-lib';

/**
 * Every comparison of a response in this directory goes through these
 * functions. Each returns whether it held and prints nothing: a spec asserts
 * the boolean under the check's name, so a failing check reports its name and
 * never a response, a message or an identifier.
 */

export type RawResponse = { status: number; body: unknown };

type GraphqlError = {
  message?: unknown;
  path?: unknown;
  extensions?: Record<string, unknown>;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const UUID_ANYWHERE =
  /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

export const graphqlErrors = (response: RawResponse): GraphqlError[] => {
  const errors = (response.body as { errors?: unknown } | undefined)?.errors;
  return Array.isArray(errors) ? (errors as GraphqlError[]) : [];
};

/**
 * The body with only its per-response values removed: `errorId` from each
 * GraphQL error's `extensions`, or `errorId` and `timestamp` from a REST body.
 */
const without = (record: Record<string, unknown>, keys: string[]) =>
  Object.fromEntries(
    Object.entries(record).filter(([key]) => !keys.includes(key))
  );

const withoutPerResponseValues = (body: unknown): unknown => {
  if (body === null || typeof body !== 'object') return body;
  const { errors } = body as { errors?: unknown };
  if (Array.isArray(errors)) {
    return {
      ...body,
      errors: errors.map((error: GraphqlError) =>
        error?.extensions
          ? { ...error, extensions: without(error.extensions, ['errorId']) }
          : error
      ),
    };
  }
  return without(body as Record<string, unknown>, ['errorId', 'timestamp']);
};

/** Equal HTTP status, and whole bodies deep-equal once per-response values are removed. */
export const sameResponse = (a: RawResponse, b: RawResponse): boolean =>
  a.status === b.status &&
  isDeepStrictEqual(
    withoutPerResponseValues(a.body),
    withoutPerResponseValues(b.body)
  );

/** The serialized response contains none of the values. */
export const holdsNone = (response: unknown, values: string[]): boolean => {
  const serialized = JSON.stringify(response) ?? '';
  return values.every(value => value !== '' && !serialized.includes(value));
};

/** Every key of `extensions` is one of `allowed`. */
export const keysWithin = (extensions: unknown, allowed: string[]): boolean =>
  extensions !== null &&
  typeof extensions === 'object' &&
  Object.keys(extensions).every(key => allowed.includes(key));

export const isUuid = (value: unknown): boolean =>
  typeof value === 'string' && UUID.test(value);

export const holdsNoUuid = (value: unknown): boolean =>
  typeof value === 'string' && !UUID_ANYWHERE.test(value);

export const samePath = (error: GraphqlError | undefined, path: string[]) =>
  isDeepStrictEqual(error?.path, path);

/** The ids a persona is known by: its user id and its actor id. */
export const idsOf = (user: TestUser): string[] => {
  const model = TestUserManager.getUserModelByType(user);
  if (!model.id || !model.agentId) {
    throw new Error(`set-up: the ids of persona ${user} are not loaded`);
  }
  return [model.id, model.agentId];
};

/** `GET rest/memo/<id>/pdf` as a persona, whatever the status. */
export const getMemoPdf = async (
  memoId: string,
  user: TestUser
): Promise<RawResponse> => {
  const url = `${testConfiguration.endPoints.rest.replace(/\/$/, '')}/memo/${memoId}/pdf`;
  const token = TestUserManager.getUserModelByType(user).authToken;
  try {
    const response = await axios.get(url, {
      headers: { Authorization: `Bearer ${token}` },
      validateStatus: () => true,
      timeout: 30_000,
    });
    return { status: response.status, body: response.data };
  } catch (e) {
    // A transport error's config carries the bearer: name the code only.
    const code = axios.isAxiosError(e) ? e.code : undefined;
    throw new Error(
      `GET memo pdf failed in transport: ${code ?? 'unknown error'}`
    );
  }
};
