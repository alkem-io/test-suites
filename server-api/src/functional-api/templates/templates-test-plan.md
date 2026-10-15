# Test plan — Template file repair: `adminRepairTemplateFiles` gate and dry run (server#6596)

> **Status:** Approved · **Depth:** Light. The user set this explicitly. By its triggers the change would rate Standard: a new privileged surface (authorization), and a real run that rewrites template content. · **Story:** [alkem-io/server#6596](https://github.com/alkem-io/server/issues/6596) · implemented by [server#6656](https://github.com/alkem-io/server/pull/6656) (merged 2026-10-14, `8e1d7c35`) · not yet in a release story (Release #78, alkemio#2177, does not list it)

server#6656 adds `adminRepairTemplateFiles(repairData: { dryRun = true, templateIDs? })`. It is the one-off repair for templates that reference files stored outside the template (part 3 of the issue's fix). It returns `AdminTemplateFileRepairResult` (`dryRun`, `templatesScanned`, `templatesWithForeignFiles`, `references[]`, `copiedReferences`, `missingFiles[]`, `failed[]`). The gate is `PLATFORM_OPERATIONS_ADMIN` on the platform policy, held only by the Platform Operations Admin credential (A11 family). **Scope, set by the user:** only the privilege gate and the dry-run shape. This plan does not cover the real run's copy, the whiteboard-media re-home, or `createSpace` from a template. **Headline:** after this plan, the gate is proven for all 14 platform/feature roles plus anonymous, plain registered and template-owning space admin callers. The dry run is proven against a real, API-seeded foreign reference: it reports that reference and changes nothing, and so does a second run with the flag omitted.

## How to run

```bash
# Prerequisite (once): the lib types do not know the mutation yet
git -C <server clone> show origin/develop:schema.graphql > <scratch>/schema.graphql
CODEGEN_SCHEMA=<scratch>/schema.graphql pnpm --filter @alkemio/tests-lib run codegen
pnpm --filter @alkemio/test-suite-server-api run codegen
# Dry run + nightly-reachable gate cases (templates project, in the nightly glob)
cd server-api && pnpm exec vitest run src/functional-api/templates/template-file-repair/template-file-repair.it-spec.ts
# Role matrix row (platform-roles projects: NOT in the nightly, needs a 027 server)
cd server-api && pnpm run test:platform-roles && pnpm run test:platform-roles:plan
```

The repair spec needs `seedPlatformRoleUsers()` (Kratos admin URL or `registerUsers`), because `TestUser.GLOBAL_ADMIN` does **not** hold Platform Operations Admin on develop.

## Risk

| #   | Risk (in user terms)                                                                                                                                                                         | Likelihood | Impact | Level      | Drives     |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | ------ | ---------- | ---------- |
| R1  | Someone without the operations role (a registered user, a template's space admin, another platform role) runs the repair. A real run republishes files to everyone who can read the template | Low        | High   | **Medium** | PR-1, TF-1 |
| R2  | A dry run (the operator's preview) silently copies files or rewrites template text on ACC/prod                                                                                               | Low        | High   | **Medium** | TF-2       |
| R3  | An operator who omits `dryRun` gets a real run, not the documented dry-run default                                                                                                           | Low        | High   | **Medium** | TF-2       |
| R4  | The report is wrong or the run fails on a real database. Unit specs mock `entityManager.query` entirely, so the ~20-join slot SQL and the owner SQL have never run against the real schema   | Medium     | Medium | **Medium** | TF-2       |
| R5  | An unscoped scan on a production-sized estate is too slow (whiteboard content is read per slot) or reports implausible counts                                                                | Medium     | Low    | Low        | M-1        |

Elevated-risk triggers present: [x] authorization/visibility (new privileged mutation) · [x] data-destructive (real run rewrites template content — out of scope here) · [ ] migration · [ ] breaking contract · [ ] cross-repo · [ ] infra · [ ] performance-sensitive path (only for the unscoped scan, R5)

## Existing coverage before this work

- **test-suites, `origin/develop` @ `663c61d9` + working tree:** `adminRepairTemplateFiles|AdminTemplateFileRepair|TemplateFileRepair` gives **zero hits** in `server-api/src`, `client-web/src` and `lib/src` (generated types included). The mutation is not in `lib/src/core/generated/alkemio-schema.ts`. `platform-roles/capabilities.data.ts` has 15 A11 rows and none is this one, so the hand-maintained table has drifted from the server census (`a.row.surfaces.ts` A11 lists it).
- **Pattern reused, not coverage:** `platform-roles/_support/groups/a11.ts` + `capabilities.data.ts` A11 rows (e.g. `A11.migrateLegacyMemoContent`): one row gives a POA positive plus 13 role negatives, judged at the gate by `_support/outcome.ts`.
- **server unit (opened):** `admin.template.file.repair.resolver.mutations.spec.ts` pins the gate call (`PLATFORM_OPERATIONS_ADMIN`, action name), that **a refused call never reaches the service**, and that a run is audited. `admin.template.file.repair.service.spec.ts` pins "dry run copies nothing", empty list = none / omitted = all, the scanned count, missing files, owner credentials and the edit-race guard. All of it runs on mocked SQL.
- **Reuse:** 4 of 13 scenarios need no new test (refused call touches nothing; empty-vs-omitted list; scanned count; audit per run). **Existing tests to update:** none invalidated. One stale data table (`capabilities.data.ts`), plus the generated `platform-roles-test-plan.md` that the coverage guard re-renders.

## Scenario → test mapping

| Scenario                                                                                                                                            | Covers   | Automated by                                                                                                           | Layer      |
| --------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ---------------------------------------------------------------------------------------------------------------------- | ---------- |
| Platform Operations Admin may call it; the other 13 platform/feature roles are refused at the gate                                                  | R1       | planned — see build sheet (PR-1)                                                                                       | API matrix |
| Anonymous, registered-without-role and template-owning space admin are refused with `FORBIDDEN_POLICY` naming `platform-operations-admin` (nightly) | R1       | planned — see build sheet (TF-1)                                                                                       | API        |
| Dry run on a seeded foreign + missing reference reports exact shape; explicit and omitted-flag runs agree; template text unchanged                  | R2 R3 R4 | planned — see build sheet (TF-2)                                                                                       | API        |
| A refused call does not run the repair                                                                                                              | R1       | server `admin.template.file.repair.resolver.mutations.spec.ts` › `touches nothing when the caller lacks the privilege` | unit       |
| Empty `templateIDs` scans nothing; omitted scans all                                                                                                | R4       | server `admin.template.file.repair.service.spec.ts` › `processes no template for an empty list…`                       | unit       |
| `templatesScanned` counts templates with nothing to report                                                                                          | R4       | same › `counts the templates scanned…`                                                                                 | unit       |
| Every run is audited (success/failure)                                                                                                              | —        | resolver spec › `requires PLATFORM_OPERATIONS_ADMIN … and audits the run`                                              | unit       |

### Regression guards

None yet. If TF-2 goes red because of a product defect, it becomes `test.skip` with the issue link (house rule), never `test.fails`.

## Not covered — known gaps

| Scenario                                                                                                                                                                                                              | Why not automated                                                                                                                                                  | Where it belongs                                                  |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------- |
| M-1: dry run with no `templateIDs` on ACC before the real run. Expect `failed: []`, a plausible `templatesWithForeignFiles` (the issue counted 16 space + 19 whiteboard + 1 callout templates) and acceptable latency | The numbers only mean anything on ACC data. An unscoped scan of a shared env sits against the ~5 s request cutoff, and test-suites has no DB access to cross-check | Manual: proposed row for `docs/release-verification-checklist.md` |
| Real run (`dryRun: false`): copy, `ownerCanRead: false` stays as written, whiteboard/memo/office slots                                                                                                                | Out of scope by user ruling. Logic is unit-pinned in the service spec (mocked SQL)                                                                                 | A follow-up plan if the real run is scheduled on ACC              |
| A refused attempt leaves no operations-audit row (the gate sits outside the audited `try`)                                                                                                                            | Out of scope; not compared with the other A11 resolvers                                                                                                            | Open question for the server owner                                |
| Audit row readable through the A19 trail                                                                                                                                                                              | Out of scope                                                                                                                                                       | `platform-roles/audit-records.it-spec.ts` family, if wanted       |

**Non-functional (Light, one line each).** _Performance:_ scoped calls only. The unscoped scan is R5 / M-1, and no load harness exists (harness.md). _Security:_ authZ negatives for every caller class are automated (PR-1, TF-1). Input is a `UUID` scalar with no free text. The report (template names, file and bucket ids) reaches only POA. _Reliability:_ a dry run has no partial-write path. The edit-race guard is unit-pinned. _Compatibility/accessibility:_ API-only, no UI surface. Not applicable.

**What is proven, and what is not.** Once built, this plan proves on a real server and database that only the Platform Operations Admin can invoke the repair. It also proves that a dry run, explicit or by default, reports a real foreign reference and a dead reference with the documented fields, and leaves the template untouched. It does **not** prove that the real run repairs anything. It does not prove the ACC estate's numbers, and it does not prove that the 36 templates named in the issue will create spaces afterwards. Those are the story's actual success criteria, and **no automated test covers them**. Note also that PR-1 lives in the platform-roles projects, which run in no nightly. TF-1 is the only gate check that runs every night.
