# Original-byte, reference-only attachment acceptance (082)

This runner targets the replacement plan in the workspace feature spec. Earlier
prepared-image, file-ID, hint-fallback and cutoff-based reports are retained as
superseded private evidence; they do not establish this replacement's acceptance.

## Isolation

Require the mode-0600 `ATTACHMENTS_FIXTURE_FILE`, `isolated: true`, exact run ID,
loopback service endpoints, separate volumes, real actors and API-created room
ownership. Never default to the shared localhost:3000 stack. The runner does not
provision or restart services. Its operator controls the two retained private
082 fixtures and starts them only after all coordinated candidates are ready.

The Element upload checks require the fixture's existing supported UI login,
explicit loopback `elementCDPURL` and `elementBaseURL`. They read the logged-in
user ID, select a real file and click Element's native Upload action. They do not
inject tokens or replace the Element upload with an API request. API uploads used
for race, policy or setup scenarios are labelled separately.

## Replacement scenario map

| Scenario | Source | Required evidence |
| --- | --- | --- |
| Web and Element JPEG/WebP/video/file UI uploads | send-and-download.spec.ts | Original SHA/name retained, source metadata unchanged, staged identity MOVE, no twin, reference-only URL, rendering/download/reload |
| Direct reference reads | send-and-download.spec.ts and destination-access.spec.ts | Bucket/reference GET and HEAD, membership/anonymous/removal, Range206/416, seek, no file-ID request or attachment resolver |
| Forward and retry | forward-and-retry.spec.ts | Same reference across authorized buckets, one upload on retry, no automatic resend after partial confirmation |
| Current destination gates | destination-access.spec.ts | Permissions/consent/comments/MIME/size rechecked; shared callout/post bucket; ordinary storage unaffected |
| Bounded readiness | reference-readiness.spec.ts | Controlled same-resource404 injection, recovery and exhausted4HEAD budget; explicitly not actual storage lag |
| Raw streaming | upload-streaming.spec.ts | Existing GraphQL spool counted/reopened, adapter-to-Synapse before EOF, half/max, cancellation and allocation observations; no preparation endpoint |
| One-time normalization | historical-normalization.spec.ts | Genuine old writer data, explicit reviewed missing tuples, finite complete inventory, ordinary IDs intact, idempotent repeat, no runtime cutoff/hint read fallback |
| Provider and deletion | provider-cache-miss.spec.ts and intentional-deletion.spec.ts | One internal reference-content GET on actual cache miss, surviving copy, final deletion unavailable, reads never create rows |

File-row IDs are permitted only in scoped read-only database assertions and
intentional ordinary storage deletion setup. Matrix upload/send/download helpers
must use external references. The same public resource handles bounded placement
retry; no new server notification or GraphQL attachment resolver is used.

## Verification status

The isolated replacement run on 2026-10-08 passed 27 cases:

- Eight actual uploads: web and Element UI, each with JPEG, EXIF/GPS-bearing WebP,
  H.264 video and PDF. Original bytes and image metadata survived; Unicode names,
  storage placement, direct reference reads, reload/download and video seeking passed.
- Ten access/forward/retry/readiness cases, including actual membership-cache expiry,
  current destination checks, partial confirmation and two explicitly injected 404 cases.
- One finite normalization case using fresh genuine baseline-writer records, complete
  export, explicit tuple approval/exclusion, preserved ordinary D IDs and URLs, and
  idempotent repeat. The candidate HTTP reader started only after successful apply.
- Three provider/deletion cases: one GET on forced cache miss, independently authorized
  surviving copy, final association removal, and no fallback to the old ordinary D.
- Five new raw-streaming cases: half/max sizes, whole-body-buffer negative control,
  cancellation/spool cleanup, and EOF counting before the adapter request starts.

The final raw upload ends at Synapse upload completion; it does not perform an
extra metadata HEAD. Sending rechecks stored metadata and current destination policy.
The fixture web cap stayed 15 MiB; no successful 50 MiB web-upload claim is made.
Samples observed Node external memory up to 23.68/35.80 MiB for half/max uploads
(arrayBuffers are included in external). The 6/13 samples are not instantaneous
peaks or proof of constant RAM. Adapter gctrace is a GC observation, not a sampled
instantaneous heap. The existing GraphQL spool was observed on disk; no second
preparation stage is used.

Exact results and runtime identities are in the private fixture's
`reference-only-final-evidence.json` and `reference-only-runtime-provenance.json`;
the workspace verification record links the operator's absolute paths. All images
are explicitly local unpublished candidates. Earlier setup failures (missing local
exiftool PATH, expired Element UI session, and Element preview/filename-matching
assumptions) remain in their original reports; they are not product passes.

The current browser uses GraphQL messaging with raw reference metadata. The separate
native-sync client branch was not integrated; only its shared reference mapper seam
has unit coverage with resolver/fetch forbidden. Physical iOS remains untested.
No publication, production normalization or shared stack operation was performed.
