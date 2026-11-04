import { afterAll, beforeAll, describe, expect, inject, test } from 'vitest';
import {
  createDisposableUser,
  createHostedSpace,
  deleteDisposableUser,
  spaceHost,
} from '../_support/disposable-user';
import type { DisposableUser } from '../_support/disposable-user';
import { describeOutcome } from '../_support/outcome';
import { rawOutcome } from '../_support/raw-outcome';
import { rawRead } from '../_support/raw-request';

const ctx = inject('platformRoles');

/**
 * A17.entity-admin-rename — FR-020 moved every nameID rename off the platform
 * settings mutations onto the ENTITY: a user renames itself through
 * `updateActorNameID`, a space admin renames its space through the protected
 * `nameID` of `updateSpace`. The 14 global-role denials are matrix cells
 * (A17); this file proves the surfaces still WORK for their owners — without
 * it, an `UPDATE_NAMEID` grant missing from the entity-admin rules would look
 * exactly like a correct denial.
 */
const RENAME_ACTOR =
  'mutation($id: UUID!, $nameID: NameID!) { updateActorNameID(updateData: { actorID: $id, nameID: $nameID }) { id nameID } }';
const RENAME_SPACE =
  'mutation($id: UUID!, $nameID: NameID!) { updateSpace(spaceData: { ID: $id, nameID: $nameID }) { id nameID } }';
const SPACE_NAME_ID =
  'query($id: UUID!) { lookup { space(ID: $id) { nameID } } }';
const MY_NAME_ID = 'query { me { user { id nameID } } }';

const nameId = (tag: string) =>
  `${tag}-${ctx.runId}`.toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 25);

describe('A17.entity-admin-rename', () => {
  let user: DisposableUser;
  let host: DisposableUser;
  let spaceId: string;

  beforeAll(async () => {
    user = await createDisposableUser(ctx, 'a17self');
    host = await spaceHost(ctx);
    spaceId = await createHostedSpace(ctx, host, 'a17own');
  }, 300_000);

  afterAll(async () => {
    await deleteDisposableUser(ctx, user);
  });

  test('positive: a user renames itself through updateActorNameID and reads the new nameID back', async () => {
    const next = nameId('a17self-renamed');
    const { updateActorNameID } = await rawRead<{
      updateActorNameID: { id: string; nameID: string };
    }>(user.token, RENAME_ACTOR, { id: user.id, nameID: next });
    expect(updateActorNameID.nameID).toBe(next);
    const { me } = await rawRead<{ me: { user: { nameID: string } } }>(
      user.token,
      MY_NAME_ID
    );
    expect(me.user.nameID).toBe(next);
  });

  test('positive: the space admin renames its space through updateSpace.nameID and reads it back', async () => {
    const next = nameId('a17own-renamed');
    const { updateSpace } = await rawRead<{
      updateSpace: { id: string; nameID: string };
    }>(host.token, RENAME_SPACE, { id: spaceId, nameID: next });
    expect(updateSpace.nameID).toBe(next);
    const { lookup } = await rawRead<{ lookup: { space: { nameID: string } } }>(
      host.token,
      SPACE_NAME_ID,
      { id: spaceId }
    );
    expect(lookup.space.nameID).toBe(next);
  });

  test('negative: Content Full Access holds UPDATE on the space, is refused the protected nameID, and the nameID is unchanged', async () => {
    const before = (
      await rawRead<{ lookup: { space: { nameID: string } } }>(
        host.token,
        SPACE_NAME_ID,
        { id: spaceId }
      )
    ).lookup.space.nameID;
    const outcome = await rawOutcome(
      ['updateSpace'],
      ctx.tokens.PLATFORM_CONTENT_FULL_ACCESS,
      RENAME_SPACE,
      { id: spaceId, nameID: nameId('a17cfa') }
    );
    expect(outcome.kind, describeOutcome(outcome)).toBe('denied');
    const after = (
      await rawRead<{ lookup: { space: { nameID: string } } }>(
        host.token,
        SPACE_NAME_ID,
        { id: spaceId }
      )
    ).lookup.space.nameID;
    expect(after).toBe(before);
  });

  test('negative: Platform Users Admin, who administers user records, is refused another user’s rename', async () => {
    const outcome = await rawOutcome(
      ['updateActorNameID'],
      ctx.tokens.PLATFORM_USERS_ADMIN,
      RENAME_ACTOR,
      { id: user.id, nameID: nameId('a17ua') }
    );
    expect(outcome.kind, describeOutcome(outcome)).toBe('denied');
  });
});
