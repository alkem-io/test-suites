// Platform Support on the organisation Community tab (workspace#090,
// server#6692 / server#6708): the SCOPE of the new privilege. What is stored on
// an organisation's role set, who holds what (the 14 platform roles), and the
// surfaces Support must NOT reach: direct add, the application form, the
// organisation profile and settings, the invitation lifecycle events, and
// everything a Content Full Access holder can do today.
//
// Plan: client-web/src/functional-e2e/support-org-community-admin/
//       support-org-community-admin-test-plan.md (S-01 ... S-07).
// The actions Support CAN take, and the audit rows they leave, are in
// support-org-community-actions.it-spec.ts.
//
// Actors: SUP = `global.support@alkem.io` (Platform Support and nothing else;
// asserted in every describe's beforeAll). OA = the fixture organisation's
// admin. The harness admin is never the Support actor: it also holds Content
// Full Access and is ADMIN of every organisation it creates.
//
// Every fixture organisation is created in this file, after the deploy under
// test, so its stored policy carries the Support rules. A pre-deploy
// organisation is the manual canary (plan M1), except S-07 which strips the
// rules by SQL on the local stack to prove "not reset" grants nothing.
import { queryHarnessDb, TestScenarioFactory } from '@alkemio/tests-lib';
import { OrganizationWithSpaceModel } from '@alkemio/tests-lib/scenario/models/OrganizationWithSpaceModel';
import { RoleName } from '@alkemio/tests-lib/core/generated/alkemio-schema';
import { rawRead, rawRequest } from '../../platform-roles/_support/raw-request';
import type { RegisteredUser } from '../../platform-roles/_support/users';
import {
  apply,
  applicationState,
  assertSupportIsSupportOnly,
  assignActor,
  assignUser,
  auditScope,
  createOrg,
  deleteUserInvitation,
  eventOnApplication,
  eventOnInvitation,
  expectForbidden,
  expectOk,
  harnessAdmin,
  invite,
  invitationState,
  LOCAL_DB,
  membersOf,
  newUser,
  type Org,
  orgAdmin,
  pendingInvitations,
  platformRoleUsers,
  removeOrgs,
  removeUser,
  removeUsers,
  resendEmailInvitation,
  resetOrganization,
  runId,
  sup,
} from './support-org-community.helpers';

const SUPPORT_MEMBERSHIP = 'PLATFORM_SUPPORT_ORG_MEMBERSHIP';
const MEMBERSHIP_RULE =
  'credentialRuleTypes-organizationRoleSetPlatformSupportMembership';
const INVITE_RULE =
  'credentialRuleTypes-organizationRoleSetPlatformSupportInvite';
/** What Platform Support must never be granted on an organisation role set. */
const NEVER_FOR_SUPPORT = [
  'GRANT',
  'UPDATE',
  'CREATE',
  'DELETE',
  'ROLESET_ENTRY_ROLE_ASSIGN',
];

type Rule = {
  name: string | null;
  cascade: boolean;
  grantedPrivileges: string[];
  criterias: { type: string; resourceID: string }[];
};

const RULES = 'credentialRules { name cascade grantedPrivileges criterias { type resourceID } }';

const isSupportRule = (rule: Rule): boolean =>
  rule.criterias.some(c => c.type === 'platform-support');

/** Rules that grant `privilege` to anyone. */
const rulesGranting = (rules: Rule[], privilege: string): Rule[] =>
  rules.filter(r => r.grantedPrivileges.includes(privilege));

/** The rules of `rules` that name Platform Support and grant `privilege`. */
const supportRulesGranting = (rules: Rule[], privilege: string): Rule[] =>
  rules.filter(
    r => isSupportRule(r) && r.grantedPrivileges.includes(privilege)
  );

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
const makeOrg = async (label: string): Promise<Org> => {
  const org = await createOrg(label);
  created.orgs.push(org);
  return org;
};

afterAll(async () => {
  await removeOrgs(created.orgs);
  await removeUsers(created.users);
});

// ---------------------------------------------------------------------------
describe('S-01 — the stored rules (P1, decision table)', () => {
  let org: Org;
  let spaceScenario: OrganizationWithSpaceModel;
  let invitationId = '';
  let platformInvitationId = '';
  let applicationId = '';

  beforeAll(async () => {
    await assertSupportIsSupportOnly();
    org = await makeOrg('s01');
    const invitee = await makeUser('s01a');
    const applicant = await makeUser('s01b');
    const user = await invite(orgAdmin().token, org.roleSetId, {
      users: [invitee.id],
    });
    invitationId = user.data!.inviteForEntryRoleOnRoleSet[0].invitation!.id;
    const email = await invite(orgAdmin().token, org.roleSetId, {
      emails: [`s01-${uid}@alkemio.test`],
    });
    platformInvitationId =
      email.data!.inviteForEntryRoleOnRoleSet[0].platformInvitation!.id;
    applicationId = await apply(applicant.token, org.roleSetId);
    spaceScenario = await TestScenarioFactory.createBaseScenario({
      name: 's090-scope',
      space: { collaboration: { addTutorialCallouts: false } },
    });
  });

  afterAll(async () => {
    await TestScenarioFactory.cleanUpBaseScenario(spaceScenario);
  });

  test('S-01 — the organisation role set carries exactly the two Support rules, and nothing else for Support', async () => {
    const data = await rawRead<{
      lookup: { roleSet: { authorization: { credentialRules: Rule[] } } };
    }>(
      orgAdmin().token,
      `query($id: UUID!) { lookup { roleSet(ID: $id) { authorization { ${RULES} } } } }`,
      { id: org.roleSetId }
    );
    const rules = data.lookup.roleSet.authorization.credentialRules;

    const membership = rules.filter(r => r.name === MEMBERSHIP_RULE);
    expect(membership).toHaveLength(1);
    expect(membership[0].cascade).toBe(true);
    expect(membership[0].grantedPrivileges).toEqual([SUPPORT_MEMBERSHIP]);
    expect(membership[0].criterias.map(c => c.type)).toEqual([
      'platform-support',
    ]);

    const inviteRule = rules.filter(r => r.name === INVITE_RULE);
    expect(inviteRule).toHaveLength(1);
    expect(inviteRule[0].cascade).toBe(false);
    expect(inviteRule[0].grantedPrivileges).toEqual([
      'ROLESET_ENTRY_ROLE_INVITE',
    ]);
    expect(inviteRule[0].criterias.map(c => c.type)).toEqual([
      'platform-support',
    ]);

    // Support is named by exactly these two rules, so it is granted exactly
    // those two privileges: nothing that lets it write beyond consent.
    const supportGrants = rules
      .filter(isSupportRule)
      .flatMap(r => r.grantedPrivileges)
      .sort();
    expect(supportGrants).toEqual(
      [SUPPORT_MEMBERSHIP, 'ROLESET_ENTRY_ROLE_INVITE'].sort()
    );
    for (const forbidden of NEVER_FOR_SUPPORT) {
      expect(supportRulesGranting(rules, forbidden), forbidden).toEqual([]);
    }
    // Positive control for the "never" list: the admins DO hold them, so the
    // filter is not trivially empty.
    expect(
      rules.some(
        r =>
          r.criterias.some(c => c.type === 'organization-admin') &&
          r.grantedPrivileges.includes('GRANT')
      )
    ).toBe(true);
  });

  test('S-01 — invitation, email invitation and application carry the membership rule, never the (non-cascading) invite rule; the organisation, Space role set and platform carry none', async () => {
    const children = await rawRead<{
      lookup: Record<string, { authorization: { credentialRules: Rule[] } }>;
    }>(
      orgAdmin().token,
      `query($inv: UUID!, $pi: UUID!, $app: UUID!, $org: UUID!) { lookup {
        invitation(ID: $inv) { authorization { ${RULES} } }
        platformInvitation(ID: $pi) { authorization { ${RULES} } }
        application(ID: $app) { authorization { ${RULES} } }
        organization(ID: $org) { authorization { ${RULES} } }
      } }`,
      {
        inv: invitationId,
        pi: platformInvitationId,
        app: applicationId,
        org: org.id,
      }
    );
    for (const child of ['invitation', 'platformInvitation', 'application']) {
      const rules = children.lookup[child].authorization.credentialRules;
      expect(rules, child).not.toBeNull();
      expect(
        supportRulesGranting(rules, SUPPORT_MEMBERSHIP).length,
        `${child} carries the membership rule`
      ).toBeGreaterThanOrEqual(1);
      expect(
        supportRulesGranting(rules, 'ROLESET_ENTRY_ROLE_INVITE'),
        `${child} must not inherit the non-cascading invite rule`
      ).toEqual([]);
      for (const forbidden of NEVER_FOR_SUPPORT) {
        expect(supportRulesGranting(rules, forbidden), child).toEqual([]);
      }
    }

    // The privilege exists only on organisation role sets and their children.
    const orgRules = children.lookup.organization.authorization.credentialRules;
    expect(supportRulesGranting(orgRules, SUPPORT_MEMBERSHIP)).toEqual([]);

    const spaceRoleSetId = spaceScenario.space.community.roleSetId;
    // The harness admin can read both policies; the assertion is about what is
    // STORED, not about who may read it.
    const elsewhere = await rawRead<{
      lookup: { roleSet: { authorization: { credentialRules: Rule[] } } };
      platform: { authorization: { credentialRules: Rule[] } };
    }>(
      harnessAdmin().token,
      `query($id: UUID!) {
        lookup { roleSet(ID: $id) { authorization { ${RULES} } } }
        platform { authorization { ${RULES} } }
      }`,
      { id: spaceRoleSetId }
    );
    const spaceRules = elsewhere.lookup.roleSet.authorization.credentialRules;
    expect(spaceRules.length).toBeGreaterThan(0);
    expect(
      rulesGranting(spaceRules, SUPPORT_MEMBERSHIP),
      'Space role set'
    ).toEqual([]);
    const platformRules = elsewhere.platform.authorization.credentialRules;
    expect(platformRules.length).toBeGreaterThan(0);
    expect(rulesGranting(platformRules, SUPPORT_MEMBERSHIP), 'platform').toEqual(
      []
    );
  });
});

// ---------------------------------------------------------------------------
describe('S-02 — who holds what: the 14 platform roles (P1, decision table)', () => {
  let org: Org;
  let invitationId = '';
  let applicationId = '';
  let roles: Awaited<ReturnType<typeof platformRoleUsers>>;

  beforeAll(async () => {
    await assertSupportIsSupportOnly();
    roles = await platformRoleUsers();
    org = await makeOrg('s02');
    const invitee = await makeUser('s02a');
    const applicant = await makeUser('s02b');
    const user = await invite(orgAdmin().token, org.roleSetId, {
      users: [invitee.id],
    });
    invitationId = user.data!.inviteForEntryRoleOnRoleSet[0].invitation!.id;
    applicationId = await apply(applicant.token, org.roleSetId);
  });

  type Held = {
    roleSet: string[];
    invitation: string[];
    application: string[];
    organization: string[];
  };
  const read = async (token: string): Promise<Held> => {
    const { data, errors } = await rawRequest<{
      lookup: {
        myPrivileges: {
          roleSet: string[] | null;
          invitation: string[] | null;
          application: string[] | null;
        };
        organization: { authorization: { myPrivileges: string[] | null } };
      };
    }>(
      token,
      `query($rs: UUID!, $inv: UUID!, $app: UUID!, $org: UUID!) { lookup {
        myPrivileges { roleSet(ID: $rs) invitation(ID: $inv) application(ID: $app) }
        organization(ID: $org) { authorization { myPrivileges } }
      } }`,
      { rs: org.roleSetId, inv: invitationId, app: applicationId, org: org.id }
    );
    expect(errors, 'privilege read').toEqual([]);
    const my = data!.lookup.myPrivileges;
    return {
      roleSet: my.roleSet ?? [],
      invitation: my.invitation ?? [],
      application: my.application ?? [],
      organization: data!.lookup.organization.authorization.myPrivileges ?? [],
    };
  };

  const expectNoSupportPrivilege = (held: Held, who: string) => {
    expect(held.roleSet, `${who} role set`).not.toContain(SUPPORT_MEMBERSHIP);
    expect(held.roleSet, `${who} role set`).not.toContain(
      'ROLESET_ENTRY_ROLE_INVITE'
    );
    expect(held.invitation, `${who} invitation`).not.toContain(
      SUPPORT_MEMBERSHIP
    );
    expect(held.application, `${who} application`).not.toContain(
      SUPPORT_MEMBERSHIP
    );
  };
  const expectNoWriteReach = (held: Held, who: string) => {
    expect(held.roleSet, `${who} role set`).not.toContain('GRANT');
    expect(held.roleSet, `${who} role set`).not.toContain(
      'ROLESET_ENTRY_ROLE_ASSIGN'
    );
  };

  test('S-02 — Platform Support (the platform-roles user and the shared persona) holds the two Support privileges and neither GRANT, ASSIGN nor org UPDATE', async () => {
    for (const [who, token] of [
      ['PLATFORM_SUPPORT user', roles.tokens.PLATFORM_SUPPORT],
      ['global.support persona', sup().token],
    ] as const) {
      const held = await read(token);
      expect(held.roleSet, who).toEqual(
        expect.arrayContaining([SUPPORT_MEMBERSHIP, 'ROLESET_ENTRY_ROLE_INVITE'])
      );
      expect(held.invitation, who).toContain(SUPPORT_MEMBERSHIP);
      expect(held.application, who).toContain(SUPPORT_MEMBERSHIP);
      expectNoWriteReach(held, who);
      expect(held.organization, `${who} organisation`).not.toContain('UPDATE');
    }
  });

  test('S-02 — the organisation admin (control) holds invite, GRANT and ASSIGN but not the Support privilege; a plain registered user holds none', async () => {
    const admin = await read(orgAdmin().token);
    expect(admin.roleSet).toEqual(
      expect.arrayContaining([
        'ROLESET_ENTRY_ROLE_INVITE',
        'GRANT',
        'ROLESET_ENTRY_ROLE_ASSIGN',
      ])
    );
    expect(admin.organization).toContain('UPDATE');
    expect(admin.invitation).not.toContain(SUPPORT_MEMBERSHIP);
    expect(admin.application).not.toContain(SUPPORT_MEMBERSHIP);
    expect(admin.roleSet).not.toContain(SUPPORT_MEMBERSHIP);

    const { token } = await makeUser('s02c');
    const plain = await read(token);
    expectNoSupportPrivilege(plain, 'plain user');
    expectNoWriteReach(plain, 'plain user');
    expect(plain.organization).not.toContain('UPDATE');
  });

  const OTHER_ROLES = [
    'PLATFORM_CONTENT_FULL_ACCESS',
    'PLATFORM_ROLES_ADMIN',
    'PLATFORM_RESOURCE_ADMIN',
    'PLATFORM_SETTINGS_ADMIN',
    'PLATFORM_OPERATIONS_ADMIN',
    'PLATFORM_USERS_ADMIN',
    'PLATFORM_LICENSE_MANAGER',
    'PLATFORM_SPACES_READER',
    'PLATFORM_AUDIT_READER',
    'FEATURE_BETA_TESTER',
    'FEATURE_VIRTUAL_ASSISTANT',
    'FEATURE_ORGANIZATION_CREATOR',
    'FEATURE_VC_CAMPAIGN',
  ] as const;

  test.each(OTHER_ROLES)(
    'S-02 — %s does not hold the Support privileges, GRANT or ASSIGN on the organisation role set',
    async role => {
      const held = await read(roles.tokens[role]);
      expectNoSupportPrivilege(held, role);
      expectNoWriteReach(held, role);
      // Content Full Access reaches the organisation through the root CRUD
      // rule (plan OP-6); recorded here, not asserted for the other roles.
      if (role === 'PLATFORM_CONTENT_FULL_ACCESS') {
        console.log(
          `[S-02] Content Full Access org policy privileges: ${held.organization.join(', ')}`
        );
      }
    }
  );
});

// ---------------------------------------------------------------------------
describe('S-03 — Support can never add anyone directly (P1, equivalence partitions)', () => {
  let org: Org;
  let nonMember: RegisteredUser;
  let member: RegisteredUser;

  beforeAll(async () => {
    await assertSupportIsSupportOnly();
    org = await makeOrg('s03');
    nonMember = await makeUser('s03a');
    member = await makeUser('s03b');
    expectOk(
      await assignUser(
        orgAdmin().token,
        org.roleSetId,
        member.id,
        RoleName.Associate
      ),
      'OA adds the associate'
    );
  });

  test('S-03 — assigning Associate, Admin or Owner to a non-member is refused on the entry privilege, by both mutations, and nothing is written; the control (promoting a member) succeeds with one row', async ctx => {
    const audit = auditScope();
    const roleSetId = org.roleSetId;

    await audit.rows(nonMember.id, async () => {
      // (a) the entry role, user mutation
      const a = await assignUser(
        sup().token,
        roleSetId,
        nonMember.id,
        RoleName.Associate
      );
      expectForbidden(a, 'roleset-entry-role-assign');
      // (b) the entry role, generic actor mutation
      const b = await assignActor(
        sup().token,
        roleSetId,
        nonMember.id,
        RoleName.Associate
      );
      expectForbidden(b, 'roleset-entry-role-assign');
      // (c) a higher role for someone not yet in the entry role is no side door
      const c = await assignUser(
        sup().token,
        roleSetId,
        nonMember.id,
        RoleName.Admin
      );
      expectForbidden(c, 'roleset-entry-role-assign');
      // (d)
      const d = await assignUser(
        sup().token,
        roleSetId,
        nonMember.id,
        RoleName.Owner
      );
      expectForbidden(d, 'roleset-entry-role-assign');
    }, []);

    const roles = await membersOf(sup().token, roleSetId);
    for (const role of [RoleName.Associate, RoleName.Admin, RoleName.Owner]) {
      expect(roles[role], role).not.toContain(nonMember.id);
    }

    // Control: the same actor DOES promote a member (this is consent-neutral).
    await audit.rows(
      member.id,
      async () => {
        expectOk(
          await assignUser(sup().token, roleSetId, member.id, RoleName.Admin),
          'promote the member'
        );
      },
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
    expect((await membersOf(sup().token, roleSetId))[RoleName.Admin]).toContain(
      member.id
    );
    audit.finish(ctx);
  });
});

// ---------------------------------------------------------------------------
describe('S-04 — surfaces outside the Community tab stay closed to Support (P1, equivalence partitions)', () => {
  let org: Org;
  let pending: { id: string };
  let rejected: { id: string };

  beforeAll(async () => {
    await assertSupportIsSupportOnly();
    org = await makeOrg('s04');
    const t5 = await makeUser('s04a');
    const t6 = await makeUser('s04b');
    const first = await invite(orgAdmin().token, org.roleSetId, {
      users: [t5.id],
    });
    pending = first.data!.inviteForEntryRoleOnRoleSet[0].invitation!;
    const second = await invite(orgAdmin().token, org.roleSetId, {
      users: [t6.id],
    });
    rejected = second.data!.inviteForEntryRoleOnRoleSet[0].invitation!;
    expectOk(
      await eventOnInvitation(t6.token, rejected.id, 'REJECT'),
      'the invitee rejects'
    );
    expect(await invitationState(orgAdmin().token, rejected.id)).toEqual(
      'rejected'
    );
  });

  const FORM = 'query($id: UUID!) { lookup { roleSet(ID: $id) { applicationForm { description questions { question explanation required maxLength sortOrder } } } } }';
  const readForm = async () =>
    (
      await rawRead<{
        lookup: {
          roleSet: {
            applicationForm: {
              description: string | null;
              questions: {
                question: string;
                explanation: string;
                required: boolean;
                maxLength: number;
                sortOrder: number;
              }[];
            };
          };
        };
      }>(orgAdmin().token, FORM, { id: org.roleSetId })
    ).lookup.roleSet.applicationForm;
  const UPDATE_FORM = 'mutation($d: UpdateApplicationFormOnRoleSetInput!) { updateApplicationFormOnRoleSet(applicationFormData: $d) { id } }';

  test('S-04 — Support cannot change the application form, the organisation profile or its settings (each refused on UPDATE and left unchanged)', async () => {
    const before = await readForm();
    const description = `s04 ${uid}`;
    const formInput = (text: string) => ({
      roleSetID: org.roleSetId,
      formData: { description: text, questions: before.questions },
    });

    // 1. the application form
    const form = await rawRequest(sup().token, UPDATE_FORM, {
      d: formInput(description),
    });
    expectForbidden(form, 'update');
    expect((await readForm()).description).toEqual(before.description);

    // 2. the organisation profile
    const displayName = async () =>
      (
        await rawRead<{
          lookup: { organization: { profile: { displayName: string } } };
        }>(
          orgAdmin().token,
          'query($id: UUID!) { lookup { organization(ID: $id) { profile { displayName } } } }',
          { id: org.id }
        )
      ).lookup.organization.profile.displayName;
    const nameBefore = await displayName();
    const profile = await rawRequest(
      sup().token,
      'mutation($d: UpdateOrganizationInput!) { updateOrganization(organizationData: $d) { id } }',
      {
        d: {
          ID: org.id,
          profileData: { displayName: `${org.displayName} renamed` },
        },
      }
    );
    expectForbidden(profile, 'update');
    expect(await displayName()).toEqual(nameBefore);

    // 3. the organisation settings
    const SETTINGS = 'query($id: UUID!) { lookup { organization(ID: $id) { settings { membership { allowApplications } } } } }';
    const applicationsOpen = async () =>
      (
        await rawRead<{
          lookup: {
            organization: {
              settings: { membership: { allowApplications: boolean } };
            };
          };
        }>(orgAdmin().token, SETTINGS, { id: org.id })
      ).lookup.organization.settings.membership.allowApplications;
    const open = await applicationsOpen();
    const settings = await rawRequest(
      sup().token,
      'mutation($d: UpdateOrganizationSettingsInput!) { updateOrganizationSettings(settingsData: $d) { id } }',
      {
        d: {
          organizationID: org.id,
          settings: { membership: { allowApplications: !open } },
        },
      }
    );
    expectForbidden(settings, 'update');
    expect(await applicationsOpen()).toEqual(open);

    // Positive control: the organisation admin DOES change the form, so the
    // refusals above are about Support and not about a broken input.
    const asAdmin = await rawRequest(orgAdmin().token, UPDATE_FORM, {
      d: formInput(description),
    });
    expectOk(asAdmin, 'OA updates the form');
    try {
      expect((await readForm()).description).toEqual(description);
    } finally {
      await rawRequest(orgAdmin().token, UPDATE_FORM, {
        d: formInput(before.description ?? ''),
      });
    }
  });

  test('S-04 — Support cannot drive the invitation lifecycle (REJECT on a pending, ARCHIVE on a rejected one): refused on UPDATE, state unchanged; revoking by delete is the allowed route', async () => {
    const reject = await eventOnInvitation(sup().token, pending.id, 'REJECT');
    expectForbidden(reject, 'update');
    expect(await invitationState(orgAdmin().token, pending.id)).toEqual(
      'invited'
    );

    const archive = await eventOnInvitation(sup().token, rejected.id, 'ARCHIVE');
    expectForbidden(archive, 'update');
    expect(await invitationState(orgAdmin().token, rejected.id)).toEqual(
      'rejected'
    );

    // Control: the organisation admin can archive the rejected invitation, so
    // the event is valid; only Support's reach is refused.
    expectOk(
      await eventOnInvitation(orgAdmin().token, rejected.id, 'ARCHIVE'),
      'OA archives'
    );
    expect(await invitationState(orgAdmin().token, rejected.id)).toEqual(
      'archived'
    );
  });
});

// ---------------------------------------------------------------------------
describe('S-05 — Content Full Access keeps exactly today\'s reach, no more (P1, decision table)', () => {
  let org: Org;
  let cfa: string;
  let member: RegisteredUser;
  let invited: RegisteredUser;
  let applicantA: RegisteredUser;
  let applicantB: RegisteredUser;
  let spare: RegisteredUser;
  let invitationId = '';
  let emailInvitationId = '';
  let applicationA = '';
  let applicationB = '';

  beforeAll(async () => {
    await assertSupportIsSupportOnly();
    cfa = (await platformRoleUsers()).tokens.PLATFORM_CONTENT_FULL_ACCESS;
    org = await makeOrg('s05');
    member = await makeUser('s05a');
    invited = await makeUser('s05b');
    applicantA = await makeUser('s05c');
    applicantB = await makeUser('s05d');
    spare = await makeUser('s05e');
    expectOk(
      await assignUser(
        orgAdmin().token,
        org.roleSetId,
        member.id,
        RoleName.Associate
      ),
      'OA adds the associate'
    );
    const user = await invite(orgAdmin().token, org.roleSetId, {
      users: [invited.id],
    });
    invitationId = user.data!.inviteForEntryRoleOnRoleSet[0].invitation!.id;
    const email = await invite(orgAdmin().token, org.roleSetId, {
      emails: [`s05-${uid}@alkemio.test`],
    });
    emailInvitationId =
      email.data!.inviteForEntryRoleOnRoleSet[0].platformInvitation!.id;
    applicationA = await apply(applicantA.token, org.roleSetId);
    applicationB = await apply(applicantB.token, org.roleSetId);
  });

  test('S-05 — Content Full Access cannot invite, resend, promote, remove or read the applications, and its APPROVE changes nothing; it can still revoke an invitation and reject an application (OP-6), unaudited', async ctx => {
    const audit = auditScope();
    const roleSetId = org.roleSetId;

    // Refused: no Support privilege, no GRANT, no invite.
    expectForbidden(
      await invite(cfa, roleSetId, { users: [spare.id] }),
      'roleset-entry-role-invite'
    );
    expectForbidden(
      await invite(cfa, roleSetId, { emails: [`s05x-${uid}@alkemio.test`] }),
      'roleset-entry-role-invite'
    );
    expectForbidden(
      await resendEmailInvitation(cfa, emailInvitationId),
      'roleset-entry-role-invite'
    );
    expectForbidden(
      await assignUser(cfa, roleSetId, member.id, RoleName.Admin),
      'grant'
    );
    expectForbidden(
      await removeUser(cfa, roleSetId, member.id, RoleName.Associate),
      'grant'
    );
    // The applications list is refused, not served empty.
    const list = await rawRequest<{
      lookup?: { roleSet?: { applications?: { id: string }[] } };
    }>(
      cfa,
      'query($id: UUID!) { lookup { roleSet(ID: $id) { applications { id } } } }',
      { id: roleSetId }
    );
    expectForbidden(list, 'grant');
    expect(list.data?.lookup?.roleSet?.applications ?? null).toBeNull();

    // APPROVE: either an error, or a silent no-op. The oracle is the state and
    // the membership, never "an error came back" (the lifecycle only warns).
    const approve = await eventOnApplication(cfa, applicationA, 'APPROVE');
    if (approve.errors.length === 0) {
      expect(approve.data?.eventOnApplication.state).toEqual('new');
    }
    expect((await applicationState(orgAdmin().token, applicationA)).state).toEqual(
      'new'
    );
    expect(
      (await membersOf(orgAdmin().token, roleSetId))[RoleName.Associate]
    ).not.toContain(applicantA.id);

    // Today's reach (root CRUD): revoke an invitation, reject an application.
    await audit.noRow(invited.id, async () => {
      expectOk(await deleteUserInvitation(cfa, invitationId), 'CFA revokes');
    });
    expect(await invitationState(orgAdmin().token, invitationId)).toBeNull();
    await audit.noRow(applicantB.id, async () => {
      expectOk(
        await eventOnApplication(cfa, applicationB, 'REJECT'),
        'CFA rejects'
      );
    });
    expect((await applicationState(orgAdmin().token, applicationB)).state).toEqual(
      'rejected'
    );

    // Positive control for the two "no row" reads above: Support's own
    // promotion of the member writes exactly one.
    await audit.rows(
      member.id,
      async () => {
        expectOk(
          await assignUser(sup().token, roleSetId, member.id, RoleName.Admin),
          'SUP promotes'
        );
      },
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
    audit.finish(ctx);
  });
});

// ---------------------------------------------------------------------------
describe('S-06 — the reset is idempotent and keeps a pre-reset invitation revocable (P2, state transition)', () => {
  let org: Org;
  let invitee: RegisteredUser;
  let invitationId = '';

  beforeAll(async () => {
    await assertSupportIsSupportOnly();
    org = await makeOrg('s06');
    invitee = await makeUser('s06a');
    const res = await invite(orgAdmin().token, org.roleSetId, {
      users: [invitee.id],
    });
    invitationId = res.data!.inviteForEntryRoleOnRoleSet[0].invitation!.id;
  });

  const readRules = async (): Promise<Rule[]> =>
    (
      await rawRead<{
        lookup: { roleSet: { authorization: { credentialRules: Rule[] } } };
      }>(
        orgAdmin().token,
        `query($id: UUID!) { lookup { roleSet(ID: $id) { authorization { ${RULES} } } } }`,
        { id: org.roleSetId }
      )
    ).lookup.roleSet.authorization.credentialRules.filter(isSupportRule);

  test('S-06 — two resets leave the two Support rules unchanged (each exactly once) and the earlier invitation revocable by Support, with one audit row', async ctx => {
    const audit = auditScope();
    const poa = (await platformRoleUsers()).tokens.PLATFORM_OPERATIONS_ADMIN;
    const before = await readRules();
    expect(before.map(r => r.name).sort()).toEqual(
      [INVITE_RULE, MEMBERSHIP_RULE].sort()
    );

    for (let run = 1; run <= 2; run++) {
      const reset = await resetOrganization(poa, org.id);
      expectOk(reset, `reset #${run}`);
      expect(reset.data?.authorizationPolicyResetOnOrganization.id).toEqual(
        org.id
      );
    }

    const after = await readRules();
    expect(after).toEqual(before);
    for (const name of [MEMBERSHIP_RULE, INVITE_RULE]) {
      expect(after.filter(r => r.name === name), name).toHaveLength(1);
    }
    const held = (
      await rawRead<{ lookup: { myPrivileges: { roleSet: string[] } } }>(
        sup().token,
        'query($id: UUID!) { lookup { myPrivileges { roleSet(ID: $id) } } }',
        { id: org.roleSetId }
      )
    ).lookup.myPrivileges.roleSet;
    expect(held).toContain(SUPPORT_MEMBERSHIP);

    // The invitation was created before the resets and is still revocable.
    expect((await pendingInvitations(sup().token, org.roleSetId)).map(i => i.id))
      .toContain(invitationId);
    await audit.rows(
      invitee.id,
      async () => {
        expectOk(
          await deleteUserInvitation(sup().token, invitationId),
          'SUP revokes'
        );
      },
      [
        {
          action: 'revoke_user_invitation',
          outcome: 'operation_succeeded',
          initiator: sup().id,
          roleSetId: org.roleSetId,
          invitationId,
        },
      ]
    );
    expect(
      (await pendingInvitations(sup().token, org.roleSetId)).map(i => i.id)
    ).not.toContain(invitationId);
    audit.finish(ctx);
  });
});

// ---------------------------------------------------------------------------
describe('S-07 — an organisation not yet reset grants nothing until it is (P2, state transition; local stack only)', () => {
  let org: Org;
  let invitee: RegisteredUser;
  let target: RegisteredUser;
  let invitationId = '';

  beforeAll(async () => {
    if (!LOCAL_DB) return;
    await assertSupportIsSupportOnly();
    org = await makeOrg('s07');
    invitee = await makeUser('s07a');
    target = await makeUser('s07b');
    const res = await invite(orgAdmin().token, org.roleSetId, {
      users: [invitee.id],
    });
    invitationId = res.data!.inviteForEntryRoleOnRoleSet[0].invitation!.id;
  });

  /** Strips both Support rules from the role set and every child policy, as a pre-deploy organisation would look. */
  const stripSupportRules = async (): Promise<void> => {
    await queryHarnessDb(
      `UPDATE authorization_policy SET "credentialRules" = (
         SELECT COALESCE(jsonb_agg(e), '[]'::jsonb) FROM jsonb_array_elements("credentialRules") e
         WHERE NOT (e->'grantedPrivileges' ? 'platform-support-org-membership')
           AND e->>'name' NOT IN ('${MEMBERSHIP_RULE}', '${INVITE_RULE}'))
       WHERE id IN (
         SELECT "authorizationId" FROM role_set WHERE id = $1
         UNION SELECT "authorizationId" FROM invitation WHERE "roleSetId" = $1
         UNION SELECT "authorizationId" FROM platform_invitation WHERE "roleSetId" = $1
         UNION SELECT "authorizationId" FROM application WHERE "roleSetId" = $1)`,
      [org.roleSetId]
    );
  };

  const asSupport = async () => {
    const token = sup().token;
    const privileges = (
      await rawRead<{ lookup: { myPrivileges: { roleSet: string[] } } }>(
        token,
        'query($id: UUID!) { lookup { myPrivileges { roleSet(ID: $id) } } }',
        { id: org.roleSetId }
      )
    ).lookup.myPrivileges.roleSet;
    return {
      privileges,
      invite: await invite(token, org.roleSetId, { users: [target.id] }),
      revoke: await deleteUserInvitation(token, invitationId),
      applications: await rawRequest(
        token,
        'query($id: UUID!) { lookup { roleSet(ID: $id) { applications { id } } } }',
        { id: org.roleSetId }
      ),
    };
  };

  test.skipIf(!LOCAL_DB)(
    'S-07 — before the reset the privilege is absent and invite, revoke and applications are refused with no audit row; after the reset all three work (local stack)',
    async ctx => {
      const audit = auditScope();
      await stripSupportRules();

      // The observable signature of "not reset": the rule is absent by name.
      const rules = (
        await rawRead<{
          lookup: { roleSet: { authorization: { credentialRules: Rule[] } } };
        }>(
          orgAdmin().token,
          `query($id: UUID!) { lookup { roleSet(ID: $id) { authorization { ${RULES} } } } }`,
          { id: org.roleSetId }
        )
      ).lookup.roleSet.authorization.credentialRules;
      expect(rules.filter(isSupportRule)).toEqual([]);

      // Nothing is written for any subject while the organisation is unreset.
      const before = await audit.rows(target.id, () =>
        audit.rows(invitee.id, asSupport, [])
      , []);
      expect(before.privileges).not.toContain(SUPPORT_MEMBERSHIP);
      expect(before.privileges).not.toContain('ROLESET_ENTRY_ROLE_INVITE');
      expectForbidden(before.invite, 'roleset-entry-role-invite');
      expectForbidden(before.revoke, 'delete');
      expectForbidden(before.applications, 'grant');
      // The refused revoke left the invitation in place.
      expect(await invitationState(orgAdmin().token, invitationId)).toEqual(
        'invited'
      );

      const poa = (await platformRoleUsers()).tokens.PLATFORM_OPERATIONS_ADMIN;
      expectOk(await resetOrganization(poa, org.id), 'reset');

      // After the reset the same three calls work, and the revoke writes its
      // row (the positive control for the empty reads above).
      const after = await audit.rows(
        invitee.id,
        asSupport,
        [
          {
            action: 'revoke_user_invitation',
            outcome: 'operation_succeeded',
            initiator: sup().id,
            roleSetId: org.roleSetId,
            invitationId,
          },
        ]
      );
      expect(after.privileges).toEqual(
        expect.arrayContaining([SUPPORT_MEMBERSHIP, 'ROLESET_ENTRY_ROLE_INVITE'])
      );
      expectOk(after.invite, 'invite after the reset');
      expect(after.invite.data?.inviteForEntryRoleOnRoleSet[0].type).toEqual(
        'INVITED_TO_ROLE_SET'
      );
      expectOk(after.revoke, 'revoke after the reset');
      expectOk(after.applications, 'applications after the reset');
      expect(await invitationState(orgAdmin().token, invitationId)).toBeNull();
      audit.finish(ctx);
    }
  );
});
