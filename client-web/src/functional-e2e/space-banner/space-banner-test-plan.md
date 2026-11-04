# Test plan — Default space banner behaviour (10178)

> **Status:** Approved — by the QA lead, in-session, 2026-09-02 · **Depth:** light — forced by
> the QA lead; see *Residual risk* for why the evidence would otherwise have argued for deep ·
> **Story:** [client-web#10178](https://github.com/alkem-io/client-web/issues/10178)
> **Basis:** story ACs + the two merged diffs
> ([client-web#10222](https://github.com/alkem-io/client-web/pull/10222),
> [server#6439](https://github.com/alkem-io/server/pull/6439)). **No workspace spec exists** —
> every conclusion below is derived from the issue body and the diffs, nothing else.

A space with no uploaded banner now renders its gradient at **10:1** instead of 6:1, and can
never be given another shape; the crop slider opens on 10:1 (left) and runs to 6:1 (right); and
the banner upload floor drops from 1536×154 to **1200×120**, re-synced onto every existing
`visual` row by a data-only migration. `test-suites` had **zero** coverage of banners, visuals
or aspect ratios at any level before this work — the headline claim of this plan is therefore
a first floor under the area, not an extension of one.

## How to run

```bash
# API — new "visual" vitest project, plus the existing storage suite the
# upload helper lives in and the configuration project TC-03 sits inside
# (as a new file — never inside configuration.it-spec.ts, see below)
pnpm --filter @alkemio/test-suite-server-api run test:visual
pnpm --filter @alkemio/test-suite-server-api run test:storage
pnpm --filter @alkemio/test-suite-server-api run test:configuration

# E2E — Chrome branded channel only
cd client-web && pnpm exec playwright test src/functional-e2e/space-banner/
```

Prerequisites: `.env` in both packages (`ALKEMIO_SERVER`, `ALKEMIO_BASE_URL`,
`AUTH_TEST_HARNESS_PASSWORD`); `server-api` runs **serially**; the environment must have run
migration `1787600000000-LowerSpaceBannerMinWidth`.

## Risk

| # | Risk (in user terms) | Likelihood | Impact | Level | Drives |
|---|---|---|---|---|---|
| R1 | A space with no banner keeps the tall 6:1 gradient — the story's headline promise silently doesn't land, on the most-viewed surface in the product | Medium | Medium | **Medium** | TC-04, TC-06 |
| R2 | Admins still cannot upload a 1200–1535px banner, because the floor lives denormalised on each `visual` row and the migration did not reach that environment | Medium | High | **High** | TC-01, TC-02 |
| R3 | The mirrored slider inverts the shape — the admin picks "shorter" and gets taller, or the saved banner is not the shape shown | Low | Medium | Low-Med | TC-05 (unit-covered — see below) |
| R4 | An existing large banner changes size or gets letterboxed by the new default | Low | Medium | Low-Med | TC-05 (save half) |
| R5 | Subspaces don't inherit the parent's resolved shape (new `SubspaceVisuals.aspectRatio` field + mapper change) | Low-Med | Low-Med | Low | TC-06 |
| R6 | Screen-reader users hear the *mirror* of the ratio: the input's `aria-valuenow` is deliberately `min+max−ratio`, with the true value only in `aria-valuetext` | High (by design) | Low-Med | Low-Med | not automated — see gaps |
| R7 | The migration writes the wrong rows, or is not idempotent, or `bannerWide` is caught in it | Low | High | Med | **not reachable from this repo** |

Elevated-risk triggers present: **migration** (data-only, no DDL) · **cross-repo contract**
(the client clamps against `platform.configuration.defaultVisualTypeConstraints`, and mirrors
6/10 as local constants). Absent: breaking contract change, authorization/visibility,
infra/config, data-destructive, performance-sensitive path.

## Existing coverage before this work

Searched `origin/develop` @ `1c843208` across `server-api/src`, `client-web/src`, `lib/src`
(excluding generated), by entity (`Visual`, `BANNER`), operation (`uploadImageOnVisual`,
`defaultVisualTypeConstraints`), field (`aspectRatio`, `minWidth`) and user-visible copy
(`Space banner for`, `Aspect Ratio`).

| Area | State | Evidence |
|---|---|---|
| Banner / aspect-ratio behaviour, any level | **None.** `aspectRatio` has **0 hits** in `server-api/src` and `client-web/src/functional-e2e`. The single `visual(type: BANNER)` hit is an unrelated template preview visual | `lib/…/mutations/templates/createTemplate.graphql:35` |
| Visual upload, API | Exists but blind to shape: `storage/upload.params.ts::uploadImageOnVisual` + `uploads.it-spec.ts` cover file *types* and document auth. Its raw `UPLOAD_IMAGE_ON_VISUAL` selects `id name uri` only | `server-api/src/functional-api/storage/` |
| Visual read, API | `lib/…/queries/lookup/lookupProfileVisual.graphql` selects `id name uri authorization` — **no dimension fields**. Widening it is the prerequisite for TC-01 | `lib/src/scenario/graphql/queries/lookup/` |
| Platform configuration | `configuration.it-spec.ts` `toStrictEqual`s the whole config — but `full-configuration.graphql` is hand-written and **omits `defaultVisualTypeConstraints`**, so it is not evidence. ⚠ The file still carries a `test.only` | `server-api/src/functional-api/configuration/` |
| Space create / settings, E2E | `space/space-create.spec.ts`, `pages/CreateSpaceDialog.ts` assert the two "Upload … banner" buttons are *present*; **no spec ever uploads a file or opens the crop dialog** | `client-web/src/functional-e2e/space/` |
| Image cropping, E2E | **Reusable and working**: `chat-avatars/chat-avatars.helpers.ts::completeCrop` + `createPngFixture` drive the real crop dialog end to end (file chooser → drag → Save). `createPngFixture` is hard-coded 64×64 and needs width/height parameters | `client-web/src/functional-e2e/chat-avatars/` |
| Owning-repo unit suites | **Strong, and they close R3.** `client-web/src/crd/lib/bannerAspectRatio.test.ts` pins the no-image → 10 rule and the unclamped read path; `ImageCropDialog.slider.test.tsx` (98 new lines) pins the mirror arithmetic, the 10:1 open, `aria-valuetext`, and clamping. `server/…/visual.service.spec.ts` pins 1200/120; `1787600000000-…spec.ts` statically pins the migration SQL | opened, all four |
| ⚠ Not unit-covered | The `hasImage` gate in `useAboutTabData::cropConfig` (passes `aspectRatio: undefined` for a bannerless page banner) and `useCreateSpace::bannerCropAspectRatio`. Both are wiring seams between tested units | `useAboutTabData.classifications.test.tsx`, `useCreateSpace.test.ts` — neither mentions aspect ratio |

**Reuse: 2 of 8 scenarios needed no new test** (R3's slider mechanics and the migration's SQL
shape are both fully covered in the owning repos). **0 existing tests are invalidated** — no
executing test asserts a banner dimension, alt text, or constraint value.

**Documentation requiring update (no assertion, so not a test change):**
`client-web/src/functional-e2e/space/space-crud.spec.md:111` and `:522` still say
"Upload an image (1536x256 pixels recommended)".

## Scenario → test mapping

| Scenario | Covers | Automated by | Layer |
|---|---|---|---|
| TC-01 A space's BANNER visual reports minWidth 1200 / minHeight 120 | AC5, R2 | `server-api` › `visual/space-banner-constraints.it-spec.ts` › `TC-01 — BANNER visual reports minWidth 1200 / minHeight 120` | API |
| TC-02 1200×120 upload accepted; 1199×120 rejected (BVA) | AC5, R2 | `server-api` › `visual/space-banner-constraints.it-spec.ts` › `TC-02 — 1200×120 upload accepted; 1199×120 rejected` | API |
| TC-03 `defaultVisualTypeConstraints(BANNER)` = 1200/120/6/6/10 | AC4, AC5, R2, cross-repo contract | `server-api` › `configuration/banner-visual-constraints.it-spec.ts` › `TC-03 — defaultVisualTypeConstraints(BANNER) = 1200/120/6/6/10` | API |
| TC-04 Bannerless space renders the gradient at 10:1 | AC1, AC2, R1 | `client-web` › `space-banner/bannerless-space-gradient.spec.ts` › `TC-04 — bannerless space renders the gradient at 10:1` | E2E |
| TC-05 First-ever banner crop opens at 10:1 and saves that shape | AC2, AC4, R3, R4 | `client-web` › `space-banner/banner-crop-default-shape.spec.ts` › `TC-05 — first crop opens at 10:1 and saves that shape` | E2E |
| TC-06 Subspace of a bannerless L0 shows the same 10:1 gradient | AC1, R1, R5 | `client-web` › `space-banner/bannerless-space-gradient.spec.ts` › `TC-06 — subspace of a bannerless L0 shows the same 10:1 gradient` (colour-differs sub-check dropped — see note below) | E2E |
| Mirror arithmetic, `aria-valuetext`, clamping, no-image → 10 | AC1, AC4, R3 | **covered** — `client-web` › `ImageCropDialog.slider.test.tsx`, `bannerAspectRatio.test.ts` | unit (owning repo) |
| Migration SQL touches only banner rows, never `aspectRatio`/`uri`/`bannerWide` | R7 (shape only) | **covered** — `server` › `1787600000000-LowerSpaceBannerMinWidth.spec.ts` | unit (owning repo) |

### Regression guards

- **TC-04** pins the defect this story exists to fix: `resolveBannerAspectRatio` used to receive
  a bare number, so the server's row-creation default (`6` — stamped on every banner visual,
  chosen by nobody) reached the gradient. The fix passes the whole visual and ignores the
  stored ratio when `uri` is empty. TC-04 fails if that guard is ever removed.
- **TC-05's save half** guards R4: the banner `<img>` takes `width`/`height` *attributes* from
  `bannerPlaceholderSize`, never a CSS `aspect-ratio`, so the loaded image's intrinsic shape
  wins. A future change to a CSS ratio would crop real banners; TC-05 catches it.

### Implementation note — TC-06's colour sub-check dropped

The build sheet's TC-06 expected the subspace's gradient colour to *differ* from the L0's,
"keyed off the subspace id", as a belt-and-braces check distinguishing "correctly inherited the
shape" from "accidentally rendered the parent's banner". The shipped mapper
(`subspacePageDataMapper.ts::mapSubspaceBanner`) instead computes
`color: pickColorFromId(levelZeroSpaceId ?? levelZeroName)` — deliberately keyed off the **L0
root id**, per its own inline comment ("so the identical image would otherwise render at two
different colours depending on whether you are on the space or a subspace"). The colour
therefore *matches* the parent by design; asserting "differs" would fail against correct,
intentional behaviour. Dropped from the implemented test — the shape assertion, taken against
the subspace's own header component (`SubspaceHeader`, a different component from `SpaceHeader`),
already proves the shape was inherited rather than a stray render of the parent's banner.

## Not covered — known gaps

| Scenario | Why not automated | Where it belongs |
|---|---|---|
| Migration actually rewrote existing rows; is idempotent; `down()` restores 1536/154 | **No DB access from `test-suites`** (standing gap). The server's spec is static analysis of the SQL string — it proves the statement's *shape*, not that any row changed | **deferred** — `server` CI, alongside the existing `migration:validate` harness. R7 has no runtime cover anywhere today |
| A large pre-existing banner "continues showing as it is" (AC3) at pixel level | Needs a real production-shaped banner and a visual judgement; no visual-regression harness exists and building one is disproportionate to a Low-Med risk | **manual** — release-verification checklist, on ACC against migrated data |
| Slider `aria-valuenow` announces the mirror of the real ratio (R6) | No axe/`@axe-core/playwright` in the repo, and the trade-off is deliberate and documented in the PR. A test would pin current behaviour, not a requirement | **manual** — release checklist row: screen-reader pass over the banner crop slider. Escalate to Product if AT announces the inverse |
| The swapped `hintLeft`/`hintRight` copy in all 6 locales | Locale assertions belong next to the locale files (standing gap) | **deferred** — a `client-web` unit test |
| Client's local `MIN`/`MAX` (6/10) agree with the server's `minAspectRatio`/`maxAspectRatio` | No cross-repo contract harness. TC-03 pins the server half only | **deferred** — same blocker as 029 TC-21; the durable fix is the client consuming `Config`, which it already does at runtime |

**Residual risk.** The evidence supports **deep** — a migration *and* a cross-repo contract,
two triggers, two repos. Light was set explicitly by the QA lead and honoured: no exploratory
charters, one line per non-functional dimension. The cost of that choice is small and known:
deep would have added charters around re-cropping an existing banner and around mixed-shape
spaces, and a fuller a11y sweep. It would **not** have closed R7 — no depth of planning gives
this repo database access.

**What this plan genuinely proves, once built:** that the API publishes and enforces the 1200px
floor at its boundary, that a bannerless space and its subspaces render at 10:1, and that a
first crop opens on 10:1 and saves a banner the page then renders unchanged. **What it does
not prove:** that the migration changed a single existing row. AC5 — the story's own reason for
the server change — is covered only for spaces created *after* the deploy; for every
pre-existing space the promise rests on a migration this repo cannot observe and whose only
test asserts the text of its SQL.
