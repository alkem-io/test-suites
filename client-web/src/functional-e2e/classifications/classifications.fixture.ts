/**
 * Self-seeded fixture for BOTH 024-classifications suites.
 *
 * Each spec file seeds its own Space tree through the API in `beforeAll`
 * (TestScenarioFactory) and deletes it, leaves first, in `afterAll`. The
 * classification entries hang off the Space About (FK cascade) and the
 * classification templates live in the Space's own library, so deleting the
 * Space removes everything a walk created. Nothing in these suites reads or
 * writes pre-existing stack data, so they need no shared Space, no prefix
 * sweeps and no single-worker rule.
 *
 * Personas are harness personas (`AUTH_TEST_HARNESS_PASSWORD`):
 * - editor   `spaceAdmin`  — the Space's own admin: FR-014a grants every
 *                            classification write to "whoever can edit the
 *                            Space About", and a platform admin would pass
 *                            for the wrong reason.
 * - viewer   `spaceMember` — a plain member: reads the About, edits nothing.
 * - outsider `nonSpaceMember` — not a member at all.
 *
 * The UI is reserved for what is under test; set-up data (templates, Tags,
 * entries a case only reads) is created through the API.
 */
import type { Browser, BrowserContext, Page } from '@playwright/test';
import {
  addClassificationEntryFromTemplate,
  ClassificationCardinality,
  createClassificationTemplate,
  deleteOrganization,
  deleteSpace,
  readSpaceClassifications,
  readSpaceTemplatesManager,
  readTemplatesSetClassificationTemplates,
  TemplateType,
  TestScenarioFactory,
  UniqueIDGenerator,
  updateTagsetTags,
  type GraphqlActor,
  type GraphqlReturnWithError,
} from '@alkemio/tests-lib';
import { TestUser } from '@alkemio/tests-lib/common/enums/test.user';
import type { OrganizationWithSpaceModel } from '@alkemio/tests-lib/scenario/models/OrganizationWithSpaceModel';
import { ensurePersonaState } from '../fixtures/authenticated-session.fixture';
import { deleteFixtureTree } from '../subspaces-callout/subspaces-callout.helpers';
import { attachConsoleGuard, type ConsoleGuard } from './console-guard';

export const BASE_URL = process.env.ALKEMIO_BASE_URL || 'http://localhost:3000';

export const EDITOR = TestUser.SPACE_ADMIN;
export const VIEWER = TestUser.SPACE_MEMBER;
export const OUTSIDER = TestUser.NON_SPACE_MEMBER;

export type Cardinality = 'MULTI_SELECT' | 'SINGLE_SELECT';

export type ClassificationsFixture = {
  scenario: OrganizationWithSpaceModel;
  spaceId: string;
  spaceUrl: string;
  templatesSetId: string;
  /** The Space's freeform Tags, seeded so the coexistence checks own them. */
  tags: string[];
  subspaceId?: string;
  subspaceUrl?: string;
};

/* ------------------------------------------------------------------ */
/* Active Space (the helpers navigate relative to it)                  */
/* ------------------------------------------------------------------ */

let activeSpaceUrl: string | undefined;

/** Point the navigation helpers at this file's own seeded Space. */
export function setActiveSpace(fixture: ClassificationsFixture) {
  activeSpaceUrl = fixture.spaceUrl;
}

export function spaceUrl(): string {
  if (!activeSpaceUrl) {
    throw new Error(
      'classifications: no seeded Space — call setActiveSpace() in beforeAll'
    );
  }
  return activeSpaceUrl;
}

/* ------------------------------------------------------------------ */
/* Lib results as the specs inspect them                               */
/* ------------------------------------------------------------------ */

export type GqlError = {
  message: string;
  code?: string;
  extensions?: { code?: string; details?: Record<string, unknown> };
};
export type GqlResult<T> = { data: T | null; errors: GqlError[] };

/** The lib actor a persona maps to; omitted = anonymous on the private endpoint. */
const actorOf = (as?: TestUser): GraphqlActor => as ?? { anonymous: 'private' };

/** A lib `{ data } | { error }` result as the `{ data, errors[] }` shape the negatives inspect. */
export function toGqlResult<T>(result: GraphqlReturnWithError<T>): GqlResult<T> {
  return {
    data: result.data ?? null,
    errors: (result.error?.errors ?? []) as unknown as GqlError[],
  };
}

/** A set-up step that must simply work: the data, or a throw naming the errors. */
export function okOr<T>(result: GraphqlReturnWithError<T>): T {
  const { data, errors } = toGqlResult(result);
  if (errors.length > 0 || !data) {
    throw new Error(
      `GraphQL set-up call failed: ${errors.map(e => `${e.extensions?.code ?? e.code}: ${e.message}`).join(' | ') || 'no data'}`
    );
  }
  return data;
}

export type EntryRead = {
  id: string;
  displayLabel: string;
  display: boolean;
  sortOrder: number;
  cardinality: Cardinality;
  selectedValueIDs: string[];
  values: { id: string; label: string }[];
};

/** A Space's classification entries through the read API, in the order the API returns them. */
export async function readEntries(
  spaceId: string,
  as: TestUser | undefined = EDITOR
): Promise<
  GqlResult<{ lookup: { space: { about: { classifications: EntryRead[] } } } }>
> {
  return toGqlResult(
    await readSpaceClassifications(spaceId, actorOf(as))
  ) as GqlResult<{
    lookup: { space: { about: { classifications: EntryRead[] } } };
  }>;
}

/** Entries as seen by the editor; throws on any error. */
export async function entriesOf(spaceId: string): Promise<EntryRead[]> {
  const res = await readEntries(spaceId, EDITOR);
  if (res.errors.length > 0 || !res.data) {
    throw new Error(`entries read failed: ${JSON.stringify(res.errors)}`);
  }
  return res.data.lookup.space.about.classifications;
}

export type TemplateRead = {
  id: string;
  profile: { displayName: string };
  classification: {
    cardinality: Cardinality;
    values: { id: string; label: string }[];
  } | null;
};

/** The classification templates of a library, through the API. */
export async function libraryTemplates(
  templatesSetId: string
): Promise<TemplateRead[]> {
  const data = okOr(
    await readTemplatesSetClassificationTemplates(templatesSetId, EDITOR)
  );
  return data.lookup.templatesSet!.classificationTemplates as TemplateRead[];
}

/** Create a classification template in the Space library (set-up only — the UI create is covered by TL-04). */
export async function createTemplateApi(
  fixture: ClassificationsFixture,
  spec: {
    name: string;
    description?: string;
    cardinality?: Cardinality;
    values: string[];
  }
): Promise<TemplateRead> {
  const data = okOr(
    await createClassificationTemplate(
      {
        templatesSetID: fixture.templatesSetId,
        type: TemplateType.Classification,
        profileData: {
          displayName: spec.name,
          description:
            spec.description ?? `e2e024 fixture template ${spec.name}`,
        },
        classificationData: {
          cardinality: (spec.cardinality ??
            'MULTI_SELECT') as ClassificationCardinality,
          values: spec.values.map(label => ({ label })),
        },
      },
      EDITOR
    )
  );
  return data.createTemplate as TemplateRead;
}

/** Step A through the API (set-up for cases that only read an entry). */
export async function addEntryApi(
  spaceId: string,
  templateId: string,
  displayLabel?: string
): Promise<EntryRead> {
  const data = okOr(
    await addClassificationEntryFromTemplate(
      { spaceID: spaceId, templateID: templateId, displayLabel },
      EDITOR
    )
  );
  return data.addClassificationEntryFromTemplate;
}

/* ------------------------------------------------------------------ */
/* Seed + teardown                                                     */
/* ------------------------------------------------------------------ */

/**
 * Seed one L0 Space (and, on request, one L1 subspace) with `spaceAdmin` as admin and
 * `spaceMember` as a plain member, plus two freeform Tags the suites own.
 */
export async function seedClassificationsSpace(
  name: string,
  { subspace = false }: { subspace?: boolean } = {}
): Promise<ClassificationsFixture> {
  const runId = UniqueIDGenerator.getID();
  const scenario = await TestScenarioFactory.createBaseScenario({
    name,
    space: {
      collaboration: { addTutorialCallouts: false },
      community: {
        admins: [EDITOR],
        members: [EDITOR, VIEWER],
      },
      ...(subspace
        ? {
            subspace: {
              collaboration: { addTutorialCallouts: false },
              community: { admins: [EDITOR], members: [EDITOR] },
            },
          }
        : {}),
    },
  });
  const spaceUrlValue = `${BASE_URL}/${scenario.space.nameId}`;
  const fixture: ClassificationsFixture = {
    scenario,
    spaceId: scenario.space.id,
    spaceUrl: spaceUrlValue,
    templatesSetId: '',
    tags: [`e2e024-innovation-${runId}`, `e2e024-sustainability-${runId}`],
    ...(subspace
      ? {
          subspaceId: scenario.subspace.id,
          subspaceUrl: `${spaceUrlValue}/challenges/${scenario.subspace.nameId}`,
        }
      : {}),
  };

  // The tree exists from here on. If the rest of the seed fails, the spec never
  // receives the fixture and its afterAll has nothing to delete — so roll the
  // tree back here, then surface the original failure.
  try {
    const ids = okOr(
      await readSpaceTemplatesManager(fixture.spaceId, TestUser.GLOBAL_ADMIN)
    );
    fixture.templatesSetId =
      ids.lookup.space!.templatesManager!.templatesSet!.id;
    const tagsetId = ids.lookup.space!.about.profile.tagset?.id;
    if (!tagsetId) throw new Error('seeded Space About has no default tagset');
    okOr(
      await updateTagsetTags(
        { ID: tagsetId, tags: fixture.tags },
        TestUser.GLOBAL_ADMIN
      )
    );
  } catch (error) {
    try {
      await teardownClassificationsSpace(fixture);
    } catch (rollbackError) {
      throw new Error(
        `classifications seed failed: ${String(error)}\nrollback of the half-seeded tree also failed: ${String(rollbackError)}`
      );
    }
    throw error;
  }
  return fixture;
}

/**
 * Delete the subspace, then the Space, then the scenario organization; attempt every
 * entity and throw once listing anything left behind (a swallowed teardown leaks a
 * Space per run until the hosting account hits capacity — harness.md).
 */
export async function teardownClassificationsSpace(
  fixture: ClassificationsFixture | undefined
): Promise<void> {
  if (!fixture) return;
  const failures: string[] = [];
  try {
    await deleteFixtureTree(
      {
        spaceId: fixture.spaceId,
        subspaceIds: fixture.subspaceId ? [fixture.subspaceId] : [],
      },
      async id => {
        const res = await deleteSpace(id);
        if (res.error) throw new Error(JSON.stringify(res.error));
      }
    );
  } catch (error) {
    failures.push(String(error));
  }
  const org = await deleteOrganization(fixture.scenario.organization.id);
  if (org.error) failures.push(`organization: ${JSON.stringify(org.error)}`);
  if (failures.length > 0) {
    throw new Error(
      `classifications fixture teardown failed:\n${failures.join('\n')}`
    );
  }
}

/* ------------------------------------------------------------------ */
/* Browser personas                                                    */
/* ------------------------------------------------------------------ */

/** Harness identity of a persona (TestUserManager's own `${user}@alkem.io` rule); usable before the user map is populated. */
export const emailOf = (user: TestUser) => `${user}@alkem.io`;

/** The CRD redesign is flag-gated; pin it so a stale session never lands on the legacy UI. */
export async function pinCrd(context: BrowserContext) {
  await context.addInitScript(() => {
    try {
      window.localStorage.setItem('alkemio-crd-enabled', 'true');
    } catch {
      /* storage unavailable — the persisted session flag still applies */
    }
  });
}

/** One isolated, already-authenticated context per persona, with the console guard attached. */
export async function openPersona(
  browser: Browser,
  user: TestUser
): Promise<{ context: BrowserContext; page: Page; guard: ConsoleGuard }> {
  const context = await browser.newContext({
    storageState: await ensurePersonaState(browser, emailOf(user)),
    viewport: { width: 1920, height: 1080 },
  });
  await pinCrd(context);
  const page = await context.newPage();
  return { context, page, guard: attachConsoleGuard(page) };
}
