# Tracked cases

Data that is **kept unchanged** by the distiller although a rule first marked it,
because deleting or "repairing" it would change something a live owner uses.
Each case has a guard that lists it on any dataset, so the same list can be
produced for production and handled the same way.

Outputs of the listing guards hold ids and short names. Keep them local.

## T1. Virtual contributor whose space was deleted (finding A7)

| | |
|---|---|
| What it is | A virtual contributor made "from a space". The space was deleted later. The virtual contributor still belongs to a live account and still stores the id of the gone space. |
| Why it exists | Accepted product behaviour (QA lead, 2026-11-12): a virtual contributor belongs to an account, not to a space. Deleting the space leaves it in place, without its context. |
| Ruling | Keep the virtual contributor, its persona, its library and every row below it. Keep the id of the gone space: it is the only record of which deleted space the AI engine may still hold content for. Do not clear it, do not reject it. |
| Listing guard | `30-architect-classifier-reconstruction.sql`, A7 G14 (the list), with G1, G5, G6, G7, G8, G12 for the detail. |
| Must stay zero | A7 G3 and G9. |
| Policies kept with them | A9 G7 lists the authorization policies of these rows (130 on acceptance). They are kept. A9 G9c must show no retired name and no empty rule among them. |
| Acceptance, backup of 2026-11-11 | 10 virtual contributors, 8 owning accounts (6 users, 2 organizations), 4 listed in the store, 3 with a role in a live top-level space, 9 gone spaces, last ingest 2024-09-11 to 2025-06-30. |
| Follow-up with owners | Send each owner their rows from G14 and ask them to give the virtual contributor a new knowledge source or delete it. Not started. |
| Behaviour to verify on acceptance | Profile opens. Store listing works. Answer when asked in a live space where it is a member. Result of "refresh knowledge". Not started; needs the live environment with the AI engine. |
| Open questions | Does the AI engine still hold content of the deleted spaces, and who purges it. The owner can change the source type but cannot point to another space. |
| On production | Run the kit. If G14 lists rows: same ruling, same owner follow-up. If G3 or G9 is not zero: stop and review before any copy. |

Rejected under the same finding, for reference: the personas and knowledge bases
with no virtual contributor at all (A7 G2, G4, G15). They are leftovers of
virtual contributors deleted before the persona merge of September 2025.

## T2. Guidance chats (finding A10)

| | |
|---|---|
| What it is | The chat between a user and the guidance virtual contributor. The server creates one for every new user. |
| Why it is tracked | The feature is hidden in the client and will be reworked after the new server lands (QA lead, 2026-11-12). Its data is the largest part of the chat data. |
| Ruling | QA lead, 2026-11-13: keep. Copy every guidance chat unchanged, with its room and messages. Never repair, merge or recreate one. |
| Second opinion | Asked from the CTO or the architect, not yet given. The alternative is to leave guidance chats out of the copy. |
| Listing guard | `30-architect-classifier-reconstruction.sql`, A10 G10 (all guidance chats by whether a live user is in them), A10 G7 (chats no user can open). |
| Acceptance, backup of 2026-11-11 | 489 of 645 conversations. 435 with a live user (432 users; 39 chats hold 226 messages). 54 with no user because the user was deleted (6 hold 32 messages). None is in the reject set. |
| Not covered by the ruling | 3 guidance chats of 2 live users that have no messaging parent and no member rows. They are in the reject set (A10, fifth row) and are not repaired. |
| Open questions | What should happen to a chat when its user is deleted (retention). Whether the new database allows only one chat per pair of members. |
| On production | Run the kit. Same ruling. Report the counts of G10 and G7 with the second opinion request. |

## T3. Users with two guidance chats (finding B1)

| | |
|---|---|
| What it is | Two direct conversations for the same pair: one user and the guidance virtual contributor. |
| Why it exists | Both were created before the server took a lock per pair when creating a chat (2026-06-24). On acceptance all surplus twins are of 2026-01-21. |
| Ruling | Keep both twins unchanged, under T2. Changed on 2026-11-13 from "repair, keep the twin with messages". |
| Listing guard | B1 G10 (who is in the pair), B1 G4 (messages per twin). |
| Acceptance, backup of 2026-11-11 | 3 pairs, all guidance chats, none between two users. Messages, kept twin first: 4 and 5, 19 and 0, 6 and 1. |
| Must hold | B1 G10 shows no pair of two users. A duplicate chat between two users is not covered by this ruling and goes to the repair bucket. |
| Open questions | A unique rule on the pair in the new database would make the copy of these twins fail. |
| On production | Run the kit. Guidance chat twins: same ruling. Any user-to-user twin: stop and review. |

## T4. Top-level spaces on a restricted word (finding B2)

| | |
|---|---|
| What it is | A top-level space whose handle is one of the words the server refuses for a new top-level space. |
| Why it exists | The list was added on 2025-05-21 (server, "Protected Space Names"). Spaces created before that date kept their handle. The server checks the list only on create and on rename. |
| Ruling | Accepted by the QA lead on 2026-11-13 together with B2, with a second pass on the B2 repairs still to come: keep unchanged. Nothing is broken, both spaces have a working address, and a rename would change the address of a working space. |
| Listing guard | B2 G7 (by level and use), B2 G2 (stored links to the handle; read the strict columns). |
| Acceptance, backup of 2026-11-11 | 2 top-level spaces, created in 2022 and in February 2025, both before the list. One has 1 member and no admin, the other 1 member, 1 admin and 1 subspace. 2 more restricted handles sit on subspaces, which the server allows. |
| Must hold | Every space listed by G7 at level 0 was created before 2025-05-21. A later one means the check on create was bypassed: stop and review. |
| Open questions | Does the new server refuse these handles when it loads the data. If it does, the ruling changes to a rename agreed with the owner of the space. |
| On production | Run the kit. Same ruling. Give the list of G7 to the architect with the open question. |

## T5. Office document with no file (finding B3)

| | |
|---|---|
| What it is | An office document inside a callout whose record points at no file. Opening it fails in the server ("Document not found"). Deleting it works. |
| Why it exists | Not known. The record was created together with its callout and no file was ever stored for it. |
| Ruling | QA lead, 2026-11-13: keep for now and track. A delete or a change of type would alter a published callout of an active user, and there is no body to link back. The ruling for production waits for the count there. |
| Listing guard | B3 G13 (creator, callout, candidate files). The heritage rule stays at this count as a named exception. |
| Acceptance, backup of 2026-11-11 | 1 document, created 2026-05-27, creator still a user, published callout in a top-level space, title only, no responses, no comments, 0 files in its storage, 0 files by the creator within 60 seconds. |
| Must hold | G13 reads 0 candidate files. A candidate file means a re-link may be possible: stop and review that row. |
| Owner follow-up | Not started. Ask the creator to delete the document or make it again. |
| Open questions | Does the document service hold rows for this document (its database was counted, not searched). Does the new server load an office document with no file. |
| On production | The count is the first number to read (QA lead: "super important to know how many such cases we have"). G13 prints one line per document. Nothing is ruled for production before that count is known. A count above a handful means a live cause: look for it before the cutover. |

## T6. Callouts without a type that keep their empty whiteboard (finding B3)

| | |
|---|---|
| What it is | A callout whose top part has the type "none" and still has a whiteboard attached. |
| Why it exists | Not known for certain. Both rows on acceptance are draft callout templates that were created with the board and never edited. An older fault that let a typed callout be set to "none" is a candidate (QA lead, 2026-11-13). |
| Ruling | QA lead, 2026-11-13: an empty whiteboard is never deleted. Keep the callout, the whiteboard and every row under it unchanged. The earlier proposal to let go of the empty whiteboard is withdrawn. |
| Listing guard | B3 G9 (one line per callout, with the size of the stored body and whether it holds a drawing), G9c (the rows under the whiteboards). The heritage rule `callout_framing-type-child-mismatch` stays at this count as a named exception. |
| Acceptance, backup of 2026-11-11 | 2 callouts, both draft callout templates, created and last updated 2024-11-26, never edited, allowed response type whiteboard, 1 template each, 0 responses. Each stored body is 61 bytes, the size of an empty board, last written on the migration day 2026-08-27. 26 rows hang under the 2 whiteboards. |
| Must hold | G9 column `body_holds_a_drawing` reads false for every row. A true means a drawing: that row is not covered by this ruling. |
| Known risk | Read from the server code, not reproduced: when the top part of such a callout is edited, the server deletes a whiteboard that does not fit the type. For an empty board nothing drawn is lost. |
| Open questions | The ruling for a row whose board holds a drawing. Proposal: set the type back to whiteboard, so that the next edit cannot delete the drawing. Does the new server load a callout of type "none" with a whiteboard attached. |
| On production | Run the kit. Read every line of G9. Empty boards: same ruling. A board with a drawing: stop, rule that row by hand. |

## T7. Platform invitations that named only a retired role (finding B4)

| | |
|---|---|
| What it is | An invitation by e-mail to a person who is not registered, placed on the platform role set, whose only role is one of the two old short names `vc-campaign` or `beta-tester`. |
| Why it exists | The role names were changed in the server on 2025-01-07 without rewriting the stored invitation values. The retirement migration of 2026-10 (`DropLegacyPlatformRoles`, step 4) takes retired roles out of platform invitations, but its list holds only the long names, so the short spellings were missed. It ran on acceptance. |
| Ruling | **QA lead, 2026-11-13: an invitation to a person who is not registered is always kept. It is never rejected.** This closes the alternative "reject the five". How it is kept is still the QA proposal: take the retired value out, as the server migration does for the names it knows, and never rename it to a `feature-` role (the server rule forbids moving holders automatically). The invitation stays listed here for a decision by hand: invite again with the right role, or leave it as it is. |
| Listing guard | B4 G5 (role values and counts), G12 (one line per invitation: date, role set kind, roles named, what is left after the removal, whether the invitee registered since, whether the inviter still exists; never the e-mail), G12b (all platform invitations by role set kind), G14 (whether the retirement migration ran). |
| Acceptance, backup of 2026-11-11 | 5 invitations, all on the platform role set, created 2024-11-26 (3) and 2024-11-29 (2). 4 name `vc-campaign`, 1 names `beta-tester`, none names a second role. After the removal all 5 name no role. None of the invitees has registered. All 5 inviters still exist. None is in the reject set. |
| Must hold | After the repair G5 and G12 print no rows, and G12b shows the platform line with all rows under `naming_no_role`. G13 prints no rows (no wrong role value in role set invitations or role rows). |
| Known risk | Read from the server code, not run. When the invitee registers, the server turns the platform invitation into an invitation on the platform role set and, on accept, grants the entry role of that role set. The entry role stored for the platform role set is `global-registered`, a value outside the server's role list and with no role row (G13b). So whether such an invitation can be accepted at all is not known, with or without the retired role. Before the repair the retired value would also be copied into the new invitation unchecked. |
| Open questions | ~~Keep the five emptied, or reject them.~~ Ruled 2026-11-13: kept. Who invites again by hand: today the server creates a platform invitation on the platform role set only for `feature-vc-campaign`, so the `beta-tester` one cannot be made again through an invitation. Is the entry role `global-registered` a fault of its own. |
| On production | Run the kit. Read every line of G12. An invitation that names a second, valid role keeps that role after the removal and is not part of this case. An invitee who registered since: stop, rule that row by hand. |

## T8. Phase names with a comma (finding B4)

| | |
|---|---|
| What it is | A phase of an innovation flow whose name holds a comma. The server stores the allowed phase names of a flow, and the phase of each callout, as one text joined by commas. A name with a comma is read back as two values. |
| Why it exists | Until 2026-06-10 the server accepted a comma in a phase name. Since then `validateStateDisplayNames` refuses it on every path that creates or renames a phase. The names made before that date stayed. |
| Ruling | **QA lead, 2026-11-13: the names are not changed in the database. Renaming is left to the space admins, and the admins are informed.** The earlier QA proposal, a rename in the database with a semicolon (step R6 of `48-b4-repair.sql`), is withdrawn and taken out of the repair file. |
| Listing guard | B4 G6 (the count), B4 G15 (one line per name, masked: dates, phases in the flow against allowed values read back, callouts that hold the name), B1 G13 (callouts whose phase tag equals a phase name only when the tag is read whole), check 6 of `48-b4-repair.sql` (the repair leaves phases, lists and callout tags as they were). |
| Acceptance, backup of 2026-11-11 | 3 names in 2 flows, made 2025-07-30 (2) and 2026-05-15 (1). Two names sit in one flow of 6 phases whose list reads back as 8 values; each has 1 callout. The third sits in a flow of 5 phases whose list holds 1 value; no callout is on it. So 2 callouts are concerned. None of the 3 is in the reject set. |
| Must hold | The count of B4 G6 stays where it is until an admin renames. No repair touches these phases, their lists or their callouts. The B1 repair of phase tags works on `truly_unmatched` of B1 G13 only (10 on acceptance) and never on the 2 callouts counted under `whole_tag_is_a_phase_name`. In the rule summary the phase tag count of B1 and C9 stays 12, not 10, as long as the names stand. |
| Known risk | Read from the server code (`tagset.service.ts updateTagsetsSelectedValue`), not run. When the phases of a flow are changed in the settings, the server walks over every callout of the flow. A callout whose stored phase is one of the new phase names is left alone. One whose stored phase equals the old name of a renamed phase gets the new name. Any other is set to the default phase of the flow. The stored value of a callout on a comma name is read back in two pieces and the server looks at the first piece only, so it matches neither the old name nor a new one: the callout is moved to the default phase. This happens on the rename itself, and by the same code on any other change of the phases of that flow. The message to the admins must say: after the rename, look at the first phase of the flow, find the callouts that belonged to the renamed phase and set their phase again. |
| How the admins are informed | The list of spaces and their admins is made locally by hand from G15 on the day (the kit prints no names). It is never published. Sending the message is the QA lead's step. |
| Open questions | Does the new server have a problem with a comma in a phase name: it depends on how it stores phase names and callout phases, which is not known. If it stores them as proper lists, the problem is gone after the move and no rename is needed. Should the rename be asked before or after the move. |
| On production | Run the kit. Read every line of G15. The count, the number of callouts per name and the spaces will differ. Each name with callouts needs the note about setting the phase again. |


## T9. Files kept outside the limits of their bucket (finding B5)

| | |
|---|---|
| What it is | A file row that is larger than the size limit of its bucket, or of a type the bucket does not list. A bucket (`storage_bucket`) is the storage of one piece of content and holds `maxFileSize` and `allowedMimeTypes`. Bodies of whiteboards and memos are left out: the server writes them itself as `application/octet-stream`. A size limit of 0 and an empty type list mean "no limit" and are no breach. |
| Why it exists | Two causes on acceptance. (a) One PDF of 16.5 MB uploaded three times on 2024-06-03 and 2024-06-04 by one person, when the limit was 5 MB; the limit went to 15 MB on 2024-06-05 (server #4049, migration `increasePdfSize`). How it passed is not explained by the code; a limit raised by hand for a test is a guess. (b) Blank office documents (Collabora) whose file row was relabelled `text/plain`: until 2026-06-12 the file service set the type again on every save by sniffing the content, and an empty save sniffs as plain text. Fixed in the file service by spec 019 (commit 994818e); its repair job (`RunMimeRepair`) skips zero-byte rows. |
| Ruling | **QA proposal, 2026-11-13: keep all, no change in the database.** The architect's sanitize step (move or delete) is not followed: a move is checked against the destination and fails, a delete loses a user's file. A repair of the relabelled type exists (set `file."mimeType"` to `collabora_document."originalMimeType"`, shape equal to the blank documents that were never saved again) and is not proposed; if wanted it goes through the repair check standard. |
| Listing guard | B5 G1 (one line per file), G4 (files over the limit per stored content, links, template or not), G5 (files of a type outside the list, the type the document holds, where the document sits), G6 and G7 (every empty file and every office document, file type against document type), G3 (buckets without a limit), classes 11 and 12 of `42-blob-ledger-check.py` (off-site record). |
| Acceptance, backup of 2026-11-11 | 7 files. (a) 3 rows of one stored content, 16,489,041 bytes, each behind 1 link in a response of a published post, 3 posts, none a template; the stored content has **no record in the off-site backup ledger**. (b) 4 blank office documents, 2 spreadsheets, 1 text document, 1 presentation, made 2026-05-08 to 2026-05-26, each on the framing of a post, none a template; the document row holds the right office type and the bucket lists it; the empty content is in the ledger. None of the 7 is in the reject set. |
| Must hold | After the copy: all rows of G1 present with the same size and type; G4 `links_on_a_live_callout` equals `links`; G5 `on_callout_framing` + `on_callout_response` is 1 per row; `rejected` is false on every line. G3 shows exactly the reserved staging bucket, with limit 0 and an empty list, unchanged. |
| Known risk | Read from the server code (`storage.bucket.service.ts` `validateSize`, `validateMimeTypes`, called on upload, `copyDocumentToBucket`, `moveDocumentToBucket`, `addDocumentToStorageBucketOrFail`), not run. Nothing checks the limits when a file is read. Any action that copies or moves one of these files into another bucket fails with a validation error and takes the whole action with it: a template made from the post, a space made from such a template, a copy of the office document, a re-upload of the file of a link. For the 4, the editor extension comes from `collabora_document."originalMimeType"`, and the file type heals on the first real save (`reconcileReplaceMIME` accepts the sniff when the stored type is generic). |
| Open questions | Does the new server check bucket limits on import or when it serves a file, and how does it read a limit of 0 and an empty list. Did the 4 ever hold content that an empty save wiped (the data holds no earlier version). How did the PDF pass the limit. |
| Still to verify (recorded 2026-11-13, B5 accepted with these open) | (1) On a running server: that the 7 files open, and that copying one of them fails. Read from the code only so far. (2) Production: the counts of both parts; needs a production backup and the go of the QA lead. (3) The new server: whether it checks bucket limits on import, and how it reads a limit of 0 and an empty type list; a question for the architect. |
| On production | Run the kit. Read every line of G1, G4 and G5. Expect other counts and other causes: every line that is neither a blank office document nor explained by a limit change is looked at by hand. A stored content with no ledger record goes on the list for C6. |

## T10. Organizations nobody can act for (finding C1)

| | |
|---|---|
| What it is | An organization with no owner and no admin. Nobody holds the `account-admin` credential of its account either, because the server grants that credential only together with the admin or owner role. The organization, its account and everything the account hosts are valid and are kept. An organization that has no owner but has an admin is **not** a tracked case: it is the normal shape (see "Why it exists"). |
| Why it exists | (a) The creation path (`organization.service.ts` `createOrganization`) gives the creator the associate and the admin role, never the owner role; the code of 2023-01 does the same. So every organization starts without an owner. (b) The admin left or was removed (the lower limit of the admin role is 0), or the user was deleted: a user deletion takes the credentials with the user and skips the role limits. The "sole owner" block of `account.deletion.blocker.service.ts` exists since 2026-09-01 and applies only to self-deletion. (c) The bootstrap creates the host organization without a person. The data cannot tell which cause applies to which organization. |
| Ruling | **QA lead, 2026-11-12: an organization without an owner is valid data, not for rejection.** QA proposal, 2026-11-13: keep all, no change in the database, no owner assigned by rule. The architect's sanitize step (oldest admin, else oldest associate, else a placeholder) is not followed. Naming an admin is a decision by a person per organization; the product has the path (platform support invites, the person accepts). **QA lead, 2026-11-13: these 40 can be updated by product.** Product gets the list and names a person for each, or decides that it stays as it is. Nothing sent yet. |
| Listing guard | C1 G1 (situations 2 and 3), C1 G10 (their top-level spaces and whether each has its own space admin), C1 G2 (soundness of account control, expect 0 and 0), C1 G3 (role credentials with no holder, they follow A8). |
| Acceptance, backup of 2026-11-11 | 40 organizations: 9 with associates only, 31 with nobody. They host 52 top-level spaces (170 with subspaces), 5 virtual contributors, 16 innovation packs, 0 hubs. 12 of the 52 top-level spaces have their own space admin, 40 have none. None of the 40 organizations and none of the 52 spaces is in the reject set. For scale: 127 of 497 organizations have no owner, 87 of them have an admin. |
| Must hold | After the copy: the same organizations on every line of G1 with the same hosted numbers, `in_reject_set` 0 on G1, G4 and G10; G2 reads 0 and 0. A distiller rule "has an owner" or "has somebody who can act for it" must not exist. |
| Known risk | Only platform staff can change these organizations and the 40 top-level spaces with no space admin. If the new server requires an owner (the architect's ledger names the proposed change "every organization keeps an owner"), these 40 and the other 87 need a named person on the day of the move. |
| To sync between product and the architect (QA lead, 2026-11-13; nothing sent yet) | (1) If the new server requires an owner: whether the rule is wanted, who becomes owner of each organization, and that the creation path then gives one. (2) Deletion of a user by platform staff does not check for the last owner (the block exists only for self-deletion): flagged as a finding, it can end in a problem or an error in some cases, for example the deleted user was also the last admin (the organization joins this case), or the new server requires an owner. |
| Open questions | Does the new server require an owner, and what does it do with an organization that has none. Who names the admin for each of the 40. Is the batch of 339 owned organizations of 2026-06-11 and 2026-06-12 (one owner, one admin, no associate, nothing hosted) test data. |
| On production | Run the kit. Read G1 and G10 line by line; the list of organizations behind situations 2 and 3 is read one by one before anybody is named admin. Read G5 without the rows of G6 to see whether "no owner" is the normal shape there too. Nothing is sent to any organization without the go of the QA lead. |

## T11. Users without a login binding (finding C2)

| | |
|---|---|
| What it is | A user whose `"user"."authenticationID"` is empty: nothing ties the user to a login identity (Kratos). The user, its account, its roles and everything it hosts are valid and are kept. The person cannot log in as this user until the server ties the two at a login. |
| Why it exists | The column exists since 2025-12-01 and the migration did not fill it. A one-off staff action filled it by e-mail lookup and skipped users with no identity; it was removed on 2026-02-23. Staff can create a user with no identity and can remove an identity while the user stays. Which path made each row cannot be told from the data. |
| Ruling | **QA lead, 2026-11-13: users are not deleted** ("I could not estimate the impact of these, but wouldn't delete users"). The impact of leaving them unbound is not estimated and stays open, see "Still to verify". **How it is settled (QA lead, 2026-11-13): by the production counts per situation and by team knowledge of the users behind them; decided per user.** The counts need a production backup with its identity database and the go of the QA lead; not requested yet. QA proposal of the same day: keep all, no change in the database. The architect's sanitize step (link or delete) is not followed: only 1 of 13 has an identity to link to and the product has no staff action for it, a delete removes people with up to 153 roles. Two data changes are possible and are **not** proposed: bind the user of situation B, lower-case the e-mails of situation D. Each needs the repair check standard first. |
| Listing guard | C2 G1 and G7 (one line per user: what it holds, last sign of life), G5 and G6 (credentials, organizations and spaces left with nobody), G4 (e-mails with upper case), `51-login-binding-xcheck.sh` K3 and K4 (situation per user against the identity database). |
| Acceptance, backup of 2026-11-11 | 13 users: 12 regular, 1 service profile. Situation B (identity exists, e-mail in other letter case) 1; C (no identity, e-mail lower case) 9 with the service profile; D (no identity, e-mail with upper case) 3; A (identity with the same letters) 0. 492 role credentials. One user of situation D holds `platform-roles-admin`; the service profile holds `platform-spaces-reader`. None in the reject set. |
| Must hold | After the copy: the same 13 on G1 with the same numbers, the e-mail as stored, the binding empty; G3 `unbound_in_reject_set` 0; G2 0 and 0. K2 on the copy and the copied identity database: `identity_missing`, `email_differs` and `identity_not_active` 0, the same bound count. The bindings of all other users and the identity ids are copied unchanged. A distiller rule "has a login binding" must not exist. |
| Known risk | Read from the server code (`identity-resolve.service.ts`, `user.lookup.service.ts`, `user.service.ts`), not run. The lookup by e-mail is exact. Situation B: the login of that person ends in an error. Situation D: the person gets a second, empty user if the e-mail arrives in lower case, and the old user with its roles stays out of reach. Situation C: the same failure as B if the e-mail arrives with upper-case letters. If a copy loses the bindings, the 6 bound users whose identity e-mail differs in letter case (K2) join situation B. |
| Open questions | Does the new server need a binding on every user. How does it give a returning person their user back, and does it compare e-mails without letter case. Should a user with no login keep a platform role. What is the service profile used for. |
| Still to verify | (1) On a running server: the three outcomes. (2) Production: counts per situation; needs a production backup with its identity database and the go of the QA lead. (3) The login settings that run on acceptance and production (verified e-mail rule). |
| On production | Run file 30 and `51-login-binding-xcheck.sh`. Read G1, G7 and K4 line by line. Every user of situation B or D is a person who may be locked out today: list them for product before anything is changed. Nothing is sent to any user without the go of the QA lead. |

## T12. Thread bindings on a thread id the chat server no longer has (finding C3)

| | |
|---|---|
| What it is | A binding in `room."vcData"->'interactionsByThread'` whose key, the thread id, is a chat message id from before the chat server migration of January 2026. The chat server holds no message with that id, so no message can ever match the binding. It does nothing. |
| Why it exists | The bindings were moved in from the old `vc_interaction` table in 2025-12. The chat migration gave every message a new id and kept the old-to-new list in memory only. Nothing rewrote the thread ids on the platform side. |
| Ruling | Proposed by QA, 2026-11-13, awaiting the QA lead: keep them. The C3 repair rewrites the old agent id in 341 of them and removes the 21 that name no virtual contributor; the 341 stay, without effect. |
| Listing guard | `53-vc-binding-threads-xcheck.sh` X1 (found or gone per situation) and X2 (the gone ids are known nowhere else on the chat server). File 30, C3 G2, for the totals. |
| Acceptance, backup of 2026-11-11 | 362 of 515 bindings: 338 + 3 old id of a VC that exists, 21 old id of a VC that is gone. In 182 rooms, all of which have a chat room with messages. After the C3 repair: 341. |
| Must hold | After the copy and the repair: X1 `thread gone` equals the agreed number and every gone binding carries the `externalThreadId` key; no binding with the current-id shape and no key is gone. C3 G4 reads 0 on every shape column. C3 G5 reads 0 and 0. |
| Known risk | None for users: the bindings match nothing. The risk is in reading them wrong: without the chat database of the same moment they look like 362 threads with a broken virtual contributor. |
| Open questions | Does the new server keep thread bindings. If it makes new ids, the thread ids and VC ids inside `vcData` are references with no foreign key. Should bindings that can never match be dropped at the copy instead of kept. |
| Still to verify | (1) Production: whether the chat migration ran the same way there; X1 on a production backup with its chat database, with the go of the QA lead. (2) On a running server: a reply in one of the 91 threads that exist (logged error, silent VC). (3) Why no VC answered in the 87 threads in January and February 2026. |
| On production | Run file 30 and `53-vc-binding-threads-xcheck.sh`. If old-id bindings sit on threads that exist in numbers far above 87, the rewrite (R1 of `52-c3-repair.sql`) matters for real users: rehearse it there first. Generator still live: deleting a virtual contributor leaves its bindings, so C3 G2 lines 3 and 5 are expected to be higher. |

## T13. Plus trials whose end date has passed but whose features are still on (finding C4)

| | |
|---|---|
| What it is | A top-level space was given the plus plan as a one-month trial. The end date on the credential has passed, and the space still has every plus feature switched on. |
| Why it exists | The server always gives plus as a trial with an end date (`license.issuer.service.ts`), but builds the features of a space from the credential type only (`licensing.credential.based.service.ts`, `space.service.license.ts`). Only the plan name in the space settings (`space.service.ts`, `activeSubscription`) skips a lapsed credential. No job removes lapsed credentials. |
| Ruling | Proposed by QA, 2026-11-13, awaiting the QA lead: keep every lapsed plus credential unchanged. Do not drop or filter on the end date when copying. What a lapsed trial should do is a product decision. |
| Listing guard | C4 G14 (who lapsed), G15 (plan held against plan named), G16 (what is still switched on), G17 (soundness), existing G3 (members affected). |
| Acceptance, backup of 2026-11-11 | 57 plus credentials, all with an end date, 54 lapsed, 3 live, 1 with no holder (rejected). 52 top-level spaces hold only lapsed plus credentials (53 rows). Plus is on for 52 of 52. Plan named: free for 44, a higher plan for 3, none for 5 (7 subspaces, 18 member credentials). |
| Must hold | After the copy: the same spaces hold the same plus credentials with the same end dates; the stored licence of each has the same features on (G16 equal before and after). G17 stays at 0. |
| Known risk | If the new server enforces the end date, shared whiteboards go off on up to 44 spaces and save as template on up to 11, and 5 spaces have no plan at all. If the lapsed credentials are dropped in the copy, the same happens at the next licence rebuild. |
| Open questions | Product: should a lapsed trial end plus, fall back to free, or stay? Architect: does the new server keep plans as credentials on the space, and does it read the end date? What should the 5 spaces with no plan named get? |
| Still to verify | On a running server and client: what the space settings show for the 52 spaces, and that a licence rebuild leaves plus on. |
| On production | Not checked. Run G14 to G17 there first. |

## T14. The same credential stored twice, and the server path that still makes it (finding C4)

| | |
|---|---|
| What it is | Two identical rows for one holder, one right and one target. Access is unchanged; member, lead and admin counts are one too high. |
| Why it exists | Two one-off migrations (2025-01-30 account admin, 2025-04-09 host organization lead and member), one double grant of 2026-01-14 that was not reproduced, one plus trial given twice by hand, and one live cause: two enabled licence plans carry the same credential type and both go to every new account, and the check that refused a second grant was removed on 2026-02-23 (commit da5929e632, `actor.service.ts` `grantCredentialOrFail`). |
| Ruling | Proposed by QA, 2026-11-13, awaiting the QA lead: merge the exact second copies with `54-c4-repair.sql` (keeps the older row, removes no right). Track until the server stops granting twice, because pairs come back at one per new top-level space. |
| Listing guard | C4 G4 (repeats against the reject set), G5 (what differs inside a pair), G6 (when the later copy was made), G7 and G8 (the live generator), G9 (counts too high), G10 (soundness of a merge), existing G1. |
| Acceptance, backup of 2026-11-11 | 182 groups, 367 rows. 3 groups (9 rows) have no holder and are rejected. 179 pairs with a holder: virtual contributor flag 84, lead 53, member 21, account admin 19, organization admin 1, plus 1. 0 pairs differ in end date or issuer. All 77 top-level spaces made from 2026-03 on hold the flag twice. |
| Must hold | After the repair: G4 shows only groups with no holder, G5 and G6 are empty, G9 reads 0 by a repeat, the number of distinct rights (holder, type, target) is unchanged. Rehearsed: 179 rows deleted, 12,886 rights before and after, fingerprint equal. |
| Known risk | A new database with one row per holder, type and target will refuse the second grant the server still makes for every new space. A repeated owner credential would hide a sole owner from the account deletion check (0 today, G10). |
| Open questions | Architect: is one row per holder, type and target enforced in the new database? Team: is the older of the two virtual contributor plans still needed? |
| Still to verify | On a running server: that a new space gets the flag twice, and whether a lead or member list shows the holder twice. The pair of 2026-01-14. |
| On production | Not checked. Run G4 to G10 there first; the repair stops by itself if any pair differs in end date or issuer. |

## T15. Subspace admin credentials that stayed behind on the parent space (finding C4)

| | |
|---|---|
| What it is | A helper credential on a space, held by someone who administers a subspace of it. Here the holder administers no subspace of that space any more. |
| Why it exists | Read from `role.set.service.ts`, not run: the grant writes the credential on the parent space; the removal (`removeActorFromSubspaceAdminImplicitRole`) asks to revoke it on the subspace itself, so the one on the parent stays. The 21 on a space with no subspace suggest that deleting a subspace leaves it behind too; that path was not read. |
| Ruling | Proposed by QA, 2026-11-13, awaiting the QA lead: keep, copy unchanged. Removing them is a decision for the team together with the server defect. |
| Listing guard | C4 G19 (as intended against left over, what the leftover still gives), G20 (by level of the space), A8 G12. |
| Acceptance, backup of 2026-11-11 | 358 with a holder. 354 on a space that exists: 307 as intended, 47 left over (26 on a space with subspaces, 21 on a space with none); 0 of the 47 rejected. 4 on a target that is not a space, all rejected. In 36 of the 47 the holder is admin of that space anyway. 25 sit on a space that lets subspace admins invite. 18 of the 358 sit on a level 2 subspace. |
| Must hold | After the copy: G19 gives the same four counts. The number left over does not grow without a matching admin removal. |
| Known risk | Where the space lets subspace admins invite, the holder can still invite members into it and is still notified as an admin. |
| Open questions | Team: remove the 47, and fix the removal? How did 18 credentials land on a level 2 subspace? |
| Still to verify | Nothing on the legacy server. **Verified on a running server, 2026-11-16** (v0.172.0 on the repaired acceptance copy, `80-role-write-check.mjs`): making a user admin of a level 1 subspace writes `space-subspace-admin` on the top-level space; making the same user admin of a level 2 subspace writes it on the level 1 subspace; removing the level 2 admin role removes nothing; removing the level 1 admin role removes the credential on the level 1 subspace; the one on the top-level space stays after every role is removed. So each removed subspace admin leaves one credential behind on the parent. |
| On production | Not checked. Run G19 and G20 there first. |

## T16. Licence credentials that switch nothing on (finding C4)

| | |
|---|---|
| What it is | Two kinds. Space licence credentials held by an account on itself, which nothing reads. And enterprise plan credentials on spaces, for which the licence policy has no rule. |
| Why it exists | The account ones were written in June 2024, before plans moved to the space. For enterprise, `license_policy.credentialRules` has 10 rules and none for `space-license-enterprise`. |
| Ruling | Proposed by QA, 2026-11-13, awaiting the QA lead: keep, copy unchanged. |
| Listing guard | C4 G18, A8 G11. |
| Acceptance, backup of 2026-11-11 | 4 credentials on 2 user accounts (free plan and virtual contributor flag, each twice), 0 rejected. 3 enterprise credentials on 3 spaces; the 3 get their features from the free, plus and premium credentials and feature flags they also hold. |
| Must hold | After the copy: G18 gives the same lines. |
| Known risk | None today. If a rule for enterprise is added, the 3 spaces gain whatever it grants. |
| Open questions | Product: is the missing enterprise rule intended? |
| Still to verify | Nothing on acceptance. |
| On production | Not checked. Run G18 there first. |

## T17. Person ids that name nobody (finding C5)

| | |
|---|---|
| What it is | A row whose creator, publisher, trigger or audit person column holds the id of a person who no longer exists as an actor. 17 columns hold such ids: the creator of callouts, posts, contributions, whiteboards, memos, office documents, calendar events, forum discussions, files, media galleries, platform invitations and one API key, the publisher of callouts, the person of activity rows and in-app notifications, and both persons of audit entries. |
| Why it exists | The person was deleted in the product, by staff or through self-service account deletion (in the server since 2026-09-01). Deleting a user removes the user, the profile and the credentials; no code clears the person columns and none of the 17 columns has a foreign key. By design, and still live. |
| Ruling | Proposed by QA, 2026-11-13, awaiting the QA lead: keep every row and every id unchanged. No repair. The placeholder for a deleted user is a display rule of the new server, applied at read time: never a real account, never written over an empty creator, never applied to audit entries, never stored. The copy does not reject a row because its person is gone. |
| Listing guard | File 30, C5 G4 (per column: empty, live user, live actor not a user, gone, distinct gone ids, nullable, foreign keys), G5 (kept or rejected), G6 (who the ids were), G8 (required columns), G9 (audit by category), G10 (notifications), G12 (activity feed), G13 (stored creator rights). |
| Acceptance, backup of 2026-11-11 | 123 distinct ids. Rows: activity 4,408, callout creator 2,160, callout publisher 2,140, file 939, whiteboard 576, post 406, contribution 247, notification 148, audit subject 90, audit initiator 53, platform invitation 40, discussion 34, memo 31, calendar event 29, office document 18, media gallery 8, API key 1. 0 of the 123 are old agent ids; 8 were users in the agent backup of February 2026; 16 have an account deletion record. 38,436 creator rules in 28,235 access policies name one of 120 of these ids and can be matched by nobody. |
| Must hold | After the copy: G4 column `gone` and `distinct gone ids` equal on source and copy for every kept row set (G5 gives the kept numbers), G6 reads the same 123 and 0 old agent ids. A higher number means the copy lost a user, a lower one that the copy rewrote or dropped rows. G9: 0 deletion records whose subject still exists, audit rows equal byte for byte. G10: 0 payloads naming a gone actor. No actor row with the id of a placeholder (G7 second query, 0). |
| Known risk | For users of the web client none found in the code: the item shows with no author, the activity feed shows "Former member". Two reads fail in the legacy server, read from the code and not run: the creator of a platform invitation (40 rows, 4 ids, required API field) and the staff view of e-mail change history (12 of 27 entries, 3 ids). If the new database puts a foreign key or NOT NULL on these columns, 4,917 rows in 5 required columns (activity, post, platform invitation, discussion, calendar event) have no legal value. If the placeholder becomes a real account, it gains creator rights on every item of G13 at the next recalculation of access rights. |
| Open questions | Does the new server have a foreign key or a required rule on any of the 19 person columns. Is the stored id of a deleted person personal data that must be removed on deletion (owner of data protection); if yes, the removal belongs in the product, not in the copy. Should the two failing reads be filed as server defects. Should the dead creator rules (G13) be dropped by the next recalculation in the new server. |
| Still to verify | (1) On a running server and in a browser: an item whose creator is gone (no author), the activity feed ("Former member"), the two failing reads, a comment on a callout whose creator is gone (notification path), the forum author lookup with a gone id. (2) Production counts, with the go of the QA lead. (3) Why the architect counts 730 notifications with 4 ids and "78 + 50" audit entries. |
| On production | Run file 30, guards C5 G4 to G13. Expect the same shape with higher numbers: the generator is live. Compare G6 line 2 (old agent ids, expected 0): any old agent id there would make it a C3-style case with a map. G13 takes about a minute on acceptance and longer on production. |

## T18. Activity rows that store the all-zero system id as the person (finding C5)

| | |
|---|---|
| What it is | 12 rows of the activity table whose person is `00000000-0000-0000-0000-000000000000`. All are saves of a whiteboard. The id is no person: the legacy server uses it as the id of its chat bot and as the id of the "Former member" display. |
| Why it exists | A writer in the legacy server stored the system id when a whiteboard was saved with no known user. The code was removed on 2026-08-25. No row since 2026-08-20. |
| Ruling | Proposed by QA, 2026-11-13, awaiting the QA lead: keep the 12 rows unchanged. They display as "Former member" today, like every other activity row whose person is gone. |
| Listing guard | File 30, C5 G7 (system ids stored as a person in any of the 19 columns; second query: actor rows with a system id, expected 0). C5 G3 covers three columns only and does not see them. |
| Acceptance, backup of 2026-11-11 | 12 rows, one activity type, 2026-06-15 to 2026-08-20. 0 rows with the other placeholder id (`ffffffff-ffff-ffff-ffff-fffffffffff0`). 0 actor rows with either id. 0 stored creator rules name a system id (G13). |
| Must hold | After the copy: G7 reads the same 12 rows in the same one column and no new line. 0 actor rows with a system id. If the new server gives its placeholder or its bot an actor row with the all-zero id, these 12 rows become rows of that actor: then the ruling must be taken again. |
| Known risk | None today. The rows show that a placeholder id did reach stored data once, and that the legacy code has two different placeholder ids, one equal to the chat bot id. A new server that reuses the all-zero id for a real row would adopt these 12 rows silently. |
| Open questions | Which id, if any, does the new server use for its placeholder and for its chat bot. Should the 12 rows be shown as "Former member" or as a system action. |
| Still to verify | (1) Who made the 12 saves, a guest or the system: not known from the data. (2) Production: the writer was live from before 2026-06-15 to 2026-08-25, so expect more rows there. |
| On production | Run file 30, C5 G7. Any line other than the activity table, or any actor row with a system id, is new and must be looked at before the copy. |

## T19. File rows whose bytes are missing or very likely missing from the file store (finding C6)

| | |
|---|---|
| What it is | A `file` row whose content hash (`externalID`) names a stored file that is not, or very likely not, in the file store. Two strengths of evidence. Class 1: the backup worker asked the file service for the bytes and got “no such blob” (`file_backup_outbox` status `skipped`), and no off-site record exists. Class 2: no off-site record and no queue row, the stored file was first uploaded in 2026. |
| Why it exists | Not known. 720 of the 724 stored files were first uploaded from April to June 2026, the first months of the new file service, 332 of them on 2026-06-12. The picture rows carry dimensions measured from the bytes at upload, so the bytes arrived and were lost afterwards or never reached the permanent store. Subject of server#6726. Copying a file later made more rows on the same missing bytes (368 in August 2026, 5 in October 2026). |
| Ruling | Proposed by QA, 2026-11-13, awaiting the QA lead: keep every row and every link that names one; delete nothing before the file store has been listed and a restore was tried. The architect proposes restore, otherwise delete the rows and the links. |
| Listing guard | `56-c6-file-bytes-xcheck.sh` X1 (classes), X5 (places that point at them), X6 (office documents). File 30, C6 G3 and G4 for class 1 from the platform database alone. |
| Acceptance, backup of 2026-11-11 | Class 1: 826 rows on 117 stored files (462 kept, 364 rejected), 807 places point at them, 449 on kept rows. Class 2: 668 rows on 607 stored files (665 kept, 3 rejected), 623 places, 620 on kept rows; among them 43 office documents on 42 stored files (40 kept). Together 1,494 rows on 724 stored files, 396 MB counting each stored file once. Architect: 1,500 on 729. |
| Must hold | After the copy: the kept rows of the list are in the new database with the same id and key; C6 G6 reads 0 (no kept place points at a rejected file row); every kept file row that is not on the list finds its bytes in the new store with the recorded size. The list never grows without a new entry in the backup queue or a new listing of the store. |
| Known risk | A broken picture, a failed download or an office document that does not open, for every place that points at one of these rows. A copy tool that drops bytes per rejected row would empty kept files: 333 stored files are shared between kept and rejected rows (C6 G8). Deleting the file row of an office document makes a T5 case. |
| Open questions | Does the new server answer “not found” for such a row without an error. Is a row whose bytes are confirmed gone and cannot be restored kept as a record or removed, and who rules on that. Is there an older copy of the file-service volume. |
| Still to verify | (1) The file store of acceptance: a listing of name and size per stored file against the 8,957 keys; needs acceptance cluster access and the go of the QA lead. (2) The architect’s list of 729 keys against classes 1 and 2 (explains the 6 rows and 5 stored files of difference). (3) The 5 size differences, which no database shows. (4) On a running server and client: what a user sees. (5) Why the bytes went missing. |
| On production | Run file 30 and `56-c6-file-bytes-xcheck.sh` on a production backup with its backup-service database, with the go of the QA lead. Class 1 needs only the platform database. Expect the same upload months if the cause was in the file service and not in the acceptance environment. Generator still live: a copy of a file does not check the bytes. |

## T20. Older file rows with no off-site copy (finding C6)

| | |
|---|---|
| What it is | A `file` row whose stored file was first uploaded before 2026 and has no record in the backup service. Nothing says the bytes are gone. It is a hole in the backup, not a loss. |
| Why it exists | Not proven. The backup service holds a record for 98 of 1,038 stored files first uploaded in 2023, against 924 of 947 for 2024 and 877 of 880 for 2025. A possible reason, read from the code: the one-time step that renamed old stored files to their content hash (August 2026) wrote no backup queue row. |
| Ruling | Proposed by QA, 2026-11-13, awaiting the QA lead: keep. The architect does not list these as missing. |
| Listing guard | `56-c6-file-bytes-xcheck.sh` X1 classes 3 and 4, X3 by month, X10 by year. |
| Acceptance, backup of 2026-11-11 | 1,413 rows on 966 stored files (1,234 kept, 179 rejected): 1,384 rows on 940 of 2023, 29 rows on 26 of 2024 and 2025. 115 MB counting each stored file once. Nearly all pictures on profiles. Includes the PDF of T9 (3 rows on 1 stored file) and 1 row of 2023 still on an old-form key (C6 G9), which is very likely a file with no bytes. |
| Must hold | After the copy: every kept row of the list finds its bytes in the new store. Once a backup run has covered them, X10 shows 2023 at the level of 2024 and 2025 and the list is empty. |
| Known risk | If the storage volume is lost, these files are lost with it: there is no second copy. |
| Open questions | Who asks operations for a backup run over the files with no record. Does the new platform back up from the store or from the queue. |
| Still to verify | (1) That the bytes are in the store: the same listing as T19. (2) How the backup service chose files when it went back over older ones; its code is not on disk. (3) The one row on an old-form key. |
| On production | Same script. If production shows the same hole for 2023, the off-site backup of production does not cover those files: that is a finding for operations, to be raised only on the go of the QA lead. |

## T21. Stored links to a file row that does not exist (finding C6)

| | |
|---|---|
| What it is | An address inside a profile description, a reference, a link or a visual that names a file id for which there is no `file` row. |
| Why it exists | Two causes. The file was deleted and the link stayed: the server removes the file row, its policy and its tags, and nothing removes the addresses that name it (13 links, acceptance address). Or the text was copied in from another environment and never named a file of this one (10 development address, 2 production address). |
| Ruling | Proposed by QA, 2026-11-13, awaiting the QA lead: keep the links unchanged. The architect proposes to remove them. |
| Listing guard | File 30, C6 G5 (state “file row does not exist”) and C6 G12 (by address). |
| Acceptance, backup of 2026-11-11 | 25 links: visual 4, reference 10, link 1, profile description 10; 24 on rows that are kept. Equal to the architect. |
| Must hold | After the copy: C6 G5 shows the same 24 on kept rows and no new one; C6 G6 reads 0, so the copy itself made none. |
| Known risk | A broken picture or a dead link in 24 places. None for data. |
| Open questions | Should a link to another environment be rewritten, removed or left. Should the new server remove or mark links when a file is deleted. |
| Still to verify | On a running server: delete a file that a text links to and read the text again. Production: the count. |
| On production | Run file 30. The generator is live, so expect more of the first kind. |

Open item outside the tracked cases: the storage tree of top-level spaces (C6 G11: 371 under their own account, 95 with no storage parent, 2 under another account). No file is affected, only storage totals. Proposed as an open item of its own, not as part of C6.

## T22. Handles that the legacy server accepts and the new rule does not (finding C7)

| | |
|---|---|
| What it is | A handle (`nameID`) with a hyphen at the start or the end, or with two hyphens in a row. The legacy server accepts it (3 to 28 letters, digits and hyphens). The rule of the new server, as the architect words it, allows lowercase letters, digits and single hyphens with no hyphen at an edge. |
| Why it exists | The server builds a handle from a title or a name, keeps hyphens as they are and cuts at 25 characters; a cut can leave a hyphen at the end, and hyphens next to each other in a title stay next to each other. The client form allows a hyphen anywhere. The generator is live: 8 of the 66 were made in the last 12 months. |
| Ruling | Proposed by QA, 2026-11-13, awaiting the QA lead: keep unchanged. No rename by the copy or by a repair: the legacy server has no redirect and keeps no old handles, so a rename breaks every link outside the database. Nobody is informed, because owners have no form to rename. |
| Listing guard | File 30, C7 G3 (per kind and shape, and what the copy keeps), C7 G4 (by year, still being made), C7 G13 (stored addresses that name one of them, with a control column). C7 G2 proves every one passes the legacy rule. |
| Acceptance, backup of 2026-11-11 | 66 handles: callouts 22, subspaces 12, posts 9, users 6, whiteboards 6, top-level spaces 4, templates 4, forum discussions 2, calendar event 1. Double hyphen 46, leading 14, trailing 8. Rejected by the copy: 0. Stored addresses naming one of them: 0 of 4,979. |
| Must hold | After the copy: C7 G3 reads the same per kind as before, `other_shape` 0, `rejected` 0; every one of these handles is the same text as in the source (the distiller rule "ids and names are copied unchanged"); C7 G2 reads 0. |
| Known risk | If the new server checks a stored handle when a page is opened or saved, these pages fail or cannot be edited. If it rewrites them at load, links from e-mails, bookmarks and chat messages break without a redirect. |
| Open questions | For the architect: what does the new server do with a stored handle that fails its rule: reject the row at load, rewrite it, or accept it until someone changes it. Does the new server keep old handles for a redirect. Is the rule checked on create and change only. |
| Still to verify | (1) On a running legacy server: that a page with an edge hyphen and one with a double hyphen open by their address. (2) Production counts, with the go of the QA lead. (3) The new rule itself, from the code or the specification of the new server. |
| On production | Run file 30 and read C7 G3 and G4 first. Expect more than 66: every new user and template can add one. Read G13: a number above 0 in the third column means stored links would have to be rewritten together with any rename. |

## T23. Handles that are fine today and collide only if the new server changes the address scheme (finding C7)

| | |
|---|---|
| What it is | Three groups. (a) A handle that is a restricted word, on a kind for which the legacy server does not enforce the list: organizations, innovation packs, virtual contributors. (b) One handle held by rows of two kinds, for example a space and an organization. (c) A subspace with the handle of a callout of its parent space. |
| Why it exists | Each kind has its own address word in front of the handle, so the legacy server checks uniqueness per kind and scope and enforces the restricted list for top-level spaces only. Nothing forbids these combinations. |
| Ruling | Proposed by QA, 2026-11-13, awaiting the QA lead: keep unchanged. Not a data fault under the legacy rules. The 2 top-level spaces on a restricted word are not part of this case; they are T4. |
| Listing guard | File 30, C7 G5 (restricted words per kind), C7 G8 (pairs across kinds), C7 G9 (subspace and callout pairs, by level, parent and day made). C7 G6 holds the word lists read from the code. |
| Acceptance, backup of 2026-11-11 | (a) 8: organizations 4, packs 3, virtual contributor 1. (b) 37 pairs, 22 of them among spaces, organizations, virtual contributors and users, 15 with a pack or a hub. (c) 305 subspaces, 303 at level 1 and 2 at level 2; 302 in one parent space, made on 2026-07-26, each after its callout. Rejected by the copy: 0 in every group. |
| Must hold | After the copy: C7 G5, G8 and G9 read the same numbers as before. C7 G5 reads 0 in both route word columns: no top-level space sits on a page address of server or client. |
| Known risk | If the new server puts kinds into one namespace, or reserves words for every kind, these rows collide or are refused and one of each pair needs a new handle, with the link breakage of a rename. |
| Open questions | For the architect: do spaces, organizations, users and virtual contributors share one namespace in the new server. Do subspaces and callouts of one space. Is the restricted list enforced for every kind. Side finding for product: 3 page words are missing from the restricted list of the legacy server and can be taken by a new top-level space. |
| Still to verify | (1) Production counts. (2) Whether the 302 subspaces of one day exist on production or come from a test or bulk action on acceptance only. (3) On a running server: that both rows of a pair open by their own address. |
| On production | Run file 30 and read C7 G5, G8, G9. If G5 shows a top-level space on a route word, that space cannot be opened by its address: report it at once. |

## T24. People in a named subspace who did not join it (finding C8)

| | |
|---|---|
| What it is | A wrong-scope space and the subspace it names share one set of role grants. Whoever was put in the space above holds the same role in the named subspace. The repair copies the grants to the space above and leaves the grants on the named subspace where they are. |
| Why it exists | Until 2026-09-11 a space created together with nested subspaces was stored with the id of its last subspace in its role definitions. Every role given in the space was written on that subspace's id. |
| Ruling | Proposed by QA, 2026-11-13, awaiting the QA lead: keep every grant on the named subspace. The 10 grants later than the creation of the subspace are left to the space admins, who are to be informed. |
| Listing guard | File 30, C8 G9 (grants on the named subspaces by when they were granted; creator against the other nested subspaces). Run on the source copy: after the C8 repair it reads empty. |
| Acceptance, backup of 2026-11-11 | 51 named subspaces that are sound themselves, 50 with grants: admin 51, lead 51, member 62. Granted with the creation of the subspace: 50, 50, 54. Granted later: 1 admin, 1 lead, 8 member (8 holders, 4 subspaces). |
| Must hold | After the copy and the repair: every grant listed here still exists on the named subspace; C8 G15 reads 0 on its first three columns; the number of role grants held twice does not rise above 75. |
| Known risk | A person sees and can act in a subspace they never joined, with the role they have in the space above. Moving the grants instead would remove creators from subspaces where the server reads them today, with no evidence that they should leave. |
| Open questions | Should the 10 later grants be removed by product or left to the space admins. Does the creator of a space belong in every nested subspace: the code path was not located; in 17 of 23 creations the data says yes, in 6 the other subspaces have no admin. |
| Still to verify | (1) On a running server: the named subspace in the own list of spaces of such a person. (2) The code that assigns the creator in nested creation. (3) Production counts, with the go of the QA lead. |
| On production | Run file 30. Expect more named subspaces and more later grants: the same code ran until release 0.167 was deployed. Save the G9 listing from the source before the repair. |

## T25. Wrong-scope spaces for a one-by-one check (finding C8)

| | |
|---|---|
| What it is | 5 of the 54 wrong-scope spaces that the repair treats like the rest but that do not fit the common picture: 2 with nobody in any role, and 3 from one creation session in which two spaces name a third that is itself wrong-scope. In 2 of those 3, one person holds 3 roles each with no join record. |
| Why it exists | The 2 empty ones: a top-level space created 2026-04-02 with 2 subspaces, and a first-level subspace of 2025-08-19 that names an id no space has. The 3: creation session of 2025-08-20; why two of them name a space that is not their child is not known. |
| Ruling | Proposed by QA, 2026-11-13, awaiting the QA lead: repair with the rest, which keeps exactly what the server reads today, and keep the 6 role holdings. Alternative for the QA lead: leave the 6 out of the repair and decide them by hand. |
| Listing guard | File 30, C8 G10 (the 5 spaces), C8 G8 (holdings with no record), C8 G7 (spaces with nobody). Run on the source copy: after the repair they read empty. `58-c8-repair.sql` check 10 repeats the counts on the repaired state. |
| Acceptance, backup of 2026-11-11 | 5 spaces. 2 with no holder before and after the repair. 6 holdings of 1 person in 2 spaces with no join event, invitation or application. 189 stored policies carry the id that no space has; 0 credentials sit on it. |
| Must hold | After the repair: the 5 spaces name their own id; the 6 holdings exist on the own ids of their 2 spaces (or are absent, if the QA lead rules so); no credential on the id that no space has. |
| Known risk | The 6 holdings may be an effect of the shared id and not of anybody's intent: the person may hold admin, lead and member in a space they were never put in. The 2 empty spaces have no admin, so nobody can manage them. |
| Open questions | Keep or drop the 6. Who should own the 2 spaces with nobody. |
| Still to verify | (1) The 5 spaces by hand on the acceptance environment. (2) After an authorization reset no stored policy carries the id that no space has. (3) Production. |
| On production | Run file 30, G10. Any space listed there goes on this list. The repair stops before writing when a named id is shared in a way it has not seen. |

## T26. Second-level subspaces whose roles list only one space above (finding C8, neighbour)

| | |
|---|---|
| What it is | `role."parentCredentials"` of a second-level subspace holds one entry where the code (`setParentRoleSetAndCredentials`) builds two: the space above and the top-level space. The top-level space is missing. |
| Why it exists | Written when a space is created together with its nested subspaces (130 of the 136 sit under a space created that way). Probably the list of the nested subspace is built before the space above has its own parent list; the code path was not traced. Still written after the server fix of 2026-09-11. |
| Ruling | Proposed by QA, 2026-11-13, awaiting the QA lead: keep, track, and report to the architect as a generator that is still live. Not repaired by the C8 repair. |
| Listing guard | File 30, C8 G13. |
| Acceptance, backup of 2026-11-11 | 136 of 485 second-level subspaces (349 have two entries). 130 under a wrong-scope space, with the own id of the space above as the entry; 3 under a sound space created before the fix; 3 created from 2026-09-11. After the C8 repair: 133 and 3. |
| Must hold | After the copy: the same 136 spaces, each list unchanged. After the C8 repair the 130 entries match the role grants of the space above. |
| Known risk | Read from the code, not run: a holder of a role in the top-level space is not accepted through this list in such a subspace. What that changes for a user is not known, because rights also come down through the policies of the spaces above. |
| Open questions | Is a one-entry list a defect for the new server or an accepted shape. Should the list be completed by a repair (the target can be read from the code). |
| Still to verify | (1) On a running server: what a top-level admin or member can do in such a subspace. (2) File the live generator, with the go of the QA lead. (3) Production counts. |
| On production | Run file 30, G13. The number grows with every space created from a template with nested subspaces. |

## T27. Phases that today’s rules would refuse: blank names, repeated names, flows over the maximum (finding C9)

| | |
|---|---|
| What it is | Three shapes of the phases of an innovation flow. A phase whose name is a single space. A flow that holds the same phase name twice, exactly or when upper and lower case are ignored. A flow that holds more phases than the maximum stored in its settings (8 on every flow). |
| Why it exists | All but one were made on 2025-07-30 or 2025-09-01. 2025-07-30 is the day the phase table was filled on acceptance: 6,415 of 8,854 phases carry it and none is older. They came in with that data change, not through the settings page. Since then the server refuses a repeated name on add and rename (`validateStateDisplayNameIsUnique`), a phase above the maximum (`createStateOnInnovationFlow`) and a definition with a repeat or too many phases when a flow is created (`validateInnovationFlowDefinition`). It still accepts a name of one space; the client forms do not send one (`AddPhaseDialog.tsx`, `LayoutPoolColumn.tsx`). |
| Ruling | **Proposed by QA, 2026-11-13, awaiting the QA lead**: the phases are not changed in the database. Renaming, and removing phases, is left to the space admins, and the admins are informed. Same line as T8. |
| Listing guard | C9 G6 (blank names by where the flow sits, callouts on the blank phase), C9 G7 (repeated names, exact and by case, callouts on the name), C9 G8 (flows over their maximum, with dates), B1 G13 (callouts whose phase tag matches no phase). |
| Acceptance, backup of 2026-11-11 | Blank: 12 phases in 12 flows; 2 in top level spaces with 5 callouts on the blank phase, 5 in level 1 spaces, 1 in a level 2 space, 3 in templates, 1 in a flow that belongs to nothing (the only one in the reject set). Repeated: 3 flows; 2 level 1 spaces with a pair that differs by case and 22 callouts on the name, 1 template with an exact repeat and 2 callouts. Over the maximum: 10 flows with 9 to 11 phases; 6 level 1 spaces, 1 level 2 space, 3 templates; 103 callouts; 9 of the 10 also hold a blank phase. |
| Must hold | The counts of G6, G7 and G8 stay where they are until an admin changes the phases; they may only go down. No repair touches these phases, the lists of allowed values or the callouts on them. The 5 callouts on a blank phase are matched callouts: they are not part of the B1 repair and `truly_unmatched` of B1 G13 does not count them. |
| Known risk | Read from the server code, not run. (1) A space made from a template whose flow is over the maximum or holds an exact repeat is refused: 3 + 1 templates on acceptance. (2) When phases are changed in the settings, `tagset.service.ts updateTagsetsSelectedValue` walks over every callout of the flow; a callout whose stored phase matches neither a new name nor the old name of the renamed phase is set to the default phase. After renaming a blank or repeated phase the admin must look at the default phase and set the phase of the moved callouts again. (3) A comment in the client code says two phases with one name show posts twice and a rename of one drags the posts of the other. |
| How the admins are informed | The list of spaces and admins is made locally by hand from G6, G7 and G8 on the day (the kit prints no names). It is never published. Sending the message is the QA lead’s step. Template owners first. |
| Open questions | Does the new server accept a blank phase name, a repeated name and a flow over its maximum on import, and if not, what does it do with the flow and its callouts. Is the maximum of 8 still a rule there. |
| Still to verify | In a running client: what a tab with a blank name looks like, where the callouts of a repeated name show, and that creating a space from one of the 4 templates fails. Where the flow of 2025-09-01 came from. |
| On production | Run the kit, read G6 to G8. A template in use with one of these shapes is the urgent part. |

## T28. Organizations with filler values in optional fields (finding C9)

| | |
|---|---|
| What it is | Organizations whose legal name, website or domain holds a filler value that many organizations share. The architect lists them as test data to delete. |
| Why it exists | The three fields are optional text. The organizations were made between 2022-08-24 and 2024-03-11; the same filler was typed or seeded each time. Nothing in the product reads meaning into these fields. |
| Ruling | **Proposed by QA, 2026-11-13, awaiting the QA lead**: all are kept, unchanged. No organization is deleted because of a name, website or domain pattern. Those without an owner fall under the C1 ruling (valid data; the ones nobody can act for are T10). |
| Listing guard | C9 G14 (finds the filler values from the data: a value shared by 10 or more organizations; no pattern is written in the guard), C9 G15 (what the matched organizations hold). C9 G2 is the older pattern check. |
| Acceptance, backup of 2026-11-11 | 38 of 497 organizations: filler legal name 25, filler website 38, filler domain 35; 25 carry all three. None is in the reject set. 11 have an owner, 26 an admin, 36 have people (28 different users). 36 host top level spaces: 74, with 275 spaces at all levels. 5 host 14 virtual contributors. 10 host innovation packs. 37 hold a role in a space. 4 are verified. On 36 a role, space or callout was made in the last 12 months, on 6 in the last 3 months. None holds nothing. |
| Must hold | `in_reject_set` of G14 stays 0. A change in `organizations_matching` is explained by an organization being edited or deleted by its owner or a platform admin, never by a distiller rule. |
| Known risk | Someone applies “delete test data” by pattern later. G15 shows what goes with it. On production the filler values may be other values and far more organizations may share a real value (a holding, a university): the threshold of 10 finds shared values, it does not prove a value is a filler. |
| Open questions | Does anyone want these fields cleaned. If so it is a message to the organization admins, not a data change. |
| Still to verify | Nothing on acceptance. |
| On production | Run G14 and G15. Read the numbers before anyone names a list for deletion. A deletion list is signed by a person, organization by organization. |

## T29. Content outside today’s input limits: empty names, long and short titles, links with an empty address (finding C9)

| | |
|---|---|
| What it is | Rows the product shows or carries without trouble, but which today’s input rules would not accept if typed now. A display name that is empty. A display name over 128 or under 3 characters. A link response with no address. |
| Why it exists | Empty names: the server writes an empty title for community guidelines by design (`space.about.service.ts`, `community.guidelines.service.ts`); the rest is older data. Long and short titles: saved before the limits or by a path without them; the path was not found. Links with no address: 386 from a data change of 2024-02-09, 82 posted by people since; the server still takes a link with no address (`link.dto.create.ts`), only the client asks for one (`LinkContributionDialog.tsx`). |
| Ruling | **Proposed by QA, 2026-11-13, awaiting the QA lead**: all kept unchanged. No name is invented, no title is cut, no link is deleted. |
| Listing guard | C9 G1 and G10 (empty names by kind, against all profiles of the kind), C9 G9 (titles over 128 and under 3 characters), C9 G3 and G11 (links with an empty address, with title, by year). |
| Acceptance, backup of 2026-11-11 | Empty names 1,631: community guidelines 1,311 of 2,483 (30 in the reject set with their guidelines), flows 317 of 2,432, user groups 2 of 11, one About profile of a space template. No space has an empty name. Titles over 128: 6 (4 link responses of 133 to 145 characters by one person on one day, one virtual contributor and its knowledge base with 550 each). Names of 1 or 2 characters: 11. Links with an empty address: 468 of 2,998, all responses, all with a title, 11 with a description, in 236 callouts of 212 spaces; 16 made in 2026. None of the long titles, short names or empty links is in the reject set. |
| Must hold | `nameless_space_abouts` of G10 stays 0. `in_reject_set` of G9 and G11 stays 0. After a copy the counts of G9, G10 and G11 on the new database equal those on the source, minus the rows the reject rules take (30 guidelines today). |
| Known risk | A silent loss. If the distiller or the new server applies today’s limits to old rows, these rows are refused or cut on import and nobody is told: 468 link titles, 6 long titles, 11 short names, and every space whose community guidelines have no title. An edit of a long title in the product is refused until the title is shortened. |
| Open questions | Which of these shapes does the new server refuse on import, and what does it do then: skip the row, cut the value, or stop. Does it keep user groups at all (11 rows, the client does not use them). |
| Still to verify | In a running client: what a click on a link with an empty address does. Why 317 flows have an empty name. The 9 rows between 1,631 and the architect’s 1,622. |
| On production | Run the kit. The counts will be larger. The ruling does not depend on them. |

## T30. Flows in which a new callout lands on no tab (finding B1, phase tag part)

| | |
|---|---|
| What it is | A flow whose list of allowed phase values is out of date in a way that matters: the value a callout gets when it is made without a phase (the declared default of the list when it is on the list, otherwise the first value of the list) is no phase of the flow. A callout made that way sits on no tab. |
| Why it exists | Read in the server code, develop 39d7aff38: the list is rewritten only when a phase is renamed or all phases are replaced through `updateInnovationFlowStates`. Adding one phase (`createStateOnInnovationFlow`, innovation.flow.service.ts:615-655) does not add it to the list. On acceptance 3 flows also had all their phases replaced in one step in February and June 2026 without the list being rewritten; which action did that is not determined. A callout made with a phase gets that value unchecked (`classification.service.ts updateClassificationTagsetInputs`). |
| Ruling | **Proposed by QA, 2026-11-16, awaiting the QA lead**: the lists are kept unchanged. `60-b1-repair.sql` repairs the callouts that are on no tab today and leaves the lists alone. The cause is a server fix, not a data repair. Bringing the lists in line with the phases is the open question of guard file `50-flow-allowed-values.sql` (387 flows differ). |
| Listing guard | B1 G18 (counts). B1 G14 lists the callouts that are on no tab today. File 50, F1 to F5, has the full picture of lists against phases. |
| Acceptance, backup of 2026-11-11 | 29 of 2,416 flows: 27 in spaces, 2 in space templates. No list is empty. None of the 29 has a phase with a comma in its name. 3 of the 29 hold a callout on no tab today (6 callouts; the other 4 unmatched callouts sit in 2 flows whose default value is a phase). After the repair: 29 flows, 0 with a callout on no tab. |
| Must hold | After `60-b1-repair.sql`: B1 G14 lists no row and `with_an_unmatched_callout_today` of G18 reads 0. Before the cutover the same two read 0 on the last backup; a new row means a callout was made on one of these flows since the last repair run, and the repair runs again. |
| Known risk | New callouts on no tab keep appearing on these 29 flows until the server is fixed or the lists are brought in line. A member makes a callout and does not find it afterwards. The count on production is unknown. |
| Open questions | Does the new server keep the phase of a callout as a name with a list beside it, or as a reference to the phase. In the second case this case ends with the import, and the import needs the rule of the repair for a name that is no phase. Which action replaced the phases of 3 flows without rewriting the list. Should a server issue be filed (not filed). |
| Still to verify | Nothing on the legacy server. **Verified on a running server, 2026-11-16** (v0.172.0 on the repaired acceptance copy): in 3 of the 4 flows that hold a repaired callout, a callout made without a phase lands on the stray value of the list, which is no phase (made and deleted again). In the same flows `updateClassificationTagset`, the call the Layout settings and the flow settings of the client use, refuses to move a callout onto a real phase that is missing from the list (`BAD_USER_INPUT ... not in allowedValues`); it accepts only the stray value. `updateCallout` with a classification accepts any value. The refusal is the same on 3 callouts no repair touched. On the repaired copy 382 flows have at least one phase missing from their list (2,068 callouts sit in those flows). So after `60-b1-repair.sql` the 6 repaired callouts show on their tab, but an admin cannot move them to another phase in Layout settings, and the next callout made there is lost again. This argues for bringing the lists in line with the phases, at least in the flows where the list holds no phase at all: a decision for the QA lead, the ruling above says the lists are kept. |
| On production | Run B1 G14 to G18. Read every line of G14. G15 must read zero in its stop columns before the repair. Expect other counts and possibly other kinds, such as a tag that differs from a phase only in case (the repair then takes the spelling of the phase) or a current phase with a comma in its name (the repair stops; the phase is a T8 row and is renamed first). |

## T32. Sub-subspaces that sit under a sub-subspace: a fourth level (finding B2, second pass)

| | |
|---|---|
| What it is | A space of level 2 whose parent is also a space of level 2. The platform has three levels, so the space sits on a fourth one while its level field says third. |
| Why it exists | A platform admin turned a subspace that had sub-subspaces of its own into a sub-subspace (`convertSpaceL1ToSpaceL2OrFail`, `conversion.service.ts:385-478` on develop of 2026-11-10). That conversion does not check for children, so they stayed below it. The newer moves refuse the same request (`conversion.service.ts:794` and `:957`). The gap is still in the code. |
| Ruling | Proposed by QA in the B2 second pass, 2026-11-16, awaiting the QA lead: keep unchanged and track. The first pass said "repair per space, once the architect shows what FC-U5 writes". The second pass found that the server code gives no target for such a space: it would refuse the request today, and it does not offer a move of a sub-subspace inside one top-level space ("deferred capability", `conversion.service.ts:949-954`). Where the space belongs is a product decision. |
| The option that is ready | `62-b2-deep-space-option.sql` attaches the space to the subspace above its parent, the way the server moves a sub-subspace (`conversion.service.ts:988-1023`). Rehearsed on acceptance on 2026-11-16. It stops by itself when the space has subspaces, when anybody holds a credential on it, when an invitation or application is pending, or when the two parents give different platform access. The other option is to undo the conversion of the parent. |
| Listing guard | File 30, B2 G8 (what its roles and storage point at) and B2 G17 (what a move would have to settle). `63-b2-chat-tree-xcheck.sh` for the chat side. |
| Acceptance, backup of 2026-11-11 | 2 spaces in 2 trees, both created on 2026-04-02 and put where they are by a conversion that only a platform admin can run. No member, no admin, no credential of any kind, no invitation. One holds 10 callouts and 15 files, the other 1 callout. Both open by their address. Their roles take members from the parent and from the top-level space and skip the subspace in between. On the chat server one hangs under its parent and one has no parent. |
| Must hold | After the copy: the same 2 spaces, unchanged. B2 G10 reads max depth 3 and no loop. No credential appears on either space without a review of this case. |
| Known risk | Read from the code, not run. A person given a role in such a space is checked against the parent and the top-level space, not against the subspace in between. Nobody holds a role today. A new server that allows only three levels may refuse the two rows at load. |
| Open questions | What the approved repair FC-U5 of the architect writes for these rows, and whether it equals option a. Whether the new server refuses a fourth level at load. Who decides where the two spaces belong: they have no member and no admin. |
| Still to verify | (1) FC-U5 against the checks of file 62: after any repair, B2 G18 must show the space with every flag as for a normal sub-subspace. (2) On a running server: an authorization reset after a move, and the chat-side links. (3) File the conversion gap, with the go of the QA lead. |
| On production | Run file 30. Read B2 G17 row by row: a space with members, credentials or invitations is decided by a person, space by space (QA lead, 2026-11-13: conversions need a check per row on production). Run file 63 against the chat backup of the same moment. |

## Updates of 2026-11-16 to earlier cases

- **T19 and T20 (C6).** The acceptance file store was listed (`68-c6-volume-xcheck.sh`). T19: 719 of the 724 stored files are confirmed missing, 5 are present. T20: 956 of the 966 stored files are present, 10 are missing. In all 730 stored files are missing, 729 with no off-site copy.
- **T26 (C8 neighbour).** The cause is traced in code and is a regression of server#5203; see `issue-drafts/c8-l2-subspace-one-entry-parent-credentials.md`. Not filed.
- **T8 and T27.** The people to inform are listed by `67-phase-admin-list.sh`; the message draft is `issue-drafts/phase-admin-message.md`. Nothing is sent.
