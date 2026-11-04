# Test plan — Contributors CRUD: user, organisation, virtual contributor

- **Story:** [alkem-io/alkemio#1699](https://github.com/alkem-io/alkemio/issues/1699) "QA P1: Contributors - CRUD Full" (epic #1696). No workspace spec.
- **Suite:** `client-web/src/functional-e2e/contributors-crud/` — nightly project **"Contributors CRUD"**, tier `extended`. Shared set-up in `contributors-crud.helpers.ts`.
- **Status:** rewritten against the CRD client (client-web `develop` @ `a47c8b36d`, server release-80 build) on 2026-11-04 and run twice through the nightly project on the local stack (≈ 4.8 min each): 23 green, 4 `test.skip` on product defects (3.2, 3.3, 3.8 → client-web#10125; 3.7b → QA-PF-02, issue pending — drop each skip when fixed), 1 skipped (3.0, recorded flow). Not yet run on `test-alkem.io`.

## Overview

The story walks each contributor type through create → read → update → delete. Every write here is checked from two angles: the reloaded page shows the new value, and the record read back over the API (`getUserData`, `readOrganization`, `readRoleSetUsersInRole`, `readVirtualContributor`, `readCalloutsSetCallouts`) holds it. "Toast shown" or "dialog closed" is never the oracle, and every absence is asserted next to a positive control on the same page.

Virtual Contributors have been **paused** since [client-web#10398](https://github.com/alkem-io/client-web/issues/10398): nobody can create one, add one to a Space or mention one, while existing VCs stay visible, editable and deletable. The VC cases therefore seed their VCs over the API, the cases for the paused steps (3.1, 3.4, 3.5) pin the pause itself, and the rest drive the UI that still exists. When the pause is lifted, 3.1 / 3.4 / 3.5 go red. That is the signal to restore the story's create / invite / tag flow there.

## Risks

| Risk | Likelihood | Impact | Cases |
| --- | --- | --- | --- |
| A settings save looks successful but does not persist (buffered bar, optimistic toggles) | medium | high | 1.2, 1.5, 1.6, 2.2, 2.6, 3.7 |
| Deleting an organisation leaves it in its associates' lists or on the platform | medium | high | 1.7, 2.1 |
| Removing a role in the Associates editor leaves the credential (or removes the wrong one) | medium | high | 2.4, 2.5 |
| Profile changes are not what other users see | low | medium | 1.2, 2.2, 3.6 |
| Capacity counts on the Account tab disagree with the licence | low | medium | 1.3, 2.3 |
| A paused VC action reappears without the reworked feature | low | medium | 3.1, 3.4, 3.5 |
| Knowledge added to a VC is stored but not shown, or shown to the wrong audience | high (both reproduced) | high | 3.2, 3.3, 3.7b, 3.8 |

## Personas and data

| Persona | Kind | Role |
| --- | --- | --- |
| disposable `crud-*@alkem.io` | registered per file, deleted in `afterAll` | every user edit (profile, notifications, settings, associations) |
| `admin` (global admin) | harness | creates and deletes organisations in Administration; seeds VCs |
| `organization.admin` | harness | Associate + Admin of every scenario organisation (factory); org edits, VC host actions |
| `space.member`, `space.admin`, `beta.tester` | harness | read-only viewers (1.2, 1.8, 2.2, 3.4–3.6, 3.8) |

Each file seeds its own organisation (`createBaseScenarioOrganization`; the VC file adds a public Space with one post callout) with run-unique names. Teardown is in a file-level `afterAll`: disposable users and VCs first, then the scenario. The shared personas are never written to.

## Navigation

- User settings `/user/<nameID>/settings/{profile,account,membership,organizations,notifications,settings,security}`. Profile edits commit through the **Unsaved changes** bar; notification and settings switches save on toggle.
- Organisation settings `/organization/<nameID>/settings/{profile,account,associates,membership,invitations,settings}`. The **Authorization** and **Community** tabs are retired: `/settings/authorization` lands on **Associates**, whose row editor (`Edit <name>`) holds the Associate / Admin / Owner switches and **Remove from organisation**.
- Administration › Organisations `/admin/organizations`: **New organisation** form, search (server-side on display name), row **Delete** + confirm.
- VC `/vc/<nameID>` (profile), `/vc/<nameID>/knowledge-base`, `/vc/<nameID>/settings/{profile,membership,settings}`. Host Account tab card → **More actions** → **Delete**.
- `/contributors` (the old "Find contributors" page) has no CRD route. See *Known defects*.

## Cases

Techniques: **UC** use-case walk with the postcondition read back, **ST** state transition, **EP** viewer partition, **NC** negative with a positive control, **EG** error guessing.

| ID | Spec › title | Technique | Oracle | Status |
| --- | --- | --- | --- | --- |
| 1.1 | `user-crud.spec.ts` › 1.1 a registered user gets a verification mail, signs in, and owns a profile carrying the names entered | UC | verification mail for that address; signed-in shell; API user with the entered first/last name; Profile tab shows them; user deleted | green |
| 1.2 | › 1.2 a profile update is saved, survives a reload, and is what another signed-in user sees | UC, EP | Display Name + Tagline after reload and in `getUserData`; `space.member` sees both on `/user/<nameID>`, without a settings link | green |
| 1.3 | › 1.3 the Account tab shows each resource block with used / available counts for an unlicensed user | EP | exactly Hosted Spaces 0/0, Virtual Contributors 0/0, Template Packs 0/0, Custom Homepages Not available, Danger Zone | green |
| 1.4 | › 1.4 the Organisations tab lists exactly the organisation the user is associated with | UC | "Showing 1 of 1", one row linking to the org with the Associate badge | green |
| 1.5 | › 1.5 toggling a notification channel saves it, and it survives a reload | ST | `space.collaborationCalloutPublished.email` flipped in the API; switch state after reload | green |
| 1.6 | › 1.6 turning off direct messages on the Settings tab saves it | ST | `communication.allowOtherUsersToSendMessages` false; unchecked after reload | green |
| 1.7 | › 1.7 once the platform admin deletes an organisation, its former associate no longer lists it | UC, NC | before: 2 of 2 incl. the doomed org; GA deletes in Administration; API lookup not found; after: 1 of 1, the scenario org still listed | green |
| 1.8 | › 1.8 Space Admin / Org Admin / Beta Tester / Space Member: own settings on an editable Profile tab | EP | per role: the 7-tab strip, Display Name = their API name, name fields editable, Email read-only | green |
| 2.1 | `organization-crud.spec.ts` › 2.1 the platform admin creates an organisation in Administration, and deleting it there removes it | UC | `createOrganization` answered; API nameID + display name; listed; deleted from the list; API lookup not found | green |
| 2.2 | › 2.2 the organisation admin updates the profile; it survives a reload and is what anonymous and signed-in visitors see | UC, EP | Display Name, Tagline, Website after reload and in `readOrganization`; anonymous and `space.member` see name + tagline, no settings link | green |
| 2.3 | › 2.3 the Account tab shows each resource block with used / available counts from the licence plan | EP | exactly Hosted Spaces 0/3, Virtual Contributors 0/3, Template Packs 0/3, Custom Homepages Not available | green |
| 2.4 | › 2.4 the organisation admin removes an associate on the Associates tab | UC, NC | confirm dialog names the person; row gone, own admin row still there; API Associate list excludes them | green |
| 2.5 | › 2.5 the organisation admin grants and then revokes Admin for an associate | ST | Admin badge on/off; API Admin list includes/excludes; Associate kept | green |
| 2.6 | › 2.6 the organisation admin turns off applications on the Settings tab | ST | `updateOrganizationSettings` answered; `allowApplications` false, `allowSpaceInvitations` untouched; unchecked after reload | green |
| 3.0 | `virtual-contributor-crud.spec.ts` › 3.0 Manually go through whole flow | — | recorded click path without assertions | skipped (author's) |
| 3.1 | › 3.1 creating a VC is paused (client-web#10398) | NC | Account tab lists the three VCs and the upgrade notice; no "Create new contributor"; "Create new pack" offered | green |
| 3.2 | › 3.2 the host adds a text post to the VC knowledge base | UC | callout stored on the KB callouts set; post listed in the KB feed after reload | **skipped** — client-web#10125 (red when unskipped) |
| 3.3 | › 3.3 the host adds a document to the VC knowledge base | UC | Links & Files post with an attached PDF: stored, one link contribution; listed in the KB feed | **skipped** — client-web#10125 (red when unskipped) |
| 3.4 | › 3.4 adding a VC to a Space is paused (client-web#10398) | NC | Space settings › Community: notice, no Add / Invite External VC buttons; members table rendered | green |
| 3.5 | › 3.5 mentioning a VC is paused (client-web#10398) | NC | a user is offered and picking inserts the mention; the VC is offered as "Temporarily unavailable" and picking it changes nothing | green |
| 3.6 | › 3.6 a signed-in user reaches the VC profile from its host's profile | UC | org profile › Other Resources › VC card → `/vc/<nameID>`: name, description, Host link, Body of Knowledge with Visit link, no settings link | green |
| 3.7 | › 3.7 the host sets a VC to Hidden on its Settings tab | ST | `searchVisibility` HIDDEN in the API; Hidden radio after reload | green |
| 3.7b | › 3.7b the "Hide knowledge-base content from non-members" switch reads ON exactly when the content is hidden | EG, ST | switch checked ⇔ `knowledgeBaseContentVisible` false, before and after a toggle | **skipped** — switch inverted (QA-PF-02, issue pending; red when unskipped) |
| 3.8 | › 3.8 a signed-in user visits the Body of Knowledge from the VC profile | UC | Visit → KB page, no Add for a visitor; seeded post title and body listed; Back returns to the profile | **skipped** — client-web#10125 (red when unskipped) |
| 3.9 | › 3.9 the host deletes a VC from the Account tab | UC, NC | confirm names the VC; card gone, other VC still listed; API lookup ENTITY_NOT_FOUND (present before) | green |

## Covered elsewhere (not duplicated here)

| Story step | Where |
| --- | --- |
| Registration with email verification and first sign-in | `authentication/authentication-registration.spec.ts` (nightly). 1.1 overlaps it and adds the created profile's names plus cleanup |
| Membership tab lists the user's Spaces; leave a Space | `memberships/access-own-membership-settings.spec.ts` |
| Notification rows persist across reload and are honoured (messaging rows) | `messaging-notifications/us3-messaging-settings-rows.spec.ts` |
| Organisation community: invite an associate, invitee accepts / declines; Admin / Owner caps; retired Authorization URL | `organization-user-associates/us1-…`, `us2-…`, `us5-associates-editor.spec.ts` |
| Organisation Account tab with a hosted Space (1/3) | `memberships/view-organization-account-settings-as-admin.spec.ts` |
| Another user's settings are refused | `memberships/cannot-access-other-user-*-settings.spec.ts` |

## Deliberately not covered here

- **VC create wizard, avatar upload, invite to a Space and accept, tag with a question** (story VC steps 6–11, 21–22): not offered while VCs are paused (client-web#10398). 3.1 / 3.4 / 3.5 pin the pause instead.
- **What "Hidden" does to other users** (3.7): the radio says "hidden from search". Whether it also removes the VC from the host's public resource list or its profile URL is not stated anywhere. Needs a product ruling before it can be asserted.
- **Story step "Ideally, should be checked with different user roles"** beyond 1.8: the story names no behaviour that differs by role, so 1.8 pins only what every role must have (their own editable profile).
- **Avatar / logo upload** on user and organisation profiles: same upload path as other storage suites; not walked.
- Running on `test-alkem.io` (story AC "pass consistently on the test environment"): not yet done.

## Known defects

| ID | Issue | Effect on this suite |
| --- | --- | --- |
| QA-PF-01 | [client-web#10125](https://github.com/alkem-io/client-web/issues/10125) — knowledge-base posts never render: `CalloutDetails` asks for the classification's `flow-state` tagset, which a knowledge-base callout does not have, and the server answers ENTITY_NOT_FOUND | 3.2, 3.3, 3.8 red at "listed in the KB feed" (their API halves pass) |
| QA-PF-02 | pending — VC Settings: "Hide knowledge-base content from non-members" is bound to `knowledgeBaseContentVisible`, so ON exposes the content and OFF hides it | 3.7b skipped (red when unskipped) |
| QA-PF-03 | pending — `/contributors` resolves on the server (`CONTRIBUTORS_EXPLORER`) but the CRD client has no route: endless "Loading" | none (no case uses it) |
