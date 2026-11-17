# Test plan — share a whiteboard with guests (W2 journey 5b)

> **Status:** Built (2026-11-12, local stack), awaiting review · **Depth:** Standard (authorization and visibility of a public route, cross-repo contract client-web ↔ server ↔ collaboration-service ↔ authorization-evaluation-service, data written by an unauthenticated actor), capped at the journey's scope · **Source:** `content-editing/content-editing-test-plan.md` › *Not covered* row "Whiteboard guest share" and ruling L-6 (follow-up J5b, P2); `space-settings-write/space-settings-write-test-plan.md` › *Deliberately not covered* (the Guest Contributions switch) · **Defects:** test-suites#724

**Build state (2026-11-12, local stack).** 6 cases (G-1 to G-6) run green twice on the committed spec (6 passed, 4 skipped, 1.9 min each, the Space torn down each time); 4 cases are `test.skip` on 3 reproduced product defects (KD-1 to KD-3). The project run takes about 2 min. Not yet run on the test cluster.

There is no diff. The basis is the product source, read at client-web `develop` `25ded1467` and server `develop` `e120d25a1`, plus workspace spec `specs/057-guest-collab-auth/` and client-web `specs/005-guest-whiteboard-access/`. Before this suite, nothing in test-suites set the Space's Guest Contributions switch, opened the share dialog's guest section, or loaded `/public/whiteboard/:id`.

## How the product gates a guest (derived from source)
- **Space setting.** `collaboration.allowGuestContributions` (Settings › Settings › Allowed Actions › "Guest Contributions"). Saving it resets the Space's authorization (`updateSpaceSettings` → `shouldUpdateAuthorizationPolicy`). While it is on, the board's reset grants `PUBLIC_SHARE` to the Space admins and to the board's creator (`whiteboard.service.authorization.ts`).
- **Board toggle.** The share dialog renders its guest section only for `PUBLIC_SHARE` (`CrdWhiteboardGuestAccessControls`). Its switch calls `updateWhiteboardGuestAccess`, which the server refuses while the Space setting is off. Turning it on adds the board's `public-access` rule: `GLOBAL_GUEST` and `GLOBAL_REGISTERED` get READ, UPDATE_CONTENT and CONTRIBUTE. The link (`<origin>/public/whiteboard/<id>`) is shown only while that rule is in place.
- **Public route.** Without a session, the page asks for a name (`JoinWhiteboardDialog`) before it loads anything. It keeps the name in `sessionStorage['alkemio_guest_name']`, sends it as the base64 `x-guest-name` header, and joins the room with `?guestName=`. A signed-in user is meant to get an anonymised "First L" name with no prompt (`useGuestSession`, `anonymizeGuestName`).
- **Revocation.** Turning the Space setting off resets the Space's authorization. The reset keeps the board's guest rule only if the setting is still on, so the rule is dropped. **The product intends a refusal, not read-only.** The server refuses the guest's lookup (the rule held READ too). The page shows its 404 state ("Whiteboard Not Found": spec 005 FR-013, FR-013a, and the edge case "guest access is now disabled"). Turning the setting back on does **not** re-share the board, because the rule is restored only if it was present before the reset. This is read from source and not asserted.

## How to run
```bash
cd client-web && pnpm exec playwright test src/functional-e2e/whiteboard-guest-share/
pnpm run test:nightly --project="Whiteboard guest share"      # registered, tier extended, capture off, actionTimeout 15 s
pnpm -C server-api exec vitest run --project contract src/contract/whiteboard-peer.it-spec.ts src/contract/lib-contract.it-spec.ts
```
- The file is `mode: 'serial'`, a chain of 6 running links (closed → open → guest joins → guest draws → signed-in user → revoked).
- The Node peer must be admitted on the target's `/collab` with a persona bearer (proven for journey 5 on local and test). It also needs the `SPACE_FEATURE_WHITEBOARD_MULTI_USER` plan, which the seed assigns.
- Nothing is `@local-stack`. Every precondition is self-seeded or a product constant.

## Risk
| # | Risk (in user terms) | Likelihood | Impact | Level | Drives |
|---|---|---|---|---|---|
| R1 | A board in a private Space is readable or editable through the public link while the Space has not allowed guests | Low | Critical | **High** | G-1 |
| R2 | An admin cannot share: the switch or the link never appears, or the link is wrong | Medium | High | **High** | G-2 |
| R3 | A guest cannot join, or joins under a name other than the one they gave | Medium (KD-2) | High | **High** | G-3, G-3a |
| R4 | A guest's drawing is lost, or members do not see it | Medium | High | **High** | G-4 |
| R5 | A signed-in user's real name is shown on a public board | Medium | High | **High** | G-5, G-5a |
| R6 | After an admin revokes guest access, the link still works | Medium (KD-2) | Critical | **High** | G-6, G-7 |
| R7 | The refusal reads as a server failure ("Something Went Wrong", "Try Again"), so guests retry and report outages | High (KD-1) | Low | Medium | G-1a |

Elevated-risk triggers present: [x] authorization/visibility · [x] cross-repo contract · [x] data written by an unauthenticated actor · [ ] migration · [ ] breaking contract · [ ] performance-sensitive.

## Existing coverage before this work
Searched test-suites `origin/develop` @ `ef405cc0` (`rg -i "guest|public/whiteboard|allowGuestContributions|PUBLIC_SHARE"` over `client-web/src`, `server-api/src`, `lib/src/scenario`):
- No Playwright case touched the switch, the share dialog's guest section, or the public route.
- `lib` read `allowGuestContributions` only in `readSpaceSettings`. `space-settings-write` saves other switches through the same `updateSpaceSettings` path.
- The `server-api` authorization suites hold no guest-actor case. Workspace 057's live matrix was run by hand at delivery and has no automated counterpart.
- **Reused from J5:**
  - the seed (`content-editing.helpers.ts` › `seedContentSpace('whiteboard')`: a private Space, the admin and member, one framed whiteboard and the multi-user plan) and its teardown (`teardownContent`);
  - the editor helpers and the scene read-back (`whiteboard-collaboration.helpers.ts` › `openWhiteboardInEditor`, `editorOf`, `pickTool`, `dragOnCanvas`, `canvasOf`, `editorElement`, `expectEditorAlive`);
  - the lib peer with its durability barrier (`connectWhiteboardPeer`, `waitFor`, `liveElements`, `rawElement`, `awaitDurable`);
  - E8-1's "the whole marker, not just the element count" wait, and E8-2's geometry comparison.
- **Reused from J4:** the Settings tab helpers (`space-settings-write.helpers.ts` › `openSettingsTab`, `settingSwitch`, `saveSettings`, `serverSettings`).

## Personas and data
| Persona | Kind | Role |
|---|---|---|
| `space.admin` | harness | Admin and member. Flips the setting and shares the board |
| anonymous guest | fresh context, no cookies, no storage | Joins under `Guest <uid>` and draws |
| `non.space` | harness, signed in, not a member | A registered user on the public route. Read only (`readMyUser` for first and last name); nothing is changed |
| `space.member` | harness | Sees the guest's drawing in a fresh context |
| Node peer (`SPACE_ADMIN` bearer) | lib instrument | Raw-document reader, durability barrier, and presence reader (`remoteUsernames`) |

One PRIVATE Space per run, seeded with run-unique names, so a guest or non-member can reach the board only through the share. Teardown is `teardownContent` in a file-level `afterAll`, after the open contexts and peers are closed. No persona is mutated.

## Scenario → test mapping
All cases are in `us1-whiteboard-guest-share.spec.ts`. Techniques: **ST** state transition (setting off → on → board shared → setting off), **EP** viewer partition (admin / anonymous guest / signed-in non-member / member), **NC** negative with a positive control, **EG** error guess.

| ID | Scenario | Technique | Oracle | Positive control | Status |
|---|---|---|---|---|---|
| G-1 | Setting off: no guest link, and the public route refuses | ST, NC | Server: the setting is `false`, and the admin's read has no `PUBLIC_SHARE` and `guestContributionsAllowed: false`. UI: the share dialog has no switch and no "Guest access" text. An anonymous guest who types the URL is asked for a name, then gets the refusal state and no editor. Server: a guest's read is refused with exactly one `FORBIDDEN_POLICY` error (not any failure) | The admin's read carries `UPDATE_CONTENT`. The share dialog's own "Share URL" field is visible before anything is asserted absent | green ×2 |
| G-1a | The refusal reads "Whiteboard Not Found" | EG | The page heading | — | **skip, KD-1** |
| G-2 | The admin turns the setting on and shares the board; the dialog offers the link | ST | The setting is saved (browser mutation answered, server reads `true`, switch on after a reload). The admin now holds `PUBLIC_SHARE`; the board is not shared yet. The share dialog's switch starts off, with no link field. The click answers `updateWhiteboardGuestAccess` with no errors, the switch turns on, and the link field equals `<baseUrl>/public/whiteboard/<id>`. Server: `guestContributionsAllowed: true`, and a guest's read succeeds. The same anonymous read **without** a guest name is still refused with `FORBIDDEN_POLICY` (057 US2-AS1) | G-1's refusals, inverted here; the named read is the control for the unnamed refusal | green ×2 |
| G-3a | A guest who follows the link at once is admitted | EG | Editor ready, and the peer sees the guest's name | — | **skip, KD-2** |
| G-3 | An anonymous guest opens the link, gives a name, and joins | UC, EP | Asked for a name first. `alkemio_guest_name` is the entered name. The editor's toolbar appears, which needs room admission. **The peer's presence read shows the session under exactly the entered name.** The name is not asked again | — (admission waits out KD-2, see below) | green ×2 |
| G-4 | The guest draws: stored, and a member sees it | UC, EP | The raw doc holds exactly the guest's rectangle (with an area) and the whole marker text, and `awaitDurable` answers `persisted`. `space.member`'s fresh editor shows both elements with the stored geometry and text, and the editor stays alive. **Two guests (057 US1-AS3):** the wire guest moves the browser guest's rectangle and the browser guest's editor applies the move; both stay connected. **Unnamed anonymous at the room (057 US2-AS1):** the same connect without `guestName` is refused (not a 5xx) | A guest peer at the wire (no session, `guestName`) is admitted with `write` and reads the marker; it is also the control for the unnamed refusal | green ×2 |
| G-5 | A signed-in non-member on the public route | EP, NC | The non-member's read succeeds only through the share (private Space). No name prompt. The editor is ready. The one new name in the room's presence is **not** the full display name and does not contain the last name | The new session is found by a strict count delta (one more than before), so "not the full name" reads a real name | green ×2 |
| G-5a | …and is shown by "First L" | EP | `alkemio_guest_name` and the presented name equal `anonymizeGuestName(first, last)` ("non S") | — | **skip, KD-3** |
| G-6 | The admin turns the setting off; the same link refuses | ST, NC | The setting is saved `false`. The admin lost `PUBLIC_SHARE` and `guestContributionsAllowed: false`. A guest's read is refused with exactly one `FORBIDDEN_POLICY` error. The guest's own tab, reloaded on the same link, shows the refusal state and **no editor at all** (refused, not read-only). The share dialog has no switch | G-2 and G-4 (the same link and reads worked minutes earlier) | green ×2 |
| G-7 | Right after revocation the room refuses a guest too | ST, NC | A wire guest's connect is refused | End of G-4: the same connect was admitted to write | **skip, KD-2** |

**G-3's admission loop.** It is a condition poll, not a sleep. It reloads until the editor's toolbar is up and the peer sees the guest's name. Its budget is authorization-evaluation-service's policy-cache TTL (60 s, `AES_POLICY_CACHE_TTL_MS`) plus 20 s. KD-2 is the reason for it, and G-3a pins KD-2. Once KD-2 is fixed, the first attempt passes. The oracle itself (name, presence, admission) is unchanged.

### Regression guards
- **G-1 / G-6:** a reset that keeps (or forgets to drop) the `public-access` rule. A `PUBLIC_SHARE` rule granted without the Space setting. A public page that renders the board for a `guestContributionsAllowed: false` answer (FR-013a).
- **G-3:** the name not carried to the room (`?guestName`): the presence read would show the fallback "Guest".
- **G-4:** guest edits accepted by the room but never stored (`persisted` is the service's own answer).
- **G-5:** the real display name presented on a public board.

## Not covered: known gaps
| Scenario | Why | Where |
|---|---|---|
| A guest still connected when access is revoked | The room keeps an admitted session. Whether it should be dropped is not specified (spec 005 and 057 are silent). Today it is also blurred by KD-2 | product question; raise with test-suites#724 |
| Re-enabling the setting does not re-share the board | Read from source (`wasGuestAccessEnabledBeforeReset`), not asserted. It costs another settings save for a P3 behaviour | follow-up if the lead wants it |
| Images on a guest board (`x-guest-name` on asset fetch) | 057's image row. Needs an uploaded image in the board; out of this cut | J5b follow-up |
| Name validation (empty, over 50 characters, punctuation) | Unit-covered in client-web (`guestNameValidator.spec.ts`). Not a cross-repo risk | client-web unit |
| The "Anyone with the link can edit" footer badge | Presentational | — |
| Two guests editing together, the browser guest's live edit received by another guest | G-4 pins one direction (a wire guest's edit reaches the browser guest, both stay connected). The reverse direction is not walked: the browser guest's drawing reaches the wire guest only through the stored document | follow-up |

## Known defects (reproduced, drafts for test-suites#724; nothing filed)

**KD-1 — the public route shows "Something Went Wrong" instead of "Whiteboard Not Found" for a board that is not shared (client-web).**
- **Reproduce.** On a private Space with Guest Contributions off, open `/public/whiteboard/<id>` in a fresh context, enter a name, and Join. The page shows "Something Went Wrong / We couldn't load this whiteboard. Please try again." with "Try Again".
- **Cause.** The server refuses the lookup with `FORBIDDEN_POLICY`: "Authorization: unable to grant 'read' privilege: lookup Whiteboard: <id> …". `CrdPublicWhiteboardPage.getErrorInfo` maps to not-found only when the *message* contains `404`, `not found`, `403`, `forbidden` or `not available`. None of those is in it, so the generic branch is taken.
- **Expected.** Spec 005: US "error messages" AC2, edge case "guest access is now disabled", FR-013 ("403: present the same 'Whiteboard not found'"). The fix should branch on `extensions.code` (`FORBIDDEN_POLICY`, `ENTITY_NOT_FOUND`), not on message text. That is the workspace's client-actionable-error convention.
- **Pinned by** G-1a (skipped). Same on revocation (G-6).

**KD-2 — the collaboration room enforces a board's guest access up to 60 s late, both ways (authorization-evaluation-service and deployment).**
- **Reproduce (admission).** The admin opens the board's editor and shares it from the share dialog. A guest who follows the link within a minute sees the editor dialog with a blank canvas and "Unavailable", and stays there. The client does not retry. collaboration-service logs `room join refused … collaboration access denied`. authorization-evaluation-service logs `"guest":true, … "privilege":"read","allowed":false,"reason":"Privilege 'read' not granted","latency_us":4`, a cache hit on the policy as it was before sharing. A reload after the TTL admits the guest.
- **Reproduce (revocation, security).** Share the board and let a guest join. Turn Guest Contributions off. The server and the page refuse at once (G-6). But a guest with no session connecting to `/collab/<id>?guestName=…` within the minute is **admitted with `access: "write"`** (G-7, observed).
- **Cause.** authorization-evaluation-service v0.0.5 logs at start-up `Policy cache initialized … ttl 60, invalidateSubject alkemio.policy.invalidate` and `NATS disabled (NATS_URL not configured)`. The infra-ops manifest for the service sets no `NATS_URL`, and the server publishes no policy invalidation. So every environment serves a cached policy for its full TTL after any authorization change. Sharing a board needs the editor open, and opening the editor caches the board's policy, so the admission side is hit on every share. This was not seen in 057's manual matrix, which tested static policies.
- **Expected.** A share takes effect for the next guest. A revocation takes effect for the next join (057 US2 AC2).
- **Pinned by** G-3a and G-7 (skipped). G-3 waits out the TTL as a condition (see above).

**KD-3 — a signed-in user on the public route is shown as "Guest", not by the anonymised "First L" (client-web).**
- **Reproduce.** Signed in as `non.space` (first "non", last "space"), open the guest link. There is no prompt, and the editor opens. `alkemio_guest_name` is empty. The room presents the session as **"Guest"** (expected **"non S"**).
- **Cause.** `useGuestSession` detects a signed-in user with `document.cookie.includes('ory_kratos_session=')`. That cookie (and `alkemio_session`) is httpOnly, so the check is always false and the derivation never runs. `resolveWhiteboardGuestIdentity` then has no name, and the editor falls back to `common.guestUserFallback`. Privacy holds: the full name is not shown (G-5 asserts it). The product's stated behaviour (client-web CLAUDE.md, spec 005 "authenticated users get anonymized names") does not hold.
- **Pinned by** G-5a (skipped).

## Lib additions (LB)
- **LB-1:** `readWhiteboardGuestAccess(whiteboardId, actor?, guestName?)` (`lib/src/scenario/functions/callout/whiteboard-callout.ts`; document `queries/callout/readWhiteboardGuestAccess.graphql`). It reads `guestContributionsAllowed` and `authorization.myPrivileges`. `guestName` sends the base64 `x-guest-name` header, so an `{ anonymous }` actor reads as a guest. Contract: `lib-contract.it-spec.ts` › LB-1, LB-2 (a guest is refused with `FORBIDDEN_POLICY` on a board that is not shared).
- **LB-3:** `ReadMyUser` also selects `firstName` and `lastName` (additive), for G-5's expected anonymised name.
- **LB-4:** `WhiteboardPeer.remoteUsernames()`. The peer now applies inbound awareness frames, which it used to drop, and lists the other sessions' `user.username`. Contract: `whiteboard-peer.it-spec.ts` › T-1k (reads the other session's name, never its own).
- **LB-5:** the `connectWhiteboardPeer({ guestName })` option (`?guestName=` on the URL, as client-web sends it). Contract: T-1l (refused on a board that is not shared).
- Generated types: only the hunks for these two documents were kept. The develop server schema is ahead of the committed generated file (the 095 promote fields), and that drift is not part of this change.

## QA challenge additions (2026-11-13, not yet run)
Added test-side by the PR challenge (QA-CH-01, QA-CH-02, QA-CH-04). They were **not run**: no stack was used. The first run must confirm them and red-proof each.
- G-1, G-6: the guest's refusal must be exactly one `FORBIDDEN_POLICY` error (`FORBIDDEN_POLICY_REFUSAL`, as contract LB-2). Red-proof: expect `ENTITY_NOT_FOUND` instead.
- G-2: an anonymous read without `x-guest-name` on the shared board is refused with `FORBIDDEN_POLICY` (057 US2-AS1, FR-007, FR-009). Red-proof: pass `GUEST_NAME`, which makes the read succeed.
- G-4: the same anonymous connect without `guestName` is refused by the room, and not with a gateway 5xx. The exact refusal frame (handshake status, or a close before the initial sync) is not pinned yet. It needs one observation on a live stack. Red-proof: add `guestName`, which admits it.
- G-4: a wire guest moves the browser guest's rectangle (`x` + 120), and the browser guest's editor applies it, with both sessions still connected (057 US1-AS3). Red-proof: expect the old `x`.

## Red-proofs (run once each, 2026-11-12, local stack, then restored)
| Oracle | Sabotage | Result |
|---|---|---|
| G-2 gate (lib `PUBLIC_SHARE`) | the admin never turns the setting on | red: the admin read's `canPublicShare` is `false` (toEqual diff) |
| G-3 stored name | the guest enters `<name>x` | red: `the session keeps the entered name` Expected "Guest …" Received "Guest …x" |
| G-3 presence | the oracle looks for a name nobody entered | red: `timed out … waiting for: the guest in the room as "Guest …"` (the full admission budget) |
| G-4 raw document | the guest types `<marker>x` | red: `timed out after 15000 ms waiting for: the guest's rectangle and the whole marker text to reach the raw document` |
| G-5 privacy | "full name" set to the name the room shows ("Guest") | red: `the full name is not presented to the room` Expected: not "Guest" (the oracle reads the real presented name) |
| G-6 revocation (server) | the admin never turns the setting off | red: the admin read still has `canPublicShare: true`, `guestContributionsAllowed: true` (toEqual diff) |
| G-6 revocation (page) | no revocation and no server checks, only the reloaded guest tab | red: `the guest link refuses`: no refusal heading (the editor loaded) |

## Rebaseline register
- authorization-evaluation-service policy-cache TTL: 60 s (`AES_POLICY_CACHE_TTL_MS`, G-3's admission budget)
- the route `/public/whiteboard/:id`, `sessionStorage['alkemio_guest_name']`, the `x-guest-name` header (base64), and the `?guestName=` collab parameter
- the server's `public-access` rule contents, and `PUBLIC_SHARE` granted only under `allowGuestContributions`
- UI copy:
  - "Guest Contributions";
  - the share dialog's "Share" title, "Share URL" and "Guest Access URL" fields, and its single switch;
  - "Join Whiteboard", "Guest display name", "Join as Guest";
  - the error headings "Whiteboard Not Found" and "Something Went Wrong";
  - the editor's `Drawing canvas` and "Rectangle —" tool title.
