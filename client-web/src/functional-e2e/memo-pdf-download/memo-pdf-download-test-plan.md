# Test plan — download a memo as PDF (087)

- **Story:** [alkem-io/server#6660](https://github.com/alkem-io/server/issues/6660), *Download a memo as PDF (unsigned, download only)*
- **Workspace spec:** `specs/087-memo-pdf-download/` in `alkem-io/agents-hq` is cited by every PR, but it was **never pushed** (no `feat/087-memo-pdf-download` branch on the remote as of 2026-10-21). Until it lands, the basis is the story's acceptance criteria plus the contracts in the product PR bodies.
- **Product code:** [server#6686](https://github.com/alkem-io/server/pull/6686) (merged 2026-10-20) adds `GET /api/private/rest/memo/{memoId}/pdf`. [client-web#10445](https://github.com/alkem-io/client-web/pull/10445) (merged 2026-10-20) adds the **Download PDF** button in the memo dialog.
- **Suite:** `client-web/src/functional-e2e/memo-pdf-download/`

## How to run

```bash
# both walks (US2 needs KRATOS_ADMIN_URL + ALKEMIO_ADMIN_PASSWORD)
pnpm --filter @alkemio/test-suite-client-web run test:memo-pdf-download
# US1 only, exactly as the nightly runs it
pnpm --filter @alkemio/test-suite-client-web run test:nightly --project="Memo PDF download"
```

- **poppler-utils** (`pdftotext`, `pdffonts`) must be installed. The content checks fail without it, because they are the only oracle for what the PDF contains. `nightly-client-tests.yml` installs it.
- **US1** uses the harness personas on a self-seeded Space (`TestScenarioFactory`), and runs nightly.
- **US2** creates its own Kratos identities through the admin API, and its own Spaces. Its teardown is fail-loud. The nightly workflow does not expose the Kratos admin API, so US2 runs only through the dedicated runner.

## Scenario → test mapping

| Scenario | Covers | Automated by |
|---|---|---|
| US1-AS1 | A reader downloads the memo. The file is named `<title-slug>-<UTC date>.pdf` (story AC4). The button is busy and disabled until the file arrives, then enabled again. The file starts with `%PDF-` | `us1-download-memo-pdf.spec.ts` › US1-AS1 |
| US1-AS2 | The button is on the callout-framing memo for an authenticated reader | `us1-…` › US1-AS2 |
| US1-AS3 | The content keeps the mark (no literal `==`), the emoji, the link text **with** its `/URI` link, and the external image as a labelled link. Every font is embedded, and an emoji font is among them. There is no header and no signing wording (story AC2) | `us1-…` › US1-AS3 |
| US1-AS4 | The content is read live: a paragraph that another collaborator has just typed is in the PDF | `us1-…` › US1-AS4 |
| US1-AS5 | A non-Latin title and a punctuation-only title fall back to `memo-<date>.pdf`. A 120-character title is cut to an 80-character slug | `us1-…` › US1-AS5 |
| US1-AS6 | The download works with and without the signing entitlement. The test first asserts that the entitlement is off (server#6686: no `SPACE_FLAG_MEMO_SIGNING` check) | `us1-…` › US1-AS6 |
| US2-AS1 | A signed-in non-member of a private Space gets 403, and is shown no memo and no button (story AC5) | `us2-download-access.spec.ts` › AS1 |
| US2-AS2 | An anonymous visitor reads a public memo but sees no button, and gets 401 for both a public and a private memo | `us2-…` › AS2 |
| US2-AS3 | An unknown memo id answers 404, and a malformed id answers 400 | `us2-…` › AS3 |
| US2-AS4 | An image from another memo's bucket answers 422 `{ message: 'Memo PDF image does not belong to the memo bucket' }`. The "too large / cannot be exported" toast is shown, the memo stays open, and nothing is downloaded | `us2-…` › AS4 |
| US2-AS5 | READ, not membership, is the gate (story AC1). The non-member refused in AS1 downloads a **public** memo: the button is shown and the file is named by the server. The response is 200 with `Content-Type: application/pdf`, `Content-Disposition: attachment; filename="<slug>-<date>.pdf"`, `Cache-Control: private, no-store` and `X-Content-Type-Options: nosniff` | `us2-…` › AS5 |
| US2-AS6 | A download stores nothing and signs nothing (story AC3). The memo's bucket documents are unchanged, and the memo has no signed copy | `us2-…` › AS6 |

## Not covered — known gaps

| Scenario | Why not automated end to end | Where it is covered instead |
|---|---|---|
| Story AC6: rendering a large memo does not block health checks | There is no load or latency harness (`docs/qa-knowledge/harness.md` › Standing gaps). The render runs in a forked worker | **No automated health check anywhere.** The forked worker is pinned by server `memo.pdf.executor*.spec.ts` and the compiled-worker gate in CI. Render time is pinned by `renderer.performance.spec.ts`, which runs only with `CONTENT_SIGNING_REAL_SERVICES=true`. Event-loop and health latency were measured live once (server#6686: health ≤ 33 ms during a 20-image render) |
| Story AC2: identical output to the signing preview | Preparing a signing preview needs a Cleverbase identity, which the harness personas lack (`entitlements/memo-signing-entitlement.it-spec.ts`) | server `memo.pdf.renderer.facade.spec.ts`, plus the Phase V parity walk in server#6686 (not re-walked on the final HEAD) |
| An image uploaded into the memo's own bucket is embedded | Needs an upload into the memo bucket plus image detection in the PDF bytes | server `memo.pdf.fidelity.spec.ts`, `memo.pdf.image-geometry.spec.ts` |
| 429 + `Retry-After: 5` for an account's own second download; 503 + `Retry-After: 5` when the instance is full, on a deadline, or when the off switch is set; the client's "busy" warning toast | A render takes about 0.8 s, so two concurrent requests race non-deterministically. 503 needs server env overrides (`MEMO_PDF_EXPORT_*`) | server `memo.pdf.executor.spec.ts`, `memo.pdf.controller.spec.ts`; client `useMemoPdfDownload.test.tsx`; live V′ in server#6686 |
| The generic "failed" toast for an unexpected status | No lever makes the server answer 500 on demand | client `useMemoPdfDownload.test.tsx` |
| Nothing is stored **anywhere** (signing-attempt rows, other buckets) | No DB access (standing). US2-AS6 pins the memo's own bucket and its signed copies only | live verification in server#6686 (file and signing-attempt counts unchanged) |
| The button on the framing **editor** surface, and on a contribution memo's success path | US2-AS4 reaches a contribution memo's button on the 422 path only. The editor surface has no seeded walk yet | client `CrdMemoDialog.downloadPdf.test.tsx` (the one dialog every surface opens) |
| A standalone memo (outside any Space) | No UI route opens one, and the harness has no lever that creates one | **None found.** server#6686 states "standalone memos work too", but no spec names the case |
| Cancellation when the browser disconnects | Not observable from a browser | server `memo.pdf.executor.spec.ts` |

## Open product questions

- **Anonymous visitors of a public Space.** They hold READ on the memo (US2-AS2 reads its content), yet they get 401 and no button. The story's AC1 says "a user with read access", and its open question "Who may download?" names "visitors of public spaces". The product chose signed-in readers only. US2-AS2 pins that choice until the spec records it.
