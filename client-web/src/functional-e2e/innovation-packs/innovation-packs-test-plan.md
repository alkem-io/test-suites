# Test plan — innovation packs: create, edit, delete in Administration (W2 journey 12, part 2)

> **Status:** Built 2026-11-12, uncommitted (branch `qa/w2-journey-12`) · **Depth:** Standard (cross-repo contract: the pack, its profile and tagset, its store listing and search visibility are shapes the rebuild replaces), capped at the journey: 3 cases · **Source:** `docs/qa/server-rebuild/plan.md` § W2, journey 12; client-net audit rows K2 (packs) and L6 (hubs/packs admin, packs half); issue alkem-io/test-suites#721

The audit rated K2 and L6 ABSENT: packs are only ever seeded through the lib. This suite creates a pack in the browser, edits every field of the pack's details form except avatar and references, and deletes it from Administration. Each write is read back with `readInnovationPack` (new) and `readAccountResources`. Product source read at client-web `origin/develop` @ `f33325b2b`, server `origin/develop` @ `e120d25a1`.

## How to run
```bash
cd client-web && pnpm run test:nightly --project="Innovation packs"   # tier extended, ~40 s
```
- The organisation is self-seeded (`seedOrganizationScenario`: licence ACCOUNT_LICENSE_PLUS, "Template Packs 0/3", `organization.admin` as its Admin). The persona only acts on that organisation.
- The file is `mode: 'serial'`: K2-1 (create) → K2-2 (edit it) → L6-1 (delete it). `afterAll` deletes any pack left on the account, then the organisation.

## Risk
| # | Risk (in user terms) | Likelihood | Impact | Level | Drives |
|---|---|---|---|---|---|
| R1 | A pack is created without its description, under another provider, or not counted against the licence | Medium | Medium | Medium | K2-1 |
| R2 | A pack edit looks saved, but a field is lost or cross-wired (name, description, tags, listing, visibility) | High (pack + profile + tagset rebuilt) | Medium | **High** | K2-2 |
| R3 | Administration shows a stale pack state, or deleting there leaves the pack (or its licence slot) behind | Medium | Medium | Medium | L6-1 |
| R4 | The suite leaks a pack or organisation | Medium | Medium | Medium | teardown design |

## Existing coverage before this work
- **API.** server-api `innovation-pack/innovation-pack.it-spec.ts`, `entitlements/innovation-packs-functional-entitlements.it-spec.ts` (licence limit) and `account/transfer-innovation-pack-to-account.it-spec.ts`. Not repeated.
- **UI.** `contributors-crud` 2.3 reads the "Template Packs 0/3" capacity, 3.1 sees "Create new pack" offered; `platform-roles/resource-transfers-as-resource-admin` transfers a lib-seeded pack (recorded client defect); `classifications/classifications-templates` and `templates-CRD/*` use lib-seeded packs' templates (K3). **Nobody creates, edits or deletes a pack in the browser.**
- **Not touched:** the Administration "Promote" column (workspace#095, owned by its own suite).

## Scenario → test mapping
| ID | Scenario | Technique | Oracle | Automated by | Layer |
|---|---|---|---|---|---|
| K2-1 | Org admin creates a pack (name, description) from the org Account tab | UC, ST | no pack before; `createInnovationPack` answered, dialog closed; the account hosts exactly 1 pack; `readInnovationPack`: exact name and description, `provider.id` = the organisation; after a reload the section reads "Template Packs 1/3" | `us1-create-edit-delete-pack.spec.ts` › K2-1 … | UI + lib |
| K2-2 | Org admin edits name, description, tags [a, b], Listed in store on → off, Search visibility Account → Public | UC, ST | the seeded defaults read back first (listed, ACCOUNT, no tags); `updateInnovationPack` answered; read-back exact name, description, tag set, `listedInStore` false, `searchVisibility` PUBLIC; after a reload every control shows the stored value | `us1-create-edit-delete-pack.spec.ts` › K2-2 … | UI + lib |
| L6-1 | Platform admin finds the pack in Administration › Innovation Packs and deletes it | UC, NC | the row shows "Not listed", "Public" and the owning organisation (K2-2's stored state); `deleteInnovationPack` answered; row gone; `readInnovationPack` ENTITY_NOT_FOUND; the account hosts no pack; positive control: the owner's Account tab is back to "Template Packs 0/3" | `us1-create-edit-delete-pack.spec.ts` › L6-1 … | UI + lib |

### Regression guards
- K2-1: a create that drops the markdown description or credits the pack to the wrong provider/account.
- K2-2: a tagset that merges instead of replacing; listed/visibility written to the wrong field or ignored; a name/description edit lost.
- L6-1: delete answered but the pack (or its account link) survives.

## Not covered — known gaps
| Scenario | Why | Where |
|---|---|---|
| Templates inside a pack (create, edit, delete) | Template CRUD is `templates-CRD/*`'s area | templates-CRD |
| Avatar and references on a pack | Upload / reference paths | journey 11 |
| A pack's visibility to other users (library listing, search) | Library and search are K1 / journey 8 | journey 8 |
| Creating a pack over the licence limit | API-covered (entitlements it-spec) | covered (API) |
| A user-owned pack | Needs a licence plan on a disposable user's account; the org path exercises the same mutation | follow-up |
| Promote a pack | workspace#095 | its own suite |

## Build notes (2026-11-12, local stack)
- **Red-proof:** K2-2 with a lib write right after the save that sets `listedInStore` back to true → red at the read-back (restored).
- The create dialog's Name field is labelled "Name *"; "Create" is enabled only once the required description has reached the form, so the description race of profile-editing R-7 cannot submit an empty description here.
