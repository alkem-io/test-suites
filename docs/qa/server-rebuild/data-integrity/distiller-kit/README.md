# Data distiller kit

A set of scripts that takes a platform database with years of leftovers and produces a clean one: only valid
rows are copied, known wrong data is repaired, and guards prove the result. It was built on the acceptance
data in November 2026. The findings it works from are in [`../acc-defect-register.md`](../acc-defect-register.md),
the first wide queries in [`../acc-audit-queries/`](../acc-audit-queries/).

Everything here reads counts. No file in this folder holds data, names, ids of real users or environment secrets.

## The idea in five steps

| Step | What happens | Main file |
|---|---|---|
| 1. Guards on the source | Every known problem is counted on the data as it is | `run-guards.sh`, `66-guard-summary.py` |
| 2. Copy | Only valid rows go into a NEW database. Rejected rows stay behind, with a list | `69-distill-copy.py`, verified by `70`, `71` |
| 3. Repairs | Wrong data that must stay is corrected, each repair by a ruling | `74-apply-repairs.sh`, the `*-repair.sql` files |
| 4. Authorization reset | The server recalculates every access policy on the new database | `86-auth-reset.sh` |
| 5. Guards, access check, walks | The same guards again, rights compared with the source, pages opened as real users | `run-guards.sh`, `75-access-full-compare.py`, the `*-walk.mjs` files |

`87-distill-flow.sh` runs all five as one command, takes a backup at every state and prints one PASS or FAIL line per stage.

## Rules that are not optional

1. **The source is only read.** The copy always goes into a new database whose name starts with `distill_`. Scripts that write refuse any other name.
2. **A backup before every change and after every authorization reset.** `83-snapshot.sh` does it; the flow calls it.
3. **Users are never deleted.**
4. **Every repair has a ruling by a person**, a rehearsal with roll back (`rehearse-repair.sh`) and a guard that fails on unrepaired data.
5. **An environment is switched by a person.** The switch is asked, approved and made by a person at a terminal (`89-switch-gate.sh`, `91-acc-timed-run.sh`). No script and no agent switches an environment.
6. **Production data is read only on an explicit word of the QA lead.** The free plan repair (125) runs on production only after product has answered (guard 126 shows whether the question exists).
7. **Nothing with personal data is committed.** Run folders, dumps, CSV lists and baselines are in `.gitignore`. Reports and issues carry counts only.

## What you need

- Docker with the local Alkemio stack of the `server` repository (the Postgres container `alkemio_dev_postgres`).
- A backup of the environment restored into local databases: the platform database and the six side databases (chat, login, tokens, assistant, file backup, office documents).
- `python3`, `psql` (inside the container), `node` with the Playwright of this repository for the walks.
- A clone of `server` on the release the environment runs. `SERVER_DIR` points to it (default `$HOME/repos/server`).
- For a run on an environment: `kubectl` access, and `acc.env` filled from [`acc.env.example`](acc.env.example).

## Task 1: check the state of a dataset, guards only

This reads and changes nothing. Use it first on any new dataset, production included.

```bash
./run-guards.sh <label> <platform_db> <synapse_db> <kratos_db> <hydra_db> <assistant_db> <filebackup_db> <wopi_db>
```

```bash
./66-guard-summary.py <label>
```

```bash
./66-guard-summary.py <label> --only FAIL,MOVED
```

Outputs go to `runs/<label>/`. How to read the summary:

| Word | Meaning |
|---|---|
| PASS | The guard has a fixed expectation and meets it |
| FAIL | It does not. On undistilled data many FAIL lines are the finding list, not a broken guard |
| INFO | Context for a person, no verdict |
| NO BASELINE | The line compares with an agreed reading and none is saved for this dataset |
| OPEN | A known open item, named in the line |
| NOT RUN | The guard needs something that was not given (guards 43 and 68 need the file store) |

For the same read against a live database through a port-forward, put `PSQL=$PWD/93-psql-live-acc.sh` in front of
`run-guards.sh` and set `ACC_PGUSER`. The wrapper only repeats calls that lost the connection. It reads whatever the
port-forward points at, so check the context twice.

After a person has read a run and agrees with it: `./66-guard-summary.py <label> --save-baseline`. Later runs compare with it.

## Task 2: the full flow on a local copy

```bash
FREE_PLAN_RULED=yes ./87-distill-flow.sh <label> <source_db> distill_<name> <kratos_copy_db> <side_db> ...
```

The flow stops once, before the authorization reset, and tells you to point the local server at the new database
(`DATABASE_NAME` in the server `.env`, your file). Then continue with `FROM=reset`. Leave `FREE_PLAN_RULED` out when
the free plan question is not ruled for the dataset. `stack/distill-stack-on.sh` and `distill-stack-off.sh` move the
local services to the experiment databases and back.

The default repair list, in order:

| File | What it repairs |
|---|---|
| `45-b3-repair.sql` | Callouts with no type and responses that are empty |
| `48-b4-repair.sql` | Rows that still hold an old value: each is set to what the server writes today for that kind of row |
| `52-c3-repair.sql` | Virtual contributor bindings in comment rooms that name an old id |
| `54-c4-repair.sql` | The same credential stored on more than one row |
| `57-c7-repair.sql` | A callout with no handle, so no web address |
| `58-c8-repair.sql` | Role definitions of spaces, and rights stored on a wrong id |
| `60-b1-repair.sql` | Phase tags of callouts that name no phase of their space |
| `61-b2-repair.sql` | Space parent pointers and reserved handles |
| `94-a1-repair.sql`, `98-admin-list-repair.sql` | Admin rights that a member of a space above should never have had; admins of a space are admin below |
| `99-a4-membership-repair.sql` | Leftover roles of people who left a space |
| `100-a6-associate-repair.sql` | Owners and admins of an organization become associates |
| `105-member-lead-list-repair.sql` | Member and lead lists name every space above, parent first |
| `110-invitee-right-repair.sql` | Invitee rights with no open invitation |
| `117-open-request-of-member-repair.sql` | Open invitations and applications of people who are members already |
| `120-lead-without-member-repair.sql` | Leads that are not members |
| `122-subspace-visibility-repair.sql` | A subspace gets the visibility of its top-level space |
| `125-space-free-plan-repair.sql` | Only with `FREE_PLAN_RULED=yes`: top-level spaces with no plan get the free plan |

Each repair file states in its header what it repairs, the ruling, the tables it touches and its own checks. Older headers say "run it only through rehearse-repair.sh": that was true before `74-apply-repairs.sh` existed. The flow applies them with file 74.

## Task 3: add a new finding

1. Write a guard first: a SQL file that counts the problem, one heading line per number. Register it in `run-guards-extra.sh`.
2. Run the guards, then `./66-guard-summary.py <label> --propose`. It prints an expectation row for every new heading. Correct it and add it to `66-guard-expectations.tsv`.
3. Find the effect in the server code and count the people affected. Bring that to a ruling. Do not repair on a guess.
4. Write the repair with a line `-- touches: table_a,table_b`. Rehearse it: `./rehearse-repair.sh <label> <db> <repair.sql>`. It runs in one transaction, runs the whole classifier on the repaired state, and rolls back.
5. The guard must fail on unrepaired data and pass after the repair. Add the repair to the list in `87-distill-flow.sh` only after the ruling.
6. If rights change, prove it in the application with a walk as an affected user, before and after.

Use the next free number for a new file. Never reuse a number.

## Task 4: a run on an environment

This is for a person. Read [`cluster/RUNBOOK.md`](cluster/RUNBOOK.md) first.

```bash
PRINT=1 ./91-acc-timed-run.sh <run>
```

```bash
FREE_PLAN_RULED=yes ./91-acc-timed-run.sh <run>
```

`PRINT=1` shows every command and changes nothing. The real run freezes the environment for about 20 minutes, distills
inside a runner pod, switches the database by renaming, starts the services and runs the reset. The previous database
stays beside the new one as `alkemio_before_<run>`; `./90-acc-switch.sh <run> back` returns to it. Kept databases are
dropped only by a person. Check the free space of the source volume before a run.

Afterwards a person walks the environment in a browser: an admin of a top-level space on a subspace below, a user who
lost a leftover role, the storage page, a whiteboard, a chat.

## Known limits

- **Side stores are out of scope.** Chat server, login store and file store are read for cross-checks and never repaired. Rooms, logins and files of rejected rows stay there.
- **Guards 43 and 68** read the file store and need a download or a volume listing. Without it they report NOT RUN.
- **The guards were built from acceptance data.** A problem class that exists only in another dataset has no guard. The wide queries in `../acc-audit-queries/` are the net for those; they print numbers and no verdict.
- **An agreed reading belongs to one dataset.** A new dataset starts with NO BASELINE lines until a person saves one.
- **Open cases** that are kept and tracked, not repaired, are in [`tracked-cases.md`](tracked-cases.md).

## Where things are

- [`FILES.md`](FILES.md): every file with one line on what it does.
- `66-guard-expectations.tsv`: what each guard must read, and why.
- `access_model.py`, `72` to `76`, `85`: the access model, used to compare the rights of every user before and after.
- `77` to `84`, `96`, `102` and later `*-walk.mjs`: walks in the running local application. They sign in with a one-time link of the LOCAL login service only and refuse any other address.
- `stack/`: compose overlays for the local experiment. `cluster/`, `shim/`, `88`: the runner pod for an environment run.
