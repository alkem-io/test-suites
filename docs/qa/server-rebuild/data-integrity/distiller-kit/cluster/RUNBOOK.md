# Distiller run in the cluster: runbook

One run, one set of volumes, one runner pod. The kit never applies anything to a cluster and never reads a live
database or a bucket. An operator does the steps marked OPS. Everything else runs inside the pod.

## What runs where

| Stage | Needs | Runs in the pod today |
|---|---|---|
| source, copy, repairs, guards, access | the pod's own Postgres | yes |
| reset | server, reset workers, queue service and login service on the new database | only with a stack declared, see below |
| walk as users, page walk, editors | the same stack plus the web client | only with a stack declared and an image built with the browser |

## Steps

1. OPS: build and push the kit image. It holds scripts and agreed counts only, no data.
   `docker build -f cluster/Dockerfile.kit --build-arg SERVER_IMAGE=<server image of the release> -t <registry>/distiller-kit:<tag> .`
   Add `--build-arg WITH_BROWSER=1` when the walks will run.
2. Render the manifests: `KIT_IMAGE=<registry>/distiller-kit:<tag> ./88-cluster-volumes.sh render <run> > distill-<run>.yml`
3. OPS: read the file, check the attach limit of the node (eight block volumes on one node), apply it.
4. OPS: put the source backups into the pod, in a folder outside the volumes, for example `/tmp/incoming`.
5. In the kit container:

   ```
   ./88-cluster-volumes.sh pod-init
   ./88-cluster-volumes.sh check
   ./88-cluster-volumes.sh load-source /tmp/incoming      # copies, records sha256, seals the source volume
   ./88-cluster-volumes.sh restore-source src_            # one database per backup: src_alkemio, src_kratos, ...
   SKIP_RESET=1 ALK_DB=none ./87-distill-flow.sh <run> src_alkemio distill_<run> src_kratos \
       src_synapse src_kratos src_hydra src_assistant src_filebackup src_wopi
   ./88-cluster-volumes.sh inventory
   ```

   `SKIP_RESET=1` is for a run with no application stack. The result then describes a state the application has
   not recalculated. It is not the final result.

## The acceptance test with a switch (decided 2026-11-18)

The switch is asked first, approved, and made by a person. The kit never stops a server, never loads a database
into an environment and never points a server at one. File `89-switch-gate.sh` holds the gate.

1. Run the flow with `SWITCH_GATE=1` in place of `SKIP_RESET=1`. After source, copy and repairs it writes
   `runs/<run>/flow/89-switch-request.md` and stops with exit 11. The request names one file and its sha256, what
   passed, the steps for the person and the way back.
2. The request goes to whoever approves. A PERSON runs `./89-switch-gate.sh approve <run>` at a terminal.
3. A PERSON switches acceptance in the agreed window, following the steps in the request, runs the authorization
   reset there, and records it with `./89-switch-gate.sh switched <run>`.
4. OPS takes a backup of acceptance after the reset and puts it into the pod. Restore it as `distill_<run>_after`.
5. `SWITCH_GATE=1 AFTER_RESET_DB=distill_<run>_after FROM=reset ./87-distill-flow.sh <same arguments>` runs the
   guards and the access checks on that backup, and reports how many policies the reset changed.
6. Way back, at any time: the person points the server at the old database again and runs `./89-switch-gate.sh back <run>`.

Not settled: who signs in for the walks as users on acceptance, and how. The walk scripts refuse every Alkemio
address until that is decided.

## With an application stack of its own (reset and walks without a switch)

The reset must be done by the server code of the release, so a server and its reset workers must run on the new
database. The kit does not create that stack. Declare it to the kit:

| Setting | Meaning |
|---|---|
| `ALK_DB`, `DISTILL_DB` | both equal to the new database: confirms which database the stack serves |
| `BASE` and `STACK_BASE` | the web address of the stack, given twice on purpose. Any address of an Alkemio environment is refused |
| `KRATOS_ADMIN_URL` | admin address of the login service of the stack, for one-time sign-in links. No password is used |
| `RABBIT_API`, `RABBIT_AUTH` | management address and login of the queue service, to see the reset queue empty |
| `WORKERS_EXTERNAL=1` | OPS starts the reset workers before the reset stage and stops them after |
| `WORKER_LOG_FILE` | the worker logs saved by OPS. Without it the reset is marked OPEN, never PASS |
| `WALK_USERS` | user ids for the walk |

Then run the flow without `SKIP_RESET`, or `FROM=reset` after a first pass.

The stack must reach the pod's Postgres, which listens on localhost only as rendered. Opening it to the stack, and
only to the stack, is an operator decision and a change to the rendered pod.

## After the run

- The result is on the `final` volume. The state after each stage is on its own volume, with a `MANIFEST.tsv`.
- `./88-cluster-volumes.sh seal <volume>` makes a volume read-only for the run user and records sums.
- OPS: delete the pod, then the claims. Disks of the retain class stay until an operator deletes them.
- The source, stage and final volumes hold personal data. The reports volume holds counts.

## Not verified

- The manifests against a real cluster. Offline they parse, and the pod uses every claim.
- The reset and the walks in a pod. Their settings were tested one by one against the local stack only.
- The image built with the browser.
