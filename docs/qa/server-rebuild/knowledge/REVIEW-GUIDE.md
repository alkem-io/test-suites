# Reviewing a behaviour-knowledge file

_One file per area lives in this folder. An agent drafts each file from three sources: the server code and GraphQL schema (the full list of behaviours), the legacy test suite (what is proven), and the specs and issues (the why). People then review it. `communications.md` is the template and the first file product reviewed (alkem-io/test-suites#717). This page says what each reader does._

## How a file is built

| Section | What it holds | Who reads it |
|---|---|---|
| **1. Rules** | One row per rule: the rule in one or two plain sentences, three whys (business, product, technical) and who decided it. | Product, and anyone who wants to know what the platform does. |
| **2. Rights** | Who may do what: one row per action, one column per role, conditions as footnotes. | Product. |
| **3. Open questions** | Everything still to answer, grouped per role. Each role has a "To answer" table and, where it has a part in another role's question, an "Also involved" table. | Each role owner reads their own part. |
| **Appendix** | The evidence: exact behaviour and sources per rule, the findings in full, test gaps, constants, and how the file was made. | Engineers and QA, when they need the detail. |

A rule is written as the server behaves today, also when that is not what we want in the end. A bold marker at the end of a rule points at section 3:

| Marker | Meaning |
|---|---|
| **(open: F7)** | A question on this rule is still open. |
| **(defect: F2)** | Today's behaviour is a fault and must not be copied as intended. |
| **(defect in part: F3)** | Part of today's behaviour is a fault. |
| no marker | The rule stands as written. |

Whether a test proves a rule is a separate fact. It sits in Appendix A as **proven** or **untested**.

Hard rules are not marked yet. Some rules are choices that a new feature may challenge, and some can never change. A later version marks the second kind with "(hard rule)" after the why that makes it so. Until then, no marker does not mean a rule is open to change.

## Product review

1. **Read each rule.** If it is wrong, or not something the platform should promise, say so in a question row.
2. **Fill the whys.** "Why: business" is what Alkemio needs. "Why: product" is the user story: "As a ‹role›, I want …, so that …". A "—" means no source states one. Leave "Why: technical" to engineering.
3. **Set "Decided by"** where you confirm a rule that had no decision behind it: your role and the date.
4. **Check the rights tables.** Flag any cell that surprises you.
5. **Answer your questions in section 3.** Write the answer in "Proposed answer" and set the state.
6. **Tick the constants** in Appendix E that product must rule on before the rebuild.

The Product Owner's decisions stand on behalf of the Product Lead.

## Role owners

Open section 3, find the heading with your role, and answer the rows under "To answer". Rows under "Also involved" belong to another role; the Owner cell says what your part is. The full text of a finding, with code lines and data, is in Appendix C under the same id.

## QA lead

1. **Answer the Quality Lead questions** in section 3: tests that prove nothing, missing cases, harness facts.
2. **Decide the gaps** in Appendix D: which untested rules get a case before the acceptance checklist is drawn from the file.
3. **Check the routing.** If a question sits with the wrong role, move the row.

## What happens to an answer

| State | Meaning |
|---|---|
| open | Nobody has answered yet. |
| suggested | An answer is proposed; the owner confirms it. |
| change decided | Not used (product, 2026-11-20). The file keeps today's behaviour as the rule so the new core's tests stay green; the wanted change is decided as "behaviour stays" and tracked in `PRODUCT-ISSUES.md`. |
| decided | The row leaves the role's table and is listed under "Decided"; the rule carries the decision in "Decided by". |

Edit the file in a branch and open a pull request, or hand your answers to the QA lead. The drafting agent applies them and keeps the counts at the top of the file right.

## The access matrix is different

Nobody reviews the 2,631 mapped cells of `access-matrix.md`. Read the eleven findings in `access-matrix-crosscheck.md` and decide one thing per finding: file it as a bug, record it as a rule, or drop it. The rights tables in the area files are drawn from the matrix, so a matrix decision carries into them.
