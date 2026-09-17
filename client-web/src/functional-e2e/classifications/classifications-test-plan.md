# Test plan — Space Classifications acceptance walks (024)

- **Story:** [alkem-io/alkemio#1985](https://github.com/alkem-io/alkemio/issues/1985) — *Classifications* (epic)
- **Workspace spec:** `specs/024-classifications/` in `alkem-io/agents-hq` (source of truth for FR/S/SC ids); the walked source is `specs/024-classifications/checklists/manual-acceptance-walk.md` (§ numbers below refer to it)
- **Product code:** `server` and `client-web` branches `feat/024-classifications` (`workspace#024-classifications`)
- **Suites:**
  - `classifications-space.spec.ts` (+ `space-lifecycle.helpers.ts`) — suite **SL**: Space-side entry lifecycle on the Default Space `/eco1`
  - `classifications-templates.spec.ts` (+ `templates-library.helpers.ts`) — suite **TL**: template library/pack/picker surfaces and snapshot independence

## How to run

Against a running app on the **same origin** as the API (traefik `:3000`, not the
`:3001` vite dev origin):

```bash
cd client-web
pnpm run test:classifications
```

The dedicated config (`config/playwright.config.classifications.ts`) pins
`workers: 1` and `fullyParallel: false` — **required**, both suites mutate the
same shared Space `/eco1`. Running these files through the default config is
blocked (`testIgnore`) precisely so a parallel run cannot race the shared state
or trip the leak sweeps mid-flight.

State safety on the shared stack: every artifact is prefixed `e2e024 SL` /
`e2e024 TL`, each scenario cleans up in `afterAll`, and each file ends with a
leak detector that sweeps both editor surfaces and fails loudly on leftovers.
The seeded SDGs platform template, pre-existing user entries, and the Space
Tags are never touched.

Personas: `admin@alkem.io` (editor, shared session fixture) and
`walker@alkem.io` (viewer — zero writes, suite-local session state).

## Scenario → test mapping

| Scenario | Covers | Automated by | Layer |
|---|---|---|---|
| Walk §2+§3 / S2+S3 | Step A add + Step B select roundtrip: immediate commit, authored order, persistence, sibling-safe deselect (FR-006a/002b/012a/012d) | `classifications-space.spec.ts` › SL-01 | UI |
| Walk §4 / S4 | Duplicate guard: server-side conflict dialog, pre-seeded retry, case/whitespace variants, alias persistence (FR-011a/b/c, FR-018b) | `classifications-space.spec.ts` › SL-02 | UI |
| Walk §7 / S7 | Single-select cardinality: radio semantics, replace-not-add, one-chip About display (FR-012) | `classifications-space.spec.ts` › SL-03 | UI |
| Walk §9 / S9 | About-page display: labelled groups, editor-only empty group, addition order, Tags untouched, viewer read-only (FR-018b/c, FR-013) | `classifications-space.spec.ts` › SL-04 | UI |
| Walk §8 / S8 | Show/hide toggle: settings persistence, editor badge vs viewer absence, reversible, FR-010d wording soft probe (FR-010b/d, FR-018d) | `classifications-space.spec.ts` › SL-05 | UI |
| Walk §10 / S10 | Removal gate: confirm names the entry + no-undo, cancel is a no-op, confirm destroys only the target (FR-014, FR-014b) | `classifications-space.spec.ts` › SL-06 | UI |
| Walk §12 (viewer half) | Viewer authorization negative: editor surfaces denied or read-only, no write affordances (read-only, zero cleanup) | `classifications-space.spec.ts` › SL-07 | UI |
| Walk §1 / S1 | Seeded library: SDGs present with the full 17-value authored sequence, no Language/Sector (rulings D3/D5/D6) | `classifications-templates.spec.ts` › TL-01 | UI |
| Walk §11 / S11 | Seed pack page: Classification templates section, deterministic chip band with +13 overflow, matching preview | `classifications-templates.spec.ts` › TL-02 | UI |
| Walk §2 (picker) / S5 | Picker contract: grouping, relative counts, name AND description search, no create path, cancel-is-noop | `classifications-templates.spec.ts` › TL-03 | UI |
| Walk §5 / S5 | Template CRUD + authoring: input guards, 0-values rejection, reorder + custom-id round-trip, card/preview contract, delete | `classifications-templates.spec.ts` › TL-04 | UI |
| Walk §6 / S6 | Snapshot independence, 5 stages: rename/add/delete of the source template never touches the entry; orphaned entry still writable (FR-009, FR-010a) | `classifications-templates.spec.ts` › TL-05 | UI |
| Walk §11 (import) | Library import: "Select from library" pulls platform SDGs into the Space library (diff-fenced deletion) | `classifications-templates.spec.ts` › TL-06 | UI |
| Walk §12 / D2+D4 | Out-of-scope negatives: no Explore chips/filter, value labels unsearchable (soft), no activity entries | `classifications-templates.spec.ts` › TL-07 | UI |

## Not covered — known gaps

| Scenario | Why not automated | Where it belongs |
|---|---|---|
| Walk §2 section *placement* (Classifications beside Tags, visual ordering within About) | Purely visual layout judgement — the suites assert presence/behaviour, not pixel placement | Manual QA (mockup comparison) |
| Walk §11 pack **create-dialog** walk | The create dialog inside the platform pack surface needs platform-admin pack mutation on the shared stack; TL-04 covers the identical form in the Space library instead | Manual QA on a disposable stack |
| Walk §13 i18n + keyboard navigation | Cross-cutting quality checks (translated strings, full keyboard traversal) are not automated in this area yet | Manual QA; candidate for a later a11y pass |
| Innovation Library type filter offers no "Classifications" entry | **Known product gap on this build** (`TemplateTypeFilter` ALL_TYPES omits classification) — recorded as a `known-gap` annotation in TL-01, not a failure | Un-annotate once the filter entry ships |
| /innovation-library gallery card badge band | Cards render the generic gradient header, no Multi-select badge — recorded as a `known-gap` annotation in TL-01 | Un-annotate once the badge band ships |
| Server API contract (mutations, auth, S-1…S-22 semantics) | This plan covers the UI acceptance walks; the GraphQL contract is exercised by the server repo's own integration specs this iteration | `server` `test/integration/` on `feat/024-classifications` |
