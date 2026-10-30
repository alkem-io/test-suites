# Test plan — change Space settings through the UI (W2 journey 4)

- **Source:** `docs/qa/server-rebuild/plan.md` § W2, ranked journey 4; client-net audit row C3 (privacy, membership policy, collaboration toggles), **ABSENT as a write** before this suite: every value was seeded through the lib and only read in the UI.
- **Suite:** `client-web/src/functional-e2e/space-settings-write/` — nightly project **"Space settings write"**, tier `extended`.
- **Status:** executed live against `test-alkem.io` on 2026-10-30, twice (the second run proves teardown); also green on the local stack.

## Overview

The admin changes ONE setting at a time in **Settings › Settings** and saves. Each save is checked three ways — the browser's `updateSpaceSettings` answered without errors and "Changes saved" shows, the server's settings read back the new value (`readSpaceSettings`), and the tab shows it again after a reload — and then the setting's real effect is checked in **another persona's** view, in both directions. "Dialog closed" or "toast shown" is never the oracle.

## Personas and data

| Persona | Kind | Role |
| --- | --- | --- |
| `space.admin` | harness | seeded admin + member; changes the settings |
| `space.member` | harness | seeded member — the oracle for privacy (positive control) and for the collaboration toggles |
| `non.space` | harness | non-member — the oracle for privacy and membership policy |

Each file seeds its own PUBLIC + OPEN Space with one published post callout (`seedSettingsScenario`), run-unique names, torn down by `teardownScenario` in a file-level `afterAll`. Every case restores the value it started from, or hands the next case a stated precondition, so the file reads top to bottom as one admin session.

## Navigation

- `/<nameID>/settings/settings`: **Visibility** radios (Public / Private), **Membership** radios (No Application Required / Application Required / Invitation Only), **Allowed Actions** switches. Edits collect in an **Unsaved changes** bar ("1 unsaved change") with **Save changes**.
- Second persona: the Space page `/<nameID>` (a non-member of a private Space is routed to `/about`); the Space sidebar (Join / Apply / Add Post / Create Subspace); the Space tabs (Video Call link).

## Cases

Techniques: **ST** state transition over each setting's values, **EP** viewer partition, **NC** negative control with a positive control in the same case.

| ID | Spec | Technique | Oracle | Status |
| --- | --- | --- | --- | --- |
| P4-1 | `us1-privacy.spec.ts` | ST, EP, NC | public → private: server `PRIVATE`, radio checked after reload; member still reads the callout (positive); non-member routed to About, no feed | automated, green |
| P4-2 | `us1-privacy.spec.ts` | ST, EP | private → public: server `PUBLIC`, radio after reload; member and non-member both read the callout on the Space URL | automated, green |
| M4-1 | `us2-membership-policy.spec.ts` | ST, EP | open → applications: server `APPLICATIONS`; non-member sidebar shows Apply, no Join (before: Join) | automated, green |
| M4-2 | `us2-membership-policy.spec.ts` | ST, NC | applications → invitations: server `INVITATIONS`; non-member sidebar has none of the membership actions, read after the callout rendered and the apply flow's requests settled | automated, green |
| M4-3 | `us2-membership-policy.spec.ts` | ST | invitations → open: server `OPEN`; Join back, no Apply | automated, green |
| C4-1 | `us3-collaboration-toggles.spec.ts` | ST, NC | Video Calls off and on: `allowMembersToVideoCall` false/true each way, switch state after reload; the member's "Video Call" link gone/back | automated, green |
| C4-2 | `us3-collaboration-toggles.spec.ts` | ST, NC | Create Posts on and off: `allowMembersToCreateCallouts`; the member's sidebar "Add Post" appears/disappears | automated, green |
| C4-3 | `us3-collaboration-toggles.spec.ts` | ST, NC | Create Subspaces on and off: `allowMembersToCreateSubspaces`; the member's Subspaces-tab sidebar "Create Subspace" appears/disappears | automated, green |

Every absence above is read only after the same viewer's page has rendered the Space's callout (and, for membership actions, after `applyFlowSettled`), and every control asserted absent is asserted present in the other direction of the same case.

## Deliberately not covered here

- The switches with no plain-member view to observe: **Guest Contributions** (needs a shared whiteboard, journey 5 territory), **Subspace Events** (needs a subspace calendar event), **Alkemio Support** (needs the platform-support persona), **Subspace Membership** (`allowSubspaceAdminsToInviteMembers`, needs a subspace admin inviting), **Trusted Applicants** (needs a trusted organization), and the **User information visibility** radios. Their saves go through the same `updateSpaceSettings` path asserted here; their effects are not walked.
- Settings on a subspace (L1/L2) — the same page, different inheritance rules.
- Private + open "Join" on the About page is journey 1 (`space-join-invite/`).

## Known defects

None found by this suite.
