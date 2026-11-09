# Test plan — edit a whiteboard, a memo and a Collabora document, then reopen (W2 journey 5)

> **Status:** Approved for build (operator, 2026-11-09); lead rulings pending · **Depth:** Deep (data-destructive content path, cross-repo contract client-web ↔ collaboration-service ↔ server ↔ wopi/file-service, authorization of read-backs, infra prerequisites), capped at the journey's scope: 8 cases · **Source:** `docs/qa/server-rebuild/plan.md` § W2, journey 5; client-net audit rows E8 / E9 / E10 and § 4 item 21; catalogue rows CT-4 (absent), CT-5, CT-6 (partial)

**Build state (2026-11-09, local stack).** All eight cases are built, with the lib additions LA-1 to LA-7. E8-1 to E8-3, E10-1, E10-2, E9-1 and E9-2 ran green in two runs each on the committed specs, and the seven together in one project run (1.6 min). The Collabora cases needed the local server started with `WOPI_SERVICE_URL` (KD-1, a local-stack setup note, not a defect). **Test cluster (test-alkem.io, 2026-11-09): all seven nightly cases green in two runs (2.3 min each)**, after one test-side fix: E8-1 first read the raw text while later keystrokes were still in flight (`"WB 34d"` for `"WB 34d3f"`, editor showing the whole marker and "Saved"), so its wait now requires the whole marker, not only two elements. The lib peer authenticates to `/collab` on test (Q6 answered). E8-4 is built, tagged and unrun (the local collaboration service is not set to idle release 0). Deviations from the build sheet are listed under Build notes.

There is no diff. This journey is from a plan, so the basis is the plan, the audit, and product source read at client-web `f33325b2b`, server `0d276e485`, collaboration-service `v0.0.4` (deployed on test), wopi-service `HEAD`, and dev-orchestration `547af30`. Before this suite, the browser wrote content in all three editors but **no case proved that the content was stored, or that anyone else could see it after the writer left**. Each content type gets two cases. The first proves that the browser's edit was stored: a server or service read-back, never the editor alone. The second proves that a fresh session, by the author after a reload and by a second persona, gets that content back. One directory, because this is one journey: one seeded Space, one nightly project, and shared helpers. There are three spec files, one per content type, so that a Collabora outage cannot hide the other two.

## How to run
```bash
cd client-web && pnpm exec playwright test src/functional-e2e/content-editing/
pnpm run test:nightly --project="Content editing"            # registered, tier extended, capture off, actionTimeout 15 s
pnpm -C server-api exec vitest run --project contract src/contract/whiteboard-peer.it-spec.ts src/contract/lib-contract.it-spec.ts
```
- **Collabora** must be reachable on the target: CODE `26.04.2.4.1` behind `/browser` and `/cool`, wopi-service, **wopi-service reachable from the server (`WOPI_SERVICE_URL`)**, and the platform plan `SPACE_FEATURE_OFFICE_DOCUMENTS`. The test overlay deploys all of them (read from config, not run-verified). E9 cases **fail, never skip**, when the editor cannot load; the failure message names `collaboraEditorUrl` and `WOPI_SERVICE_URL`. Run the server-api `collabora` suite first: if it is red, E9 is red for the same reason.
- **The Node peer must be admitted on the target's `/collab`** with a persona bearer. This is proven on the local stack only (harness.md › Whiteboards, Q6). Run once on test before registering.
- E8-4 is `@local-stack` (the nightly excludes it; `pnpm run test:local-stack` runs the whole whiteboard file, project "Local stack — collaboration room release"). It needs `IDLE_RELEASE_SECONDS=0` on the collaboration-service, and the same value declared to the harness as `COLLAB_IDLE_RELEASE_SECONDS=0`; without it the case fails with that instruction.
- Each file is `mode: 'serial'`, and its chain has two or three links (write, then reopen). They are stated as preconditions.

## Risk
| # | Risk (in user terms) | Likelihood | Impact | Level | Drives |
|---|---|---|---|---|---|
| R1 | A drawing is gone when the board is reopened, because the room never stored it (save contract to server/file store broken) | High under the rebuild (the RabbitMQ save/fetch bus is removed) | Critical | **High** | E8-1, E8-4 |
| R2 | The author or a colleague reopens the board and gets an empty, stale, or someone else's board | High | Critical | **High** | E8-2, E8-4 |
| R3 | Memo text is typed but lost, or the platform serves a stale `markdown` | High | Critical | **High** | E10-1 |
| R4 | A colleague opens the memo after the author left and sees old text, or overwrites it | Medium | High | **High** | E10-2 |
| R5 | A typed Collabora document is not saved, or saves to the wrong file | Medium | Critical | **High** | E9-1 |
| R6 | A second editor's session loads the old file, so their save destroys the first editor's text | Medium | High | **High** | E9-2 |
| R7 | The callout card keeps the old whiteboard preview after editing (the visual upload path moves to the file container) | Medium | Low | Medium | E8-3 |
| R8 | A read-back is authorised wrongly (a member is refused content in their own Space, or a non-member reads it) | Medium | High | Medium | covered at API level, see mapping |
| R9 | Signing a memo breaks | — | High | — | not automatable here (deferred) |
| R10 | Env drift (Collabora, wopi or peer auth unavailable) reads as a product red | Medium | Medium | Medium | prerequisites, fail-loud setup |

Elevated-risk triggers present: [x] cross-repo contract · [x] data-destructive (content loss) · [x] authorization/visibility · [x] infra/config · [ ] migration · [ ] breaking contract · [ ] performance-sensitive.

## Existing coverage before this work
Searched test-suites `origin/develop` @ `afbefaf2` (commands in `docs/qa-knowledge/coverage-map.md` › Content editing). Every row below came from an opened file.
- **Whiteboard.**
  - `whiteboard-collaboration/` WC-01 and WC-02 draw in a browser and read the raw doc through `connectWhiteboardPeer`. They pin the undo race and a damaged board. They are skip-gated (`WHITEBOARD_COLLAB_FIXED`) and never assert storage or reopen.
  - `public-space/non-member-whiteboard-access` 3.1–3.4 check render and read-only for a non-member, with no content oracle.
  - `templates-CRD/whiteboard-template` 1.3 shows a template inside a whiteboard, with no content oracle.
  - **No case reopens a board, or proves it is durable.**
- **Memo.**
  - `memo-pdf-download` US1-AS4: a paragraph typed by A is shown **live** in B's open editor and in the PDF. **Full** for live relay. It is concurrent only: no reload, no stored-content read.
  - `authz-admin-guard/memo-sign-action-gate` 13.1/14.1, plus server-api `entitlements/memo-signing-entitlement`: **full** for the Sign gate (entitlement and Cleverbase identity).
  - **`Memo.markdown` ("last saved content") is read back by no test** (rg over `server-api/src`, `lib/src/scenario/graphql`).
- **Collabora.**
  - server-api `collabora/collabora-editor-url` (editor URL, authz matrix, import, replace) and `collabora-template-isolation` (byte isolation via `replaceCollaboraDocument`): **full at API level**.
  - `templates-CRD/document-template-content` DT-2 asserts only that "Open Document" is visible. **Nothing opens the editor iframe or types into it.** The isolation README says so itself ("not a live Collabora save").
- **Open PRs.**
  - #545 (server-api, wire level): admission, outsider refusal, convergence, a durability request, and cold rehydrate after idle release, for memo and whiteboard rooms with **raw Node writes**. It has not been run live. It is a different layer (no editor, no UI), and J5 does not duplicate it (see ruling L-4).
  - #699 un-pins the Documents template round trip (RT-2/RT-3) only. It is unrelated to editing.
- **Reuse.** 6 of the 20 scenarios needed no new test: live memo relay, the sign gate, the memo PDF, Collabora editor URL and authorization, Collabora isolation and replace, and whiteboard non-member read-only. 4 are not automated (signing, UI create of a document, guest share, template content). 10 are covered by 8 new cases. **0 existing tests need updating.** One additive change to a shared helper was made for E8-2: `editorElement` in `whiteboard-collaboration.helpers.ts` also returns the text element's `text` (optional field; WC-01/02 do not read it). These were confirmed unaffected: WC-01/02, memo-pdf US1, memo-sign gate, the template round trip, and non-member-whiteboard-access.

## Personas and data
| Persona | Kind | Role |
|---|---|---|
| `space.admin` | harness | Seeded admin and member. The author in every case |
| `space.member` | harness | Seeded member. The second session. Appends to the memo and the document (asserts `UPDATE_CONTENT` first) |
| Node peer (`connectWhiteboardPeer`, bearer `SPACE_ADMIN`) | lib instrument | Raw-doc reader and durability barrier for E8. It is not a user |

One private Space per file, seeded through the lib with run-unique names. Each file seeds one framed callout: a whiteboard (plus the `SPACE_FEATURE_WHITEBOARD_MULTI_USER` plan, so the peer is a collaborator), a memo seeded with `Seed <uid>`, or a blank WORDPROCESSING document (plus `SPACE_FEATURE_OFFICE_DOCUMENTS`). Teardown is `teardownScenario` in a file-level `afterAll`, and the peers are closed first. No persona is mutated.

## Scenario → test mapping
Techniques: **UC** use-case walk · **EP** viewer partition (author / second persona) · **ST** session transition (live → closed → reopened) · **EG** error guess (stale session overwrites).

| ID | Scenario | Technique | Oracle | Automated by | Status |
|---|---|---|---|---|---|
| E8-1 | Draw a rectangle and a text `WB <uid>`, then close | UC | The peer's raw doc holds exactly those two live elements, with the text equal to the marker. The durability barrier answers `persisted`. GraphQL `whiteboard.updatedDate` is later than its value before the editor opened. The editor dialog is gone | us1-whiteboard-draw-reopen.spec.ts › E8-1 the author draws a rectangle and a text and closes; the board is stored | built, 2/2 green (local) |
| E8-2 | The author reloads and reopens. `space.member` opens it in a fresh context | ST, EP | In each editor's own scene (`editorElement` by the ids from E8-1), the same two elements, with the same text and geometry as the raw doc. The author's reopened editor has Undo disabled (a fresh session, not a cached tab) | us1-whiteboard-draw-reopen.spec.ts › E8-2 the author reloads and reopens, and the member opens it in a fresh context | built, 2/2 green (local) |
| E8-3 | The callout card preview follows the edit | UC | The read-back of the CARD visual `uri` differs from its value before E8-1. The card image on the Space page has that `src` | us1-whiteboard-draw-reopen.spec.ts › E8-3 the callout card on the Space page shows the preview the edit produced | built, 2/2 green (local); oracle corrected, see Build notes |
| E8-4 | The board survives a room release (cold load from storage) | ST | With idle release 0, after every session closed, a fresh peer reads both elements | us1-whiteboard-draw-reopen.spec.ts › E8-4 the board survives a room release (`@local-stack`, ruling L-2) | built, **unrun** (stack not at idle release 0) |
| E10-1 | Type a paragraph `MEMO <uid>` into the seeded memo | UC | The editor shows it (precondition). A poll of GraphQL `memo.markdown` holds `Seed <uid>` and then `MEMO <uid>`, in that order, as separate paragraphs. `updatedDate` advanced | us2-memo-edit-reopen.spec.ts › E10-1 the author types a paragraph and the platform stores it | built, 2/2 green (local) |
| E10-2 | The author closes. `space.member` opens a fresh session and appends `MEMBER <uid>`. The author reloads and reopens | ST, EP | The member's editor is editable and shows both earlier paragraphs before typing. `markdown` read as `space.member` holds all three, in order. The author's reopened editor shows all three | us2-memo-edit-reopen.spec.ts › E10-2 a colleague opens it in a fresh session after the author left and appends | built, 2/2 green (local) |
| E9-1 | Open the document, type `DOC <uid>`, Ctrl+S | UC | The footer shows "Unsaved changes" after typing (positive precondition), then "Saved". The lib read of the stored file's text (DOCX `word/document.xml`, or ODT `content.xml`) has a paragraph equal to the marker | us3-collabora-type-reopen.spec.ts › E9-1 the author types a line and saves; the stored file holds it | built; **red on this local stack (env, 401 on the editor URL)**; probe with the URL minted around it 2/2 green |
| E9-2 | The author closes. `space.member` opens, types `MEMBER <uid>`, Ctrl+S | ST, EP, EG | The member holds `UPDATE_CONTENT` (precondition). The read as `space.member` holds **both** markers, the author's first. If the member's session had loaded a stale file, its save would have erased the author's text | us3-collabora-type-reopen.spec.ts › E9-2 a colleague opens it after the author left, adds a line and saves | built; **not run on the committed spec (blocked by E9-1's env)**; probe 2/2 green |
| — | Live relay of memo typing to an open second editor | — | — | `memo-pdf-download/us1-download-memo-pdf.spec.ts` › US1-AS4 | covered |
| — | The Sign gate (entitlement off / on without Cleverbase) | — | — | `authz-admin-guard/memo-sign-action-gate.spec.ts` › 13.1, 14.1; server-api `memo-signing-entitlement` | covered |
| — | Collabora editor URL, authorization, import, replace, isolation | — | — | server-api `collabora/collabora-editor-url.it-spec.ts`, `collabora-template-isolation.it-spec.ts` | covered (API) |
| — | Non-member whiteboard is read-only; outsider not admitted to a private room | — | — | `public-space/non-member-whiteboard-access` › 3.3; PR #545 (open) | covered / pending |

### Regression guards
- **E8-1 / E10-1:** a collaborator save that never reaches the server's metadata store, or a checkpoint that is never re-read (`saveCollaborationMetadata`, `contentPointer`). The memo `markdown` resolver reads the stored checkpoint, not the live room.
- **E9-2:** a WOPI `GetFile` that serves a stale or initial file to a later session. The fileID is stable across saves (wopi `PutFile` overwrites in place), so a cached read would pass any check that does not carry the first author's marker through a second save.

## Not covered — known gaps
| Scenario | Why not automated | Where it belongs |
|---|---|---|
| Actually signing a memo | **Deferred.** No harness persona has a Cleverbase identity, and there is no signing stub; signing leaves through `continueMemoSigning.authorizeUrl` | deferred.md; release checklist (manual sign on ACC) |
| Whiteboard guest share (E8 second half; the Guest Contributions toggle deferred here by `space-settings-write`) | **Out of this cut** (ruling L-6). Anonymous context, share dialog, guest name: a case of its own | follow-up J5b, P2 |
| Collabora text visible in the second browser | **Impossible as a DOM oracle.** COOL renders document tiles on canvas inside the iframe. E9-2's save-through-the-second-session is the falsifiable substitute | — |
| Create a Collabora document through the UI | Audit E1 (callout creation), not journey 5 | journey-1 follow-up of `callouts/0.5` |
| Cold load on the nightly cluster (idle release 30 s) | **Rejected as a fixed wait** under the conventions. Wire-level cold rehydrate is #545's | L-2 |
| Read-back authorization negatives per content type | Pure-API cases do not belong in Playwright (audit § 2.8) | server-api; #545 for rooms |
| `CollaboraDocument.updatedDate` as a save signal | **Not an oracle.** wopi writes file-service directly, so the server row is untouched | harness.md |

**Non-functional.** *Performance:* one Space and one document per file, nothing at volume, so no case. *Security:* the second persona reads through its own actor, so every read-back is authorization-scoped; the negatives live at API level (R8). *Reliability:* durable means the barrier answered `persisted`, never the footer "Saved" (the whiteboard and memo footers mean "sent", and the Collabora footer starts at "Saved"). *Compatibility:* E9 is Chrome only, because cross-browser COOL is out of scope; E8 and E10 are `ControlOrMeta`-safe. *Accessibility:* not assessed, because canvas editors expose no content to the a11y tree.

## Open rulings for the lead (Comoque1)
The operator (Carlos Cano) approved the plan for build on 2026-11-09 with the PROVISIONAL defaults below. Each stays open until the lead rules.

| Ruling | Provisional default used in the build |
|---|---|
| L-1 | provisional default: whiteboard oracle = the lib peer's raw Yjs read, plus the durability barrier, plus a second browser's scene, plus `updatedDate` |
| L-2 | provisional default: option (a), E8-4 is `@local-stack` with idle release 0, no fixed waits in the nightly |
| L-3 | provisional default: memo signing stays deferred |
| L-4, L-5 | notes for the lead, no action in this build |
| L-6 | provisional default: whiteboard guest share is a follow-up (J5b), out of J5 |
| L-7 | provisional default: ODT/DOCX text extraction on `node:zlib`, no new dependency |

The original rulings follow, unchanged.

- **L-1 (premise correction).** The handover's whiteboard oracle, "content read-back over GraphQL", does not exist. `Whiteboard` has no content field (generated schema: no content, markdown or elements field), and no input takes content (server#6399). The ruling proposed instead:
  - the raw Yjs read by the lib peer,
  - plus the service's durability barrier,
  - plus the editor's own scene in a second browser,
  - plus GraphQL `updatedDate`.
  - The memo **does** have a GraphQL oracle (`Memo.markdown`, the stored checkpoint). Collabora has a REST byte oracle, the stored ODT, which needs a lib text extractor (built: DOCX and ODT, `node:zlib`).
- **L-2.** Cold load: (a) E8-4 `@local-stack` with `IDLE_RELEASE_SECONDS=0` (recommended), (b) rely on #545's wire-level cold rehydrate on the nightly, (c) a 35 s constant-derived wait in the nightly, which breaks § 3.
- **L-3.** Signing is deferred, and the gate is already covered. J5 adds nothing for E10 "sign".
- **L-4.** #545 keeps the wire matrix. Rebase its private `collab-ws.client.ts` onto the lib peer, which gains `awaitDurable` here, so that the schema boundary has one wire client.
- **L-5.** Run WC-01/02 once on test: client-web `develop` resolves `@excalidraw-yjs/excalidraw` 0.5.6 since `cd2d50419` (2026-11-06). That one run also verifies the peer's auth on test, which E8 needs.
- **L-6.** Is guest share in J5 or in J5b?
- **L-7.** Office text extraction: a small zip reader on `node:zlib` (recommended, no new dependency) or adding `fflate` to the lib.

## Rebaseline register (server and service constants these oracles lean on)
- `SAVE_DEBOUNCE_MILLIS` 2000 (sets the poll budgets)
- `IDLE_RELEASE_SECONDS` 30
- the `/collab/<id>?type=` URL and wire frames, including type 4 durability and the `persisted` / `persist-failed` controls
- the preview URL shape `/api/private/wopi/files/<fileID>/preview`
- the storage REST path `/api/private/rest/storage/document/<id>`
- plan names `SPACE_FEATURE_WHITEBOARD_MULTI_USER` and `SPACE_FEATURE_OFFICE_DOCUMENTS`
- `Memo.markdown`, and the paragraph serialisation it uses
- `CollaboraDocumentType.WORDPROCESSING`, and the stored format of a blank one (zero-byte DOCX; COOL saves DOCX)
- the `persist-failed` control's `error` field, and the `WHITEBOARD_PREVIEW` / `CARD` visual pair the card reads
- COOL's own DOM the helper leans on: the `Page N of M` status bar and `iframe.iframe-welcome-modal`; the client-web editor dialog's footer texts

## Known defects

**KD-1 — `collaboraEditorUrl` answers 401 on the local stack; every Collabora editor open fails (environment, not product, not a test defect).** Reproduced on every attempt (two committed-spec runs, four probe attempts, plus the server-api `collabora-editor-url` suite: 12 of 18 red, all with the same error).
- **Evidence.**
  - The server answers `collaboraEditorUrl` with `AxiosError: Request failed with status code 401` (GraphQL `UNSPECIFIED`). The editor dialog shows "The document editor is temporarily unavailable. Request failed with status code 401".
  - wopi-service's own log shows `POST /wopi/token` and `GET /wopi/files/<id>/lock-status` answered `401` in microseconds, from the Docker gateway address.
  - The host-run server process has no `WOPI_SERVICE_URL` set, so `storage.collabora.wopi_service_url` falls back to its default `http://localhost:3000`, the Traefik gateway, which strips the trusted `X-Alkemio-Actor-Id` header the token endpoint requires.
  - Calling wopi-service directly on its mapped port with that header returns a token and editor URL.
- **Attribution.** Environment: the local server's configuration. Not a product defect (the config default is for the in-cluster layout).
- **Needed to run E9 on this stack.** Set `WOPI_SERVICE_URL=http://localhost:<host port of alkemio_dev_wopi_service>` on the host-run server and restart it (`docker port alkemio_dev_wopi_service`; 32783 on the day of the build, an ephemeral port). Then run `pnpm -C server-api run test:collabora` (it must go green first) and `--project='Content editing'`.
- **Status.** Resolved for this stack on 2026-11-09: with the server restarted on `WOPI_SERVICE_URL=http://localhost:32783`, the committed E9-1 and E9-2 passed 2 of 2, and once more in the full project run. E9 is not skipped: without the setting it fails loudly, as the plan requires. No issue filed.

No product defect found in whiteboard or memo persistence.

## Build notes (2026-11-09)

**Assumptions in this plan that the first runs falsified**
- The Space page card shows the **`WHITEBOARD_PREVIEW`** visual, not `CARD` (E8-3). The client uploads both on close, and uploads again on every later close, so E8-3 compares the card image with the server's *current* preview uri on each poll. `readWhiteboardState` selects both visuals.
- A blank WORDPROCESSING document is stored as a **zero-byte DOCX**, and COOL saves **DOCX**, not ODT. `readOfficeDocumentText` reads DOCX and OpenDocument, and an empty file is `{ paragraphs: [], bytes: 0 }`. The sheet's "`bytes > 0` on the blank document" guard cannot hold; the guard is that a non-2xx throws, and that the marker is found after the save.
- client-web's Collabora footer is **not** a status role and has no "Connected" text. The save chip is located by text inside the editor dialog, and readiness is COOL's own `Page 1 of 1` inside the frame.
- CODE shows a **"What's new" welcome modal** inside the editor frame, once per browser profile, which swallows keystrokes. The helper waits up to 5 s for it after the load and dismisses it with Escape. A late arrival would fail at the "Unsaved changes" precondition, by design.
- **Ctrl+S is not load-bearing in E9-1 when the editor is then closed** (closing makes COOL save). It is load-bearing for the poll window if the editor stays open: with neither, the stored file stayed empty for 15 s. The oracle is real either way.
- `whiteboard.updatedDate` **does** move on a persist (the assertion stays strict, `>`).
- The local collaboration service is `v0.0.3`, not `v0.0.4`, and already carries the durability barrier. Its `persist-failed` reason field is `error`.
- A memo caret placed by clicking the editor root and pressing Control+End was seen to land at the document start, so Enter and typing prepended (one run in six). Fixed by `appendMemoParagraph`: click the last paragraph, End, and read the selection back before any editing key.

**Deviations from the build sheet**
- `seedContentSpace(kind, uid, record)` takes the uid as an argument, and the three markers use `Seed`/`MEMO`/`MEMBER`/`WB`/`DOC` as specified.
- The authors' pages are `openPersonaPage` contexts opened in `beforeAll` (the house pattern of `space-settings-write`), not `createPersonaTest`, so the serial chain keeps one tab across reload and reopen.
- E8-1 closes the editor with the header's "Close whiteboard" button, not repeated Escapes.
- E9 saves are located with `dialog.getByText`, not `getByRole('status')`.
- The suite sits after "Space settings write" in the nightly (after the Space project and the W2 journeys 1–4, before the long callout suites), with `capture: 'off'` and `actionTimeout: 15 s` (the Classifications precedent).
- E8-4's guard **fails** (build sheet) rather than skips; the local-stack config documents it and lists the whole whiteboard file, since E8-4 needs the earlier cases' ids.
- Lib: `WhiteboardPeer.awaitDurable` rejects with the service's `error` text. `readOfficeDocumentText` and `officeDocumentFileId` are exported next to `officeDocumentParagraphs`; the contract adds a hand-built DOCX unit case and a negative control (an unknown document id throws).

**Red-proofs (run once each, 2026-11-09, local stack)**
| Oracle | Mutation | Result |
|---|---|---|
| E8-1 | drawing step removed | red: `timed out after 15000 ms waiting for: the rectangle and the text to reach the raw document` |
| E10-1 | poll for `MEMO <uid>-x` | red: the stored-markdown poll fails with the expected/received diff |
| E9-1 | no Ctrl+S, editor closed, then the poll | **green**: COOL saves on close, so Ctrl+S is not load-bearing there |
| E9-1 | no Ctrl+S, editor left open | red: the stored file stayed empty for the poll window |
| E9-2 | oracle reads a fresh blank document | red: `authorKept: false, authorLines: 0, memberAfterAuthor: false` |
The E9 red-proofs ran in the probe (editor URL minted around KD-1), not on the committed spec; the committed spec itself has since run green with KD-1 cleared.

**E8-4 status, exactly.** Without the env the case fails with its setup instruction (observed on the local runner). With `COLLAB_IDLE_RELEASE_SECONDS=0` set on the harness only (the service still at its 30 s default) the case body ran green once, as a **code-path check only**: the oracle peer closed, a fresh read-only peer connected and read both elements, but the room was served from memory, so that run proves nothing about storage. E8-4 has **not** passed against a service at idle release 0.

**E8-4 evidence without the case.** A one-off script (not committed, not a case) wrote an element through a peer, got `persisted`, closed the peer, and read it from a fresh peer immediately (served from memory) and again after 36 s idle (cold load from storage): both returned the element. That proves the mechanism E8-4 relies on, with a fixed wait the suite forbids.

**Not changed.** The WC-01/WC-02 skip gate (`WHITEBOARD_COLLAB_FIXED`) is untouched: client-web `develop` resolves `@excalidraw-yjs/excalidraw` 0.5.6, so the gate can be lifted, but that is a separate item. The Node peer's admission on `test-alkem.io` is still unproven (E8 on the nightly depends on it).

**What this will prove, and what it will not.** When green, the suite will prove the following for all three editors on the deployed stack: a browser edit is stored where the platform keeps it, and a later session gets it back, both for the author and for a colleague. For the whiteboard, the storage half rests on the collaboration-service's own `persisted` answer, and the cold reload is proven only on the local stack (E8-4) or at the wire level (#545). **Signing a memo stays unproven end to end. It is one of the three things this journey names, and no test covers it.**
