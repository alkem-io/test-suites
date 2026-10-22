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

---

# Document post templates (workspace#085)

`collabora-template-isolation.it-spec.ts` — the byte-level acceptance criteria
of `specs/085-document-post-templates` §5.1. It runs in the same `collabora`
vitest project:

```bash
pnpm --filter @alkemio/test-suite-server-api run test:collabora
```

## What it proves

| AC | Claim | Case |
|---|---|---|
| AC1 | A callout template created with an uploaded file carries that file's bytes, and its `documentType` is derived from the file (none is supplied in the input) | `the template carries the uploaded content` |
| AC2 | Applying that template twice yields **three** distinct backing files — template, post A1, post A2 — all hashing to the fixture | `two posts from one template have three distinct files…` |
| AC2 | The copy-on-apply source READ reaches a **template-owned** document for an ordinary space role: one apply runs as `SPACE_ADMIN`, the other as `SPACE_MEMBER`, and the member's `CREATE_CALLOUT` is asserted first so a refusal would be attributable to the source READ alone | same case |
| AC3 | A real content write on post A1 changes A1's bytes and leaves the template's and A2's **byte-identical** to their AC2 values — row-level *and* byte-level isolation | `editing one post changes only that post` |
| AC6 | Applying a template the actor cannot read is refused as the source READ denial — `FORBIDDEN_POLICY`, `unable to grant 'read' privilege`, **naming the source** (not the licence code, not a destination `CREATE_CALLOUT` denial) — and persists nothing. Its precondition is the template read's own `FORBIDDEN_POLICY`, not merely an absent template | `a foreign source is refused, and nothing is persisted` |

Every byte assertion flows through one reader, `fetchDocumentBytesHash`, which
builds on the **non-async** `getDocument` so the binary parser is attached
before the request is dispatched, and asserts `Buffer.isBuffer(res.body)`
before hashing. Without that guard a silent regression to superagent's default
text parser makes every comparison a tautology. Expected values are always
`sha256` of the on-disk fixture (`fixtureHash`), never a hash re-derived from
another served response.

AC6's "nothing persisted" is an id-set comparison taken **before and after** the
refused apply, plus a positive control reading space A in the same case.
`expect(callouts).toHaveLength(0)` would not do: space B is freshly created, so
zero is already true before the attempt and the assertion would pass whether or
not the refusal left an orphan behind — and it would also pass if the reader
started returning `[]` for an unrelated reason. Spec §0.2 rests its decision to
delete the resolver prechecks on this one live assertion.

## What it does not prove

**The content write is `replaceCollaboraDocument`, not a live Collabora save.**
Both re-point only the edited row, so the isolation claim holds either way, but
the WOPI editor round trip itself is the manual check in
`specs/085-document-post-templates` §8.

**`replaceCollaboraDocument` needs a reachable `wopi-service`.** Without one,
AC3 fails with a transient-sounding lock-check message. That is an environment
fault, not a product defect.

**Space A's `allowMembersToCreateCallouts: true` is deliberate.** Without it
`SPACE_MEMBER` holds no `CREATE_CALLOUT` and AC2's member leg fails for a
reason that has nothing to do with this feature. The case asserts the privilege
up front so that distinction stays visible.

Three things it deliberately leaves out:

- **Template deletion.** That deleting the template leaves the posts' bytes
  intact is shipped file-service refcount GC — blob GC counts the remaining
  references *after* the row delete and collects only at refcount 0 — which
  this feature does not touch. The structural guarantee it rests on, that the
  three documents are independent rows, is exactly what AC2 and AC3 prove.
- **The privilege outcome for editing a template-owned document**
  (`UPDATE_CONTENT`), deferred with the open/edit work (spec §6 D7, residual
  R-9).
- **Applying a template from a templates set the actor is not a member of** —
  the innovation-pack toolbox route (spec §6 D23, residual R-11, §8 human
  check 3).

Since revision 6 deleted the US2 acceptance walk (spec §5.2), this suite is
also **US2's only automated evidence** — there is no browser proof of the apply
at all.

**And nothing schedules it.** The `collabora` vitest project is not in the
`nightly` project's glob list in `server-api/vitest.config.ts`, and no workflow
in `.github/workflows/` invokes `test:collabora` — so AC1/AC2/AC3/AC6, and the
copy-on-apply source READ they are the only cover for, are verified **on demand
only**. Read "US2's only automated evidence" as *the only automated evidence
that exists*, not as standing coverage: a later change dropping that source
READ would leave every CI check green. Widening the nightly glob is the
obvious fix and is deliberately not done here — AC3 and the editor-URL cases
need a reachable `wopi-service`, so it has to be verified against the nightly
cluster first, as its own change.
