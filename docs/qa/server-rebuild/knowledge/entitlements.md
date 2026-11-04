# Entitlements and licences — behaviour knowledge

_Extracted 2026-10-27 from `server-api/src/functional-api/entitlements/*.it-spec.ts` (7 files, 16 cases) on `origin/develop` @ `3a41129d`. This is the WHAT and WHY of the area; the HOW (mutations, fixtures, request params) is deliberately left out so the rules survive the server rebuild. Rows marked **(title only)** were taken from case titles without reading the assertions and must be confirmed when the area is extracted in full. Template for every other area._

## Behaviour rules

| ID | Rule the platform guarantees | Why (business reason, origin) | Actors | Evidence (spec › case) | Legacy status |
|---|---|---|---|---|---|
| ENT-01 | A user who holds the platform feature role *VC Campaign* has exactly these account entitlements available: AI-assistant tokens per month, one free Space, an innovation hub, a virtual contributor, an innovation pack. | The VC Campaign programme gives participants a bounded free allowance; the allowance list is the contract the UI's "create" buttons key on. | VC Campaign user reads own account | `innovation-packs-functional-entitlements` › table rows `pack1..pack3` | green |
| ENT-02 | Innovation packs per account are capped at 3 under that allowance. The fourth creation is refused with a message naming the account, the entitlement type `account-innovation-pack` and the limit 3; once the cap is reached the pack entitlement disappears from the available list. | Entitlement limits are enforced server-side, not only hidden in the UI; the error text is what the client shows. | VC Campaign user on own account | `innovation-packs-functional-entitlements` › `Create a innovation pack over the license limit` | green |
| ENT-03 | Spaces per account are capped under the same allowance; creating over the limit is refused, and deleting one restores the ability to create. **(title only)** | Allowance is a live count, not a one-time grant. | VC Campaign user | `space-functional-entitlements` › `Create a space over the license limit`, `Create a space after third over the license limit was removed` | green |
| ENT-04 | Virtual contributors per account are capped under the allowance; creation over the limit is refused. **(title only)** | Same mechanism as ENT-02 for agents. | VC Campaign user | `vc-functional-entitlements` › `Create a vc over the license limit` | green |
| ENT-05 | Assigning the *Space Licence Plus* plan to a Space extends that Space's entitlement set; revoking the plan returns the Space to its previous set. The Space's entitlements are readable by the account holder from their own account view. | Paid plans are reversible and take effect without a reset; the account page is the holder's source of truth for what a Space may do. | Account holder (reads), platform admin (revokes) | `licenses-functional-entitlements` › `Add License Plus to space` | green |
| ENT-06 | A newly created Space and its subspace carry the memo-signing feature flag disabled. Granting the memo-signing plan to the L0 Space enables the flag on the L0 **and** on its subspace; revoking the plan closes the gate again. While the gate is closed, preparing a memo for signing is refused with a message naming the missing entitlement. With the gate open but no linked signing identity, preparing is refused with a message asking the user to link a Cleverbase identity first. | Signing is a paid, Space-scoped feature that must inherit to subspaces (server#6478); the two refusals are distinct so the client can route the user to the right fix (buy vs link). | Space admin, subspace admin, platform admin | `memo-signing-entitlement` › 3 cases | green |
| ENT-07 | An organisation's account exposes a baseline authorization + licence privilege set with no plans assigned; an organisation admin whose account holds *Account Licences Plus* sees the plus set. After creating a Space, a VC and a pack under that account, deleting them leaves the account clean. **(title only)** | Organisation accounts and user accounts follow the same entitlement model. | Organisation admin | `organization-entitlements` › 3 cases | green |
| ENT-08 | A user's account exposes a baseline set with no licences; the *VC Campaign* set and the *Beta Tester* set are distinct and each is removed cleanly when the role is removed, even after resources were created under it. **(title only)** | Platform feature roles are the only way a user account gains entitlements; removal must not strand created resources. | User, platform admin | `user-entitlements` › 5 cases | green |

## Constants the rules depend on (rebaseline candidates)

| Constant | Value today | Used by |
|---|---|---|
| Innovation packs per VC Campaign account | 3 | ENT-02 |
| Spaces per VC Campaign account | 3 (inferred from "third") | ENT-03 |
| Plan names | `SPACE_LICENSE_PLUS`, `SPACE_FEATURE_MEMO_SIGNING` | ENT-05, ENT-06 |
| Platform feature roles | `FEATURE_VC_CAMPAIGN`, `BETA_TESTER` | ENT-01, ENT-08 |
| Entitlement names | `ACCOUNT_AI_ASSISTANT_TOKENS_MONTH`, `ACCOUNT_SPACE_FREE`, `ACCOUNT_INNOVATION_HUB`, `ACCOUNT_VIRTUAL_CONTRIBUTOR`, `ACCOUNT_INNOVATION_PACK`, `SPACE_FLAG_MEMO_SIGNING` | all |
| Error texts | `Unable to create account-innovation-pack on account: <id>. Entitlement limit of 3 of type account-innovation-pack reached`; `Entitlement space-flag-memo-signing is not available`; `Link a Cleverbase identity before signing this memo` | ENT-02, ENT-06 |

## Where this lands in the new core (from the rebuild briefing)

`license_plan`, `plan_entitlement`, `plan_assignment`, resolved at read time; no per-entity licence cache and no reset mutations. Platform feature roles become credentials scoped by target type. Every rule above stays valid as a behaviour; what changes is that ENT-05/06 no longer need a reset and that the entitlement read moves from the account query to the `viewer` slice. Error texts are rebaseline rows, not rules.

## Not covered on the legacy suite (gaps to carry over)

- No rule for what happens to resources already created when a plan is revoked (archived? read-only?).
- No rule for plan assignment by a non-admin being refused.
- No rule for organisation-hosted Space entitlements inheriting from the organisation's plan.
