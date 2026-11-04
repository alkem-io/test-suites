# Patched MailSlurper for the Alkemio test stacks

A drop-in replacement for `oryd/mailslurper:latest-smtps` that stops it losing
mail. Same source commit, same build steps, same bundled config, certificates
and ports; two small patches on top.

MailSlurper only exists in dev and test stacks (production sends through a real
SMTP provider), so nothing here touches product code or production.

## Why

`oryd/mailslurper:latest-smtps` was built on 2020-02-18 from the last commit of
Ory's fork (`ory/mailslurper@4c6aecc`) and has not moved since. It has two bugs
that make mail assertions fail at random.

### 1. The connection pool is never emptied — `01-connection-pool-leak.patch`

MailSlurper tracks each client connection in a map keyed by the client's
`ip:port`. `ConnectionManager.Close()` closes the socket but never removes the
entry, and `ConnectionManager.New()` refuses any connection whose key is
already present: the listener logs

    Error adding connection '172.18.0.22:44054' to connection manager
    error="Connection on '172.18.0.22:44054' already exists"

and closes the socket. The client sees
`Client network socket disconnected before secure TLS connection was established`
and the mail is lost — the notifications service opens one connection per
recipient and does not retry a partially failed fan-out.

The operating system picks each new connection's source port from about 14,000
usable ports in an effectively random order, so the chance of a rejection is
roughly

    connections served since MailSlurper started / 14,000

That fit the measurements: 81 rejections in 1,484 connections (79 predicted),
19 in one full `notifications` run of 796 connections (22 predicted). A restart
only resets the counter; a single full `notifications` run makes enough
connections to lose about 20 mails on a freshly restarted MailSlurper.

The patch removes the entry on close — but only when the entry still holds
that same connection, so a late duplicate close for an old connection cannot
evict a new client that has since reused the address — makes `Close()`
idempotent (a worker can signal close more than once), and guards the map with
a mutex — it is written
by the SMTP listener goroutine and now deleted from by the close goroutine. The
lock is deliberately not held across `ServerPool.NextWorker`, which can wait up
to two seconds for a free worker.

### 2. SQLite drops mail under bursts — `02-sqlite-single-connection.patch`

The SQLite storage is opened with Go's default unbounded connection pool and no
busy timeout. About 40 simultaneous deliveries are enough for writers to
collide (`database is locked`), and the mail item is dropped *after* the SMTP
client was told `250 OK`. Found while burst-testing patch 1; the stock image
lost 60 of 400 mails in the same test. The patch limits SQLite to one
connection, which serializes access.

## Verification

Run from a `node:22-alpine` container on the stack's network
(`tls.connect({ localPort })` fixes the source port):

| Check | Stock image | Patched image |
|---|---|---|
| 3 mails from the SAME source port | 1 delivered, 2 rejected | 3 delivered |
| 800 mails in bursts of 40 | 340 of 400 stored (first 400) | 803 of 803 stored |
| `already exists` / `database is locked` / Go panics in the log | present | 0 / 0 / 0 |

Re-verified 2026-09-30 on a fresh local build: 400 mails in bursts of 40 →
400 stored, no rejections; `notifications` specs `post-contribution` and
`forum-discussions` (28 cases, the two that lost mails against the stock image
that day) → 28 passed, no rejections. MailSlurper writes to SQLite from a
queue, so count stored mail a few seconds after the last `250 OK`, not
immediately.

## Using it

**Local stack** — build the image from this directory, then apply
`docker-compose.override.yml` on top of the server repo's compose file; the
override swaps only the image of the `mailslurper` service. Exact commands are
in the override's header. (The override has no `build:` block on purpose:
Compose resolves a relative build context against the first `-f` file, which
is the server repo's, not this directory.)

**Nightly** — `.github/workflows/nightly-build-trigger.yml` pins the published
image on the test cluster's `mailslurper-deployment` before the suite runs, and
rolls back with a warning if the rollout fails.

**Test cluster** — the deployment lives in the private `alkem-io/dev-orchestration`
repo, one copy per environment overlay:

    01-alkemio-platform/overlays/test/third-party/mailing/mailslurper/11-mailslurper-deployment.yml
    01-alkemio-platform/overlays/dev/third-party/mailing/mailslurper/11-mailslurper-deployment.yml

Change the single `image:` line to the published tag. Pin the tag; never use
`latest`, or the fix can disappear on a re-pull.

**Image** — `.github/workflows/build-mailslurper-image.yml` builds this
directory and publishes `ghcr.io/alkem-io/test-suites/mailslurper`. The tag
encodes the upstream commit and the patch level (`smtps-4c6aecc-p2`). Bump the
`pN` suffix whenever a patch changes.

## Maintenance notes

- Upstream's Dockerfile runs an unpinned, global `go get github.com/mjibson/esc`,
  which no longer compiles on Go 1.13. This Dockerfile installs `esc` from
  inside the cloned module instead, where MailSlurper's own `go.sum` pins it.
- The build needs network access (it clones the fork and downloads Go modules).
- If this ever needs more than a patch or two, moving to a maintained catcher
  such as Mailpit is the better investment; `lib/src/utils/mailslurper.rest.requests.ts`
  is the one place that speaks MailSlurper's REST API.
