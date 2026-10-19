# Memo PDF download — test plan

Feature: a signed-in reader downloads a memo as an unsigned PDF through
`GET /api/private/rest/memo/{memoId}/pdf`. Run with
`pnpm --filter @alkemio/test-suite-client-web run test:memo-pdf-download`
against a stack serving the memo PDF export.

| Scenario | Spec | Case |
|---|---|---|
| Reader downloads; file named `<title-slug>-<UTC date>.pdf`; button busy until the file arrives | `us1-download-memo-pdf.spec.ts` | US1-AS1 |
| Download PDF present on the memo dialog for an authenticated reader | `us1-download-memo-pdf.spec.ts` | US1-AS2 |
| PDF keeps highlight, emoji and link text; external image as a labelled link; no header, no signing wording | `us1-download-memo-pdf.spec.ts` | US1-AS3 |
| Content is read live: a paragraph another collaborator just typed is in the PDF | `us1-download-memo-pdf.spec.ts` | US1-AS4 |
| Non-Latin and punctuation-only titles fall back to `memo-<date>.pdf`; long titles cut to an 80-character slug | `us1-download-memo-pdf.spec.ts` | US1-AS5 |
| Download is available with and without the signing entitlement | `us1-download-memo-pdf.spec.ts` | US1-AS6 |
| Signed-in non-member of a private space is refused (403) | `us2-download-access.spec.ts` | AS1 |
| Anonymous visitor sees no button and is refused (401) | `us2-download-access.spec.ts` | AS2 |
| Unknown memo 404, malformed id 400 | `us2-download-access.spec.ts` | AS3 |
| Memo embedding an image from another memo's storage is not exportable (422) | `us2-download-access.spec.ts` | AS4 |

Not automated here (covered by server unit specs and manual/live verification):
capacity responses (429 for an account's own second download, 503 when the
instance is full), the render deadline, cancellation, the off switch, nothing
stored after a download, and signing-preview parity.
