# Product issues from the behaviour analysis

_Product decisions from reviewing the knowledge files where product wants something other than today's behaviour, or wants to keep an eye on it. The files keep logging today's behaviour as the rule, so the new core's tests stay green; the wanted change lives here, one row per item, with the board issue that tracks it. "To file" means no board issue exists yet._

| ID | File | Rule | Decision | Decided | Issue |
|---|---|---|---|---|---|
| CH-EVT-02 (track) | `calendar.md` | EVT-02 | Behaviour stays: only space admins create events. Wanted: members can create calendar events too. | Product, 2026-11-20 | [alkem-io/alkemio#2205](https://github.com/alkem-io/alkemio/issues/2205) (criterion "Should let members create calendar events") |
| F7 (track) | `calendar.md` | EVT-24 | Behaviour stays: a creator keeps their rights after leaving. Wanted: a creator's rights on an event end when they leave the community; space admins keep theirs. | Product, 2026-11-20 | To file |
| F1 (track) | `roleset.md` | RS-04 | Behaviour stays: not enforced. Wanted: a lead, admin or owner must also hold the entry role (member or associate), enforced on assignment, with the existing data repaired (67 space and 757 organisation credentials on acceptance). | Product, 2026-11-20 | To file |
| F7 (track) | `roleset.md` | RS-77 | Behaviour stays: the stored limits are enforced. Wanted: the code's limits (RS-02) everywhere, with the stored role definitions on acceptance repaired (VC caps, top-level spaces allowing 9 lead organisations). | Product, 2026-11-20 | To file |
| F8 (track) | `roleset.md` | RS-26, RS-37 | Behaviour stays: on a space a rejected application or declined invitation blocks a new one until an admin archives it; on an organisation a new one can follow at once. Tracked because the two differ. | Product, 2026-11-20 | To file |
| F10 (track) | `roleset.md` | RS-39, RS-50, RS-56 | Behaviour stays: when the lead slots fill before acceptance, a space silently accepts the invitee as member, while an organisation reports the withheld role. Tracked because the two differ (spec 062 SC-001 forbids silent downgrades on organisations). | Product, 2026-11-20 | To file |
| F11 (track) | `roleset.md` | RS-54 | Behaviour stays: the creator of an organisation becomes associate and admin, not owner. Wanted: make the creator owner and repair the organisations without one (126 on acceptance). | Product, 2026-11-20 | To file |
