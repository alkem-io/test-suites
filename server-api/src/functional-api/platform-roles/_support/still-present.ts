import { TestUserManager } from '@alkemio/tests-lib';
import { NEUTRAL_ERROR_CODE } from '@functional-api/error-response/error-response.constants';
import { rawRequest } from './raw-request';

/** The `lookup` field that reads each kind of entity by id. */
const LOOKUP = {
  user: 'user',
  vc: 'virtualContributor',
  pack: 'innovationPack',
  hub: 'innovationHub',
  space: 'space',
  organization: 'organization',
} as const;

export type LookupKind = keyof typeof LOOKUP;

/**
 * Whether the entity still exists, read by the global admin. The server
 * answers a missing entity and a refused one with the same generic error, so
 * a delete that answers with that error proves nothing on its own: it may be
 * a refusal. The global admin may read every entity, so its generic answer
 * here means the entity is gone. Any other error is thrown.
 */
export const stillPresent = async (
  kind: LookupKind,
  id: string
): Promise<boolean> => {
  const field = LOOKUP[kind];
  const { data, errors } = await rawRequest<{
    lookup: Record<string, { id: string } | null>;
  }>(
    TestUserManager.users.globalAdmin.authToken,
    `query($id: UUID!) { lookup { ${field}(ID: $id) { id } } }`,
    { id }
  );
  if (errors.length === 0) return data?.lookup?.[field]?.id === id;
  if (errors.every(e => e.extensions?.code === NEUTRAL_ERROR_CODE))
    return false;
  throw new Error(`could not read ${kind} ${id}: ${errors[0].message}`);
};

/**
 * The errors of a teardown delete that leave something behind: every error
 * other than the generic one, or the generic one while the global admin can
 * still read the entity (a refused delete).
 */
export const deleteResidue = async (
  kind: LookupKind,
  id: string,
  errors: readonly { message?: unknown; extensions?: { code?: unknown } }[]
): Promise<string | undefined> => {
  if (errors.length === 0) return undefined;
  const other = errors.find(e => e.extensions?.code !== NEUTRAL_ERROR_CODE);
  if (other) return String(other.message);
  return (await stillPresent(kind, id))
    ? `the delete was refused and the ${kind} is still there`
    : undefined;
};
