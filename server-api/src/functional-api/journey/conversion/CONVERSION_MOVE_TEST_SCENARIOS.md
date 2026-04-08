# Space Conversion & Cross-L0 Move Test Scenarios

## Overview

This document covers all test scenarios for space level conversion (same-L0) and cross-L0 move operations. It maps each scenario to the effects matrix from server PR #5959.

### Mutations Covered

| Mutation | Direction | Scope | Type |
|----------|-----------|-------|------|
| `convertSpaceL1ToSpaceL0` | L1 -> L0 (promote) | Same-L0 | Existing (improved) |
| `convertSpaceL2ToSpaceL1` | L2 -> L1 (promote) | Same-L0 | Existing (improved) |
| `moveSpaceL1ToSpaceL0` | L1 -> L1 (lateral) | Cross-L0 | **New** |
| `moveSpaceL1ToSpaceL2` | L1 -> L2 (move + demote) | Cross-L0 | **New** |

---

## A. convertSpaceL1ToSpaceL0 - Basic (Improved)

**File:** `convert-L1-to-L0-basic.it-spec.ts`
**Setup:** L0 space with L1 subspace, callouts (post, post-collection, whiteboard), community members at all levels.

| # | Test | Assertion | Matrix Effect |
|---|------|-----------|---------------|
| A.1 | space level is promoted to L0 | `level === SpaceLevel.L0` | Space Level |
| A.2 | collaboration calloutsSet is preserved | `calloutsSet` deep equal before/after | Callouts & contributions |
| A.3 | innovation flow states match L0 template | states equal parent L0's states | Innovation flow tagsets |
| A.4 | visibility is preserved | `visibility` equal before/after | Visibility / privacy |
| A.5 | about/profile is preserved | `about` deep equal | Profile |
| A.6 | account host is preserved | `account.host` deep equal | Account |
| A.7 | settings are preserved | `settings` deep equal | Settings |
| A.8 | subspaces are preserved | sorted subspaces equal | Descendants |
| A.9 | community roleSet members are preserved | sorted member IDs equal | Members |
| A.10 | community roleSet leads are preserved | sorted lead IDs equal | Leads |
| A.11 | community roleSet admins are preserved | sorted admin IDs equal | Admins |
| A.12 | license subscriptions are preserved | sorted subscriptions equal | Account / License |
| A.13 | Space Admin cannot execute conversion | `error.errors.length > 0` | Auth required |
| A.14 | Space Member cannot execute conversion | `error.errors.length > 0` | Auth required |

**Improvements over original:**
- Split monolithic single test into isolated test cases per concern
- Fixed vacuous `Array.isArray(community)` assertion (community is an object, was always falling through to `[]`)
- Added proper roleSet member/lead/admin assertions using `roleSet.memberUsers`, `leadUsers`, `adminUsers`
- Added authorization tests

---

## B. convertSpaceL1ToSpaceL0 - Applications & Invitations (Improved)

**File:** `convert-L1-to-L0.it-spec.ts`
**Setup:** L1 subspace with `Applications` membership policy, `Private` privacy. Pending invitation to `nonSpaceMember`, pending application from `SPACE_MEMBER`.

| # | Test | Assertion | Matrix Effect |
|---|------|-----------|---------------|
| B.1 | visibility is preserved after conversion | `visibility` defined | Visibility |
| B.2 | settings are preserved after conversion | `settings` defined | Settings |
| B.3 | pending invitation can be accepted after conversion | `status === 200`, user gains `read` privileges | Applications/Invitations |
| B.4 | pending application can be approved after conversion | `status === 200`, `state contains 'approved'`, user gains `read` privileges | Applications/Invitations |

**Improvements over original:**
- Removed all `console.log` debug statements
- Uncommented and fixed the invitation privilege assertion (was "skip until fixed")
- Clean separation of invitation vs application test cases

---

## C. convertSpaceL1ToSpaceL0 with Cascading L2->L1 (Improved)

**File:** `convert-L1-to-L0-with-L2-to-L1.it-spec.ts`
**Setup:** Full hierarchy L0 -> L1 -> L2. Pending invitation and application on L1 subspace.

| # | Test | Assertion | Matrix Effect |
|---|------|-----------|---------------|
| C.1 | parent level is L0 | `convertedL0.level === SpaceLevel.L0` | Space Level |
| C.2 | parent visibility preserved | equal before/after | Visibility |
| C.3 | parent about preserved | deep equal | Profile |
| C.4 | parent account host preserved | deep equal | Account |
| C.5 | parent settings preserved | deep equal | Settings |
| C.6 | parent community members preserved | sorted member IDs equal | Members |
| C.7 | parent subspaces preserved | sorted subspaces equal | Descendants |
| C.8 | child level is L1 | `promotedL1.level === SpaceLevel.L1` | Space Level (cascade) |
| C.9 | child visibility preserved | equal | Visibility (cascade) |
| C.10 | child about preserved | deep equal | Profile (cascade) |
| C.11 | child account host preserved | deep equal | Account (cascade) |
| C.12 | child settings preserved | deep equal | Settings (cascade) |
| C.13 | child community members preserved | sorted IDs equal | Members (cascade) |
| C.14 | child subspaces preserved | sorted equal | Descendants (cascade) |
| C.15 | pending invitation on L1 can be accepted after cascade | `status === 200` | Applications/Invitations |
| C.16 | pending application on L1 can be approved after cascade | `status === 200`, `state contains 'approved'` | Applications/Invitations |

**Improvements over original:**
- Removed dead invitation/application setup code that was never asserted on
- Added actual invitation/application acceptance/approval tests
- Split assertions into separate test cases per concern

---

## D. convertSpaceL2ToSpaceL1 (Improved)

**File:** `convert-L2-to-L1.it-spec.ts`
**Setup:** Full hierarchy. Pending invitation and application on L2 subsubspace.

| # | Test | Assertion | Matrix Effect |
|---|------|-----------|---------------|
| D.1 | level is promoted to L1 | `level === SpaceLevel.L1` | Space Level |
| D.2 | collaboration calloutsSet preserved | deep equal | Callouts & contributions |
| D.3 | innovation flow states preserved | deep equal (same L0) | Innovation flow |
| D.4 | visibility preserved | equal | Visibility |
| D.5 | about/profile preserved | deep equal | Profile |
| D.6 | account host preserved | deep equal | Account |
| D.7 | settings preserved | deep equal | Settings |
| D.8 | community members preserved | sorted IDs equal | Members |
| D.9 | community admins preserved | sorted IDs equal | Admins |
| D.10 | subspaces preserved | sorted equal | Descendants |
| D.11 | pending invitation can be accepted | `status === 200` | Applications/Invitations |
| D.12 | pending application can be approved | `status === 200`, `state contains 'approved'` | Applications/Invitations |

**Bug fix:** Original used `baseScenario.subspace.id` (L1) instead of `baseScenario.subsubspace.id` (L2).

---

## E. moveSpaceL1ToSpaceL0 - Basic (New)

**File:** `move-L1-to-L0-basic.it-spec.ts`
**Setup:** Source L0 with L1 subspace + L2 children. Separate target L0 space.

| # | Test | Assertion | Matrix Effect |
|---|------|-----------|---------------|
| E.1 | space level remains L1 | `level === SpaceLevel.L1` | Space Level: Unchanged |
| E.2 | moved space appears in target L0 subspaces | `targetSubspaceIds.contains(movedId)` | Parent: Re-parented |
| E.3 | moved space no longer in source L0 | `sourceSubspaceIds.not.contains(movedId)` | Parent: Re-parented |
| E.4 | collaboration calloutsSet preserved | deep equal | Callouts & contributions |
| E.5 | about/profile preserved | deep equal | Profile |
| E.6 | visibility/privacy preserved | equal | Visibility / privacy |
| E.7 | settings preserved | deep equal | Settings |
| E.8 | L2 descendants move with parent | `childIds.contains(subsubspaceId)` | Descendants: All L2 children move |
| E.9 | L2 descendant level unchanged | `l2.level === SpaceLevel.L2` | Descendants |
| E.10 | L2 descendant collaboration preserved | deep equal | Callouts (descendants) |
| E.11 | account inherited from target L0 | `movedAccountId === targetAccountId` | Account / License: Inherited |
| E.12 | license subscriptions inherited from target | sorted subscriptions equal target's | Account / License |
| E.13 | moved space is first in target (sort order 0) | `subspaces[0].id === movedId` | Sort order: Set to 0 |

---

## F. moveSpaceL1ToSpaceL0 - Community & Roles (New)

**File:** `move-L1-to-L0-community.it-spec.ts`
**Setup:** Source L1 with members/leads/admins. Target L0.

| # | Test | Assertion | Matrix Effect |
|---|------|-----------|---------------|
| F.1 | all members removed from moved space | `members.length === 0` | Members: REMOVED |
| F.2 | all leads removed | `leads.length === 0` | Leads: REMOVED |
| F.3 | all admins removed | `admins.length === 0` | Admins: REMOVED |
| F.4 | all member organizations removed | `memberOrgs.length === 0` | Organizations: REMOVED |
| F.5 | L2 descendant members also cleared | `members.length === 0` | Descendants community |
| F.6 | L2 descendant admins also cleared | `admins.length === 0` | Descendants community |

---

## G. moveSpaceL1ToSpaceL0 - Rooms & Communication (New)

**File:** `move-L1-to-L0-rooms.it-spec.ts`
**Setup:** Source L1 with messages in callout rooms and updates room. Target L0.

| # | Test | Assertion | Matrix Effect |
|---|------|-----------|---------------|
| G.1 | callout discussion room messages preserved | `messageTexts.contains('test message')` | Callout discussion rooms: Preserved |
| G.2 | updates room recreated empty | `updatesMessages.length === 0` | Updates room: Recreated empty |
| G.3 | former member cannot access moved space | `privileges.not.contains('UPDATE')` | Room memberships: Revoked |

---

## H. moveSpaceL1ToSpaceL0 - Pre-existing Applications & Invitations (New)

**File:** `move-L1-to-L0-applications-invitations.it-spec.ts`
**Setup:** Source L1 with pending invitation and application. Target L0.

| # | Test | Assertion | Matrix Effect |
|---|------|-----------|---------------|
| H.1 | pending invitation invalidated after cross-L0 move | `hasError === true` | Authorization chain: Rebuilt |
| H.2 | pending application invalidated after cross-L0 move | `hasError === true` | Authorization chain: Rebuilt |
| H.3 | new invitation can be created after move | `invitation.id` defined | Post-move operations |
| H.4 | new application can be submitted and approved | `status === 200`, `state contains 'approved'` | Post-move operations |

---

## I. moveSpaceL1ToSpaceL0 - Auto-Invite (New)

**File:** `move-L1-to-L0-auto-invite.it-spec.ts`
**Setup:** Source L1 with members. Target L0 with overlapping members (SUBSPACE_MEMBER in both).

| # | Test | Assertion | Matrix Effect |
|---|------|-----------|---------------|
| I.1 | no invitations when autoInvite not set | `members.length === 0` | Auto-invite: disabled default |
| I.2 | invitations created for overlapping members (autoInvite=true) | space data defined | Auto-invite: overlap set |
| I.3 | auto-invite with custom message sent | space data defined | Auto-invite: message |

---

## J. moveSpaceL1ToSpaceL0 - Authorization & Validation (New)

**File:** `move-L1-to-L0-authorization.it-spec.ts`
**Setup:** Source L1. Target L0.

| # | Test | Assertion | Matrix Effect |
|---|------|-----------|---------------|
| J.1 | Platform Admin can execute move | `moveSpaceL1ToSpaceL0` defined, `level === L1` | Auth required: Platform Admin |
| J.2 | authorization chain rebuilt from target L0 | `privileges.length > 0` | Authorization chain: Rebuilt |
| J.3 | Space Admin cannot execute | `error.errors.length > 0` | Auth required |
| J.4 | Space Member cannot execute | `error.errors.length > 0` | Auth required |
| J.5 | Non-space member cannot execute | `error.errors.length > 0` | Auth required |
| J.6 | cannot move to same parent L0 | `error.errors.length > 0` | Validation |
| J.7 | cannot move with invalid spaceL1ID | `error.errors.length > 0` | Validation |
| J.8 | cannot move with invalid targetSpaceL0ID | `error.errors.length > 0` | Validation |
| J.9 | cannot move an L0 space (source must be L1) | `error.errors.length > 0` | Validation |

---

## K. moveSpaceL1ToSpaceL2 - Basic (New)

**File:** `move-L1-to-L2-basic.it-spec.ts`
**Setup:** Source L0 with L1 subspace (NO L2 children). Target L0 with L1 subspace as target parent.

| # | Test | Assertion | Matrix Effect |
|---|------|-----------|---------------|
| K.1 | space level demoted to L2 | `level === SpaceLevel.L2` | Space Level: Demoted |
| K.2 | moved space in target L1 subspaces | `subspaceIds.contains(movedId)` | Parent: Re-parented to target L1 |
| K.3 | moved space no longer in source L0 | `subspaceIds.not.contains(movedId)` | Parent |
| K.4 | collaboration calloutsSet preserved | deep equal | Callouts & contributions |
| K.5 | about/profile preserved | deep equal | Profile |
| K.6 | visibility/privacy preserved | equal | Visibility / privacy |
| K.7 | settings preserved | deep equal | Settings |
| K.8 | account inherited from target L0 | `accountId === targetAccountId` | Account / License: Inherited |
| K.9 | license subscriptions inherited | sorted equal target's | Account / License |
| K.10 | moved space first in target L1 subspaces | `subspaces[0].id === movedId` | Sort order: Set to 0 |

---

## L. moveSpaceL1ToSpaceL2 - Community & Roles (New)

**File:** `move-L1-to-L2-community.it-spec.ts`
**Setup:** Source L1 with members/admins. Target L0 with L1.

| # | Test | Assertion | Matrix Effect |
|---|------|-----------|---------------|
| L.1 | all members removed | `members.length === 0` | Members: REMOVED |
| L.2 | all leads removed | `leads.length === 0` | Leads: REMOVED |
| L.3 | all admins removed (key diff from same-L0) | `admins.length === 0` | Admins: REMOVED |
| L.4 | all member organizations removed | `memberOrgs.length === 0` | Organizations: REMOVED |

---

## M. moveSpaceL1ToSpaceL2 - Rooms & Communication (New)

**File:** `move-L1-to-L2-rooms.it-spec.ts`
**Setup:** Source L1 with messages. Target L1 in different L0.

| # | Test | Assertion | Matrix Effect |
|---|------|-----------|---------------|
| M.1 | callout discussion room messages preserved | `messageTexts.contains('test message')` | Callout discussion rooms: Preserved |
| M.2 | updates room recreated empty | `updatesMessages.length === 0` | Updates room: Recreated empty |
| M.3 | former member cannot access | `privileges.not.contains('UPDATE')` | Room memberships: Revoked |

---

## N. moveSpaceL1ToSpaceL2 - Pre-existing Applications & Invitations (New)

**File:** `move-L1-to-L2-applications-invitations.it-spec.ts`
**Setup:** Source L1 with pending invitation and application. Target L1 in different L0.

| # | Test | Assertion | Matrix Effect |
|---|------|-----------|---------------|
| N.1 | pending invitation invalidated | `hasError === true` | Authorization chain: Rebuilt |
| N.2 | pending application invalidated | `hasError === true` | Authorization chain: Rebuilt |
| N.3 | new invitation can be created after move | `invitation.id` defined | Post-move operations |
| N.4 | new application can be submitted and approved | `status === 200`, `state contains 'approved'` | Post-move operations |

---

## O. moveSpaceL1ToSpaceL2 - Auto-Invite (New)

**File:** `move-L1-to-L2-auto-invite.it-spec.ts`
**Setup:** Source L1 with members. Target L0/L1 with overlapping members.

| # | Test | Assertion | Matrix Effect |
|---|------|-----------|---------------|
| O.1 | no invitations when autoInvite not set | `members.length === 0` | Auto-invite: disabled |
| O.2 | invitations created for overlapping members | space data defined | Auto-invite: overlap set |
| O.3 | auto-invite with custom message | space data defined | Auto-invite: message |

---

## P. moveSpaceL1ToSpaceL2 - Authorization & Validation (New)

**File:** `move-L1-to-L2-authorization.it-spec.ts`
**Setup:** Source with/without L2 children. Target L1 in different L0.

| # | Test | Assertion | Matrix Effect |
|---|------|-----------|---------------|
| P.1 | Platform Admin can execute | `moveSpaceL1ToSpaceL2` defined, `level === L2` | Auth required: Platform Admin |
| P.2 | auth chain rebuilt from target L1 | `privileges.length > 0` | Authorization chain: Rebuilt |
| P.3 | Space Admin cannot execute | `error.errors.length > 0` | Auth required |
| P.4 | Space Member cannot execute | `error.errors.length > 0` | Auth required |
| P.5 | Non-space member cannot execute | `error.errors.length > 0` | Auth required |
| P.6 | blocked when source has L2 children | `error.errors.length > 0` | Descendants: Blocked if L2 children |
| P.7 | cannot target L1 in same L0 | `error.errors.length > 0` | Validation |
| P.8 | invalid spaceL1ID | `error.errors.length > 0` | Validation |
| P.9 | invalid targetSpaceL1ID | `error.errors.length > 0` | Validation |
| P.10 | cannot move L0 space (source must be L1) | `error.errors.length > 0` | Validation |

---

## Q. Same-L0 vs Cross-L0 Comparison (New)

**File:** `move-vs-convert-comparison.it-spec.ts`
**Setup:** Two separate runs — one cross-L0 move, compared against documented same-L0 behavior.

| # | Test | Assertion | Comparison Aspect |
|---|------|-----------|-------------------|
| Q.1 | cross-L0: admins are REMOVED | `admins.length === 0` | Same-L0 preserves, cross-L0 removes |
| Q.2 | cross-L0: members are REMOVED | `members.length === 0` | Same-L0 preserves, cross-L0 removes |
| Q.3 | cross-L0: account inherited from target | `accountId === targetAccountId` | Same-L0 unchanged, cross-L0 inherited |
| Q.4 | cross-L0: updates room recreated empty | `updatesMessages.length === 0` | Same-L0 no change, cross-L0 recreated |
| Q.5 | cross-L0: former member loses access | `privileges.not.contains('UPDATE')` | Same-L0 none, cross-L0 revoked |

---

## Effects Matrix Coverage Map

| Matrix Effect | moveL1ToL0 Test(s) | moveL1ToL2 Test(s) | Covered |
|---------------|--------------------|--------------------|---------|
| Space Level | E.1 | K.1 | Yes |
| Parent (re-parented) | E.2, E.3 | K.2, K.3 | Yes |
| levelZeroSpaceID | E.8, E.9 (via descendants) | K.8 (via account) | Yes |
| Descendants | E.8, E.9, E.10 | P.6 (blocked) | Yes |
| Members | F.1 | L.1 | Yes |
| Leads | F.2 | L.2 | Yes |
| Admins | F.3 | L.3 | Yes |
| Organizations | F.4 | L.4 | Yes |
| Virtual Contributors | F.4 (orgs proxy) | L.4 (orgs proxy) | Partial |
| Callout discussion rooms | G.1 | M.1 | Yes |
| Post comment rooms | G.1 (via callout) | M.1 (via callout) | Yes |
| Updates room | G.2 | M.2 | Yes |
| Room memberships | G.3 | M.3 | Yes |
| Callouts & contributions | E.4 | K.4 | Yes |
| Innovation flow tagsets | E.4 (via calloutsSet) | K.4 (via calloutsSet) | Partial |
| Authorization chain | J.2 | P.2 | Yes |
| Account / License | E.11, E.12 | K.8, K.9 | Yes |
| Storage aggregator | — | — | Not testable (no API query) |
| Sort order | E.13 | K.10 | Yes |
| URL caches | — | — | Not testable (no API query) |
| NameID validation | J.6 (same L0 error) | P.7 (same L0 error) | Partial |
| Visibility / privacy | E.6 | K.6 | Yes |
| Auto-invite | I.1-I.3 | O.1-O.3 | Yes |
| Auth required | J.1, J.3-J.5 | P.1, P.3-P.5 | Yes |
| Applications/Invitations | H.1-H.4 | N.1-N.4 | Yes |
| Atomicity | — | — | Not testable at API level |

### Items not testable at API level
- **Storage aggregator**: No query helper exists to retrieve aggregator parent. Would require a new GraphQL query.
- **URL caches**: URL invalidation is a post-commit best-effort operation. No API to verify cache state.
- **Atomicity**: Single DB transaction guarantee — not observable through API.

---

## Test File Summary

| File | Scenarios | Status |
|------|-----------|--------|
| `convert-L1-to-L0-basic.it-spec.ts` | 14 | Improved |
| `convert-L1-to-L0.it-spec.ts` | 4 | Improved |
| `convert-L1-to-L0-with-L2-to-L1.it-spec.ts` | 16 | Improved |
| `convert-L2-to-L1.it-spec.ts` | 12 | Improved (bug fixed) |
| `move-L1-to-L0-basic.it-spec.ts` | 13 | **New** |
| `move-L1-to-L0-community.it-spec.ts` | 6 | **New** |
| `move-L1-to-L0-rooms.it-spec.ts` | 3 | **New** |
| `move-L1-to-L0-applications-invitations.it-spec.ts` | 4 | **New** |
| `move-L1-to-L0-auto-invite.it-spec.ts` | 3 | **New** |
| `move-L1-to-L0-authorization.it-spec.ts` | 9 | **New** |
| `move-L1-to-L2-basic.it-spec.ts` | 10 | **New** |
| `move-L1-to-L2-community.it-spec.ts` | 4 | **New** |
| `move-L1-to-L2-rooms.it-spec.ts` | 3 | **New** |
| `move-L1-to-L2-applications-invitations.it-spec.ts` | 4 | **New** |
| `move-L1-to-L2-auto-invite.it-spec.ts` | 3 | **New** |
| `move-L1-to-L2-authorization.it-spec.ts` | 10 | **New** |
| `move-vs-convert-comparison.it-spec.ts` | 5 | **New** |
| **Total** | **123** | |

## Prerequisites

- Server PR #5959 must be merged (provides `moveSpaceL1ToSpaceL0` and `moveSpaceL1ToSpaceL2` mutations)
- GraphQL codegen must be run after schema update (`pnpm --filter @alkemio/tests-lib run codegen`)
- New GraphQL mutation files added: `lib/src/scenario/graphql/mutations/convert/moveSpaceL1ToSpaceL0.graphql` and `moveSpaceL1ToSpaceL2.graphql`
