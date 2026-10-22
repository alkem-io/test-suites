# Test plan — images in comments

- **Story:** [alkem-io/client-web#10357](https://github.com/alkem-io/client-web/issues/10357), *Paste and add images in comments*
- **Workspace spec:** `specs/088-comment-images/` in `alkem-io/agents-hq` (user stories US1–US5 and their acceptance scenarios).
- **Product rules the walks pin:** one image per comment or reply send; JPEG, PNG, GIF and WebP only; the image button follows the right to post in the room (not the upload right on the bucket); image and text sent together post as one comment or reply, the text being the image's caption; a failed upload posts nothing and keeps the text; rooms without an attachment bucket (calendar events, the forum) keep develop's text composers.
- **Suite:** `client-web/tests/comment-images-us{1,2,3}-*.spec.ts` (forge-verify acceptance walks), shared fixtures in `client-web/tests/comment-images.helpers.ts`.

## How to run

```bash
# all three walks, exactly as the nightly runs them
pnpm --filter @alkemio/test-suite-client-web run test:nightly --project="Comment images"
# one walk
pnpm --filter @alkemio/test-suite-client-web run test:nightly --project="Comment images" comment-images-us2
```

- Every walk seeds its own private Space through the API (`seedCommentImages`) under a run-unique name, registers disposable Kratos identities for the people it drives (`addMember`, `addOutsider`), and deletes all of it in `afterAll`. The teardown fails the hook if anything leaks.
- The cases in a file do not depend on one another: each opens its own composer, sends under run-unique names and asserts on what it sent (US2 compares a thread's replies with what was there before the case). A failing case does not skip the rest; Playwright starts a fresh worker, which seeds afresh.
- The only shared persona used is the platform admin (US3-AS2 platform-admin case, US3-AS3/4/5/7). It is signed in, never modified. The ordinary member, the space admin (a disposable member given the Space's Admin role) and the non-member are disposable identities.
- Every browser context is given cookie consent before its first page loads (`grantCookieConsent`), so the consent banner never covers a composer.
- `KRATOS_ADMIN_URL`: the nightly workflow (`nightly-client-tests.yml`) does not set it, and the walks' set-up does not need it (the disposable people register through Kratos self-service). Teardown needs it only for its fallback: a disposable identity whose set-up failed before it became a platform user can be removed only through the Kratos admin API. Without the variable that cleanup fails loudly — the teardown hook fails and names the leaked identity — instead of leaking it silently.
- The forum discussion US3 seeds belongs to the platform forum, so for the run's duration it is visible platform-wide, to every signed-in user of the environment. That cannot be avoided: forum discussions are platform-scoped and cannot be placed inside the walk's private Space. Teardown deletes it.
- The upload goes through the messaging media route (`/api/private/rest/messaging/media/upload`). An environment where chat image uploads do not work fails every send case here, by design.

## Scenario → test mapping

| Scenario | Covers | Automated by |
|---|---|---|
| US1-AS1 | Pasting an image stages a removable chip, uploads nothing, and enables Send (the chip is then removed and a text-only comment sent as a barrier: it is the only `sendMessageToRoom` call, and no upload request was made) | `comment-images-us1-add.spec.ts` › US1-AS1 |
| US1-AS2 | Text + image posts one comment: one row holding both the text and the picture (the picture in that row's own attachment list, nothing else nested in the row), the picture beneath the text, no filename line; the picture opens full size in a new tab | `us1-…` › US1-AS2 |
| US1-AS3 | Image + text produce exactly one new comment row carrying the text and the picture (checked on screen, and as exactly one `sendMessageToRoom` call whose message is the text and which carries the one attachment) | `us1-…` › US1-AS3 |
| US1-AS4 | An image with no text posts an image-only comment rendered inline | `us1-…` › US1-AS4 |
| US1-AS5 | The image button opens an images-only picker by mouse, Enter and Space; dragging shows the hint; a drop stages | `us1-…` › US1-AS5 |
| US1-AS6 | A second image by paste, drop or pick is refused with the one-file alert; a two-file pick stages only the first | `us1-…` › US1-AS6 |
| US1-AS7 | Removing the chip clears it and sends nothing (a text comment sent afterwards is the only `sendMessageToRoom` call, and carries no attachment) | `us1-…` › US1-AS7 |
| US1-AS8 | The same flow in a post's own comments (contribution dialog), with the same checks as US1-AS2 | `us1-…` › US1-AS8 |
| US1-AS9 | A second member with the thread open sees the picture live and after reload | `us1-…` › US1-AS9 |
| US1-AS10 | Accessible names, the upload status live region, the refusal alert, keyboard order and operation of the chip | `us1-…` › US1-AS10 |
| US1-AS11 | A failing upload posts nothing, marks the chip failed (the chip marked 'Upload failed' in text) and keeps the text; after recovery Send posts one message carrying the text and the image | `us1-…` › US1-AS11 |
| US2-AS1 | An ordinary member's image reply keeps the box open and disabled while the send is in flight, then closes; the reply is last in the thread | `comment-images-us2-reply.spec.ts` › US2-AS1 |
| US2-AS2 | Text + image in a reply give one reply carrying the text and the picture, before and after reload | `us2-…` › US2-AS2 |
| US2-AS3 | Text typed and an image staged, the upload blocked: Send posts nothing (no `sendMessageReplyToRoom` call), the box stays open with the typed text, the failed chip (marked 'Upload failed' in text) and a message; unblocked, the retry is exactly one `sendMessageReplyToRoom` call and one reply carrying the text and the image; the chip can also be removed | `us2-…` › US2-AS3 |
| US2-AS4 | An image staged in one comment's reply box is not carried to another comment's reply box | `us2-…` › US2-AS4 |
| US3-AS1 | A signed-in non-member of the private Space gets no comment field and no image button on the callout and the post | `comment-images-us3-access.spec.ts` › US3-AS1 |
| US3-AS2 | An ordinary member and a space admin both get the image button and can send an image on the callout and the post; the platform admin is checked as an extra case | `us3-…` › US3-AS2 (member, space admin, platform admin) |
| US3-AS3 | A PDF dropped or pasted is refused as an unsupported type; nothing staged | `us3-…` › US3-AS3 |
| US3-AS4 | An SVG picked is refused as an unsupported type | `us3-…` › US3-AS4 |
| US3-AS5 | An image one byte above the room bucket's size limit (read from the bucket's `maxFileSize`) is refused with the exact message, the limit in whole MB as the composer words it | `us3-…` › US3-AS5 |
| US3-AS6 | Calendar-event and forum-discussion threads show no image button; a text comment and a text reply post as on develop: with the send held at the network, the field is already cleared and the reply box already closed | `us3-…` › US3-AS6 |
| US3-AS7 | Plain text and Office rich text with a bitmap paste as text (the clipboard text lands in the field) and stage nothing; a bare bitmap is consumed and stages (control) | `us3-…` › US3-AS7 |

## Not covered — known gaps

| Scenario | Why not automated here |
|---|---|
| US4 (notifications and virtual-contributor invocation for image-only messages) | Needs notification payloads, email bodies, a virtual contributor and server log lines. The server changes carry unit specs (`message.details.service.spec.ts`, `message.inbox.service.spec.ts`); there is no persisted browser walk. |
| US5 (deleting an image comment removes the picture for every viewer) | P2; no persisted walk yet. |
| HEIC, HEIF and AVIF refused in comments even where the room's bucket allows them | Pinned by unit specs instead of a walk: the client side by `useCommentImageStorageConfig.test.ts` (client-web), the server side by `room.attachment.send.spec.ts` (server). The browser refusal path itself is walked by US3-AS3 (PDF) and US3-AS4 (SVG). |
| Release check: a chat image upload succeeds in the target environment | Environment activation, not product behaviour; recorded in the Release NN story, not automated. |
