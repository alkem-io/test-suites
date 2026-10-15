# Acc QA Flow Report — Oct 2026

_As of 2026-10-15 · exploratory + automated verification of acc (`https://acc-alkem.io`)_

Exploratory and automated verification of acc flows on 12–15 Oct 2026, after the
authorization / Vault changes. Core product flows work; this round raised three
new code defects (now filed) plus one addition to an existing issue, confirmed
five known-open issues still reproduce, and reclassified two earlier findings as
file-loss / auth data remediation rather than code bugs. **All findings are
pre-existing — several confirmed present on prod — so none is a regression from
the Vault rollout.**

## At a glance

Of the ~17 findings carried from the first pass, one is resolved, five remain
known-open, two turned out to be data remediation rather than code, and the
genuinely new code defects narrowed to three — all now filed.

| Disposition | Count | Where |
| --- | --- | --- |
| New code defects — filed this round | 3 | client-web#10425, server#6661, server#6663 |
| Existing issue — extended with new evidence | 1 | client-web#8441 (comment) |
| Known-open — confirmed still reproducing | 5 | #9636, #2387, #2395, #1995, #8975 |
| Reclassified — data remediation or expected | 4 | folds into #1995 / not-a-bug |
| Resolved since first pass | 1 | Apollo notification console error |

Most notable (both pre-existing, confirmed on prod too): the MCP catalog exposed
to unauthenticated callers (server#6661), and the file-loss data (alkemio#1995)
behind the office-preview and storage-tab symptoms.

## Filed this round

Three new code defects raised, plus one extension to an existing issue. All
reproducible on acc 2026-10-14/15.

| Issue | Area | Severity | Summary |
| --- | --- | --- | --- |
| [client-web#10425](https://github.com/alkem-io/client-web/issues/10425) | Client routing | Low | `/user/me/settings/organisations` redirect-loops, appending `/profile` indefinitely; the correct `/organizations` works. |
| [server#6661](https://github.com/alkem-io/server/issues/6661) | MCP / authZ | Medium (security) | `/rest/mcp` serves the tools/resources catalog with no token — bad bearer → 401, but omitting the header → 200 + full 10-tool catalog. Discovery only; tool **invocation** gating untested (would raise severity if also open). |
| [server#6663](https://github.com/alkem-io/server/issues/6663) | Error handling | Low (security) | Error responses leak internal stack traces and `/usr/src/app/...` paths to clients (observed on a 401). |
| [client-web#8441](https://github.com/alkem-io/client-web/issues/8441) (existing) | Server/client | Medium | `deleteWhiteboard` / `deleteMemo` leave an orphan `CalloutContribution`. Commented with the new `deleteMemo` case and 12 pre-existing orphan rows already on acc (Aug–Sep). |

## Known-open, still reproducing

Already filed; confirmed live on acc this round. No new issues needed.

| Issue | Area | Still-current symptom |
| --- | --- | --- |
| [client-web#9636](https://github.com/alkem-io/client-web/issues/9636) | Space Storage tab | `AuthorizationPolicy without credential rules` for a storage-bucket; tab breaks. The acc trigger is a missing bucket entity — see Reclassified. |
| [infra-ops#2387](https://github.com/alkem-io/infrastructure-operations/issues/2387) | Edge hardening (P2) | Security headers absent on edge/static (nginx) responses; CSP missing. Note: the Node API path *does* carry helmet headers, so this is edge-scoped. |
| [infra-ops#2395](https://github.com/alkem-io/infrastructure-operations/issues/2395) | GraphQL (P3) | Introspection enabled (audit finding APP-3). |
| [alkemio#1995](https://github.com/alkem-io/alkemio/issues/1995) | Data remediation | DB references to files lost in the 2026-06-30 incident — dangling-document 404s. Root cause behind the office-preview and storage-tab symptoms below. |
| [client-web#8975](https://github.com/alkem-io/client-web/issues/8975) | Server version | `platform.metadata` version empty; help dialog shows "v". Open since Nov 2025. (Twin server#5819 was closed as a duplicate of this, not fixed — so it is **not** a regression.) |

## Reclassified — data or expected, not new code bugs

Four first-pass findings were re-investigated and do not warrant new code issues.
The two file-related ones were confirmed by pulling document records and fetching
the actual bytes.

| Finding | Verdict | Evidence |
| --- | --- | --- |
| Office-document previews 502 / doc won't open | **Data** (file-loss) | Of 3 sampled failing docs: one is a 0-byte file; one has a DB record claiming 715 KB but the file-service returns **404**; one document entity is missing entirely. Root cause is the 2026-06-30 file loss (#1995), not the preview feature. Robustness sub-point: it should degrade to "file unavailable" rather than a 502 + dead Collabora session. |
| Space Storage tab error | **Data / auth-state** | The storage-bucket named in the authorization error does not exist — `storageBucket(ID)` returns "Could not find any entity". A dangling reference, consistent with a stale auth-reset. The client defect is tracked in #9636. |
| Hosted-space limit not enforced | **Expected** | Only the GA-privileged QA account bypassed the limit; a standard account-licence-plus user gets the limit enforced. Not a bug. |
| Layout tab ~9.5s latency | **Expected (data-volume)** | Slow only on spaces with many callouts; scales with content rather than a fixed defect. Worth a perf ticket only if it regresses. |

## What was covered

Across two automated rounds (headless, incognito Playwright) plus manual
exploration, the following were exercised on acc.

**Automated**

- **Auth:** email/password login; social sign-in redirects (GitHub, Microsoft, LinkedIn)
- **Spaces:** create, delete; subspace create, delete
- **Callouts:** create / read / update / delete; manual (custom) selection
- **Collaboration:** whiteboard create and edit; memo create; Collabora office docs (open and edit intact files)
- **Calendar:** event create, delete
- **Community & messaging:** People / Orgs / VCs counts; direct messages
- **Content & templates:** documentation iframe; templates (40 restored)
- **Search:** global search filters (Spaces, Posts, Responses, Users, Orgs) and card navigation
- **Platform / admin:** settings pages; innovation-hub admin; MCP API key lifecycle (mint → use → revoke)
- **Innovation hub:** `uwv.acc-alkem.io`, logged-in and anonymous
- **Security / API probes:** security headers; GraphQL introspection; MCP endpoint auth; error-response hygiene

**Manual (QA lead, this round) — exercised, no defect raised**

- Guest contributions to a public whiteboard
- Signing a memo document
- Multi-user memo and whiteboard (concurrent editing)
- Password reset (run manually — it was excluded from the automated incognito suite)
- Adding a Cleverbase account to an existing account
- Global search
- Commenting with the guidance engine (virtual contributor)
- Registering a brand-new user with email + password, then self-deleting the account

## Status & context

Every finding above is **pre-existing** — several were confirmed present on prod
as well as acc — so none is a regression introduced by the Vault rollout. This
report is a coverage-and-findings record; whether and when to address each item
is the team's call. The new issues were filed so the findings stay tracked, not
to imply they block this change.
