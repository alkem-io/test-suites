# Test plan — expanded subspace cards (076)

> **Status:** Implemented — persisted from the feature's live acceptance walks, then executed as
> spec files against an isolated stack built from the three feature branches: **24/24 passed**
> (2026-09-23, one pass, no retries) · **Depth:** standard — one additive setting, one new
> cross-scope rendering surface · **Story:**
> [client-web#10033](https://github.com/alkem-io/client-web/issues/10033) · **Spec:**
> `agents-hq/specs/076-expanded-subspace-cards/` · **Diffs:**
> [server#6533](https://github.com/alkem-io/server/pull/6533),
> [client-web#10335](https://github.com/alkem-io/client-web/pull/10335),
> [test-suites#640](https://github.com/alkem-io/test-suites/pull/640)

A Subspaces post gains an **"Expanded card"** switch. When on, the post renders one card per row:
the compact card's identity block plus the subspace's What / Why / Who as clamped markdown
excerpts. The excerpts are authored by the *subspace's* admins but render on the *host* space's
page, so the headline risk is cross-scope content injection (overlays, fetched images, a crash that
takes the host page down). The setting is stored as `settings.framing.spaces.cardVariant`
(`COMPACT` default, `EXPANDED`).

## How to run

```bash
pnpm install && pnpm --filter @alkemio/tests-lib run build
(cd server-api && pnpm exec vitest run src/functional-api/callout/spaces-collection)
(cd client-web && pnpm exec playwright test src/functional-e2e/subspaces-callout/)
```

Each walk file seeds its own public Space and subspaces through the API in `beforeAll` and deletes
them in `afterAll`; nothing pre-existing is assumed except the `admin@alkem.io` identity.

## Coverage map

| Area | Scenario | Spec |
|---|---|---|
| Setting — API round-trip | create EXPANDED; default COMPACT; partial update and `spaces: {}` keep the stored value; toggle; off-kind rejection (NONE, CONTRIBUTORS) proven by reason and by re-listing the callouts set | `server-api/.../spaces-collection/spaces-collection-card-variant.it-spec.ts` |
| US1 — rich cards | one per row, clamps 3/2/2; partial fields; all-empty falls back to the compact card; one link per card, keyboard; 3 then "Show more"; private-subspace exposure parity (API + anonymous browser); search narrowing | `us1-expanded-cards.spec.ts` |
| US2 — the switch | placement under Manual selection; publish on; edit both directions without reload; curated selection survives a variant flip; not offered for other attachments; legacy-shaped post reads compact and fetches no What/Who; title-only edit keeps the variant | `us2-expanded-card-switch.spec.ts` |
| US3 — content safety | images/iframes neither render nor fetch; fixed-position HTML not interpreted; headings/lists/tables flattened within the clamp; links inert; suppressed-only field counts as empty; 500-char token wraps; maximum-length fields clamp and the page stays responsive (elapsed time attached to the report); nested-emphasis payload renders without a page error | `us3-excerpt-safety.spec.ts` |
| US4 — narrow layout | 390 px stacks identity → excerpts → footer; arrangement follows the card's width, not the viewport (feed vs. detail dialog); resize across the threshold keeps "Show more" and search | `us4-narrow-layout.spec.ts` |

Unit-level coverage for the excerpt pipeline (length ceiling, nesting bound, linear image removal,
footnotes and form controls, per-section error boundary) lives in client-web next to
`src/crd/lib/markdownExcerpt.ts` and `src/crd/components/space/ExpandedSpaceCard.tsx`.

## Conventions these walks rely on

- **Wait for a card, not for the network.** Cards mount lazily (half a second in view, then the
  query); `networkidle` resolves before that. Use `gotoSpaceAndWaitForCards` from
  `subspaces-callout.helpers.ts`.
- **Address excerpts by `data-testid`** (`excerpt-what|why|who`). The identity block's tagline is a
  `.line-clamp-2` that precedes the panel, so clamp classes alone select the wrong element.
- **Find cards by their name heading** (`findArticleByName`): compact cards are wrapped in their
  link, expanded cards hold a stretched link inside, and only the heading is common to both.
- **Scope assertions to the post's own list** (`subspacesListOfPost`): the sidebar and older posts
  render links with the same subspace names.
- **Teardown must never swallow a failure** (`deleteFixtureTree`): these fixtures are public; a
  leaked tree stays visible on the shared stack.
- **US2 is the only authenticated walk** and turns trace/video capture off with a file-level
  `test.use` — a retried trace would embed the admin session cookie in the published report.

## Known gaps

- US2-AS6 needs direct Postgres access to strip the stored block, so it skips wherever
  `harnessPostgresConfigured()` is false — including the nightly pipeline.
- The walk files still duplicate their fixture plumbing (raw GraphQL client, space/subspace
  creation); only the DOM helpers and teardown are shared so far.
- Phone *styling* fidelity (FR-028) is a designer sign-off, not an automated check.
