# Product issues from the behaviour analysis

_Every decision taken while reviewing the knowledge files that changes what the server does today. Each one stays in its file's section 3 with the state **change decided**, and the rule keeps a **(defect: …)** marker, until the change ships. This list is the overview for the product board: one row per change, with the issue that tracks it, plus decisions product wants to track even though the behaviour stays (marked "track"). "To file" means no board issue exists yet._

| ID | File | Rule | Decision | Decided | Issue |
|---|---|---|---|---|---|
| CH-EVT-02 | `calendar.md` | EVT-02 | Members should be able to create calendar events, not only space admins. | Product, 2026-11-20 | [alkem-io/alkemio#2205](https://github.com/alkem-io/alkemio/issues/2205) (criterion "Should let members create calendar events") |
| F7 | `calendar.md` | EVT-24 | A creator's rights on an event end when they leave the community; space admins keep theirs. | Product, 2026-11-20 | To file |
| F1 | `roleset.md` | RS-04 | A lead, admin or owner must also hold the entry role (member or associate); enforce it on assignment and repair the existing data (67 space and 757 organisation credentials on acceptance). | Product, 2026-11-20 | To file |
| F7 | `roleset.md` | RS-77 | The code's limits (RS-02) are the one set of limits; the stored role definitions on acceptance are repaired to match them (VC caps, top-level spaces allowing 9 lead organisations). | Product, 2026-11-20 | To file |
| F8 (track) | `roleset.md` | RS-26, RS-37 | Behaviour stays: on a space a rejected application or declined invitation blocks a new one until an admin archives it; on an organisation a new one can follow at once. Tracked because the two differ. | Product, 2026-11-20 | To file |
| F10 (track) | `roleset.md` | RS-39, RS-50, RS-56 | Behaviour stays: when the lead slots fill before acceptance, a space silently accepts the invitee as member, while an organisation reports the withheld role. Tracked because the two differ (spec 062 SC-001 forbids silent downgrades on organisations). | Product, 2026-11-20 | To file |
