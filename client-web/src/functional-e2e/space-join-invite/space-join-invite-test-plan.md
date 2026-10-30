# Test plan — join an open Space; invite, accept, open (W2 journeys 1 and 2)

- **Source:** `docs/qa/server-rebuild/plan.md` § W2, ranked journeys 1 and 2; client-net audit rows D1 (join an open Space) and D3 (invite an existing user), both **ABSENT** before this suite: the harness joined and invited through the API, no case clicked Join or Accept.
- **Suites:** `client-web/src/functional-e2e/space-join-invite/` — nightly project **"Space join and invite"**, tier `long`.
- **Why these two together:** both are a persona gaining MEMBER on an L0 Space, and both prove it the same way — the About page a non-member is held on, the member-only callout a member reads, and the role set read back. They share `helpers/space-access.helper.ts` (About dialog, content feed, callout heading, mutation wait, role read-back, teardown).
- **Status:** executed live against `test-alkem.io` on 2026-10-30, twice (the second run proves teardown); also green on the local stack. Per-run results are in the PR that added the suite.

## Overview

| Journey | What the user does in the browser | Oracle that goes red on a wrong server |
| --- | --- | --- |
| 1 — join | A non-member opens a private Space whose policy is OPEN, clicks **Join** in its About dialog, opens the Space | the browser's `joinRoleSet` answers without errors; the role set lists the persona as MEMBER; the Space page then renders the member-only callout; a persona who did not join is still held on About with no feed |
| 2 — invite + accept | The admin invites a user by name from **Settings › Community**; the invitee opens **Pending Memberships**, accepts, opens the Space | the pending table row (Invited, Revoke); the server's invitation in state `invited` for that actor only; exactly one mail with the subject `Invitation to join <Space>` to the invitee and none to a bystander; after Accept the role set lists the invitee as MEMBER and the invitation is `accepted`; the Space renders the member-only callout |

## Personas and data

Every run seeds its own organization and Space through the lib (`TestScenarioFactory.createBaseScenario`, run-unique `UniqueIDGenerator` names) with one published post callout. The Space is **private**, so its content — the callout — is readable by members only: that is what makes the callout a membership oracle. Teardown is `teardownScenario` (space tree leaves-first through `deleteSpaceTree`, which throws on a leak, then the factory removes the organization) in a file-level `afterAll`.

| Persona | Kind | Journey | Role |
| --- | --- | --- | --- |
| `space.admin` | harness | 1, 2 | seeded admin + member; invites in 2 |
| `non.space` | harness | 1 | the joiner |
| `subspace.member` | harness | 1 | never joins — negative control |
| `W2 Invitee <id>` | disposable, registered in `beforeAll` (Kratos self-service + verification mail + `registerInAlkemioOrFail`), deleted in `afterAll` | 2 | the invitee — a fresh mailbox and default notification settings |
| `non.space` | harness | 2 | not invited — negative control |

No harness persona is mutated: the only state a harness persona gains is a membership of this run's Space, which is deleted with it. The MailSlurper inbox is read by recipient and by the run-unique subject, never pruned.

## Navigation

- Space: `/<space nameID>` — a non-member of a private Space is routed to `/<nameID>/about`, an About **dialog** named after the Space with the membership action (Join / Accept invitation / none).
- Community settings: `/<nameID>/settings/community` → **Invite** → dialog `Invite others to join "<Space>"` → search → pick → **Send** → per-invitee result `Invitation sent`.
- Invitee: `/home?dialog=invitations` (the mail's call-to-action) → dialog **Pending Memberships** → the invitation card → `My Pending Membership: <Space>` → button **Accept invitation to <Space>** (label "Join").

## Cases

Techniques: **ST** state transition (non-member → member), **EP** equivalence partitioning of viewers (member / non-member), **UC** use-case walk, **NC** negative control with a positive control in the same case.

| ID | Spec | Technique | Oracle | Status |
| --- | --- | --- | --- | --- |
| J1-1 | `us1-join-open-space.spec.ts` | EP, NC | non-member on `/about`, Join offered, no feed (dialog is the positive control); not in MEMBER | automated, green |
| J1-2 | `us1-join-open-space.spec.ts` | ST, UC | `joinRoleSet` answered clean; MEMBER read-back (poll); Space page with h1 + member-only callout, no About dialog | automated, green |
| J1-3 | `us1-join-open-space.spec.ts` | EP, NC | member sees the callout after reload (positive); bystander on About with Join, no feed, no callout heading; MEMBER list holds the joiner and not the bystander | automated, green |
| I2-1 | `us2-invite-accept.spec.ts` | UC | `inviteForEntryRoleOnRoleSet` answered clean; `Invitation sent` for the invitee; pending row Invited + Revoke; server invitation `invited` for the invitee, none for the bystander | automated, green |
| I2-2 | `us2-invite-accept.spec.ts` | UC, NC | exactly one `Invitation to join <Space>` to the invitee once its box settles, its link is `/home?dialog=invitations`; none with that subject to the bystander (after the invitee's arrived) | automated, green |
| I2-3 | `us2-invite-accept.spec.ts` | ST, UC | before: About with Accept invitation, no feed; card and detail in Pending Memberships; `eventOnInvitation` answered clean; MEMBER read-back; invitation `accepted`; Space with the member-only callout | automated, green |
| I2-4 | `us2-invite-accept.spec.ts` | EP, NC | invitee sees the callout after reload (positive); bystander's About dialog rendered and the apply flow settled, then no membership action at all (invitation-only), no feed, not a MEMBER | automated, green |

## Deliberately not covered here

- Decline, revoke, resend, invitations to organizations and by email address: `organization-space-invitations/`, `organization-email-invitations/`, and the server-api roleset specs.
- Applications (Apply → approve/reject): `applications/`.
- Joining a subspace (needs parent membership) and leaving a Space: the unregistered `memberships/*` rewrites (client-net audit Tier 0, item 1).
- The admins' notifications on join/accept, and push/in-app channels.

## Known defects

None found by this suite.

## Things that will change with the rebuilt server

- The mail subject `Invitation to join <Space>` is a server constant — rebaseline it, do not "fix" it, if it changes.
- The invitation state literals `invited` / `accepted` are read back through `readRoleSetInvitations`; they move with the lib if the schema changes.
