# Collabora document API tests

Regression cover for **server#6360** — the proper fix for the ~8 s
`collaboraEditorUrl` stall (feature `110-collabora-editor-url-latency`,
PR alkem-io/server#6350, merged to `develop` 2026-08-13).

```bash
pnpm --filter @alkemio/test-suite-server-api run test:collabora
```

## What the change did

Two independent defects, fixed together:

- **D1** — best-effort analytics were `await`ed inline on the user-facing path.
  Now the three user-facing sites publish typed in-process lifecycle events
  (`collabora.document.{opened,replaced,uploaded}`) via `EventEmitter2.emit`,
  and a singleton subscriber owns attribution, reporting, timing and failure
  containment.
- **D2** — the ownership lookup started from the `Space` aggregate root and
  OR-ed two five-level relation paths through the callout graph (**7,917 ms** in
  production). It now starts at the uniquely indexed
  `callout_contribution.collaboraDocumentId`, falls back to
  `callout_framing.collaboraDocumentId`, and delegates to the existing
  `getLevelZeroSpaceIdForCalloutsSet`.

## What this suite proves

| # | Case | Covered by |
|---|---|---|
| 1 | Open a framing-attached document | `collaboraEditorUrl - resolves without waiting on analytics` |
| 2 | Open a contribution-attached document | same |
| 3 | Open a document in an L2 subspace | `returns the editor URL for a document in an L2 subspace` |
| 4 | Replace a document | `replaceCollaboraDocument - publishes only after persistence` |
| 5 | Import a document | `importCollaboraDocument - attaches an uploaded file` |
| 7 | Document with no owning Space | `collaboraEditorUrl - a document with no owning Space` |

Plus authorization (unauthenticated, non-member, member), the side-effect-free
`collaboraServiceAvailable` control, and the refused-replace ordering guard —
a write that fails must not leave a changed document behind, because
publication happens only after persistence succeeds.

### Case 7 does not need the client

A Collabora document with no owning Space means a callouts set of type
`KNOWLEDGE_BASE` — those hang off a Virtual Contributor, not a Space. The spec
creates the VC, its knowledge base and the Collabora callout **through the
API**, so it is not blocked by client-web#10125 (which blocks the UI route to
VC body-of-knowledge documents).

If the environment cannot provision a VC, the setup error is recorded and the
test **fails with that reason** rather than skipping. A skip here would be
indistinguishable from a pass, which is the failure mode this whole area is
prone to.

## What this suite cannot prove

**Analytics record content.** The five record contracts —
`collaboraDocumentOpened`, `calloutCollaboraDocumentReplaced`,
`calloutCollaboraDocumentUploaded`, `officeDocumentContribution`,
`officeDocumentView` — are written to Elasticsearch and are **not readable
through the GraphQL API**. No API test can assert that a record was produced,
or that it was attributed to the correct level-zero space.

This matters more than usual here: delivery is best-effort by design. `emit` is
fire-and-forget, subscriber failures are logged and swallowed, and a pod restart
between response and write drops the record. **If the subscriber were entirely
dead, every test in this suite would still pass.** The suite proves the user is
never harmed by analytics; it cannot prove analytics happened.

Verify the records separately, by one of:

1. **Kibana** (production / any environment where it is wired up) — the
   queries are in `specs/110-collabora-editor-url-latency/quickstart.md` in the
   server repo.
2. **The server log**, where Kibana is not configured — the subscriber emits one
   structured INFO record per lookup attempt. Pipe the log through:

   ```bash
   docker logs alkemio-server 2>&1 \
     | node scripts/verify-collabora-lookup-records.mjs --threshold-ms 100
   ```

   It applies the same rules as the SC-003 Kibana check, including the one that
   is easy to get wrong: **zero records is `unverified`, not a pass**, so it
   exits non-zero on silence.

   > **The record is invisible in the default dev log format.** The subscriber
   > logs an *object* as the Winston message. Only the JSON console format
   > preserves its fields; `nestLike` — the default when
   > `LOGGING_FORMAT_JSON=false` — stringifies it to the literal
   > `[collaboration] [object Object]`, so `durationMs`, `outcome` and
   > `collaboraDocumentId` are gone before they ever reach the log. Restart the
   > server with `LOGGING_FORMAT_JSON=true` to collect. The script detects this
   > case specifically and says so, rather than reporting "no records found",
   > which is what it otherwise looks like.

**Site 4** — the RabbitMQ contribution/view window consumer, which produces the
`officeDocumentContribution` / `officeDocumentView` aggregates — has no GraphQL
entry point at all. It is driven by real editing sessions closing their windows
and cannot be triggered from this suite. It was the site the Release 71 hotfix
disabled with an early return, so it needs its own manual check.

## Environment requirements

**Office Docs is licensed.** Creating any Collabora callout requires the
`SPACE_FLAG_OFFICE_DOCUMENTS` entitlement on the owning Collaboration; without
it every create is refused with `LICENSE_ENTITLEMENT_NOT_AVAILABLE` ("Office
Docs is not enabled for this Collaboration"). `beforeAll` assigns the
`SPACE_FEATURE_OFFICE_DOCUMENTS` license plan to the L0 space — the entitlement
is evaluated against the level-zero space agent, so that covers the L1/L2
subspaces too. The platform must have that plan (migration
`1776692645254-AddOfficeDocumentsEntitlement`); the spec fails with an explicit
message if it does not.

Knowledge-base and template callouts sets are **not** gated —
`ensureOfficeDocsAllowedForCalloutsSet` allows any CalloutsSet with no owning
Collaboration — which is why the no-owning-Space case needs no entitlement.

The editor-URL cases need a reachable `wopi-service`; without it
`collaboraEditorUrl` cannot issue a token and these tests fail. That is
deliberate — a token that cannot be issued is a real failure, not a skip.

The import/replace cases upload the ODT fixtures in `files-to-upload/`. They are
minimal but structurally valid OpenDocument files (`mimetype` stored first and
uncompressed), so `file-service-go` sniffs them as
`application/vnd.oasis.opendocument.text` and derives `WORDPROCESSING`.

## Timing assertion

`EDITOR_URL_BUDGET_MS` (override with `COLLABORA_EDITOR_URL_BUDGET_MS`)
defaults to **5000 ms**, and is a *regression ceiling*, not the SC-001
acceptance threshold.

SC-001 accepts on a **p95 below 1 s** measured on the APM `CollaboraEditorUrl`
transaction in production. What this suite measures is a client-side round trip
on a test environment, which includes network and a possible cold WOPI
discovery fetch (cached 12 h). Asserting 1 s here would be flaky and would not
mean what SC-001 means. 5 s is the spec's own alarm line: the regression put
every open at 5–8 s, and zero transactions exceeded 5 s in the 46 days before
it. Observed timings are logged on every run so a slow-but-passing environment
stays visible.
