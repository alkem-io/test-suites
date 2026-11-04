# ACC data-quality probes — the queries behind the defect register

The SQL that produced [`../acc-defect-register.md`](../acc-defect-register.md). Read-only; every file is a sequence of `SELECT`s that return counts and ids, never content. They were run on the acceptance environment (v0.170.2) on 2026-10-28 and are the first probes of the W4 register. The outputs (`.out`) and the CSV dumps used for cross-database joins stay **outside the repo** (they carry environment ids and e-mail addresses); the local copy lives in `~/repos/qa/acc-data-quality/` on the QA lead's machine.

## Running

```
kubectl config use-context <acceptance-v3 context>
./run.sh <db> <file>.sql          # port-forwards the postgres pod on 15433, runs psql -U synapse-db -d <db> -f, writes <file>.out beside it
```

Edit the pod name in `run.sh` first (`kubectl get pods | grep postgres`). Authentication on the loopback is `trust`, so no password; one port-forward per file. The same files run on PROD once a prod context exists; nothing is environment-specific inside the SQL.

Cross-database checks (files `13`, `23b`, `23c`, `29`–`29c`) load CSV dumps into temp tables with `\copy`; the dump queries are in `13-kratos-dump.sql`, `27b-filebackup-dump.sql`, `28-alkemio-dump.sql`, and the synapse files produce `syn-*.csv`. Run the dump file for each side first, then the cross-check.

## What each file covers

| File | Database | Register groups |
|---|---|---|
| `00-schema.sql` | alkemio | schema dump the generic checks were derived from |
| `01-dangling-refs.sql` | alkemio | D, E — foreign keys to nothing |
| `02-credentials.sql` | alkemio | A4–A9, B |
| `03-roles.sql` | alkemio | A1–A3 |
| `04-spaces.sql` | alkemio | C |
| `05-authorization.sql` | alkemio | G |
| `06-orphans.sql` | alkemio | F4–F6 |
| `07-actors-users-orgs.sql` | alkemio | E |
| `08-collab-comm.sql` | alkemio | D, F1–F3 |
| `09-leftovers.sql` | alkemio | H |
| `10-drilldown.sql`, `11-followups.sql`, `12-followups-b.sql` | alkemio | drill-downs for A, B, D, E, F |
| `13-kratos-dump.sql`, `13-kratos-xcheck.sql` | alkemio + kratos CSV | I |
| `14-jsonb-content.sql` | alkemio | J, K, L |
| `15-whiteboards.sql` | alkemio | M4, M5 |
| `16-drilldown-b.sql` | alkemio | K, L, M drill-downs |
| `20-dbs-overview.sql`, `21-schema-*.sql` | all | server overview, schema dumps |
| `22-kratos.sql`, `22b-kratos-followup.sql` | kratos | N |
| `23-synapse.sql`, `23b-synapse-xcheck.sql`, `23c-synapse-drill.sql` | synapse (+ alkemio CSV) | P |
| `24-hydra.sql`, `24b-hydra-followup.sql` | hydra | O |
| `25-wopi.sql` | wopi | Q |
| `26-assistant.sql` | assistant | R |
| `27-filebackup.sql`, `27b-filebackup-dump.sql` | filebackup | S |
| `28-alkemio-dump.sql`, `29-alkemio-xcheck.sql`, `29b-`, `29c-alkemio-drill.sql` | alkemio (+ filebackup, synapse CSV) | S1, S2, T |

## Rules

- Never commit `.out` files or CSV dumps; they hold ids and addresses from a shared environment.
- Never run these against production from a workstation; hand them to an operator and take back aggregates only (plan § W4 addendum, step 3).
- A new signature = one new `SELECT` returning `count(*)` plus a sample of ids, appended to the file of its group, and one new row in the register.
