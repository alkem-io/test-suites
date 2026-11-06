# Reviewing a behaviour-knowledge table

_For the QA lead. One table per area lives in this folder; `entitlements.md` is the template. An agent drafts each table from three sources — the server code and GraphQL schema (the universe of behaviours), the legacy test suite (what is proven), and the specs and issues (the why) — and a person signs it. This page is the whole of what the signing person has to do._

## What a rule is

One sentence a non-engineer could check against any server. Example, ENT-02 in `entitlements.md`: "Innovation packs per account are capped at 3; the fourth creation is refused with a message naming the limit." Next to it is a **why**: "limits are enforced server-side, not only hidden in the UI."

Every rule carries a **status**:

| Status | Meaning | What it asks of you |
|---|---|---|
| proven | a green legacy case asserts it | sign the why |
| untested | the code or a spec states it, no case does | sign the why; the row is already in the gaps list |
| disputed | code, test and spec disagree; a numbered finding explains | decide the finding (below) |
| unknown-why | the rule stands but no source says why | fill the why, or write `unknown, ask product` |

## Your job on a table is to sign the why column

You are the only person who knows whether the reason written there is the real business reason or the drafting agent's reading of a spec. For each row:

1. **Read the rule.** If it is wrong, or not something the platform guarantees, strike it.
2. **Read the why.** If you agree, leave it. If you know the real reason, replace it. If nobody knows, write `unknown, ask product` in that cell. Rows whose why cites a spec or issue need only a glance.
3. **Read the who-may block.** It says which roles can and cannot exercise the feature's actions. Flag any cell that surprises you; the evidence line under the table says where it came from.
4. **Look at the constants table** underneath. Each value is a candidate for the new server to change. Tick the ones product must rule on in the "product must rule?" column.
5. **Decide each finding.** A finding is a place where code, test and spec disagree, or where the code looks like a defect. One decision per finding: file it as a bug, record it as a rule, or drop it. Write the decision at the end of the finding.
6. **Look at the gaps** at the bottom. Untested rules land there by themselves; add any behaviour you know the area has that neither the code reading nor the tests pinned down, or leave it.

That is the entire review. For entitlements it is under an hour. Edit the file in your editor and hand it back; the drafting agent commits it and moves the area to *signed* in the tracker's W1 table.

## Then it repeats

The drafting agent produces the next area (journey, then callout, in the slice order given in `../plan.md` § W1) the same way. You spend twenty to sixty minutes per table doing steps 1 to 6. Twenty-five tables in total over the coming weeks. The tracker's "N of 25" counts tables that went through your signature.

## The access matrix is different

You do not review the 2,631 mapped cells of `access-matrix.md`. You read the eleven findings in `access-matrix-crosscheck.md` and decide one thing per finding: file it as a bug, record it as a rule, or drop it. F1 is the only one that needs a ruling from above you. The who-may blocks in the area tables are drawn from the matrix, so a matrix decision carries into them.

## What you do not have to do

You do not read the test code or the server code, you do not write rules, and you do not decide where the rules live or who reviews them on the product side. Those are ask 7 on the readiness brief; the drafting agent writes that request when you want it.
