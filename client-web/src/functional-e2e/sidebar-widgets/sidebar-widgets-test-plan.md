# Sidebar widgets — test plan

Acceptance walks for workspace feature `040-sidebar-widget-config`
(`specs/040-sidebar-widget-config/spec.md`). Tagged `@forge-acceptance` —
these require a live stack (server + client-web + Postgres) and are run by
the verification track, not by the repo's default gate commands.

| Scenario     | Spec                            | Covers                                                                                                                                                                                                                |
| ------------ | ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| US1-AS1..AS4 | `us1-default-rendering.spec.ts` | Per-tab default widget set (FR-009) renders in order for a plain member across the four canonical tab positions, including the generic `[Add Post, Apply/Join, Intention&Leads, Post Index]` default for a 4th+/custom tab.                 |
| US1-AS5      | not automated                   | Missing/unknown stored `sidebar` entries — a manufactured direct-DB-edit condition outside this suite's raw-SQL-free UI-walk conventions; verified manually (see `spec.md` US1-AS5 and the forge evidence directory). |
| US2-AS1      | `us2-admin-config.spec.ts`      | Layout dialog lists the full, localized widget vocabulary (FR-001/FR-014) pre-filled with the current selection.                                                                                                      |
| US2-AS2      | `us2-admin-config.spec.ts`      | Deselecting a widget persists, drops its data fetch (FR fetch-parity), and leaves other tabs unchanged.                                                                                                               |
| US2-AS3      | `us2-admin-config.spec.ts`      | Adding + reordering a widget persists order; member view reflects the new position.                                                                                                                                   |
| US2-AS4      | `us2-admin-config.spec.ts`      | Deselecting every widget on a tab empties the sidebar (FR-016) without breaking the tab's main content.                                                                                                               |
| US2-AS5      | `us2-admin-config.spec.ts`      | Non-admin member API write is rejected; stored config unchanged.                                                                                                                                                      |
| US2-AS6      | `us2-admin-config.spec.ts`      | Sequenced sidebar-only and rename-only saves on the same state each leave the other field untouched (partial-update semantics).                                                                                       |
| US2-AS7      | `us2-admin-config.spec.ts`      | Invalid sidebar writes (duplicate, unknown widget, over max size) are rejected server-side; stored data unchanged.                                                                                                    |
