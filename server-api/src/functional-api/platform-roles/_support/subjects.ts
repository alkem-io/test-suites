import { rawRead } from './raw-request';
import { inject } from 'vitest';
import { acquirePoolUser, releasePoolUsers } from './users';

/**
 * Subjects — real, registered users a spec file grants and revokes roles on.
 *
 * Rule and grantability specs grant and revoke roles on their subject. Doing
 * that to one of the 14 role users, or to a shared `TestUser`, poisons every
 * negative in the suite the moment a revoke is missed; a disposable subject
 * can only poison itself. It has a login of its own, so a spec can read the
 * subject's privileges AS the subject.
 */
export type Subject = { id: string; email: string; token: string };

/**
 * `tag`: lowercase letters only, UNIQUE across all spec files (two files run in
 * parallel must never share a subject). Subjects are only ever granted and
 * revoked, never consumed, so they come from the persistent normalised pool —
 * ~150 ms instead of a 2-5 s registration each.
 */
export const createSubject = async (tag: string): Promise<Subject> => {
  const { id, email, token } = await acquirePoolUser(
    inject('platformRoles').tokens.PLATFORM_ROLES_ADMIN,
    `subj${tag}`
  );
  return { id, email, token };
};

/** Returns the subjects to the pool, normalised. */
export const deleteSubjects = async (
  _usersAdminToken: string,
  subjects: readonly Subject[]
): Promise<void> => {
  await releasePoolUsers(
    inject('platformRoles').tokens.PLATFORM_ROLES_ADMIN,
    subjects.map(subject => subject.id)
  );
};

/**
 * A disposable ORGANIZATION holder. Organizations are Platform Support's to
 * create and delete — pass that role's token.
 */
export const createSubjectOrganization = async (
  supportToken: string,
  runId: string,
  tag: string
): Promise<string> => {
  const data = await rawRead<{ createOrganization: { id: string } }>(
    supportToken,
    'mutation($org: CreateOrganizationInput!) { createOrganization(organizationData: $org) { id } }',
    {
      org: {
        // nameID: lowercase alphanumerics and hyphens, max 25.
        nameID: `pr-${tag}-${runId}`
          .toLowerCase()
          .replace(/[^a-z0-9-]/g, '')
          .slice(0, 25),
        profileData: { displayName: `platform-roles ${tag} ${runId}` },
      },
    }
  );
  return data.createOrganization.id;
};

export const deleteSubjectOrganization = async (
  supportToken: string,
  organizationId: string
): Promise<void> => {
  await rawRead(
    supportToken,
    'mutation($id: UUID!) { deleteOrganization(deleteData: { ID: $id }) { id } }',
    { id: organizationId }
  );
};
