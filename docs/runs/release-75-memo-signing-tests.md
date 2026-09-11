# Release 75 — memo signing on ACC (tracker M3, live journey)

> **Result 11.09 (QA lead):** A1–A6 ✅. Happy path ✅ as platform admin, space member and space admin. Signed PDFs validated externally with the EU DSS demo validator (https://ec.europa.eu/digital-building-blocks/DSS/webapp-demo/validation) ✅. Deleting a signed memo ✅; another user's edits on one's own memo ✅. **Findings:** markdown → PDF formatting differences (memo markdown not rendered faithfully in the signed PDF) — server#6498 (bullets in table cells), #6499 (emoji), #6500 (line breaks in bullets), #6501 (wide images cut off); #6492 memo with a missing image file cannot be signed (pre-existing data, repair needs authorisation); product decision client-web#10294 (independent verification path). C1 decline ✅ (redirected back to the memo with a "you cancelled" message). C4/C5 foreign attempt id ✅: anonymous/incognito on a **public** space sees the memo and its signed copies (reader-visible by design, D1) and nothing more; on a **private** space the direct link exposes nothing. C9 plan revoke ✅. Not reported: C3 expiry sweep (leave to the operator during O2).

Run after the e2e-flow deploy on ACC finishes. Source: server `docs/sandbox-content-signing-acceptance.md`,
client `CrdMemoDialog` / `MemoSigningDialog` (develop), P13–P15 of the run sheet.
Personas: **S** = user with a linked Cleverbase login · **N** = normal user (no Cleverbase) · **P** = platform admin.
Keep the session cookie, authorize URL and certificate details out of screenshots and the report.

Attempt-status query, run as the signing user in the GraphQL playground (`/api/private/graphql`):
```graphql
query($id: UUID!) { signingAttempt(ID: $id) { id status createdDate updatedDate document { id displayName } } }
```
Row query for the operator (app DB):
```sql
SELECT id, status, "snapshotDocumentId", "correlationId", "expiresAt", "signedDocumentId", "updatedDate"
FROM signing_attempt WHERE id = '<attemptId>';
```

## A. Gates (entitlement off)
| # | Step | Expect |
|---|------|--------|
| A1 | **S** and **N** open a memo in a space **without** the Memo Signing plan | No Sign / "Signed copies" action anywhere in the memo dialog |
| A2 | **S**, playground: `mutation { prepareMemoSigning(signingData:{memoID:"<memo>"}) { attemptId previewUrl } }` | GraphQL error naming the entitlement (`Entitlement space-flag-memo-signing is not available…`); no 500 |
| A3 | **P**: grant **SPACE_FEATURE_MEMO_SIGNING** to one test L0 space | Space + one subspace: `license.entitlements` has `SPACE_FLAG_MEMO_SIGNING` enabled, limit 1; an unrelated space unchanged |
| A4 | **N** opens a memo in that space | Still no Sign action (identity gate: Cleverbase not linked) |
| A5 | **N**, playground: same `prepareMemoSigning` | Error `Link a Cleverbase identity before signing this memo` |
| A6 | **S** opens the same memo | "Signed copies" / Sign action visible |

## B. Happy path (space from A3, user S)
| # | Step | Expect |
|---|------|--------|
| B1 | Create a memo with unique text, wait for "Saved", open Sign | Stage "preparing" then an inline **PDF preview** showing exactly the saved text (the client forces durability first) |
| B2 | Copy `attemptId` from the `prepareMemoSigning` response (dev tools) → run the attempt query | `PENDING`; operator row: snapshot document set, `correlationId`/`expiresAt`/`signedDocumentId` null |
| B3 | Click **Continue** once | Browser leaves to the Cleverbase authorize URL; button does not double-fire (a second click is ignored) |
| B4 | While consent is open, re-run the queries | Still `PENDING`; row now has `correlationId` and `expiresAt` |
| B5 | Complete consent | Return via `/api/public/rest/content-signing/complete` to the **memo URL** with `?signingAttemptId=<id>`; the memo dialog opens on the signed state; the parameter is stripped from the address bar; any other query/hash on the memo URL is preserved |
| B6 | Attempt query + row | `SIGNED`; `snapshotDocumentId` null, `signedDocumentId` set |
| B7 | Reload the memo; open "Signed copies" | One entry: your name, **Recorded** date unchanged after reload, Download + Verify |
| B8 | Download the PDF | Opens; `pdfsig signed.pdf` (or any PDF reader) shows one signature |
| B9 | Click **Verify** | `VERIFIED`. Playground cross-check: `query { verifyMemoSignature(verificationData:{attemptID:"<id>"}) }` → `VERIFIED` |
| B10 | **N** (a reader, no Cleverbase) opens the memo | Sees the signed copy in "Signed copies", can Download and Verify, has no Sign action (R-14: signatures are reader-visible by design — D1) |
| B11 | Edit the memo text after signing, save, reopen "Signed copies" | The earlier signed copy is still listed and still verifies; the PDF content is the old text (immutable snapshot) |
| B12 | Sign again | Second entry appears; both verify |

## C. Aborts and edge cases
| # | Step | Expect |
|---|------|--------|
| C1 | Prepare + Continue a new attempt, **decline** in the Wallet | Return to the memo, no signed copy added; attempt `CANCELLED`, snapshot null, no signed document; no error toast beyond the dialog's own message |
| C2 | Prepare, then close the dialog without Continue | Attempt stays `PENDING` with a snapshot; nothing listed under "Signed copies"; memo still editable |
| C3 | Prepare + Continue, then abandon the Wallet; wait past `expiresAt` + 1 min + the next hourly sweep | `EXPIRED`, snapshot null; not listed as a signed copy |
| C4 | Open the memo URL with a bogus `?signingAttemptId=<random uuid>` | Dialog opens normally, no crash, no signed copy claimed; parameter removed |
| C5 | Open the memo URL with **another user's** attempt id, as **N** | Same as C4: nothing leaked (attempt query returns an error for a non-owner) |
| C6 | `curl -i https://acc-alkem.io/api/public/rest/content-signing/complete?state=<junk>&code=<junk>` unauthenticated | Redirect to `/login`, never 500 (M10 already green; confirm unchanged post-deploy) |
| C7 | Tamper: download the signed PDF, change one byte, run the gateway verify only if the operator exposes it; in Alkemio nothing to do | Alkemio's Verify only checks its own stored copy, so this is operator-side; skip if no gateway access |
| C8 | Delete the memo that has a signed copy | Deletion succeeds; `signing_attempt` rows for it are gone (FK cascade); the signed PDF `file` row is retained or removed per design — record what happens (P16 guard: no "retained by a signing attempt" error on **other** deletions) |
| C9 | **P**: revoke the plan from the test space | **S** loses the Sign action; existing signed copies remain listed and verify |

## D. Operator, alongside
- `kubectl get deploy trust-gateway` on ACC → present and Ready now (tracker O3 flips: the assumption "absent on ACC" no longer holds; PROD stays absent until promotion).
- Server logs during B3–B5: no stack traces; one attempt per Continue click.
- `SELECT status, count(*) FROM signing_attempt GROUP BY 1;` after the session: only the attempts you created.
- Leave the entitlement **off** on the test space before sign-off (P14 step 5) unless the team wants the demo space enabled.

## Evidence to keep
Screenshots of A6, B1 preview, B5 return, B7 list, B9 verdict, C1 return (addresses redacted); the attempt-status sequence PENDING → SIGNED and PENDING → CANCELLED; the PDF SHA-256.
