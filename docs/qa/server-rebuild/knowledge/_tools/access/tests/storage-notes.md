# storage suite — extraction notes

Source: `~/repos/qa/test-suites` @ `87812019` (branch `qa/server-rebuild-qa-plan`),
`server-api/src/functional-api/storage/` (8 auth specs + `uploads.it-spec.ts`).
Nothing under the repo was modified; titles were resolved by `vitest.collect()`
(collection only — no hooks, no test executed, no server) run from the scratchpad
with the storage project only; privilege constants were evaluated from
`lib/src/common/constants/privileges.ts` with tsx.

Reconciliation: inventory 917 = collected distinct 917, 0 unaccounted, 0 extra,
0 row/title mismatches. Raw rows = 918: `public-space-private-ch` "Access to Space
Profile reference" storage-bucket table has **two GLOBAL_ADMIN rows** (the second
should be SUBSPACE_ADMIN as in the three sibling files) — same title, so vitest
and the inventory count it once. That cell (SUBSPACE_ADMIN on the L1 about
bucket, public L0 / private L1) is therefore untested.

## How a row is asserted

Document row (`expectedStatus` column):
1. GraphQL as `userRole` (no Authorization header when `undefined`) through the
   resource's lookup query — `lookup.profile.storageBucket.documents[0]` for
   about/organization/user profiles, `lookup.callout.contributions[].link|post|
   whiteboard.profile.storageBucket.documents[0]` for contributions,
   `lookup.callout.framing.profile|framing.whiteboard.profile.storageBucket.
   documents[0]` for framing.
2. `expect(doc.authorization.myPrivileges.sort()).toEqual(privileges)` — sorted
   equality against the constant (or `undefined` when the lookup itself returns
   null because the parent is unreadable).
3. REST `GET {rest}/storage/document/{documentId}` with the same bearer (none for
   anonymous) — `expect(status).toEqual(expectedStatus)` (200/403; 404 only in
   uploads). The documentId is always fetched in `beforeAll` **as GLOBAL_ADMIN**.

Storage-bucket row (`parentEntityType` column): same lookup, one level up —
`…storageBucket.authorization.myPrivileges` sorted equality **and**
`storageBucket.parentEntity.type` equality (`SPACE_ABOUT`, `CALLOUT_FRAMING`,
`POST`, `WHITEBOARD`, `ORGANIZATION`, `USER`; `undefined` when unreadable). No
REST call. Bucket constants add `FILE_UPLOAD`+`FILE_DELETE` (`_fileUp_fileDel`)
for admins and `FILE_UPLOAD` for contributors; `GRANT` is never on a document or
bucket for plain members.

Titles: `public-space-*` / `*-ch` files say `has this privileges … to …`;
`private-space-document-auth` alone says `has privileges … (REST $expectedStatus)
on …` — same assertion, different wording.

## How buckets are reached

- Space about / organization / user: `lookupProfileVisuals(profileId)` →
  `visuals[0].id` → `uploadImageOnVisual`; or `createReferenceOnProfile(profileId)`
  → `uploadFileOnRef`; or `getProfileDocuments(profileId, GLOBAL_ADMIN)` →
  `lookup.profile.storageBucket.id` → `uploadFileOnStorageBucket`. Then
  `getProfileDocuments` → `lookup.profile.storageBucket.documents[0].id`.
- Callouts: created fresh per describe by GLOBAL_ADMIN on
  `baseScenario.space|subspace.collaboration.calloutsSetId`; the scenario's own
  `addPostCallout/addPostCollectionCallout/addWhiteboardCallout` callouts are not
  used. Contribution documents via `createLinkOnCallout`+`uploadFileOnLink`,
  `createPostCardOnCallout`+(`uploadImageOnVisual` on `post.profile.visual` |
  `createReferenceOnProfile(post.profile.id)`+`uploadFileOnRef`),
  `createWhiteboardOnCallout`+`uploadImageOnVisual`. Framing documents via
  `createReferenceOnProfile(framing.profile.id)`+`uploadFileOnRef` or
  `uploadFileOnStorageBucket(framing.profile.storageBucket.id |
  framing.whiteboard.profile.storageBucket.id)`.
- Gotcha: the **Link collections bucket table queries the callout FRAMING bucket**
  (`calloutStorageConfig` → `framing.profile.storageBucket`, parent
  `CALLOUT_FRAMING`), not the link-contribution profile bucket the document table
  reads. So the link profile's own bucket is never asserted.
- The "Call for Posts Callout visual(banner)" and both "Whiteboard(Rt) Callout
  visual(banner)" blocks upload straight onto the framing storage bucket — no
  visual is involved despite the title. The `WhiteboardRt` block is a verbatim
  copy of the `Whiteboard` block (second `createWhiteboardCallout`).
- `user-document-auth` uses `createBaseScenarioEmpty` (no org, no space);
  `organization-document-auth` has no `space` block (org only).

## Scenario variants (what each row assumes)

| file | L0 | L1 | extra |
|---|---|---|---|
| public-space | PUBLIC | — | visibility ACTIVE |
| private-space | PRIVATE | — | visibility ACTIVE |
| public-space-public-ch | PUBLIC | PUBLIC | L1 settings: inheritMembershipRights **true**, allowMembersToCreateCallouts false, allowMembersToCreateSubspaces false |
| public-space-private-ch | PUBLIC | PRIVATE | same L1 override; also creates an L2 (server-default privacy, SUBSUBSPACE_* community) that no table uses |
| private-space-public-ch | PRIVATE | PUBLIC | same L1 override |
| private-space-private-ch | PRIVATE | PRIVATE | same L1 override |

L0 community everywhere: admin SPACE_ADMIN; members SPACE_MEMBER, SPACE_ADMIN,
SUBSPACE_*, SUBSUBSPACE_*. L1 (ch files): admin SUBSPACE_ADMIN; members
SUBSPACE_*, SUBSUBSPACE_*. Members self-join while the fresh space is still OPEN,
then privacy is applied (Slice B factory order). Membership policy is never set
(server default). The L1 `settings.privacy` from the config is applied by the
factory; the `updateSpaceSettings` in `beforeAll` only touches `collaboration`.

## Interesting cells (expectations that differ across variants)

Roles that never vary: GLOBAL_ADMIN, SPACE_ADMIN, SUBSPACE_ADMIN,
SUBSPACE_MEMBER get the same list on the same resource kind in every file.
ANONYMOUS and NON_SPACE_MEMBER always carry identical expectations.

1. **About-profile documents/buckets (visual, reference, about bucket) follow
   L0 privacy only.** Anonymous/non-member: READ/200 on PUB, PRV (!), PUB/pub,
   PUB/prv; `undefined`/403 on PRV/pub, PRV/prv. So the *private L0's own* about
   documents are publicly readable, but the about documents of a *public L1
   inside a private L0* are not, and those of a *private L1 inside a public L0*
   are. L1 about readability = L0 privacy, L1's own privacy ignored.
2. **Callout-level content (link/post/whiteboard contributions and framing)
   requires every ancestor level to be public.** Anonymous/non-member READ/200
   only on PUB and PUB/pub; `undefined`/403 on PRV, PUB/prv, PRV/pub, PRV/prv.
   Contrast with (1): on a private L0, about docs are READ but callout docs are
   not.
3. **SPACE_MEMBER (L0 member, not L1 member) on L1 callout content follows L1
   privacy:** `CONTRIBUTE`+`READ` (bucket: +`FILE_UPLOAD`) on PUB/pub and PRV/pub,
   `undefined`/403 on PUB/prv and PRV/prv. Yet on L1 *about* documents it gets
   READ in all four variants. Note the L0 member gets CONTRIBUTE on a public
   subspace it never joined (inheritMembershipRights:true is set on L1 — the
   suites never test the false case).
4. Admin deltas: GLOBAL_ADMIN = plain admin list + `PLATFORM_CONTENT_FULL_ACCESS`
   everywhere; on whiteboards (collection contribution and framing) GLOBAL_ADMIN
   additionally has `UPDATE_CONTENT` while SPACE_ADMIN/SUBSPACE_ADMIN do not
   (`…_contribute_updateContent_globalAdmin` vs `…_contribute`).
5. Organization: SUBSPACE_ADMIN with only the org ADMIN role equals
   ORGANIZATION_ADMIN (Associate+Admin): CRUD+GRANT+`RECEIVE_NOTIFICATIONS_ADMIN`
   +`UPDATE_NAMEID` (bucket +`FILE_UPLOAD`+`FILE_DELETE`); an org ASSOCIATE
   (SPACE_MEMBER) is plain READ, same as anonymous. Org documents are world
   readable (anonymous 200).
6. User: anonymous/non-member READ/200 on every user-profile document ("GDPR
   discussion" comment in the spec); owner QA_USER CRUD+`READ_USER_PII`+
   `UPDATE_NAMEID` (no GRANT); GLOBAL_ADMIN CRUD+`READ_USER_PII`+
   `READ_USER_SETTINGS`+`PLATFORM_CONTENT_FULL_ACCESS` (no GRANT, no
   UPDATE_NAMEID). Bucket variants add FILE_UPLOAD/FILE_DELETE.
7. Missing cell: SUBSPACE_ADMIN on the L1 about-profile *reference* storage
   bucket in public-space-private-ch (duplicated GLOBAL_ADMIN row, see top).

## uploads.it-spec.ts

22 cases, all on the organization profile (reference / visual[0]) plus one
innovation-hub visual: per-type upload success for avif/gif/jpeg/jpg/png/svg/webp/
pdf, same-file-twice idempotence, delete-twice error text, >15 MB and `.sql`
rejection ("Upload on reference or link failed!"), visual dimension guard
(190–410 px), document survives reference deletion, and three REST read cases
(200 / 404 after delete / 200 after reference removal) that are `test.skip`
when `CI` is set (inventory was collected with CI unset, hence 0 skips).
