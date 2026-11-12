# Test plan — upload a file reference, a media-gallery image and a message attachment, with a storage read-back (W2 journey 11)

> **Status:** Draft · **Depth:** Standard (storage contract + download access; files move to the file container in the rebuild), capped at the journey: 6 cases · **Source:** `docs/qa/server-rebuild/plan.md` § W2 row 11; client-net audit rows N2, N3, N4 and § 4 item 27; issue alkem-io/test-suites#721

There is no diff. The basis is the plan, the audit, and product source read at client-web `origin/develop` @ `25ded1467` and server `origin/develop` @ `e120d25a1`. In the CRD client a callout is a **Post**. Before this suite **no browser test uploaded a file reference, a media-gallery image or a chat attachment** (audit N2/N3/N4 ABSENT). The storage API area (`server-api/…/storage/`) covers uploads and the document-access matrix over the API only. The `comment-images` forge walks (`client-web/tests/`) send images in comments, but never read the stored file back.

Every case has the same three-part oracle, through named `@alkemio/tests-lib` functions:
1. **Record.** The server holds a document for the upload with the expected MIME type (`MimeType` enum), size and end location (`temporaryLocation: false`). Readers: `readCalloutStoredFiles`, `readStoredDocument`, `readConversationStoredFiles`.
2. **Bytes.** The URL the server hands out serves the upload. `downloadStoredFile` checks the HTTP 200, the `Content-Type`, the size, and byte equality for documents. For images, file-service canonicalises the bytes (EXIF rotation, metadata strip; server `visual.service`), so the check is the served pixel dimensions against the upload's, plus the served size against the stored size.
3. **Access.** A signed-in user without access to the container (`non.space`) is refused the same URL, and the refusal carries none of the file.

Uploads carry run-unique bytes, so a stale or deduplicated file cannot pass: a marker in the PDF text, and a run-derived pixel size for images.

## How to run
```bash
cd client-web
pnpm exec playwright test --config=config/playwright.config.nightly.ts --project="File uploads"   # RF-1/2, MG-1/2 (nightly, tier extended)
pnpm run test:local-stack --project="Local stack — message attachments"                         # MA-1/2 (@local-stack)
pnpm -C ../server-api exec vitest run --project contract                                          # lib shape case for the storage readers
```
- RF and MG each seed their own **private** L0 Space (`w2-j11-<area>-<uid>`), with `space.admin` as admin and member. Teardown is `teardownScenario` in a file-level `afterAll`.
- MA registers two disposable users (`contributors-crud.helpers` › `registerDisposableUser`) and creates a two-member **GROUP** conversation over the API as the sender. A DIRECT conversation can be neither left nor deleted by anyone (`leaveConversation` → BAD_USER_INPUT; no actor holds DELETE). It would outlive the run. Teardown: both members leave, the walk polls until the conversation is gone, then both users are deleted with their Kratos identities.
- `non.space` is used read-only, as the refused downloader. No persona is mutated.
- MA needs the browser to reach the Matrix homeserver: chat goes browser → Matrix. The shared test cluster has no reachable homeserver (`chat-avatars.helpers` › `matrixSendPath`, alkem-io/infrastructure-provisioning#51), so MA is tagged `@local-stack`. The nightly drops it (`grepInvert`), and `config/playwright.config.local-stack.ts` runs it. On a stack whose homeserver does not answer, each case skips with the probe's reason.

## Risk
| # | Risk (in user terms) | Likelihood | Impact | Level | Drives |
|---|---|---|---|---|---|
| R1 | A file attached to a post is "uploaded" but the link serves nothing, another file, or a truncated one | Medium (rebuild: uploads go straight to the file container) | High | **High** | RF-1 |
| R2 | A file uploaded in a private Space can be downloaded by anyone signed in | Medium (rebuild: download gating moves to the file container) | High | **High** | RF-1, MG-1, MA-1 |
| R3 | A file type the platform refuses is stored anyway, or the user is told nothing | Low | Medium | Medium | RF-2, MA-2 |
| R4 | An image added to a media gallery is lost, or is served at the wrong size or type | Medium | Medium | Medium | MG-1 |
| R5 | A non-image is accepted into a gallery | Low | Low | Low | MG-2 |
| R6 | A chat attachment never reaches the conversation's storage, so the other member gets a dead link, or an outsider can fetch it | Medium (rebuild: attachments move from Synapse media to the file container) | High | **High** | MA-1 |
| R7 | A file stays in the temporary area and is never moved to its end location (the #10126 class) | Medium | Medium | Medium | RF-1, MG-1, MA-1 (`temporaryLocation: false`) |

Elevated-risk triggers present: [x] authorization/visibility · [x] cross-repo contract (client-web ↔ server ↔ file-service, the rebuild) · [ ] migration · [ ] breaking contract · [ ] infra/config · [ ] data-destructive · [ ] performance-sensitive.

## Existing coverage before this work
Searched test-suites `origin/develop` @ `ef405cc0`; every row below comes from a file that was opened.
- **API storage.** `server-api/…/storage/uploads.it-spec.ts` covers `uploadFileOnReference`, `uploadImageOnVisual` and `uploadFileOnStorageBucket` across organisation, Space and innovation-hub profiles. The `storage/auth/*-document-auth` matrix covers document privileges by Space privacy. All of it is API-only, none of it nightly in client-web, and none of it touches a media gallery or a conversation bucket.
- **Comment images.** `client-web/tests/comment-images-us{1,2,3}` covers image comments end to end in the UI, through the same messaging media route as chat. It reads no stored file back.
- **Banner / avatar upload (N1).** `space-banner/*` and `chat-avatars/*` check the uploaded `src` on screen. Not storage read-backs, and not in scope here.
- **Reuse.** The `chat-avatars` helpers (`openChatPanel`, `openConversation`, `chatPanel`, `matrixSendPath`) and `contributors-crud.helpers` › `registerDisposableUser` are reused. **0 existing tests need updating.**

## Personas and data
`space.admin` acts in RF and MG. MA's sender and recipient are disposable users. `non.space` is the outsider, used read-only. Data per file: one private Space with two posts (framing NONE for RF, MEDIA_GALLERY for MG), or one two-member group conversation (MA). Files are generated in memory per run (`file-uploads.helpers` › `pdfPayload`, `executablePayload`; the lib's `createPngFixture` for images), so no fixture file is committed.

## Scenario → test mapping
Techniques: **EP** file-type partition (accepted / refused) · **DT** viewer × access · **UC** use-case walk · **EG** error guess (temporary location, canonicalisation).

| ID | Scenario | Technique | Oracle | Automated by | Layer |
|---|---|---|---|---|---|
| RF-1 | Space admin, Edit Post › More options › Add another reference › Attach file (PDF), Save | UC, DT, EG | The row fills with the returned `/rest/storage/document/<id>` URL and the file's base name. Record: the reference `{name, uri}`, and exactly one document in the post's bucket with that URL, file name, `PDF`, the byte size and `temporaryLocation: false`. Bytes: identical, `application/pdf`. Access: `non.space` refused (4xx). The reloaded post links the reference to the stored URL | `us1-reference-file.spec.ts` › RF-1 | UI + lib |
| RF-2 | Same row, a Windows executable is attached | EP | The bucket policy (read back) does not list its type. The browser's upload answers with GraphQL errors, the toast "Error occurred while uploading the file" shows, the URL stays empty, and the bucket stays empty. Positive control: a PDF on the same row uploads. After Discard, only that control is stored | `us1-reference-file.spec.ts` › RF-2 | UI + lib |
| MG-1 | Space admin opens a media-gallery post, Add images (PNG) | UC, DT, EG | `addVisualToMediaGallery` and the upload answer without errors, and the image shows with its alt text. Record: exactly one visual with that alt text; its document (`readStoredDocument` by the id in the visual's URI) is `PNG` and `temporaryLocation: false`. Bytes: `image/png`, size = stored size, pixel size = uploaded. Access: `non.space` refused | `us2-media-gallery.spec.ts` › MG-1 | UI + lib |
| MG-2 | Same gallery affordance, a text file | EP | Warning "Unsupported file type"; the read-back shows no visual. Positive control: a PNG then goes through and is the only visual | `us2-media-gallery.spec.ts` › MG-2 | UI + lib |
| MA-1 | Sender attaches a PDF in the conversation and sends it; the recipient opens the thread | UC, DT | The staged chip shows, the messaging media upload answers 200, and the chip clears. Record (polled; the server places the file when the message event returns from Matrix): exactly one document in the conversation bucket, with the file name, `PDF`, the size and `temporaryLocation: false`; the room's messages carry exactly that attachment. Bytes: identical for the recipient. Access: `non.space` refused. The recipient's fresh thread offers "Download <name>": its link reads this conversation's bucket, serves the recipient the identical bytes, and is refused to `non.space` | `us3-message-attachment.spec.ts` › MA-1 (`@local-stack`) | UI + lib |
| MA-2 | Sender attaches a Windows executable | EP | Alert "<name> has an unsupported file type.", nothing staged. Positive control: a PDF stages and is removed. No request reached the media upload route, and the bucket count is unchanged | `us3-message-attachment.spec.ts` › MA-2 (`@local-stack`) | UI + lib |
| — | API upload / document-access matrix | — | — | `server-api/…/storage/**` | covered (API) |
| — | Image comments (paste, drop, pick, limits) | — | — | `client-web/tests/comment-images-us*` | covered (UI) |

DT matrix: a member of the container (the Space admin; the conversation's recipient) gets the bytes. A signed-in outsider (`non.space`) is refused, in RF-1, MG-1 and MA-1 (both the document URL and the UI's link).

### Regression guards
- **RF-1:** the reference saved with a URL but no document behind it; a document left in temporary storage; a download serving other or truncated bytes or the wrong type; private-Space files downloadable by any signed-in user.
- **RF-2 / MG-2 / MA-2:** a refused type stored anyway, or refused silently. Each has a positive control on the same affordance, so a broken picker cannot pass as a refusal.
- **MG-1:** a gallery image lost after upload, served as another type or size, or public.
- **MA-1:** an attachment left in the Matrix staging bucket (the server's MOVE never ran), a message without its attachment, the recipient's link pointing at another bucket or serving nothing, an outsider able to fetch it.

## Not covered — known gaps
| Scenario | Why not automated | Where it belongs |
|---|---|---|
| Size limit (oversize) for references and attachments | A refusal needs a file above the bucket limit (15 MiB for a callout bucket, 50 MiB for chat). The client refuses it before upload (`file-size-error`, `errorTooLarge`), so the server limit would stay unproven. Comment images already cover the composer's size refusal (`comment-images-us3` US3-AS5) | server-api storage, a size-boundary it-spec |
| A reference file added while **creating** a post (temporary upload relocated on save) | The edit path uploads permanently. The create path's relocation is the #10126 class and deserves its own case | follow-up case, P2 |
| Reference file on a response (post contribution) | Same component and contract as RF-1 | — |
| Media-gallery video | Same affordance; video fixtures are heavy | follow-up, P3 |
| Deleting a reference or gallery image removes the stored document | No read-back of deletion exists anywhere (coverage map, orphan-free deletion) | orphan-free deletion area |
| Chat attachment on the shared test cluster | Environment: no reachable Matrix homeserver from the browser | `@local-stack` until infrastructure-provisioning#51 |

**Non-functional.**
- *Security:* access is covered for one outsider per case. The full privilege matrix stays in server-api `storage/auth`.
- *Compatibility:* desktop 1920×1080 only.
- *Accessibility:* not assessed here. The affordances are found by their accessible names ("Attach file", "Add images", "Attach files", "Download <name>").

## Product observations (drafts, not filed)
| # | Observation | Severity | Evidence |
|---|---|---|---|
| D-1 | `MediaGallery.storageBucket` always resolves `null`. The field is declared in the schema, but the server has no field resolver for it and the relation is not eager (`media.gallery.entity.ts`, `media.gallery.resolver.fields.ts`). A client cannot read a gallery's bucket, its policy or its documents through the field. Reproduced: a gallery with one uploaded image reads `storageBucket: null` as the platform admin | Minor (API) | MG-1 first run; worked around with `readStoredDocument` by the visual's URI |
| D-2 | A DIRECT conversation can be neither deleted (no actor, the platform admin included, holds DELETE) nor left (`Cannot remove members from a non-group conversation`). A DIRECT conversation therefore outlives any test, and any user who no longer wants it. Possibly by design (Matrix DM semantics); needs a product ruling | Question | MA runs 1–3 (DIRECT) |

## Open rulings for the lead
| # | Question | Provisional default |
|---|---|---|
| R-1 | Is an image served canonicalised (not byte-identical) the contract the rebuild keeps? | yes; MG-1 asserts type, size against the record, and pixel size |
| R-2 | Is the chat attachment link (`/rest/storage/file/by-reference?bucketId=…&ref=…`) part of the contract, or is the document URL? | the user-visible link must serve the bytes from the conversation bucket; MA-1 does not pin its shape |
| R-3 | MA runs on a GROUP of two because a DIRECT conversation cannot be cleaned up (D-2). Is that acceptable for N4? | yes |

**What this proves, and what it does not.** When green, the suite proves this on the deployed stack:
- a Space admin's browser can attach a document to a post and add an image to a gallery;
- a chat member's browser can send a document (local stack);
- the server records each upload, in its end location;
- each URL serves the upload (identical bytes for documents; same type and pixel size for images) to a member, and refuses an outsider;
- the platform refuses an executable reference or chat attachment, and a non-image gallery item, without storing anything.

It does **not** prove:
- server-side size limits;
- relocation from the temporary area on create;
- deletion of stored files.

## Build notes (2026-11-12)

**Files.** `file-uploads.helpers.ts`, `us1-reference-file.spec.ts`, `us2-media-gallery.spec.ts`, `us3-message-attachment.spec.ts`. Lib (`lib/src/scenario/functions/storage/stored-files.ts`, documents in `lib/src/scenario/graphql/queries/storage/`): `readCalloutStoredFiles`, `readStoredDocument`, `storedDocumentIdOf`, `downloadStoredFile` (RAW), `readConversationStoredFiles`, `createConversation`, `leaveConversation`. The `MimeType` enum is re-exported, and each new name and enum member is listed in `lib-contract.it-spec.ts`, with one storage shape case. The generated lib types were regenerated from server `develop`'s committed `schema.graphql`, which also brings in develop's platform-promote additions. Registered as nightly project `File uploads` (tier `extended`) and local-stack project `Local stack — message attachments`.

**Local runs** (local develop stack: server `e120d25a1`, client-web `25ded1467`; branded Chrome, headless), 2026-11-12. Run 1: `File uploads` 4/4, local stack 2/2. Run 2: `File uploads` 4/4, local stack 2/2. Both Spaces were removed in each run, and the group conversation and both users were removed with it. test-alkem.io has not been run yet (#721 asks for two green runs there for RF/MG).

**Red-proof (each oracle made to fail once, then restored).**

| Case | Mutation | Failed at |
|---|---|---|
| RF-1 | compare the served file with another run's PDF | `served size of …` |
| RF-2 | attach the accepted PDF instead of the executable | `the server refuses the upload` |
| MG-1 | expect another pixel size | `served pixel dimensions` |
| MG-2 | pick the PNG instead of the text file | the "Unsupported file type" warning (not shown) |
| MA-1 | download the recipient's link as the outsider | `download of …` (403, expected 200) |
| MA-2 | attach the PDF instead of the executable | the unsupported-type alert (not shown) |
