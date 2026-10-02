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
  deleteOrganization,
  deleteSpace,
  postGraphqlRaw,
  TestScenarioFactory,
  TestUserManager,
  UniqueIDGenerator,
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
/* Raw GraphQL as a persona or anonymously                             */
/* ------------------------------------------------------------------ */

export type GqlError = {
  message: string;
  extensions?: { code?: string; details?: Record<string, unknown> };
};
export type GqlResult<T> = { data: T | null; errors: GqlError[] };

/** POST an inline document as `as` (a harness persona) or, when omitted, anonymously. */
export async function gql<T>(
  query: string,
  variables: Record<string, unknown> = {},
  as?: TestUser
): Promise<GqlResult<T>> {
  const bearerToken = as
    ? TestUserManager.getUserModelByType(as).authToken
    : undefined;
  if (as && !bearerToken) {
    throw new Error(`classifications: no auth token for persona ${as}`);
  }
  const res = await postGraphqlRaw<T>(query, { variables, bearerToken });
  if (res.status !== 200 || typeof res.body !== 'object' || !res.body) {
    throw new Error(
      `GraphQL transport failure (HTTP ${res.status}): ${res.raw}`
    );
  }
  return {
    data: (res.body.data ?? null) as T | null,
    errors: (res.body.errors ?? []) as unknown as GqlError[],
  };
}

/** Same as `gql`, but a set-up step that must simply work. */
export async function gqlOk<T>(
  query: string,
  variables: Record<string, unknown> = {},
  as: TestUser = EDITOR
): Promise<T> {
  const { data, errors } = await gql<T>(query, variables, as);
  if (errors.length > 0 || !data) {
    throw new Error(
      `GraphQL set-up call failed: ${errors.map(e => `${e.extensions?.code}: ${e.message}`).join(' | ') || 'no data'}`
    );
  }
  return data;
}

export const ENTRY_FIELDS =
  'id displayLabel display sortOrder cardinality selectedValueIDs values { id label }';

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
  return gql(
    `query ClassificationsRead($spaceId: UUID!) {
      lookup { space(ID: $spaceId) { about { classifications { ${ENTRY_FIELDS} } } } }
    }`,
    { spaceId },
    as
  );
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
  const data = await gqlOk<{
    lookup: { templatesSet: { classificationTemplates: TemplateRead[] } };
  }>(
    `query ClassificationTemplatesRead($id: UUID!) {
      lookup { templatesSet(ID: $id) { classificationTemplates {
        id profile { displayName } classification { cardinality values { id label } }
      } } }
    }`,
    { id: templatesSetId }
  );
  return data.lookup.templatesSet.classificationTemplates;
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
  const data = await gqlOk<{ createTemplate: TemplateRead }>(
    `mutation ClassificationTemplateCreate($data: CreateTemplateOnTemplatesSetInput!) {
      createTemplate(templateData: $data) {
        id profile { displayName } classification { cardinality values { id label } }
      }
    }`,
    {
      data: {
        templatesSetID: fixture.templatesSetId,
        type: 'CLASSIFICATION',
        profileData: {
          displayName: spec.name,
          description:
            spec.description ?? `e2e024 fixture template ${spec.name}`,
        },
        classificationData: {
          cardinality: spec.cardinality ?? 'MULTI_SELECT',
          values: spec.values.map(label => ({ label })),
        },
      },
    }
  );
  return data.createTemplate;
}

/** Step A through the API (set-up for cases that only read an entry). */
export async function addEntryApi(
  spaceId: string,
  templateId: string,
  displayLabel?: string
): Promise<EntryRead> {
  const data = await gqlOk<{ addClassificationEntryFromTemplate: EntryRead }>(
    `mutation ClassificationEntryAdd($data: AddClassificationEntryFromTemplateInput!) {
      addClassificationEntryFromTemplate(classificationData: $data) { ${ENTRY_FIELDS} }
    }`,
    { data: { spaceID: spaceId, templateID: templateId, displayLabel } }
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

  const ids = await gqlOk<{
    lookup: {
      space: {
        templatesManager: { templatesSet: { id: string } };
        about: { profile: { tagset: { id: string } | null } };
      };
    };
  }>(
    `query ClassificationsFixtureIds($spaceId: UUID!) {
      lookup { space(ID: $spaceId) {
        templatesManager { templatesSet { id } }
        about { profile { tagset { id } } }
      } }
    }`,
    { spaceId: fixture.spaceId },
    TestUser.GLOBAL_ADMIN
  );
  fixture.templatesSetId = ids.lookup.space.templatesManager.templatesSet.id;
  const tagsetId = ids.lookup.space.about.profile.tagset?.id;
  if (!tagsetId) throw new Error('seeded Space About has no default tagset');
  await gqlOk(
    `mutation ClassificationsFixtureTags($data: UpdateTagsetInput!) {
      updateTagset(updateData: $data) { id }
    }`,
    { data: { ID: tagsetId, tags: fixture.tags } },
    TestUser.GLOBAL_ADMIN
  );
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
