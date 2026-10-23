// Platform Support on the organisation Community tab (workspace#090,
// server#6692 / server#6708): what Support CAN do, that each action takes
// effect as it would for an organisation admin, and that each one leaves exactly
// one correct audit row (category `organization_administration`, initiator
// `platform_support`, identifiers only, never an address). Plus the self-target
// refusals and the accept-time honouring of an offered Admin/Owner.
//
// Plan: client-web/src/functional-e2e/support-org-community-admin/
//       support-org-community-admin-test-plan.md (A-01 ... A-11).
// The scope (stored rules, the 14-role matrix, direct add, excluded surfaces) is
// in support-org-community-scope.it-spec.ts.
//
// Every case asserts the EFFECT first and the audit second. The audit half is
// read through the MCP `analyze_audit_log` tool as Platform Audit Reader and
// needs the server to run with MCP_ENABLED=true; when it does not, the effect
// assertions still run and the case then SKIPS visibly (never a silent green).
// The email-invitation rows have no subject user, so MCP cannot read them:
// A-04 and the A-11 add-on read them by SQL and run on the local stack only.
//
// Actors: SUP = `global.support@alkem.io` (Platform Support only). DSUP =
// a throwaway Support user, where the case needs to take the role away or make
// the user an organisation admin. OA = the organisation's admin. Targets are
// fresh registered users, so their audit count starts at 0 and they can act
// (accept, apply).
import { RoleName } from '@alkemio/tests-lib/core/generated/alkemio-schema';
import {
  apply,
  assertSupportIsSupportOnly,
  assignUser,
  auditScope,
  createOrg,
  deleteEmailInvitation,
  deleteUserInvitation,
  eventOnApplication,
  eventOnInvitation,
  expectOk,
  expectSelfTarget,
  invite,
  invitationState,
  LOCAL_DB,
  membersOf,
  myOrganizationInvitationIds,
  newSupportUser,
  newUser,
  type Org,
  orgAdmin,
  orgAuditRowsSql,
  pendingApplicationIds,
  pendingInvitations,
  removeActor,
  removeOrgs,
  removePlatformRole,
  removeUser,
  removeUsers,
  resendEmailInvitation,
  applicationState,
  runId,
  sup,
} from './support-org-community.helpers';
import type { RegisteredUser } from '../../platform-roles/_support/users';

const uid = runId();
const created: { orgs: Org[]; users: RegisteredUser[] } = {
  orgs: [],
  users: [],
};
const makeUser = async (label: string): Promise<RegisteredUser> => {
  const user = await newUser(label);
  created.users.push(user);
  return user;
};
const makeSupportUser = async (label: string): Promise<RegisteredUser> => {
  const user = await newSupportUser(label);
  created.users.push(user);
  return user;
};
const makeOrg = async (
  label: string,
  options?: { orphan?: boolean }
): Promise<Org> => {
  const org = await createOrg(label, options);
  created.orgs.push(org);
  return org;
};
/** OA adds `user` as an organisation associate (an admin may add directly). */
const addAssociate = async (org: Org, user: { id: string }): Promise<void> =>
  expectOk(
    await assignUser(orgAdmin().token, org.roleSetId, user.id, RoleName.Associate),
    'OA adds the associate'
  );
const grant = async (
  org: Org,
  user: { id: string },
  role: RoleName
): Promise<void> =>
  expectOk(
    await assignUser(orgAdmin().token, org.roleSetId, user.id, role),
    `OA grants ${role}`
  );
const accept = (user: RegisteredUser, invitationId: string) =>
  eventOnInvitation(user.token, invitationId, 'ACCEPT');
const invitationOf = (
  res: Awaited<ReturnType<typeof invite>>
): { id: string; state: string; extraRoles: string[] } => {
  expectOk(res, 'invite');
  const result = res.data!.inviteForEntryRoleOnRoleSet[0];
  expect(result.type).toEqual('INVITED_TO_ROLE_SET');
  return result.invitation!;
};

afterAll(async () => {
  await removeOrgs(created.orgs);
  await removeUsers(created.users);
});

// ---------------------------------------------------------------------------
describe('A-01 — repair an orphan by invitation: offer Admin, the invitee accepts (P1, use case)', () => {
  test('A-01 — Support invites offering Admin, the offer is listed under Support, and on accept the invitee is Associate + Admin; two rows, attributed to Support', async ctx => {
    await assertSupportIsSupportOnly();
    const orphan = await makeOrg('a01', { orphan: true });
    const invitee = await makeUser('a01a');
    const audit = auditScope();
    const roleSetId = orphan.roleSetId;

    // The orphan really has nobody, and Support can read that (FR-011).
    const before = await membersOf(sup().token, roleSetId);
    expect(before[RoleName.Associate]).toEqual([]);
    expect(before[RoleName.Admin]).toEqual([]);

    const sent = await audit.rows(
      invitee.id,
      () => invite(sup().token, roleSetId, { users: [invitee.id], roles: [RoleName.Admin] }),
      [
        {
          action: 'invite_user',
          outcome: 'operation_succeeded',
          initiator: sup().id,
          roleSetId,
          roles: [RoleName.Admin],
        },
      ]
    );
    const invitation = invitationOf(sent);
    expect(invitation.extraRoles).toEqual([RoleName.Admin]);

    // The row also names the invitation it created.
    const listed = (await pendingInvitations(sup().token, roleSetId)).find(
      i => i.id === invitation.id
    );
    expect(listed, 'the invitation is listed under Support').toBeDefined();
    expect(listed!.extraRoles).toEqual([RoleName.Admin]);
    expect(listed!.createdBy?.id).toEqual(sup().id);

    const accepted = await audit.rows(
      invitee.id,
      () => accept(invitee, invitation.id),
      [
        {
          action: 'extra_role_honoured',
          outcome: 'role_granted',
          // The offerer, not the invitee.
          initiator: sup().id,
          roleSetId,
          roles: [RoleName.Admin],
          invitationId: invitation.id,
        },
      ]
    );
    expectOk(accepted, 'accept');
    expect(accepted.data?.eventOnInvitation.extraRolesWithheld ?? []).toEqual([]);

    const after = await membersOf(sup().token, roleSetId);
    expect(after[RoleName.Associate]).toContain(invitee.id);
    expect(after[RoleName.Admin]).toContain(invitee.id);
    audit.finish(ctx);
  });
});

// ---------------------------------------------------------------------------
describe('A-02 — the offerer loses the Support credential before the accept (P1, state transition)', () => {
  test('A-02 — the invitee is Associate without Admin, the withheld offer is reported and audited as standing_lost, attributed to Platform Support', async ctx => {
    await assertSupportIsSupportOnly();
    const org = await makeOrg('a02');
    const offerer = await makeSupportUser('a02s');
    const invitee = await makeUser('a02a');
    const audit = auditScope();
    const roleSetId = org.roleSetId;

    const sent = await audit.rows(
      invitee.id,
      () => invite(offerer.token, roleSetId, { users: [invitee.id], roles: [RoleName.Admin] }),
      [
        {
          action: 'invite_user',
          outcome: 'operation_succeeded',
          initiator: offerer.id,
          roleSetId,
          roles: [RoleName.Admin],
        },
      ]
    );
    const invitation = invitationOf(sent);

    await removePlatformRole(offerer.id, RoleName.PlatformSupport);

    const accepted = await audit.rows(
      invitee.id,
      () => accept(invitee, invitation.id),
      [
        {
          action: 'extra_role_withheld',
          outcome: 'operation_succeeded',
          // Stated, not derived: the offerer no longer holds the role.
          initiator: offerer.id,
          roleSetId,
          withheldRoles: [RoleName.Admin],
          reason: 'standing_lost',
          invitationId: invitation.id,
        },
      ]
    );
    expectOk(accepted, 'accept');
    expect(accepted.data?.eventOnInvitation.extraRolesWithheld).toEqual([
      RoleName.Admin,
    ]);
    const members = await membersOf(orgAdmin().token, roleSetId);
    expect(members[RoleName.Associate]).toContain(invitee.id);
    expect(members[RoleName.Admin]).not.toContain(invitee.id);
    audit.finish(ctx);
  });
});

// ---------------------------------------------------------------------------
describe('A-03 — the Owner cap at accept time: on the limit honoured, one over withheld (P2, boundary values)', () => {
  test('A-03 — with two owners an Owner offer is honoured (3 of 3); with three owners at accept time it is withheld as role_limits', async ctx => {
    await assertSupportIsSupportOnly();
    const org = await makeOrg('a03');
    const owner1 = await makeUser('a03a');
    const owner2 = await makeUser('a03b');
    const onLimit = await makeUser('a03c');
    const overLimit = await makeUser('a03d');
    const audit = auditScope();
    const roleSetId = org.roleSetId;
    const owners = async () =>
      (await membersOf(orgAdmin().token, roleSetId))[RoleName.Owner];

    for (const owner of [owner1, owner2]) {
      await addAssociate(org, owner);
      await grant(org, owner, RoleName.Owner);
    }
    expect(await owners()).toHaveLength(2);

    // 2 granted + 1 pending = 3: the invitation is created, and honoured.
    const first = invitationOf(
      await invite(sup().token, roleSetId, {
        users: [onLimit.id],
        roles: [RoleName.Owner],
      })
    );
    const honoured = await audit.rows(
      onLimit.id,
      () => accept(onLimit, first.id),
      [
        {
          action: 'extra_role_honoured',
          outcome: 'role_granted',
          initiator: sup().id,
          roleSetId,
          roles: [RoleName.Owner],
          invitationId: first.id,
        },
      ]
    );
    expectOk(honoured, 'accept on the limit');
    expect(honoured.data?.eventOnInvitation.extraRolesWithheld ?? []).toEqual([]);
    expect(await owners()).toContain(onLimit.id);
    expect(await owners()).toHaveLength(3);

    // Back to two owners, so the offer is accepted at invite time ...
    expectOk(
      await removeUser(orgAdmin().token, roleSetId, owner2.id, RoleName.Owner),
      'OA demotes owner2'
    );
    const second = invitationOf(
      await invite(sup().token, roleSetId, {
        users: [overLimit.id],
        roles: [RoleName.Owner],
      })
    );
    // ... and the cap fills before it is accepted.
    await grant(org, owner2, RoleName.Owner);
    expect(await owners()).toHaveLength(3);

    const withheld = await audit.rows(
      overLimit.id,
      () => accept(overLimit, second.id),
      [
        {
          action: 'extra_role_withheld',
          outcome: 'operation_succeeded',
          initiator: sup().id,
          roleSetId,
          withheldRoles: [RoleName.Owner],
          reason: 'role_limits',
          invitationId: second.id,
        },
      ]
    );
    expectOk(withheld, 'accept over the limit');
    expect(withheld.data?.eventOnInvitation.extraRolesWithheld).toEqual([
      RoleName.Owner,
    ]);
    const members = await membersOf(orgAdmin().token, roleSetId);
    expect(members[RoleName.Associate]).toContain(overLimit.id);
    expect(members[RoleName.Owner]).not.toContain(overLimit.id);
    expect(members[RoleName.Owner]).toHaveLength(3);
    audit.finish(ctx);
  });
});

// ---------------------------------------------------------------------------
describe('A-04 — email-invitation audit rows carry no address (P2, use case; local stack only)', () => {
  test.skipIf(!LOCAL_DB)(
    'A-04 — invite, resend and revoke by email write three rows with no subject user and no address anywhere (local stack)',
    async () => {
      await assertSupportIsSupportOnly();
      const org = await makeOrg('a04');
      const roleSetId = org.roleSetId;
      const local = `a04-${uid}`;
      const address = `${local}@alkemio.test`;

      const sent = await invite(sup().token, roleSetId, { emails: [address] });
      expectOk(sent, 'invite by email');
      const result = sent.data!.inviteForEntryRoleOnRoleSet[0];
      expect(result.type).toEqual('INVITED_TO_PLATFORM_AND_ROLE_SET');
      const platformInvitationId = result.platformInvitation!.id;

      // The first resend is allowed; a second inside the cooldown would be throttled.
      expectOk(
        await resendEmailInvitation(sup().token, platformInvitationId),
        'resend'
      );
      expectOk(
        await deleteEmailInvitation(sup().token, platformInvitationId),
        'revoke'
      );

      const rows = await orgAuditRowsSql(org.id);
      expect(rows.map(r => r.details.action)).toEqual([
        'invite_email',
        'resend_email_invitation',
        'revoke_email_invitation',
      ]);
      for (const row of rows) {
        expect(row.subjectUserId).toBeNull();
        expect(row.initiatorUserId).toEqual(sup().id);
        expect(row.initiatorRole).toEqual('platform_support');
        expect(row.outcome).toEqual('operation_succeeded');
        expect(row.details.platformInvitationId).toEqual(platformInvitationId);
        expect(row.details.roleSetId).toEqual(roleSetId);
        expect(JSON.stringify(row.details)).not.toMatch(/@/);
        expect(JSON.stringify(row)).not.toContain(local);
      }
    }
  );
});

// ---------------------------------------------------------------------------
describe('A-05 — promote, demote and remove a member (P1, use case)', () => {
  test('A-05 — each of the three calls takes effect and writes exactly one row, with the right outcome and action', async ctx => {
    await assertSupportIsSupportOnly();
    const org = await makeOrg('a05');
    const member = await makeUser('a05a');
    await addAssociate(org, member);
    const audit = auditScope();
    const roleSetId = org.roleSetId;
    const rolesOfMember = async () => {
      const members = await membersOf(sup().token, roleSetId);
      return [RoleName.Associate, RoleName.Admin, RoleName.Owner].filter(role =>
        members[role].includes(member.id)
      );
    };

    await audit.rows(
      member.id,
      async () =>
        expectOk(
          await assignUser(sup().token, roleSetId, member.id, RoleName.Admin),
          'promote'
        ),
      [
        {
          action: 'assign_role',
          outcome: 'role_granted',
          initiator: sup().id,
          roleSetId,
          roles: [RoleName.Admin],
        },
      ]
    );
    expect(await rolesOfMember()).toEqual([RoleName.Associate, RoleName.Admin]);

    await audit.rows(
      member.id,
      async () =>
        expectOk(
          await removeUser(sup().token, roleSetId, member.id, RoleName.Admin),
          'demote'
        ),
      [
        {
          action: 'remove_role',
          outcome: 'role_revoked',
          initiator: sup().id,
          roleSetId,
          roles: [RoleName.Admin],
        },
      ]
    );
    expect(await rolesOfMember()).toEqual([RoleName.Associate]);

    // The generic actor mutation, removing the entry role = removing the member.
    await audit.rows(
      member.id,
      async () =>
        expectOk(
          await removeActor(sup().token, roleSetId, member.id, RoleName.Associate),
          'remove'
        ),
      [
        {
          action: 'remove_member',
          outcome: 'role_revoked',
          initiator: sup().id,
          roleSetId,
          roles: [RoleName.Associate],
        },
      ]
    );
    expect(await rolesOfMember()).toEqual([]);
    audit.finish(ctx);
  });
});

// ---------------------------------------------------------------------------
describe('A-06 — application events, one row per state change (P1, state transition)', () => {
  test('A-06 — approve adds the applicant with one row; reject, reopen, reject, archive leave four rows in order; an invalid event writes none', async ctx => {
    await assertSupportIsSupportOnly();
    const org = await makeOrg('a06');
    const approved = await makeUser('a06a');
    const cycled = await makeUser('a06b');
    const untouched = await makeUser('a06c');
    const audit = auditScope();
    const roleSetId = org.roleSetId;
    const p1 = await apply(approved.token, roleSetId);
    const p2 = await apply(cycled.token, roleSetId);
    const p3 = await apply(untouched.token, roleSetId);
    const stateOf = async (id: string) =>
      (await applicationState(sup().token, id)).state;
    const row = (
      action: string,
      outcome: 'role_granted' | 'operation_succeeded',
      applicationId: string
    ) => ({
      action,
      outcome,
      initiator: sup().id,
      roleSetId,
      applicationId,
    });

    // 1. Support reads the pending applications (the tab's list).
    expect(await pendingApplicationIds(sup().token, roleSetId)).toEqual(
      expect.arrayContaining([p1, p2, p3])
    );

    // 2. APPROVE: the applicant becomes an Associate; one row, no
    //    `mark_application_approved` (that internal step is not a resolver action).
    await audit.rows(
      approved.id,
      async () =>
        expectOk(await eventOnApplication(sup().token, p1, 'APPROVE'), 'approve'),
      [row('approve_application', 'role_granted', p1)]
    );
    expect(await stateOf(p1)).toEqual('approved');
    expect((await membersOf(sup().token, roleSetId))[RoleName.Associate]).toContain(
      approved.id
    );

    // 3. REJECT, REOPEN, REJECT, ARCHIVE: four state changes, four rows.
    const steps: [string, string, string][] = [
      ['REJECT', 'rejected', 'reject_application'],
      ['REOPEN', 'new', 'reopen_application'],
      ['REJECT', 'rejected', 'reject_application'],
      ['ARCHIVE', 'archived', 'archive_application'],
    ];
    await audit.rows(
      cycled.id,
      async () => {
        for (const [event, state] of steps) {
          expectOk(await eventOnApplication(sup().token, p2, event), event);
          expect(await stateOf(p2), `after ${event}`).toEqual(state);
        }
      },
      steps.map(([, , action]) => row(action, 'operation_succeeded', p2))
    );
    expect((await membersOf(sup().token, roleSetId))[RoleName.Associate]).not.toContain(
      cycled.id
    );

    // 4. An event that is not valid in the state fails, changes nothing and writes no row.
    await audit.noRow(untouched.id, async () => {
      const invalid = await eventOnApplication(sup().token, p3, 'ARCHIVE');
      expect(invalid.errors.length).toBeGreaterThan(0);
      expect(invalid.errors[0].message).toContain('Not in valid set of next events');
    });
    expect(await stateOf(p3)).toEqual('new');
    audit.finish(ctx);
  });
});

// ---------------------------------------------------------------------------
describe('A-07 — revoke a pending user invitation (P1, use case)', () => {
  test('A-07 — Support revokes an invitation an organisation admin made: gone from both lists, one row on the invitee', async ctx => {
    await assertSupportIsSupportOnly();
    const org = await makeOrg('a07');
    const invitee = await makeUser('a07a');
    const audit = auditScope();
    const roleSetId = org.roleSetId;
    const invitation = invitationOf(
      await invite(orgAdmin().token, roleSetId, { users: [invitee.id] })
    );
    expect(await myOrganizationInvitationIds(invitee.token)).toContain(
      invitation.id
    );

    await audit.rows(
      invitee.id,
      async () =>
        expectOk(
          await deleteUserInvitation(sup().token, invitation.id),
          'revoke'
        ),
      [
        {
          action: 'revoke_user_invitation',
          outcome: 'operation_succeeded',
          initiator: sup().id,
          roleSetId,
          invitationId: invitation.id,
        },
      ]
    );
    expect((await pendingInvitations(sup().token, roleSetId)).map(i => i.id)).not.toContain(
      invitation.id
    );
    expect(await myOrganizationInvitationIds(invitee.token)).not.toContain(
      invitation.id
    );
    expect(await invitationState(orgAdmin().token, invitation.id)).toBeNull();
    audit.finish(ctx);
  });
});

// ---------------------------------------------------------------------------
describe('A-08 — the last owner cannot be removed, and no row is written (P2, boundary values)', () => {
  test('A-08 — removing one of two owners works with one row; removing the last is refused with the minimum-limit error and no row', async ctx => {
    await assertSupportIsSupportOnly();
    const org = await makeOrg('a08');
    const owner1 = await makeUser('a08a');
    const owner2 = await makeUser('a08b');
    const audit = auditScope();
    const roleSetId = org.roleSetId;
    for (const owner of [owner1, owner2]) {
      await addAssociate(org, owner);
      await grant(org, owner, RoleName.Owner);
    }
    const owners = async () =>
      (await membersOf(sup().token, roleSetId))[RoleName.Owner];

    // Just inside the limit: two owners, one may go.
    await audit.rows(
      owner2.id,
      async () =>
        expectOk(
          await removeUser(sup().token, roleSetId, owner2.id, RoleName.Owner),
          'remove one of two owners'
        ),
      [
        {
          action: 'remove_role',
          outcome: 'role_revoked',
          initiator: sup().id,
          roleSetId,
          roles: [RoleName.Owner],
        },
      ]
    );
    expect(await owners()).toEqual([owner1.id]);

    // On the limit: the only owner stays.
    await audit.noRow(owner1.id, async () => {
      const refused = await removeUser(
        sup().token,
        roleSetId,
        owner1.id,
        RoleName.Owner
      );
      expect(refused.errors.length).toBeGreaterThan(0);
      expect(refused.errors[0].message).toContain(
        "Min limit of users reached for role 'owner': 1, cannot remove user."
      );
    });
    expect(await owners()).toEqual([owner1.id]);
    audit.finish(ctx);
  });
});

// ---------------------------------------------------------------------------
describe('A-09 — self-targeted Support actions are refused (P1, decision table)', () => {
  test('A-09 — invite, own-address invite, self-approve, self-promote to Admin and Owner and removing an Admin role it does not hold are all refused with the self-target code; leaving the organisation works and writes no row', async ctx => {
    await assertSupportIsSupportOnly();
    const consented = await makeOrg('a09');
    const notMember = await makeOrg('a09b');
    const other = await makeUser('a09a');
    const audit = auditScope();
    const me = sup();

    // SUP is an Associate of `consented` by consent: OA invites, SUP accepts.
    const invitation = invitationOf(
      await invite(orgAdmin().token, consented.roleSetId, { users: [me.id] })
    );
    expectOk(
      await eventOnInvitation(me.token, invitation.id, 'ACCEPT'),
      'SUP accepts'
    );
    expect((await membersOf(me.token, consented.roleSetId))[RoleName.Associate]).toContain(
      me.id
    );
    await addAssociate(consented, other);

    await audit.noRow(me.id, async () => {
      // a. invite oneself, offering Admin
      expectSelfTarget(
        await invite(me.token, notMember.roleSetId, {
          users: [me.id],
          roles: [RoleName.Admin],
        })
      );
      // b. invite one's own address: resolved to the user, then refused
      expectSelfTarget(
        await invite(me.token, notMember.roleSetId, { emails: [me.email] })
      );
      expect(await pendingInvitations(me.token, notMember.roleSetId)).toEqual([]);

      // c. apply, then approve one's own application
      const application = await apply(me.token, notMember.roleSetId);
      expectSelfTarget(await eventOnApplication(me.token, application, 'APPROVE'));
      expect((await applicationState(orgAdmin().token, application)).state).toEqual(
        'new'
      );
      expect(
        (await membersOf(orgAdmin().token, notMember.roleSetId))[RoleName.Associate]
      ).not.toContain(me.id);

      // d, e. promote oneself
      expectSelfTarget(
        await assignUser(me.token, consented.roleSetId, me.id, RoleName.Admin)
      );
      expectSelfTarget(
        await assignUser(me.token, consented.roleSetId, me.id, RoleName.Owner)
      );
      const members = await membersOf(orgAdmin().token, consented.roleSetId);
      expect(members[RoleName.Admin]).not.toContain(me.id);
      expect(members[RoleName.Owner]).not.toContain(me.id);

      // f. "demote" oneself from a role it does not hold: the only reachable
      //    form, because holding Admin or Owner would make SUP an organisation
      //    admin and take the entity-admin path instead.
      expectSelfTarget(
        await removeUser(me.token, consented.roleSetId, me.id, RoleName.Admin)
      );

      // Control: leaving is always allowed, and is not a Support action.
      expectOk(
        await removeUser(me.token, consented.roleSetId, me.id, RoleName.Associate),
        'SUP leaves'
      );
      expect(
        (await membersOf(orgAdmin().token, consented.roleSetId))[RoleName.Associate]
      ).not.toContain(me.id);
    });

    // Positive control for the "no row" above: a legitimate Support action on
    // someone else, measured by the same helper in the same test.
    await audit.rows(
      other.id,
      async () =>
        expectOk(
          await assignUser(me.token, consented.roleSetId, other.id, RoleName.Admin),
          'promote someone else'
        ),
      [
        {
          action: 'assign_role',
          outcome: 'role_granted',
          initiator: me.id,
          roleSetId: consented.roleSetId,
          roles: [RoleName.Admin],
        },
      ]
    );
    audit.finish(ctx);
  });
});

// ---------------------------------------------------------------------------
describe('A-10 — a self-offered Owner is withheld at accept (P2, state transition)', () => {
  test('A-10 — an organisation admin who is also Support invites itself offering Owner, steps down, and on accept gets Associate only, audited as self_offer', async ctx => {
    await assertSupportIsSupportOnly();
    const org = await makeOrg('a10');
    const dsup = await makeSupportUser('a10s');
    const audit = auditScope();
    const roleSetId = org.roleSetId;

    // OA makes the Support user an organisation ADMIN without membership.
    await grant(org, dsup, RoleName.Admin);

    // As an organisation admin it acts on the entity-admin path, so no
    // self-target check applies: the invitation is created.
    const invitation = invitationOf(
      await invite(dsup.token, roleSetId, {
        users: [dsup.id],
        roles: [RoleName.Owner],
      })
    );
    expectOk(
      await removeUser(orgAdmin().token, roleSetId, dsup.id, RoleName.Admin),
      'OA removes the admin role'
    );

    const accepted = await audit.rows(
      dsup.id,
      () => accept(dsup, invitation.id),
      [
        {
          action: 'extra_role_withheld',
          outcome: 'operation_succeeded',
          initiator: dsup.id,
          roleSetId,
          withheldRoles: [RoleName.Owner],
          reason: 'self_offer',
          invitationId: invitation.id,
        },
      ]
    );
    expectOk(accepted, 'accept');
    expect(accepted.data?.eventOnInvitation.extraRolesWithheld).toEqual([
      RoleName.Owner,
    ]);
    const members = await membersOf(orgAdmin().token, roleSetId);
    expect(members[RoleName.Associate]).toContain(dsup.id);
    expect(members[RoleName.Owner]).not.toContain(dsup.id);
    audit.finish(ctx);
  });
});

// ---------------------------------------------------------------------------
describe('A-11 — organisation-admin actions write no Support row (P1, decision table)', () => {
  test('A-11 — Support\'s promotion writes one row; the same actions by an organisation admin, and by an admin who is also Support, write none', async ctx => {
    await assertSupportIsSupportOnly();
    const org = await makeOrg('a11');
    const roleSetId = org.roleSetId;
    const bySupport = await makeUser('a11a');
    const promoted = await makeUser('a11b');
    const invitedByAdmin = await makeUser('a11c');
    const revoked = await makeUser('a11d');
    const approved = await makeUser('a11e');
    const rejected = await makeUser('a11f');
    const byDualRole = await makeUser('a11g');
    const lateInvitee = await makeUser('a11i');
    const dsup = await makeSupportUser('a11s');
    const audit = auditScope();
    const oa = orgAdmin().token;
    const rolesOf = async (user: { id: string }) => {
      const members = await membersOf(oa, roleSetId);
      return [RoleName.Associate, RoleName.Admin, RoleName.Owner].filter(role =>
        members[role].includes(user.id)
      );
    };

    for (const user of [bySupport, promoted, byDualRole]) {
      await addAssociate(org, user);
    }
    const applicationApproved = await apply(approved.token, roleSetId);
    const applicationRejected = await apply(rejected.token, roleSetId);
    const revokedInvitation = invitationOf(
      await invite(oa, roleSetId, { users: [revoked.id] })
    );

    // Positive control: Support's own promotion writes exactly one row.
    await audit.rows(
      bySupport.id,
      async () =>
        expectOk(
          await assignUser(sup().token, roleSetId, bySupport.id, RoleName.Admin),
          'SUP promotes'
        ),
      [
        {
          action: 'assign_role',
          outcome: 'role_granted',
          initiator: sup().id,
          roleSetId,
          roles: [RoleName.Admin],
        },
      ]
    );
    expect(await rolesOf(bySupport)).toEqual([RoleName.Associate, RoleName.Admin]);

    // OA promotes, then demotes: today's behaviour, no row.
    await audit.noRow(promoted.id, async () => {
      expectOk(
        await assignUser(oa, roleSetId, promoted.id, RoleName.Admin),
        'OA promotes'
      );
      expect(await rolesOf(promoted)).toEqual([RoleName.Associate, RoleName.Admin]);
      expectOk(
        await removeUser(oa, roleSetId, promoted.id, RoleName.Admin),
        'OA demotes'
      );
      expect(await rolesOf(promoted)).toEqual([RoleName.Associate]);
    });

    // OA invites offering Admin; the invitee accepts: Associate + Admin, no
    // `invite_user`, no `extra_role_honoured`.
    await audit.noRow(invitedByAdmin.id, async () => {
      const invitation = invitationOf(
        await invite(oa, roleSetId, {
          users: [invitedByAdmin.id],
          roles: [RoleName.Admin],
        })
      );
      const accepted = await accept(invitedByAdmin, invitation.id);
      expectOk(accepted, 'accept');
      expect(accepted.data?.eventOnInvitation.extraRolesWithheld ?? []).toEqual([]);
      expect(await rolesOf(invitedByAdmin)).toEqual([
        RoleName.Associate,
        RoleName.Admin,
      ]);
    });

    // OA revokes a pending invitation.
    await audit.noRow(revoked.id, async () => {
      expectOk(
        await deleteUserInvitation(oa, revokedInvitation.id),
        'OA revokes'
      );
      expect(await invitationState(oa, revokedInvitation.id)).toBeNull();
    });

    // OA approves one application and rejects another.
    await audit.noRow(approved.id, async () => {
      expectOk(
        await eventOnApplication(oa, applicationApproved, 'APPROVE'),
        'OA approves'
      );
      expect(await rolesOf(approved)).toEqual([RoleName.Associate]);
    });
    await audit.noRow(rejected.id, async () => {
      expectOk(
        await eventOnApplication(oa, applicationRejected, 'REJECT'),
        'OA rejects'
      );
      expect((await applicationState(oa, applicationRejected)).state).toEqual(
        'rejected'
      );
    });

    // An organisation admin who is ALSO Platform Support acts as the admin:
    // the entity-admin path wins and nothing is written.
    await grant(org, dsup, RoleName.Admin);
    await audit.noRow(byDualRole.id, async () => {
      expectOk(
        await assignUser(dsup.token, roleSetId, byDualRole.id, RoleName.Admin),
        'admin + Support promotes'
      );
      expect(await rolesOf(byDualRole)).toEqual([
        RoleName.Associate,
        RoleName.Admin,
      ]);
    });

    // SC-003 asks for an org-admin control on every audited action. The rest:
    // removing a member (`remove_member`) ...
    await audit.noRow(approved.id, async () => {
      expectOk(
        await removeUser(oa, roleSetId, approved.id, RoleName.Associate),
        'OA removes the member'
      );
      expect(await rolesOf(approved)).toEqual([]);
    });

    // ... reopening and archiving an application (`reopen_application`,
    // `archive_application`, and a second `reject_application`) ...
    await audit.noRow(rejected.id, async () => {
      for (const [event, state] of [
        ['REOPEN', 'new'],
        ['REJECT', 'rejected'],
        ['ARCHIVE', 'archived'],
      ] as const) {
        expectOk(
          await eventOnApplication(oa, applicationRejected, event),
          `OA ${event}`
        );
        expect(
          (await applicationState(oa, applicationRejected)).state,
          `after ${event}`
        ).toEqual(state);
      }
    });

    // ... and an offer withheld at accept (`extra_role_withheld`): an admin who
    // lost standing before the accept has no Support offer row to recover, so
    // the withholding (062 US2-AS8 behaviour) writes nothing. The Admin cap is
    // six and the organisation is at it, so two seats are handed back first.
    for (const user of [dsup, byDualRole]) {
      expectOk(
        await removeUser(oa, roleSetId, user.id, RoleName.Admin),
        `OA demotes ${user.id}`
      );
    }
    await grant(org, promoted, RoleName.Admin);
    const lateInvitation = invitationOf(
      await invite(promoted.token, roleSetId, {
        users: [lateInvitee.id],
        roles: [RoleName.Admin],
      })
    );
    expectOk(
      await removeUser(oa, roleSetId, promoted.id, RoleName.Admin),
      'OA demotes the offering admin'
    );
    await audit.noRow(lateInvitee.id, async () => {
      const accepted = await accept(lateInvitee, lateInvitation.id);
      expectOk(accepted, 'accept');
      expect(accepted.data?.eventOnInvitation.extraRolesWithheld).toEqual([
        RoleName.Admin,
      ]);
      expect(await rolesOf(lateInvitee)).toEqual([RoleName.Associate]);
    });
    audit.finish(ctx);
  });

  test.skipIf(!LOCAL_DB)(
    'A-11 — an organisation admin\'s email invite, resend and revoke add no row to the organisation\'s trail: only Support\'s one row is there (local stack)',
    async () => {
      await assertSupportIsSupportOnly();
      const org = await makeOrg('a11x');
      const roleSetId = org.roleSetId;
      const member = await makeUser('a11h');
      await addAssociate(org, member);
      const oa = orgAdmin().token;

      const sent = await invite(oa, roleSetId, {
        emails: [`a11-${uid}@alkemio.test`],
      });
      expectOk(sent, 'OA invites by email');
      const id = sent.data!.inviteForEntryRoleOnRoleSet[0].platformInvitation!.id;
      expectOk(await resendEmailInvitation(oa, id), 'OA resends');
      expectOk(await deleteEmailInvitation(oa, id), 'OA revokes');
      expect(await orgAuditRowsSql(org.id)).toEqual([]);

      // Positive control: Support's one promotion is the only row.
      expectOk(
        await assignUser(sup().token, roleSetId, member.id, RoleName.Admin),
        'SUP promotes'
      );
      const rows = await orgAuditRowsSql(org.id);
      expect(rows).toHaveLength(1);
      expect(rows[0].initiatorUserId).toEqual(sup().id);
      expect(rows[0].details.action).toEqual('assign_role');
      expect(rows[0].subjectUserId).toEqual(member.id);
    }
  );
});
