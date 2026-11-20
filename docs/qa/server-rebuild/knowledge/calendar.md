# Calendar and events: behaviour rules

_What the platform does today for the calendar every space carries and its events: creating, reading, updating and deleting them, whole-day and timed dates, the Google, Outlook and ICS exports, subspace events showing on the parent calendar, and the notifications and activity an event produces. It says what the server does, why, who may, and what is still to answer. The file has three sections, **1. Rules**, **2. Rights** and **3. Open questions**, with the evidence in an **Appendix**._

_Open questions per owner: Product Lead 3 · Technical Lead 5 · Quality Lead 4 · Architecture Lead 1. By state: 6 open · 2 change decided · 5 with a suggested answer · 5 decided. Proof of the 25 rules: 12 proven by a test · 13 untested (Appendix A)._

_Whys of the 25 rules: 12 rest on a source · 11 carry a draft for product to decide · 2 have none, and each already carries an open question (EVT-24, EVT-25)._

**How to read it**

- **Rule** is one or two plain sentences. The exact behaviour, with error messages and limits, is in Appendix A under the same id. The new core is checked against the exact text.
- **Why: business** is what Alkemio needs. **Why: product** is the user story. **Why: technical** is the engineering reason. A rule needs at least one why, and gets a second or third only where it adds something for the decision or the code. "—" means none is given.
- A why that names a spec, issue, pull request, code comment or code line rests on that source. A why, or the part of a why, ending in _(draft)_ was written by QA and no source states it: product keeps, rewrites or deletes it, and sets **Decided by**. A user story always ends in its "so that"; where no source gives one, QA wrote it. A rule with no why at all carries an open question in section 3.
- **Decided by** names the source of the decision: a spec, a commit or pull request, an issue or a document. "Not decided" means the behaviour exists in the code and nobody chose it. Product has not reviewed this file yet.
- A marker in bold at the end of a rule points at section 3: **(open: F3)** means a question on this rule is still open, **(defect: …)** means today's behaviour is a fault and must not be copied as intended, **(defect in part: …)** means part of it is. A rule with no marker stands as written. Every rule is logged as the server behaves today, also when that is not the intended end state. Whether a test proves the rule sits in Appendix A as **proven** or **untested**.
- Hard rules are not marked yet. Some rules are choices that a new feature may challenge, and some can never change; a later version will mark the second kind with "(hard rule)" after the why that makes it so. Until then, no marker does not mean a rule is open to change.

## 1. Rules

### The calendar

| ID | Rule | Why: business | Why: product | Why: technical | Decided by |
|---|---|---|---|---|---|
| EVT-01 | Every space, at every level, has exactly one calendar, created with the space. Anyone who can read the space can read its calendar. Templates carry no calendar. | — | — | One calendar per space is the container the events hang on; templates do not carry dated content. _(draft)_ | Not decided: exists in the code |

### Creating events

| ID | Rule | Why: business | Why: product | Why: technical | Decided by |
|---|---|---|---|---|---|
| EVT-02 | Only space admins create events on a space's calendar. Members and leads can comment on events but cannot create them; outsiders are refused. **(defect: CH-EVT-02)** | Today: events are curated by the space's admins; taking part is a comment, not an event. Product, 2026-11-20: members should be able to create events too (change decided, CH-EVT-02; alkem-io/alkemio#2205). | — | The collaboration's contributor rule grants contribute only, not create. _(draft)_ | Product, 2026-11-20 (CH-EVT-02, change decided): members should also create events |
| EVT-03 | An event has a title, an optional description, location and tags, one of six types (event, deadline, meeting, milestone, training, other), a start, a whole-day flag, a multi-day flag, a duration, and a flag that says whether it shows on the parent calendar. **(open: F6)** | — | As a space admin, I want to say what kind of event it is, where, and when (one day, several days or a time slot), so that members can plan for it. For the parent-calendar flag: as a subspace admin, I want to promote some events on the space level as well (client-web#6876), so that the whole community sees the events that matter beyond my subspace. | — the event vocabulary is the calendar's own; no spec states why these six. | Product, 2026-11-20 |
| EVT-04 | An event's name identifier is unique within its calendar. One that is already taken is refused; when none is given, one is made from the title. **(open: Q-EVT-04)** | — | — | The name id is the last part of the event's web address (`<space>/calendar/<nameID>`, `url.generator.service.ts:1357`), so two events in one calendar cannot share it. | Not decided: exists in the code |
| EVT-05 | Every event has its own comments room. If the event cannot be saved the room is removed again, and deleting the event deletes the room. | — | — | The Matrix room is created outside the database transaction, so an orphan must be removed explicitly (code comment). | Not decided: exists in the code |
| EVT-06 | The creator of an event can read, update and delete it whatever their role, but cannot delete other people's comments on it. | — | — | Comment rights are inherited before the creator's extra rights are added, "so that the creating user does not have rights to delete comments" (code comment, `event.service.authorization.ts:59-60`). | Not decided: exists in the code |
| EVT-07 | Creating an event is recorded as activity and notifies the space community, except the creator, by email, in the app and by push. One notification setting covers it. | — | As a member, I want to know what events are happening, so that I can take part in them. As a creator, I don't want notifications for my own events, so that I am only told about what is new to me. (Product, 2026-11-20; the two so-thats are QA's wording) _(draft)_ | — | Server PR #5860; Product, 2026-11-20 |
| EVT-08 | A comment on an event notifies the event's creator only, and never the person who wrote the comment. | Keep event creators engaged with discussion on their events; no self-notification (spec 015 US1/US2, FR-003/FR-004). | As an event creator, I want to be notified when someone else comments on my event, so that I stay engaged with the discussion on it (015 US1/US2). | — | Spec 015 US1/US2, FR-003/FR-004 |

### Reading events

| ID | Rule | Why: business | Why: product | Why: technical | Decided by |
|---|---|---|---|---|---|
| EVT-09 | Anyone who can read a calendar sees its list of events, each with its title, dates and flags. | An event is part of the space's content, so it is exactly as visible as the space. | — | The calendar inherits the collaboration's policy. _(draft)_ | Product, 2026-11-20 |
| EVT-10 | When the space setting "allow events from subspaces" is on (the default), the calendar of a top-level space also shows the events of its direct subspaces that are flagged to show on the parent. Events of sub-subspaces never show on a calendar above them. | — | As a subspace admin, I want to promote some events on the space level as well, so that the whole community sees the events that matter beyond my subspace. As a space admin, I want to be able to prevent subspace events from being promoted on the space dashboard, so that my space's calendar does not fill up with events that are not for everyone. (client-web#6876) | One level up only, "for simplicity for now" (client-web#6876); the code comment says how to widen it. | client-web#6876; server PR #4687; Product, 2026-11-20 (was F3): one level up is the rule |
| EVT-11 | An event shown on a parent calendar says which subspace it belongs to. An event on a top-level space's own calendar names none. | — | As a space member, I want an event promoted from a subspace to show which subspace it comes from (client-web#6876, acceptance criteria), so that I know who organises it and where to find out more. _(draft)_ | — (schema: "Only applicable if the Space has this option enabled") | client-web#6876; Product, 2026-11-20 (was Q-EVT-11) |
| EVT-12 | Anyone who can read an event can open it by its id. A deleted event can no longer be found. **(open: F5)** | — | As a space member, I want to open an event from a link someone shared, so that I land straight on it. _(draft)_ | — | Not decided: exists in the code |

### Updating and deleting

| ID | Rule | Why: business | Why: product | Why: technical | Decided by |
|---|---|---|---|---|---|
| EVT-13 | Space admins and the creator can update an event. The dates and durations are always replaced by what is sent, so shortening a multi-day event to one day sticks. Changing the title also renames the comments room. **(open: F6)** | — | — | A truthy guard dropped a legitimate 0 and silently kept the old span (023 US5, FR-012; server#6279). | Spec 023 US5, FR-012; server#6279 |
| EVT-14 | Space admins and the creator can delete an event. Its profile and its comments room go with it. | — | As a space admin or event creator, I want to delete an event that no longer takes place, so that members are not misled. _(draft)_ | — | Not decided: exists in the code |
| EVT-15 | Deleting a space deletes its calendar and every event, with their comments rooms. | Events are owned content of the space. _(draft)_ | — | — | Not decided: exists in the code |
| EVT-16 | Rights on events always follow the space: the calendar takes its rights from the space, each event from the calendar plus its creator, and each comments room from its event. | — | — | One authorization forest; events are children of the collaboration. _(draft)_ | Not decided: exists in the code |

### Whole-day and timed dates

| ID | Rule | Why: business | Why: product | Why: technical | Decided by |
|---|---|---|---|---|---|
| EVT-17 | A whole-day event is a plain calendar date that never shifts with anyone's time zone. Every export (ICS file, Google link, Outlook link) carries that date, and stays exact across year ends and clock changes. | An exported event on the wrong day is actively misleading (023 US1). | — | RFC 5545 exclusive end; UTC arithmetic has no DST (023 FR-001/003/005/006, ADR 0001; closes server#6267). | Spec 023 FR-001/003/005/006; ADR 0001 |
| EVT-18 | A timed event is exported as an exact moment in time, with a hint that the time zone is Europe/Amsterdam. | — | — | Timed events were already correct; importers localise an instant (023 FR-007, SC-005). | Spec 023 FR-007, SC-005; Product, 2026-11-20 (was OQ3): Europe/Amsterdam is the hint for every customer |
| EVT-19 | An event's dates are checked only when its calendar links or its ICS file are read, not when it is created or updated. A timed event must end after it starts; a whole-day event may start and end on the same day. An event with bad dates is saved, and then fails every time its links are read. **(open: F4, OQ4)** | — | — | 023 edge case: "Server date-range validation MUST accept start === end for whole-day events … only timed events require end strictly after start"; validating at write is not stated anywhere. | Spec 023 edge case (what to accept); checking only on read is not decided |

### Exporting

| ID | Rule | Why: business | Why: product | Why: technical | Decided by |
|---|---|---|---|---|---|
| EVT-20 | Every event offers a Google Calendar link and an Outlook link with its title, its description as plain text (cut at 1,000 characters) and its location. | — | As a platform user, I want to export a calendar event to my personal calendar application (Teams, Outlook, Google Calendar), so that I can manage all my events in one place without manually recreating them (client-web spec 004 US1; client-web#9330). | — | client-web#9330; client-web spec 004 FR-001–FR-003; server PR #5860 |
| EVT-21 | The ICS download is a standard calendar file named after the event, with its title, plain-text description (cut at 8,000 characters), location and a link to the event page. **(open: F2, OQ1)** | — | — | RFC 5545 compliance (client-web spec 004 FR-005); the link back to the event is FR-006. | client-web spec 004 FR-005, FR-006 (branch `4-add-to-calendar`) |
| EVT-22 | Downloading the ICS file needs a signed-in user who can read the event. A visitor is sent to the login page; a signed-in user without access is sent to a "restricted" page. **(open: F2, OQ1)** | — | — | Export is an authenticated read of the event (code). Client-web spec 004 US3 scenario 4 wants the ICS opened from the notification email without signing in. | Product, 2026-11-20 (was F1): sign-in stays required; client-web spec 004 US3 scenario 4 is not adopted |

### Lifecycle with the space

| ID | Rule | Why: business | Why: product | Why: technical | Decided by |
|---|---|---|---|---|---|
| EVT-23 | Events stay with their space when it is converted or moved. | Content travels with the space (journey area, 083/084). | — | — | Specs 083, 084 |
| EVT-24 | A creator who has left the community can still update and delete the events they created. **(defect: F7)** | Product, 2026-11-20: a creator's rights on an event end when they leave the community; space admins keep theirs. | — | The creator rule is keyed on the user, not on membership. | Product, 2026-11-20 (F7, change decided): today's behaviour is not the rule |
| EVT-25 | When the creator's account no longer exists, the event still shows, without a creator, and nobody inherits the creator's rights. **(open: F8)** | An event is content of the space, not of its creator, so it outlives the account; space admins keep managing it. Product, 2026-11-20. | — | — | Product, 2026-11-20 (was Q-EVT-25) |

Numbering note: ids are contiguous; none folded.

## 2. Rights

_Y = may · N = refused · – = does not apply. Conditions are footnotes under each table. Row ids W1–W11 follow the order of the former who-may table. "Platform roles" are the platform admin roles; the footnotes say which. Evidence is in Appendix B. The legacy tests exercise only the harness admin, a space admin and a non-member; every other cell comes from the access matrix._

### Events, comments and export

| ID | Action | Platform roles | Space admin (same level) | Subspace admin (level below) | Space lead or member | Creator, still a member | Creator, no longer a member | Registered user, not a member | Visitor |
|---|---|---|---|---|---|---|---|---|---|
| W1 | Create an event on a space's calendar | Y¹ | Y | N² | N | – | – | N | N |
| W2 | Read the calendar and its events, public or open space | Y | Y | Y | Y | Y | Y | Y | Y |
| W3 | Read the calendar and its events, private space | Y³ | Y | Y | Y | Y | N | N | N |
| W4 | Update an event | Y¹ | Y | N | N | Y | Y⁴ | N | N |
| W5 | Delete an event | Y¹ | Y | N | N | Y | Y⁴ | N | N |
| W6 | Comment, react or reply on an event | Y¹ | Y | Y | Y | Y | N | N | N |
| W7 | Delete another member's comment on an event | Y¹ | Y⁵ | N | N | N⁶ | N | N | N |
| W8 | Download the ICS file | Y³ | Y | Y | Y | Y | Y⁷ | Y⁷ | N⁸ |
| W9 | Turn "events from subspaces" on or off (space setting) | Y¹ | Y | – | N | – | – | N | N |

¹ Platform Content Full Access only. Platform Settings Admin, Platform Operations Admin, Platform Resource Admin, Platform License Manager, Platform Support and the spaces reader are refused. ² An L1 admin cannot create on the L0 calendar. ³ Where the role can read the space: Platform Content Full Access, the spaces reader, Platform Resource Admin and others that read spaces. ⁴ Kept after leaving the community; question F7. ⁵ Through the space admin's delete right on the room. ⁶ The creator has no extra rights over the comments on their event (EVT-06). ⁷ On a public space only. ⁸ Sent to the login page; question F1.

### Notifications

| ID | Notification | Platform roles | Space admin (same level) | Subspace admin (level below) | Space lead or member | Creator, still a member | Creator, no longer a member | Registered user, not a member | Visitor |
|---|---|---|---|---|---|---|---|---|---|
| W10 | Receive the "event created" notification | – | Y | Y | Y | N⁹ | – | – | – |
| W11 | Receive the "comment on your event" notification | – | – | – | – | Y | Y | – | – |

⁹ The creator is left out of the notification about their own event (EVT-07).

## 3. Open questions

_One section per role, so each owner reads only their own part. **To answer** lists the questions the role owns. **Also involved** repeats questions another role owns where this role has a part; the Owner cell says which part. A question shared by two roles therefore appears under both. **State**: open · suggested (an answer is proposed and the owner confirms it). F ids are findings, OQ ids are open questions of the extraction, Q ids ask why a rule exists. The full text of each finding and open question, with code lines and data, is in Appendix C under the same id._

### Product Lead

[Product Lead](https://github.com/alkem-io/organisation/blob/develop/vault/Model/Alkemio/Sub-circles/Strategy/Sub-circles/Product/Roles/Product%20Lead.md) · Strategy › Product (Simone); Denise decides on her behalf · 3 to answer

**To answer**

| ID | Area | Type | Question | Owner | Proposed answer | State |
|---|---|---|---|---|---|---|
| F7 | Lifecycle | decision | A creator who has left the community can still update and delete the events they created. Is that intended? | Product Lead | Product, 2026-11-20: rights end on leaving. A former member can no longer update or delete the events they created; space admins keep theirs. Issue: to file. | change decided |
| CH-EVT-02 | Creating | decision | Only space admins create events today; members and leads can only comment. Should members be able to create events? | Product Lead | Product, 2026-11-20: yes, members should be able to create events too. Issue: alkem-io/alkemio#2205 ("Should let members create calendar events"). | change decided |
| CONST | All | decision | 22 of the 27 constants are still blank in "product must rule?" (Appendix E). Which of them must product rule on? | Product Lead (Technical Lead and Security Lead for the rows pre-filled with their name) | Product, 2026-11-20: of the seven Product Lead rows, event types and notification events must be ruled on; the two description cuts carry over; roll-up, ICS redirects and creator rights follow F3, F1 and F7. The Technical and Security Lead rows are theirs to tick. | suggested |

### Technical Lead

[Technical Lead](https://github.com/alkem-io/organisation/blob/develop/vault/Model/Alkemio/Sub-circles/Delivery/Roles/Technical%20Lead.md) · Delivery (Anton) · 5 to answer, 1 also involved

**To answer**

| ID | Area | Type | Question | Owner | Proposed answer | State |
|---|---|---|---|---|---|---|
| F4 | Dates | defect | An event with impossible dates (a timed event that ends when it starts, or before) is saved without complaint and then fails every time its links or ICS file are read. Check the dates when the event is saved? | Technical Lead | Validate at write and treat the read-time check as a safety net. | suggested |
| F5 | Reading | tidy-up | One way of reading a single event through its calendar checks only the right to read the calendar, not the event. Harmless today, but inconsistent with the other two ways. Align it or drop the field? | Technical Lead | — | open |
| F8 | Lifecycle | decision | When a creator's account is deleted, the event keeps the id of the deleted user and the creator rule that goes with it (server#4529). Leave it as cosmetic, or clear it when the user is deleted? | Technical Lead | — | open |
| OQ4 | Dates | check | Does the notification for a new event use the same date check as the links and the ICS file? If so, F4 applies there too. The file was not found during the extraction. | Technical Lead | — | open |
| Q-EVT-04 | Creating | decision | Why does this rule exist? An event's name identifier is unique within its calendar; no source states the reason. | Technical Lead | The name id is the last part of the event's web address (`url.generator.service.ts:1357`). The why is on EVT-04. | suggested |

**Also involved**

| ID | Area | Type | Question | Owner | Proposed answer | State |
|---|---|---|---|---|---|---|
| CONST | All | decision | 22 of the 27 constants are still blank in "product must rule?" (Appendix E). Which of them must product rule on? | Product Lead (Technical Lead and Security Lead for the rows pre-filled with their name) | Product, 2026-11-20: of the seven Product Lead rows, event types and notification events must be ruled on; the two description cuts carry over; roll-up, ICS redirects and creator rights follow F3, F1 and F7. The Technical and Security Lead rows are theirs to tick. | suggested |

### Quality Lead

[Quality Lead](https://github.com/alkem-io/organisation/blob/develop/vault/Model/Alkemio/Sub-circles/Delivery/Roles/Quality%20Lead.md) · Delivery (Evgeni), with the QA Engineer as the doer · 4 to answer

**To answer**

| ID | Area | Type | Question | Owner | Proposed answer | State |
|---|---|---|---|---|---|---|
| F2 | Exporting | test | Seven ICS cases are parked as todo, and one is skipped, on a note that a bearer token is refused. That note is stale: another suite downloads with a bearer token and gets the file. Un-park them? | Quality Lead | Yes: un-park the 7 ICS todos (content type, structure, location, markdown strip, VALUE=DATE, datetime). They are runnable today. | suggested |
| OQ1 | Exporting | check | Which spec do the parked ICS cases cite ("User Story 3", "FR-005")? It is in neither the server nor the agents-hq specs. Find it (pull request #5860 or Zenhub) before F1 is answered. | Quality Lead | Found: client-web `specs/004-add-to-calendar/spec.md` on branch `4-add-to-calendar`, linked from client-web#9330. US3 is export from the notification email; FR-005 is RFC 5545. | suggested |
| OQ2 | Calendar | check | On acceptance 247 timeline and calendar rows have an empty rights list. Are they left-overs, or live calendars that refuse everyone? Needs a look at the data, not at the code. | Quality Lead | — | open |
| GAPS | All | test | 13 of the 25 rules have no test, several proven rules have untested parts, and 10 behaviours were never pinned down (Appendix D). Which get a case before the acceptance checklist is drawn from this file? | Quality Lead | — | open |

### Security Lead

[Security Lead](https://github.com/alkem-io/organisation/blob/develop/vault/Model/Alkemio/Sub-circles/Delivery/Roles/Security%20Lead.md) · Delivery (Valentin) · 1 also involved

**Also involved**

| ID | Area | Type | Question | Owner | Proposed answer | State |
|---|---|---|---|---|---|---|
| CONST | All | decision | 22 of the 27 constants are still blank in "product must rule?" (Appendix E). Which of them must product rule on? | Product Lead (Technical Lead and Security Lead for the rows pre-filled with their name) | Product, 2026-11-20: of the seven Product Lead rows, event types and notification events must be ruled on; the two description cuts carry over; roll-up, ICS redirects and creator rights follow F3, F1 and F7. The Technical and Security Lead rows are theirs to tick. | suggested |

### Service Operations Lead

[Service Operations Lead](https://github.com/alkem-io/organisation/blob/develop/vault/Model/Alkemio/Sub-circles/Delivery/Sub-circles/Operational%20Services/Roles/Service%20Operations%20Lead.md) · Delivery › Operational Services (Valentin) · 1 also involved

Nothing left: OQ3, where this role was involved, was decided on 2026-11-20 (see Decided).

### Architecture Lead

[Architecture Lead](https://github.com/alkem-io/organisation/blob/develop/vault/Model/Alkemio/Sub-circles/Delivery/Roles/Architecture%20Lead.md) · Delivery (Anton) · 1 to answer

**To answer**

| ID | Area | Type | Question | Owner | Proposed answer | State |
|---|---|---|---|---|---|---|
| F6 | Creating | contract | The server stores an event's three duration values (minutes, days, multi-day flag) as the client sends them and never checks that they agree. Keep trusting the client, or work them out on the server in the new core? | Architecture Lead | — | open |

### Decided

**Decided and moved to Rules**

| Was | Decision | Decided by | Now |
|---|---|---|---|
| Q-EVT-25 | The event stays when its creator's account is gone, and nobody inherits the creator's rights; space admins keep managing it. | Product, 2026-11-20 | EVT-25 |
| OQ3 | Europe/Amsterdam is the intended ICS time-zone hint for every customer. | Product, 2026-11-20 | EVT-18 |
| F1 | Downloading the ICS file keeps requiring sign-in; client-web spec 004 US3 scenario 4 (download from the email without signing in) is not adopted. | Product, 2026-11-20 | EVT-22 |
| Q-EVT-11 | An event shown on a parent calendar names its subspace, as asked in client-web#6876. | Product, 2026-11-20 | EVT-11 |
| F3 | A top-level space's calendar shows the events of its direct subspaces only; one level up is the product rule (as chosen in client-web#6876). | Product, 2026-11-20 | EVT-10 |

## Appendix

_The record behind sections 1 to 3. Decisions live in sections 1 and 3; nothing here overrides them._

### A. Exact behaviour and evidence per rule

_**Proof**: **proven** = a green legacy case asserts it · **untested** = code or spec only. Evidence paths are relative to the server repo unless prefixed `test ›`, `spec ›`, `matrix ›` or `register ›`._

| ID | Exact behaviour | Actors | Evidence | Proof |
|---|---|---|---|---|
| EVT-01 | Every space (L0, L1, L2) carries exactly one calendar on its collaboration's timeline, created with the space; collaboration templates carry none. The calendar and timeline are read through the space by anyone who may read the space. | all readers | code › `src/domain/collaboration/collaboration/collaboration.service.ts:94, 352-354` · `src/domain/timeline/timeline/timeline.service.ts:25-33` · `src/domain/timeline/calendar/calendar.service.ts:50-58` · test › every case reads `space.collaboration.timeline.calendar`; `journey/conversion/convert-L1-to-L0-basic` › `calendar events are preserved after conversion` | proven |
| EVT-02 | Creating an event on a calendar needs the create right on that calendar, which the space's admins hold (and platform content-full-access); members and leads only contribute (comments), and an outsider is refused. | space admin, PCFA | code › `src/domain/timeline/calendar/calendar.resolver.mutations.ts:42-47` · `src/domain/collaboration/collaboration/collaboration.service.authorization.ts:151-166, 260-294` · matrix › `access-matrix.md:2136-2199` · test › `calendar-event` › `should allow space admin to create calendar events`, `should not allow non-member to create calendar events` | proven (member refusal untested) |
| EVT-03 | An event has a title, optional description, location and tags, one of six types (event, deadline, meeting, milestone, training, other), a start instant, a whole-day flag, a multi-day flag, a duration in minutes (required), an optional duration in days, and a flag saying whether it shows on the parent calendar; all six types are accepted and echoed back. | space admin | code › `src/common/enums/calendar.event.type.ts:3-10` · `src/domain/timeline/event/dto/event.dto.create.ts` · `schema.graphql:2019-2060` · test › `calendar-event` › `Create` (3 cases), `Event Types` (6 rows), `Edge Cases` (4) | proven |
| EVT-04 | An event's name identifier is unique within its calendar: a supplied one that is already taken is refused with "Unable to create CalendarEvent: the provided nameID is already taken: <nameID>"; otherwise one is derived from the title avoiding the taken ones. | space admin | code › `src/domain/timeline/calendar/calendar.service.ts:140-155` · `src/services/infrastructure/naming/naming.service.ts:99-111` | untested |
| EVT-05 | Every event gets its own comments room (Matrix, type calendar-event, named after the event's nameID); if the event cannot be saved the room is deleted again, and deleting the event deletes the room. | server | code › `src/domain/timeline/event/event.service.ts:64-92, 94-114, 133-137` | untested |
| EVT-06 | The creator is recorded on the event and may read, update and delete it regardless of role — but holds no extra rights over the event's comments room (members' messages are not theirs to delete). | creator | code › `src/domain/timeline/event/event.service.authorization.ts:46-76, 88-125` · `src/common/constants/authorization/credential.rule.constants.ts:84-85` · matrix › `access-matrix.md:2170-2171` (`creator-member@L1` D on create/update/delete) · crosscheck › `access-matrix-crosscheck.md:52` | untested (covered by the access matrix cells) |
| EVT-07 | Creating an event writes an activity entry (calendar-event-created, on the space's collaboration), reports a contribution to analytics, and notifies the space community — everyone with receive-notifications on the space except the creator — by email, in-app and push under the setting `space.communityCalendarEvents`. | space members | code › `calendar.resolver.mutations.ts:63-85` · `src/services/adapters/activity-adapter/activity.adapter.ts:195-215` · `src/services/adapters/notification-adapter/notification.space.adapter.ts:365-440` · `src/services/api/notification-recipients/notification.recipients.service.ts:542-544, 718-721` | untested (the setting toggle alone is covered by `push-notifications-settings`) |
| EVT-08 | A comment posted on an event notifies the event's creator only (same setting key), and never the commenter themself. | creator | code › `src/services/event-handlers/internal/message-inbox/message.notification.service.ts:141-151` · `notification.space.adapter.ts:458-520` · `notification.recipients.service.ts:723-731` · spec › `server/specs/015-timeline-comment-notification/spec.md` | untested |
| EVT-09 | A calendar's event list is readable by anyone who may read the calendar and contains the calendar's own events the reader may read, each with its title, dates and flags. | all readers | code › `src/domain/timeline/calendar/calendar.resolver.fields.ts:43-66` · `calendar.service.ts:171-197, 218-227` · test › `calendar-event` › `should query calendar events for a space` | proven |
| EVT-10 | When the space setting "allow events from subspaces" is on (the default in every platform template), the calendar of a top-level space also lists the events of its direct subspaces (L1) that are flagged visible-on-parent; sub-subspace (L2) events never roll up, and an L1 calendar never shows its L2 children's events. | all readers | code › `calendar.service.ts:95-126` · `calendar.resolver.fields.ts:57-64` · `src/core/bootstrap/platform-template-definitions/default-templates/*.ts` (`allowEventsFromSubspaces: true`) · `src/domain/space/space.settings/space.settings.collaboration.interface.ts:27-29` | untested (see F3) |
| EVT-11 | An event reports the subspace it belongs to (so a parent calendar can label it); an event on a top-level space's own calendar reports none. | all readers | code › `src/domain/timeline/event/event.resolver.fields.ts:83-90` · `event.service.ts:265-282` · `schema.graphql:2048-2051` | untested |
| EVT-12 | A single event is readable by id by anyone with read on it; once deleted it can no longer be looked up. | all readers | code › `src/services/api/lookup/lookup.resolver.fields.ts:517-533` · test › `calendar-event` › `should query a single calendar event by ID`, `should delete a calendar event` (read-back) | proven |
| EVT-13 | Updating an event needs the update right (space admins, the creator, PCFA). Start, whole-day, multi-day, duration minutes and duration days are always replaced by the submitted values — a zero persists, so shrinking a multi-day whole-day event to a single day sticks and a title-only edit leaves the dates untouched; type and visible-on-parent change only when supplied; renaming the title renames the comments room. | space admin, creator | code › `src/domain/timeline/event/event.resolver.mutations.ts:41-54` · `event.service.ts:162-217` · spec › `agents-hq/specs/023-wholeday-calendar-timezone/spec.md` FR-012 · test › `calendar-event` › `should update a calendar event`; `calendar-event-wholeday-timezone` › `D2: narrowing a 4-day whole-day event to a single day persists`, `E5: a title-only edit leaves a timed event duration and start untouched` | proven |
| EVT-14 | Deleting an event needs the delete right (space admins, the creator, PCFA); it removes the event, its profile, its policy and its comments room, and answers with the deleted id. | space admin, creator | code › `event.resolver.mutations.ts:23-36` · `event.service.ts:120-144` · test › `calendar-event` › `should delete a calendar event` | proven (cascade of profile/room untested) |
| EVT-15 | Deleting a space deletes its timeline, calendar and every event with their rooms. | space admin | code › `collaboration.service.ts:352-354` · `timeline.service.ts:35-48` · `calendar.service.ts:60-77` | untested |
| EVT-16 | Rights on events are re-derived from the space on every authorization reset: the calendar inherits the collaboration's policy plus the contributors rule, each event inherits the calendar plus its creator rule, and each comments room inherits the event (before the creator rule) plus the contributors' message/reply/react rights. | server | code › `collaboration.service.authorization.ts:151-166` · `src/domain/timeline/timeline/timeline.service.authorization.ts:101-135` · `src/domain/timeline/calendar/calendar.service.authorization.ts:18-59` · `event.service.authorization.ts:27-86` · matrix › `access-matrix.md:445-512, 2136-2199` | untested (cells proven by the access matrix engine run, not by a suite) |
| EVT-17 | A whole-day event is a bare calendar date: its start is UTC-midnight of the picked date, its duration in minutes is the end−start day offset (a single-day event is 0), and every export — ICS `DTSTART;VALUE=DATE`, the Google link, the Outlook link (`allday=true`) — carries that date with an exclusive end one UTC day after the last covered day, exact across year boundaries and DST changes. | all readers | code › `src/domain/timeline/event/calendar.event.calendar-links.ts:67-91, 212-242` · spec › `agents-hq/specs/023-wholeday-calendar-timezone/spec.md`; `agents-hq/docs/decisions/0001-wholeday-calendar-utc-midnight-contract.md` · test › `calendar-event-wholeday-timezone` › `A` (2), `B1`, `B2`, `B3`, `C1` | proven |
| EVT-18 | A timed event exports as a real UTC instant (`DTSTART:YYYYMMDDTHHMMSSZ`, end = start + duration minutes) with an `X-WR-TIMEZONE: Europe/Amsterdam` hint, never as a bare date. | all readers | code › `calendar.event.calendar-links.ts:93-103, 119, 203-204, 235-242` · test › `calendar-event-wholeday-timezone` › `E1: a timed event still exports a real UTC instant, not a DATE` | proven (the timezone hint is untested) |
| EVT-19 | An event's dates are validated only when its links or ICS are read: a timed event must end strictly after it starts, a whole-day event may start and end on the same instant; a failing event answers "Invalid calendar event date range" (and malformed dates "Invalid calendar event date format") on every read of its link fields and on ICS download — creation and update themselves accept any values. | all readers | code › `calendar.event.calendar-links.ts:244-336` · `event.resolver.fields.ts:130-146` · `src/services/api-rest/calendar-event-ics/calendar-event-ics.service.ts:52-62` · test › `calendar-event-wholeday-timezone` › `B1` (whole-day start === end accepted) | untested (see F4; only "a whole-day event may start and end on the same instant" is asserted, by B1) |
| EVT-20 | Every event offers a Google Calendar link (`calendar.google.com/calendar/render?action=TEMPLATE…`) and an Outlook link (`outlook.office.com/calendar/deeplink/compose…`) carrying the title, the description as plain text (markdown stripped, cut at 1,000 characters), and the location as the joined address parts (address lines, city, state, postal code, country); events with no description or location still get links. | all readers | code › `calendar.event.calendar-links.ts:26-50, 338-353` · `event.resolver.fields.ts:92-168` · test › `calendar-event` › `Add to Calendar URLs` (5 cases), `Edge Cases` (4) | proven (markdown stripping and the 1,000-character cut untested) |
| EVT-21 | The ICS download (`/rest/calendar/event/<id>/ics`) is an RFC 5545 file: `text/calendar`, attachment named `<nameID>.ics`, not cached, one VEVENT with `UID <id>@alkem.io`, summary, plain-text description cut at 8,000 characters, location, the event's page URL, text escaped and lines folded at 75 octets. | all readers | code › `calendar-event-ics.controller.ts:40-48` · `calendar-event-ics.service.ts:33-99` · `calendar.event.calendar-links.ts:106-201` · test › `calendar-event-wholeday-timezone` › `A`, `B1`, `B2`, `B3`, `C1`, `D2`, `E1` (status 200, DTSTART/DTEND) | proven for status and dates; headers, UID, escaping, folding and the 8,000 cut are the 7 todo cases |
| EVT-22 | Downloading the ICS needs a signed-in actor (browser session cookie or API bearer token) with read on the event: a visitor is sent to `/login?returnUrl=…`, a signed-in actor without read to `/restricted?returnUrl=<event page>`. | registered, anonymous | code › `calendar-event-ics.controller.ts:25-38` · `calendar-event-ics.redirect.filter.ts:8-44` · `src/core/authorization/rest.guard.ts` · test › `calendar-event` › `should redirect when accessed with Bearer token` [skip], todo `should allow unauthenticated ICS download (spec: User Story 3)`, todo `should allow authenticated ICS download with session cookie` | untested (see F1, F2: the cases are skipped or todo) |
| EVT-23 | Events stay with their space through every same-L0 conversion and cross-L0 move. | space admin | test › `journey/conversion/convert-L1-to-L0-basic` › `calendar events are preserved after conversion`; `convert-L2-to-L1`, `convert-L1-to-L0-with-L2-to-L1` (2), `move-L1-to-L0-rooms`, `move-L1-to-L2-rooms`, `move-L2-to-L1-rooms` › `calendar events are preserved …` | proven |
| EVT-24 | A creator who has left the community keeps the right to update and delete the events they created. | former member | matrix › `access-matrix.md:2171` (`creator-former-member` D on create/update/delete) · code › `event.service.authorization.ts:100-115` | untested (see F7; access matrix cell only) |
| EVT-25 | When the creator's account no longer exists the event still shows (creator resolves to nobody) and nobody inherits the creator rights. | all readers | code › `event.resolver.fields.ts:39-64` · `event.entity.ts:14-22` (TODO server#4529) | untested (see F8) |

### B. Rights: evidence

The evidence text below uses the shorthands of the former table. Its legend:

_Role shorthands: **PLM** = Platform License Manager · **PCFA** = Platform Content Full Access · **PSA** = Platform Settings Admin · **POA** = Platform Operations Admin · **PRA** = Platform Resource Admin · **support** = Platform Support · **account holder** = the user whose account it is, or an admin of the organisation that owns it. Y = may, N = refused, – = not applicable. The evidence line under the table says where each cell comes from._

Evidence: `calendar.resolver.mutations.ts:42-47` (CREATE on the calendar); `event.resolver.mutations.ts:29-34, 47-52` (UPDATE/DELETE on the event); `lookup.resolver.fields.ts:525-530`, `calendar.resolver.fields.ts:23-24, 43-44` (READ); `calendar-event-ics.controller.ts:34-38` + `calendar-event-ics.service.ts:42-47` (ICS: actor + READ); `event.service.authorization.ts:59-76, 100-115` (creator rule, comments excluded); access matrix `calendar-event` (`access-matrix.md:2136-2199`: space-admin@Ln C on create/delete/update/grant for its own level, `− create for space-admin@L1` on `calendar-event@L0`, `space-admin@L2` only contribute on `@L1`, members/leads C on contribute only, `creator-member@L1` and `creator-former-member` D on create/delete/update, platform-content-full-access CT on create/delete/update, everyone CTS on read under `pub-open`), `calendar-event@Ln/comments` (`:445-512`: contribute → create-message/reply/reaction for members and leads); crosscheck rows `access-matrix-crosscheck.md:52, 234`. Private-space read cells follow the space's own READ (journey area); the notification rows follow `notification.recipients.service.ts:718-731`. The legacy suite exercises only the harness admin, `space.admin` and `non.space`; every other cell is matrix-only.

### C. Findings and questions in full

_The original text of every finding (F) and open question (OQ), with its evidence. Where this text says "finding 3" or "F-3", section 3 says F3._

#### Findings

- **F1 — Anonymous ICS download (EVT-22).** Code: the REST endpoint redirects a visitor to `/login` and a signed-in actor without read to `/restricted`. Test: two todo cases say "Per spec (User Story 3): unauthenticated users should be able to download .ics files". Spec: 023 is silent; the originating spec (#5860 era) is not in the repo. Ruling: is the ICS file public for public spaces (then the redirect is a defect) or authenticated-only (then the todos are wrong)?
- **F2 — Stale "Bearer not accepted" annotation (EVT-21/22).** Code: `RestGuard` accepts cookie session, non-interactive login and Hydra bearer (FR-025 comment). Test: `calendar-event.it-spec.ts` skips one case and parks 7 todos claiming Bearer gets a 302, while `calendar-event-wholeday-timezone.it-spec.ts` downloads with Bearer as `space.admin` and gets 200 with the right dates. Ruling: un-park the 7 ICS todos (content type, structure, location, markdown strip, VALUE=DATE, datetime) — they are runnable today.
- **F3 — Roll-up depth (EVT-10).** Code: only `level = L1` children of the queried space roll up, so an L0 shows its L1 events and nothing else, and an L1 calendar never shows L2 events; the comment says how to widen it. Schema/setting text: "events from Subspaces are visible on this Space calendar". Test: none (the only list case reads own events). Ruling: is one level the product rule?
- **F4 — Dates validated on read, not on write (EVT-19).** Code: a timed event with `durationMinutes 0` (or a start after its end) is created and updated without complaint; every subsequent read of its link fields or ICS fails with "Invalid calendar event date range" (and the create mutation's own response errors when the client selects the link fields, which is how B1's "broke creation outright" was observed). Spec 023 only says what to accept. Ruling: validate at write and treat the read-time check as a safety net.
- **F5 — `Calendar.event(ID)` has no per-event read check (EVT-12).** Code: the field guards READ on the calendar and returns the event; `Calendar.events` and `lookup.calendarEvent` check READ on the event. Harmless while every event's policy is a superset of its calendar's, but inconsistent. Ruling: align or drop the field.
- **F6 — Duration triple is caller-asserted (EVT-03/13).** Code stores `durationMinutes`, `durationDays` and `multipleDays` as sent; nothing checks that days × 1440 = minutes or that multipleDays matches. Spec 023 FR-003/FR-011 make the client derive them. Test C1 pins "durationDays is derived and must never be added on top". Ruling: accept client-derived, or derive server-side in the new core.
- **F7 — Creator rights outlive membership (EVT-24).** Matrix: `creator-former-member` keeps create/update/delete on the event. Code: the rule is keyed on `user-self-management:<createdBy>` with no membership condition. Spec: none. Ruling: intended?
- **F8 — Dangling creator (EVT-25).** `createdBy` is a bare uuid with a TODO (server#4529); deleting the user leaves the id and the creator rule. `createdBy` resolves to null. Ruling: cosmetic, or clear on user deletion?

#### Open questions

- **OQ1 — Which spec the ICS todos cite.** "spec: User Story 3" and "FR-005 — .ics files must be RFC 5545 compliant" refer to a feature spec that is in neither the server `specs/` nor agents-hq `specs/` (PR #5860 era). Find it (PR body or Zenhub) before ruling finding 1.
- **OQ2 — Live state of the empty timeline/calendar policies.** Crosscheck F3 counts 247 timeline/calendar rows with an empty rule list on ACC; whether they are orphans or live calendars that deny everyone needs the register's id-level probe, not code.
- **OQ3 — Is `Europe/Amsterdam` the intended ICS timezone hint for every tenant?** Hard-coded; no spec. Product/ops.
- **OQ4 — The notification payload's date handling.** 023 names it as the third date-range consumer; the adapter file was not found at the expected path and was not read. Confirm it shares `validateCalendarDateRange` (then finding 4 applies there too).

### D. Test gaps

_For the Quality Lead. The GAPS row in section 3 asks which of these get a case._

Untested rules by id: EVT-05, EVT-06, EVT-07, EVT-08, EVT-15, EVT-16; plus the untested clauses of EVT-02 (a member is refused), EVT-14 (profile and room really gone), EVT-18 (`X-WR-TIMEZONE`), EVT-20 (markdown stripped, 1,000-character cut), EVT-21 (the 7 todo ICS cases) and the whole of EVT-10, EVT-11, EVT-19, EVT-22, EVT-24, EVT-25.

Behaviours the area has that neither reading nor tests pinned down:
- Subspace events rolling up onto the parent calendar (setting on/off, flag on/off, L2 never) and the `subspace` label on a rolled-up event.
- Reading a private space's calendar as a non-member (refused) and as anonymous on a public space (allowed).
- The creator updating/deleting their own event as a plain member; a member updating another's event (refused).
- Notifications on event creation (audience, creator excluded, setting off) and on a comment (creator only, not the commenter).
- The activity-log entry for an event.
- nameID collision on create; the derived nameID.
- ICS redirects (anonymous → login, no read → restricted) and the ICS headers/body (todos).
- Date-range errors on a bad event; malformed date input.
- Space deletion cascading to events and their Matrix rooms.
- Event comments room: rename on title change; members can post, creator cannot delete others' messages.

### E. Constants the rules depend on

_"Rules on it" is pre-filled with the role whose domain covers the value: Product Lead for business values, plan constants and user-facing copy; Technical Lead for engineering limits and wire shapes; Security Lead for security limits. The "product must rule?" column is unchanged: the reviewer ticks the rows product must rule on. An entry such as F-3 in that column is finding F3._

| Constant | Value today | Source | product must rule? | Rules on it |
|---|---|---|---|---|
| Event types (6) | `event`, `deadline`, `meeting`, `milestone`, `training`, `other` | `src/common/enums/calendar.event.type.ts:3-10` | yes (Product, 2026-11-20) | Product Lead |
| Required fields on create | type, startDate, wholeDay, multipleDays, durationMinutes, visibleOnParentCalendar (+ profile displayName); optional durationDays, tags, nameID | `event.dto.create.ts` | | Technical Lead |
| Required fields on every update | startDate, wholeDay, multipleDays, durationMinutes (type, durationDays, visibleOnParentCalendar optional) — a title-only edit is not expressible | `event.dto.update.ts:14-54` | F-6 | Technical Lead |
| Whole-day wire convention | start = UTC-midnight `YYYY-MM-DDT00:00:00.000Z`; durationMinutes = (end − start) in minutes, 0 for one day; export end = last covered day + 1 (exclusive) | ADR 0001; `calendar.event.calendar-links.ts:67-91`; `event.dto.create.ts:36-39` | | Technical Lead |
| Timed end | start + durationMinutes; `durationDays` is never added on top | `calendar.event.calendar-links.ts:235-242` | | Technical Lead |
| Date-range rule | refuse when start > end, or start == end on a timed event; evaluated on read only | `calendar.event.calendar-links.ts:307-336` | F-4 | Technical Lead |
| Accepted date format | ISO-8601 `YYYY-MM-DDTHH:mm:ss(.sss)Z` | `calendar.event.calendar-links.ts:304-305` | | Technical Lead |
| Subspace roll-up | setting `collaboration.allowEventsFromSubspaces`, default `true` in all 4 platform templates; depth = direct L1 children of an L0 only; per-event flag `visibleOnParentCalendar` | templates; `calendar.service.ts:95-126` | decided (F3) (Product, 2026-11-20) | Product Lead |
| Google link | `https://calendar.google.com/calendar/render?action=TEMPLATE&text=&dates=&details=&location=` (`dates=YYYYMMDD/YYYYMMDD` whole-day, `…THHMMSSZ/…` timed) | `calendar.event.calendar-links.ts:46` | | Technical Lead |
| Outlook link | `https://outlook.office.com/calendar/deeplink/compose?subject=&startdt=&enddt=&body=&location=` + `&allday=true` for whole-day (`YYYY-MM-DD` dates) | `calendar.event.calendar-links.ts:47` | | Technical Lead |
| Description cut in links | 1,000 characters of plain text (markdown stripped) | `calendar.event.calendar-links.ts:7, 31-33` | no (Product, 2026-11-20) | Product Lead |
| Description cut in ICS | 8,000 characters | `calendar.event.calendar-links.ts:8, 111-113` | no (Product, 2026-11-20) | Product Lead |
| ICS path | `<cluster><path_api_private_rest>/calendar/event/<id>/ics`; route `rest/calendar/event/:id/ics` | `url.generator.service.ts:1291-1296`; `rest.endpoint.ts:6` | | Technical Lead |
| ICS headers | `Content-Type: text/calendar; charset=utf-8`; `Content-Disposition: attachment; filename="<nameID>.ics"`; `Cache-Control: no-store` | `calendar-event-ics.controller.ts:43-47` | | Technical Lead |
| ICS body | `VERSION:2.0`, `PRODID:-//Alkemio//Calendar Event//EN`, `X-WR-TIMEZONE:Europe/Amsterdam`, `UID:<id>@alkem.io`, `DTSTAMP`, DTSTART/DTEND (`;VALUE=DATE` for whole-day), SUMMARY, DESCRIPTION (if any), LOCATION (if any), URL; CRLF; fold at 75 octets | `calendar.event.calendar-links.ts:106-178` | | Technical Lead |
| ICS escaping | `\` → `\\`, newline → `\n`, `;` → `\;`, `,` → `\,` | `calendar.event.calendar-links.ts:138-144` | | Technical Lead |
| ICS auth strategies | cookie session, non-interactive login (non-prod), Hydra bearer | `rest.guard.ts` | | Security Lead |
| ICS redirects | no actor → `302 /login?returnUrl=<request url>`; no READ → `302 /restricted?returnUrl=<event page path>` | `calendar-event-ics.controller.ts:34-38`; `calendar-event-ics.redirect.filter.ts:29-43` | decided (F1) (Product, 2026-11-20) | Product Lead |
| Location format | `addressLine1, addressLine2, city, stateOrProvince, postalCode, country` (blank parts dropped) | `calendar.event.calendar-links.ts:338-353` | | Technical Lead |
| Comments room | type `calendar-event`, name `calendarEvent-comments-<nameID>` (renamed on title change) | `event.service.ts:64-67, 187-191` | | Technical Lead |
| Creator rule | `credentialRule-calendarEventCreatedBy`: CREATE, READ, UPDATE, DELETE for `user-self-management:<createdBy>` on the event only | `event.service.authorization.ts:100-115`; `credential.rule.constants.ts:84-85` | change decided (F7) (Product, 2026-11-20) | Product Lead |
| Notification events | `SPACE_COMMUNITY_CALENDAR_EVENT_CREATED` (space audience with RECEIVE_NOTIFICATIONS, creator excluded; in-app category SPACE_MEMBER), `SPACE_COMMUNITY_CALENDAR_EVENT_COMMENT` (creator only); both under setting `space.communityCalendarEvents` | `notification.space.adapter.ts:365-440, 458-520`; `notification.recipients.service.ts:542-544, 718-731` | yes (Product, 2026-11-20) | Product Lead |
| Activity | `CALENDAR_EVENT_CREATED`, description `[<title>] - <description chars 1..100>`, parent = calendar | `activity.adapter.ts:195-215` | | Technical Lead |
| Error text — nameID taken | `Unable to create CalendarEvent: the provided nameID is already taken: <nameID>` | `calendar.service.ts:145-147` | | Technical Lead |
| Error texts — dates | `Invalid calendar event date format`, `Invalid calendar event date`, `Invalid calendar event date range` (details carry field/eventId/dates) | `calendar.event.calendar-links.ts:248-335` | | Technical Lead |
| Error texts — not found | `Calendar not found: <id>`, `Not able to locate calendarEvent with the specified ID: <id>`, `Event not found in Calendar` | `calendar.service.ts:88-90, 207-212`; `event.service.ts:155-158` | | Technical Lead |
| GraphQL surface | `Timeline.calendar`, `Calendar{event(ID), events}`, `CalendarEvent{type, startDate, wholeDay, multipleDays, durationMinutes, durationDays, visibleOnParentCalendar, subspace, createdBy, comments, profile, googleCalendarUrl, outlookCalendarUrl, icsDownloadUrl}`, `lookup.calendarEvent`, mutations `createEventOnCalendar`, `updateCalendarEvent`, `deleteCalendarEvent`; REST `GET /rest/calendar/event/:id/ics` | `schema.graphql:2001-2060, 7678-7686`; `calendar-event-ics.controller.ts` | | Technical Lead |

### F. Where this lands in the new core

Per the rebuild briefing (`plan.md` § 1, catalogue), the calendar is a child of the space document: events become rows owned by the space with the creator as an ordinary row fact (the matrix already treats `createdBy` grants as per-row, `access-matrix.md:2563`), rights resolved at read time from the space's membership instead of a stored policy per event, calendar and timeline (which removes the 247 empty-policy rows of crosscheck F3 as a class). The whole-day contract (EVT-17) is a data-shape convention recorded in ADR 0001 and must be carried into the new schema as-is — ideally as a real date column for whole-day events rather than a UTC-midnight instant. Three facts here should shape the model: (1) the roll-up is one level deep and L0-only today (EVT-10, F-3) — the new core should decide depth explicitly; (2) date validation lives only on read (EVT-19, F-4) — move it to write; (3) the ICS endpoint is a session-authenticated REST read with redirect semantics (EVT-22) — decide anonymous access before porting. Error texts and link formats are rebaseline rows, not rules.

### G. How this file was made

Extracted 2026-11-06 from three sources: server develop @ `eeecf9ddb` (Release/79) code + `schema.graphql`; the legacy server-api suite (`server-api/src/functional-api/calendar/`, 2 files, 43 cases — 33 run, 1 skipped, 9 todo); the specs, issues and docs listed in § Sources. Scope: the timeline/calendar every space carries, its events (create, read, update, delete), whole-day and timed date rules, the Google/Outlook/ICS exports, subspace events rolling up, who may act, and the notifications and activity an event produces. Membership, rooms (beyond the event's own comments) and notification delivery mechanics are their own areas. WHAT and WHY only — no mutations, fixtures or request params. Evidence paths are relative to the server repo unless prefixed `test ›` or `spec ›`. The fact base with every file:line is `calendar-dossier.md` beside this file.

2026-11-19 converted to the three-section layout.

2026-11-19 whys pass: every rule has at least one why, sourced where a spec, issue or code line states it and marked _(draft)_ where QA wrote it. Restating whys with no source were dropped where a sourced one remains. The two client-web issues behind PRs #4687 and #5860 (client-web#6876, #9330) and the client-web spec they link were added as sources; they answer OQ1, Q-EVT-04 and Q-EVT-11 and suggest an answer for F3.

#### Sources

Server code (worktree `w1-access-matrix/server` @ `eeecf9ddb`):
- `src/domain/timeline/timeline/timeline.service.ts`, `timeline.service.authorization.ts`, `timeline.resolver.fields.ts`
- `src/domain/timeline/calendar/calendar.service.ts`, `calendar.resolver.mutations.ts`, `calendar.resolver.fields.ts`, `calendar.service.authorization.ts`, `dto/calendar.dto.create.event.ts`
- `src/domain/timeline/event/event.entity.ts`, `event.service.ts`, `event.resolver.mutations.ts`, `event.resolver.fields.ts`, `event.service.authorization.ts`, `calendar.event.calendar-links.ts`, `calendar.event.calendar-links.wholeday-tz.harness.spec.ts`, `dto/event.dto.create.ts`, `dto/event.dto.update.ts`
- `src/services/api-rest/calendar-event-ics/calendar-event-ics.controller.ts`, `calendar-event-ics.service.ts`, `calendar-event-ics.redirect.filter.ts`; `src/core/authorization/rest.guard.ts`; `src/common/enums/rest.endpoint.ts`
- `src/common/enums/calendar.event.type.ts`; `src/common/constants/authorization/credential.rule.constants.ts`
- `src/domain/collaboration/collaboration/collaboration.service.ts`, `collaboration.service.authorization.ts`
- `src/domain/space/space.settings/space.settings.collaboration.interface.ts`; `src/core/bootstrap/platform-template-definitions/default-templates/*.ts`
- `src/services/adapters/notification-adapter/notification.space.adapter.ts`; `src/services/api/notification-recipients/notification.recipients.service.ts`; `src/services/event-handlers/internal/message-inbox/message.notification.service.ts`; `src/services/adapters/activity-adapter/activity.adapter.ts`
- `src/services/infrastructure/url-generator/url.generator.service.ts`; `src/services/infrastructure/naming/naming.service.ts`; `src/services/api/lookup/lookup.resolver.fields.ts`
- `schema.graphql`
- git: `5b991ba8a` (#4687), `d725aebdb` (#5860), `1a3a569ff` (#5946), `c879f0e52` (#6284 / workspace#023)

Tests (worktree `w1-access-matrix/test-suites`):
- `server-api/src/functional-api/calendar/calendar-event.it-spec.ts`, `calendar-event-wholeday-timezone.it-spec.ts`, `calendar.request.params.ts`
- `docs/qa/server-rebuild/knowledge/access-matrix.md` (§ calendar-event, § room comments), `access-matrix-crosscheck.md` (rows 52, 62/F3, 234, 281)
- Other suites touching the area (list only): see dossier § 2

Specs / issues:
- `agents-hq/specs/023-wholeday-calendar-timezone/spec.md`; `agents-hq/docs/decisions/0001-wholeday-calendar-utc-midnight-contract.md`
- server `specs/015-timeline-comment-notification/spec.md`; `specs/061-ut-domain-timeline/spec.md` (unit-test scope only)
- server#6267 (bug), #6271, #6279 (whole-day); #4529 (createdBy TODO); PRs #4687, #5860, #5946, #6284
- client-web#6876 (subspace events on the parent calendar, behind PR #4687); client-web#9330 (add to personal calendar, behind PR #5860); client-web `specs/004-add-to-calendar/spec.md` on branch `4-add-to-calendar`
