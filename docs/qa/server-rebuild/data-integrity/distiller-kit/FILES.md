# Files of the distiller kit

Generated from the first comment line of each file. The header of a file is the full reference.

| File | Kind | Role | What it does |
|---|---|---|---|
| `30-architect-classifier-reconstruction.sql` | SQL | guard | The classifier: marks every row that is rejected at copy (class A), and holds the guards of all 25 findings A1 to C9. The base of every run. |
| `30-bug-drill.sql` | SQL |  | Drill: A2 cases: parent, child, timing |
| `31-bug-drill-b.sql` | SQL |  | Drill: F1 callouts comments enabled, no room: isTemplate? in a space collaboration or a template content space? |
| `32-bug-drill-c.sql` | SQL |  | Drill: G3a file rows without authorization policy since 2026-08: shape |
| `33-bug-drill-d.sql` | SQL |  | Drill: G3c bucket owner for NULL-policy files |
| `34-a3-callouts-and-rooms.sql` | SQL |  | Drill: A3 EXTRA (acceptance backup 2026-11-11, local copy) |
| `35-a3-callouts-drill.sql` | SQL |  | Drill: A3 DRILL (acceptance backup 2026-11-11, local copy) |
| `36-a3-callout-files.sql` | SQL |  | Drill: A3 FILES (acceptance backup 2026-11-11, local copy) |
| `37-a3-matrix-check.sql` | SQL |  | A3 Matrix check on the acceptance Synapse backup of 2026-11-11 (side database acc_synapse). |
| `38-reject-closure-scan.sql` | SQL |  |  |
| `39-reject-closure-scan-side.sql` | SQL |  |  |
| `40-owner-split.sql` | SQL |  |  |
| `41-inline-body-scan.py` | Python |  | """41-inline-body-scan.py: read the inline copies of live whiteboard and memo |
| `42-blob-ledger-check.py` | Python |  | """42-blob-ledger-check.py: do the blobs behind the file rows have a record in |
| `43-fetch-blobs.sh` | shell |  | fetch the blobs named in a keys file from the off-site file |
| `43-file-store-body-scan.py` | Python |  | """43-file-store-body-scan.py: read the bodies that live in file storage and |
| `44-a10-chat-server-members.sql` | SQL |  |  |
| `45-b3-repair.sql` | SQL | repair | the B3 repair as QA ruled it on 2026-11-13. |
| `46-rule-summary.sql` | SQL |  | one line per classifier rule, for a before/after comparison. |
| `47-output-diff.py` | Python |  | """47-output-diff.py: compare two outputs of script 30, section by section. |
| `48-b4-repair.sql` | SQL | repair | the B4 repair. R1 to R4 as QA proposes them; R5 and the phase names as the QA lead ruled on 2026-11-13. |
| `49-links-carrying-ids.sql` | SQL |  | (2026-11-13, asked by the QA lead in the B4 review) |
| `50-flow-allowed-values.sql` | SQL |  | guard, reads only, prints counts only. Run by hand: |
| `51-login-binding-xcheck.sh` | shell |  | (2026-11-13, written in the C2 review) |
| `52-c3-repair.sql` | SQL | repair | the C3 repair as QA proposes it (2026-11-13). Not ruled yet. |
| `53-vc-binding-threads-xcheck.sh` | shell |  | (2026-11-13, written in the C3 review) |
| `54-c4-repair.sql` | SQL | repair | the C4 repair as QA proposes it (2026-11-13). Not ruled yet. |
| `56-c6-file-bytes-xcheck.sh` | shell |  | (2026-11-13, written in the C6 review) |
| `57-c7-repair.sql` | SQL | repair | the C7 repair as QA proposes it (2026-11-13). Not ruled yet. |
| `58-c8-repair.sql` | SQL | repair | the C8 repair as QA proposes it (2026-11-13). Not ruled yet. |
| `60-b1-repair.sql` | SQL | repair | the phase tag part of the B1 repair as QA proposes it (2026-11-16). Not ruled yet. |
| `61-b2-repair.sql` | SQL | repair | the two B2 repairs that the second pass confirms (QA proposal, 2026-11-16). Not ruled yet. |
| `62-b2-deep-space-option.sql` | SQL |  | an OPTION for the sub-subspaces that sit under a sub-subspace (finding B2). |
| `63-b2-chat-tree-xcheck.sh` | shell |  | (2026-11-16, written in the B2 second pass) |
| `66-guard-summary.py` | Python | guard | """66-guard-summary.py: one PASS / FAIL line per guard over a run folder. |
| `66-rule-distilled.py` | Python |  | """66-rule-distilled.py: give every guard that is still `undecided` for the new database an expectation, from how it |
| `67-phase-admin-list.sh` | shell |  | (2026-11-16, written for tracked cases T8 and T27) |
| `68-c6-volume-xcheck.sh` | shell |  | (2026-11-16, closing check of the C6 review) |
| `69-distill-copy.py` | Python |  | """69-distill-copy.py: build a NEW database that holds only the rows that are not rejected. |
| `70-distill-verify.py` | Python |  | """70-distill-verify.py: after 69-distill-copy.py, prove that the copy made no new orphan. |
| `71-distill-row-compare.py` | Python |  | """71-distill-row-compare.py: prove that every row of the copy is the same as its source row. |
| `72-access-equivalence.py` | Python |  | """72-access-equivalence.py: for EVERY credential holder, is access on the new database the same as on the source? |
| `73-access-model-export.py` | Python |  | """73-access-model-export.py: what the database says every user may do, written as JSON for a cross-check |
| `74-apply-repairs.sh` | shell |  | APPLY repair files to a distilled database. Unlike rehearse-repair.sh this COMMITS. |
| `75-access-full-compare.py` | Python |  | """75-access-full-compare.py: the rights of EVERY credential holder on EVERY policy, source against a later state |
| `76-repaired-entities.py` | Python |  | """76-repaired-entities.py: list every row the repairs changed, with the place a person would open to look at it. |
| `77-page-walk.mjs` | Node | walk | open real pages of the local application in a headless browser as one user and record what a person |
| `78-user-access-walk.mjs` | Node | walk | ask the running application, signed in as ONE non-admin user, what that user may do on every |
| `79-run-as-user.mjs` | Node |  | sign in on the LOCAL stack as one user (one-time recovery link from the local login service, no |
| `80-role-write-check.mjs` | Node |  | steps file for 79-run-as-user.mjs. Run as an admin of a space chain L0 > L1 > L2 whose L1 and L2 |
| `81-build-on-repaired.mjs` | Node |  | steps file for 79-run-as-user.mjs. Run as an admin of a space whose role definitions were |
| `82-join-gained.mjs` | Node |  | steps file for 79-run-as-user.mjs. Takes two models of 73-access-model-export.py for the same user |
| `83-snapshot.sh` | shell |  | backups of a distilled database, so that every change made by a check can be undone. |
| `84-editors-check.mjs` | Node |  | steps file for 79-run-as-user.mjs. Run as an admin of a space. Creates a whiteboard callout and |
| `85-server-function-xcheck.mjs` | Node |  | is the kit's access model (access_model.py) the same as the SERVER'S OWN CODE, for every |
| `86-auth-reset.sh` | shell |  | one full authorization reset on the experiment database the local server serves, as ONE step: |
| `86-reset-steps.mjs` | Node | walk | steps file for 79-run-as-user.mjs, run as a platform admin: ask the server for a full authorization reset. |
| `87-distill-flow.sh` | shell |  | the whole flow as one command, with a backup at every state and one PASS or FAIL line per stage. |
| `88-cluster-volumes.sh` | shell |  | one cluster volume for each backup and for each stage of a distiller run (ops, 2026-11-18). |
| `89-switch-gate.sh` | shell |  | the gate before an environment is switched to the distilled database. |
| `90-acc-switch.sh` | shell |  | the steps a PERSON performs to switch ACCEPTANCE to the distilled database, and back. |
| `91-acc-timed-run.sh` | shell |  | the whole distiller flow on ACCEPTANCE as ONE command, with the time of every step. |
| `92-compare-runs.sh` | shell |  | do two distiller runs give the same result? (asked by the CTO and the CEO, 2026-11-18) |
| `93-psql-live-acc.sh` | shell |  | psql against the LIVE acceptance database server, for read-only guard runs (2026-11-19). |
| `94-a1-repair.sql` | SQL | repair | the repair for QA register A1 (2026-11-19). Asked by the QA lead: "this must be fixed". |
| `95-a1-policy-guard.sql` | SQL | guard | QA register A1, read from both places it lives in (2026-11-19). Reads only, counts only. |
| `96-top-admin-walk.mjs` | Node | walk | the rule of the QA lead (2026-11-19): "the admin of a top-level space is admin of every |
| `97-admin-down-rule.sql` | SQL |  | the admin rule of the QA lead (2026-11-19), read for EVERY subspace. Reads only, counts only. |
| `98-admin-list-repair.sql` | SQL | repair | the repair for the admin rule of the QA lead (2026-11-19), register A3 for the admin lists. |
| `99-a4-membership-repair.sql` | SQL | repair | the repair for QA register A4, for USERS (2026-11-19). Run through rehearse-repair.sh first. |
| `100-a6-associate-repair.sql` | SQL | repair | the repair for QA register A6 (2026-11-19). Run through rehearse-repair.sh first. |
| `101-move-signs.sql` | SQL |  | signs that a subspace was MOVED, PROMOTED or DEMOTED, next to the role rows the repairs touch. |
| `102-left-member-walk.mjs` | Node | walk | after the membership repair (99) and a reset, does the RUNNING application still work |
| `103-short-list-walk.mjs` | Node | walk | register A3 remainder (2026-11-19). A sub-subspace whose MEMBER list holds only the parent |
| `104-template-subspace.steps.mjs` | Node | walk | reproduce the short parent lists (register A3 remainder, 2026-11-19). |
| `105-member-lead-list-repair.sql` | SQL | repair | the member and lead lists of subspaces (register A3 remainder), QA lead 2026-11-19: |
| `106-list-shape-guard.sql` | SQL | guard | the lists of every subspace against what the server should have written (2026-11-19). |
| `107-join-walk.mjs` | Node | walk | what a member of the top-level space meets on an OPEN sub-subspace when they are not a member of |
| `108-upload-rights-walk.mjs` | Node | walk | file upload rights of a plain top-level member on a public sub-subspace with inherited |
| `109-new-post-image-walk.mjs` | Node | walk | can a member of a space above upload the image of a NEW post on a public sub-subspace with |
| `110-invitee-right-repair.sql` | SQL | repair | invitee rights left behind (open row 2, register A9), 2026-11-19. Accepted by the QA lead |
| `111-invitee-right-guard.sql` | SQL | guard | invitee rights against open invitations (2026-11-19). Reads only, counts only. |
| `112-invitee-right-walk.mjs` | Node | walk | what a leftover invitee right really gives (open row 2, 2026-11-19). For every USER who holds |
| `113-invitee-subspace-walk.mjs` | Node | walk | what the invitee right gives on a SUBSPACE (open row 2, QA lead 2026-11-19: "if the user sees |
| `114-community-lists-walk.mjs` | Node | walk | do the lists of the community tab still load (2026-11-19)? Asked from the RUNNING |
| `115-space-read.steps.mjs` | Node | walk | what the signed-in user may read on one space. Steps file for 79-run-as-user.mjs. Reads only. |
| `116-accept-old-invitation.steps.mjs` | Node | walk | can an OLD open invitation that has no invitee right still be accepted from the |
| `117-open-request-of-member-repair.sql` | SQL | repair | open invitation or application of an actor who is already a member (open row 4), |
| `118-open-request-of-member-guard.sql` | SQL | guard | open invitation or application of an actor who is already a member (open row 4, 2026-11-20). |
| `119-lead-without-member-walk.mjs` | Node | walk | how a lead who is not a member shows in the community lists (open row 5, 2026-11-20). |
| `120-lead-without-member-repair.sql` | SQL | repair | lead of a space who is not member of it (open row 5), 2026-11-20. |
| `121-lead-without-member-guard.sql` | SQL | guard | lead of a space who is not member of it (open row 5, 2026-11-20). |
| `122-subspace-visibility-repair.sql` | SQL | repair | subspace whose visibility differs from its top-level space (open row 6), 2026-11-20. |
| `123-subspace-visibility-guard.sql` | SQL | guard | subspace whose visibility differs from its top-level space (open row 6, 2026-11-20). |
| `124-new-subspace-visibility.steps.mjs` | Node | walk | does a NEW subspace get the visibility of its top-level space (row 6, 2026-11-20)? |
| `125-space-free-plan-repair.sql` | SQL | repair | top-level spaces that hold no plan (open row 7), 2026-11-20. |
| `126-space-plan-guard.sql` | SQL | guard | top-level spaces that hold no plan (open row 7, 2026-11-20). |
| `127-unmanaged-spaces-guard.sql` | SQL | guard | top-level spaces that no user can manage (2026-11-20). |
| `127-unmanaged-spaces-list.sh` | shell |  | the list behind 127-unmanaged-spaces-guard.sql, for product (2026-11-20). |
| `128-leftover-checks.sql` | SQL |  | three readings that were "not checked" in the open rows pass, explained 2026-11-20. |
| `129-space-content-compare.sql` | SQL |  | what a space shows, as one digest per item, to compare two databases (2026-11-20). |
| `access_model.py` | Python |  | """access_model.py: THE ONE place where the kit computes "who may do what" from stored rows. Imported by files 72, 73, |
| `lib-snapshot.mjs` | Node |  | every kit script that can write through the application calls needSnapshot(tag) first. |
| `lib-who.sh` | shell |  | source it. Resolves people for the walk scripts WITHOUT printing them. |
| `rehearse-repair.sh` | shell |  | try one repair on a dataset and keep nothing of it. |
| `run-guards-extra.sh` | shell | guard | the guard files that used to be run by hand (49, 50, 51, 53, 56, 63, 67, 68) and, since 2026-11-19, 95 (register A1), now run for |
| `run-guards.sh` | shell | guard | run the per-finding guards, the owner split, the reject closure scan, the inline body scan |
