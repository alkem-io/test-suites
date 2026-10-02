/**
 * Space classifications — the API contract (workspace#024-classifications,
 * epic alkem-io/alkemio#1985). The rules here are authorization and data-shape
 * rules, so they are pinned at the API; the browser walks live in
 * client-web/src/functional-e2e/classifications/.
 *
 * One scenario per file: an L0 Space (+ one L1) with `spaceAdmin` as admin and
 * `spaceMember` as a plain member. Every entry and template the cases create
 * hangs off that tree, which afterAll deletes leaves first.
 */
import {
  TestScenarioConfig,
  TestScenarioFactory,
  TestUser,
  UniqueIDGenerator,
} from '@alkemio/tests-lib';
import { OrganizationWithSpaceModel } from '@alkemio/tests-lib/scenario/models/OrganizationWithSpaceModel';
import { deleteOrganization } from '@functional-api/contributor-management/organization/organization.request.params';
import { deleteSpace } from './space.request.params';
import {
  addClassificationEntryFromTemplate,
  ClassificationEntry,
  createClassificationEntry,
  createClassificationTemplate,
  deleteClassificationEntry,
  readSpaceClassifications,
  spaceClassificationsOf,
  templatesSetOfSpace,
  updateClassificationEntry,
  updateClassificationEntryDisplay,
  updateClassificationEntrySelection,
  updateClassificationTemplateValues,
} from './space-classifications.request.params';

const uniqueId = UniqueIDGenerator.getID();
let baseScenario: OrganizationWithSpaceModel | undefined;
let spaceId = '';
let subspaceId = '';
let templatesSetId = '';

const scenarioConfig: TestScenarioConfig = {
  name: 'space-classifications',
  space: {
    collaboration: { addTutorialCallouts: false },
    community: {
      admins: [TestUser.SPACE_ADMIN],
      members: [TestUser.SPACE_ADMIN, TestUser.SPACE_MEMBER],
    },
    subspace: {
      collaboration: { addTutorialCallouts: false },
      community: {
        admins: [TestUser.SPACE_ADMIN],
        members: [TestUser.SPACE_ADMIN],
      },
    },
  },
};

const values = (...labels: string[]) => labels.map(label => ({ label }));
const label = (name: string) => `e2e024 api ${name} ${uniqueId}`;

const mustCreate = async (name: string, labels: string[], options = {}) => {
  const res = await createClassificationEntry(
    spaceId,
    label(name),
    values(...labels),
    options
  );
  expect(res.errors).toEqual([]);
  return res.data!.createClassificationEntry;
};

beforeAll(async () => {
  baseScenario = await TestScenarioFactory.createBaseScenario(scenarioConfig);
  spaceId = baseScenario.space.id;
  subspaceId = baseScenario.subspace.id;
  templatesSetId = await templatesSetOfSpace(spaceId);
});

afterAll(async () => {
  const failures: string[] = [];
  for (const id of [subspaceId, spaceId]) {
    if (!id) continue;
    const res = await deleteSpace(id);
    if (res.error) failures.push(`space ${id}: ${JSON.stringify(res.error)}`);
  }
  // beforeAll may have thrown before the scenario was assigned; a TypeError here
  // would only mask that failure.
  const orgId = baseScenario?.organization.id;
  if (orgId) {
    const org = await deleteOrganization(orgId);
    if (org.error) failures.push(`organization: ${JSON.stringify(org.error)}`);
  }
  if (failures.length > 0)
    throw new Error(`teardown left entities behind:\n${failures.join('\n')}`);
});

describe('Space classifications — authorization (FR-014a)', () => {
  let entry: ClassificationEntry;
  let templateId = '';

  beforeAll(async () => {
    entry = await mustCreate('authz', ['Red', 'Blue']);
    const template = await createClassificationTemplate(
      templatesSetId,
      label('authz template'),
      values('One')
    );
    expect(template.errors).toEqual([]);
    templateId = template.data!.createTemplate.id;
  });

  // Positive control: the Space's own admin may write — the denials below are about the persona.
  test('the Space admin can change the selection', async () => {
    const res = await updateClassificationEntrySelection(entry.id, [
      entry.values[0].id,
    ]);
    expect(res.errors).toEqual([]);
    expect(
      res.data?.updateClassificationEntrySelection.selectedValueIDs
    ).toEqual([entry.values[0].id]);
  });

  test.each([
    ['a plain member', TestUser.SPACE_MEMBER],
    ['a non-member', TestUser.NON_SPACE_MEMBER],
  ])(
    '%s is denied every classification write with FORBIDDEN_POLICY, and nothing changes',
    async (_who, user) => {
      const before = await spaceClassificationsOf(spaceId);
      const attempts = [
        [
          'addClassificationEntryFromTemplate',
          await addClassificationEntryFromTemplate(
            spaceId,
            templateId,
            label(`intruder ${user}`),
            user
          ),
        ],
        [
          'createClassificationEntry',
          await createClassificationEntry(
            spaceId,
            label(`intruder adhoc ${user}`),
            values('x'),
            {},
            user
          ),
        ],
        [
          'updateClassificationEntrySelection',
          await updateClassificationEntrySelection(entry.id, [], user),
        ],
        [
          'updateClassificationEntryDisplay',
          await updateClassificationEntryDisplay(entry.id, false, user),
        ],
        [
          'updateClassificationEntry',
          await updateClassificationEntry(
            entry.id,
            { displayLabel: label('renamed') },
            user
          ),
        ],
        [
          'deleteClassificationEntry',
          await deleteClassificationEntry(entry.id, user),
        ],
      ] as const;
      for (const [operation, res] of attempts) {
        expect(res.data, operation).toBeNull();
        expect(
          res.errors.map(e => e.extensions?.code),
          operation
        ).toEqual(['FORBIDDEN_POLICY']);
        expect(res.errors[0].message, operation).toContain(
          "unable to grant 'update' privilege"
        );
      }
      expect(await spaceClassificationsOf(spaceId)).toEqual(before);
    }
  );
});

describe('Space classifications — read surface (FR-010d, FR-017, FR-018b)', () => {
  test('a hidden entry is still returned, with display=false and its selection, to anonymous and non-member readers', async () => {
    const entry = await mustCreate('hidden', ['Alpha', 'Beta']);
    expect(
      (await updateClassificationEntrySelection(entry.id, [entry.values[1].id]))
        .errors
    ).toEqual([]);
    expect(
      (await updateClassificationEntryDisplay(entry.id, false)).errors
    ).toEqual([]);
    for (const reader of [
      undefined,
      TestUser.NON_SPACE_MEMBER,
      TestUser.SPACE_MEMBER,
    ]) {
      const res = await readSpaceClassifications(spaceId, reader);
      expect(res.errors, `read as ${reader ?? 'anonymous'}`).toEqual([]);
      const hidden = res.data?.lookup.space.about.classifications.find(
        e => e.id === entry.id
      );
      expect(hidden, `returned to ${reader ?? 'anonymous'}`).toMatchObject({
        display: false,
        selectedValueIDs: [entry.values[1].id],
      });
    }
  });

  test('entries are returned in addition order, and a removed-then-re-added entry moves to the end', async () => {
    // Zulu is added first but sorts last, so alphabetical and addition order disagree.
    const zulu = await mustCreate('order zulu', ['z']);
    const alpha = await mustCreate('order alpha', ['a']);
    const ours = async () =>
      (await spaceClassificationsOf(spaceId)).filter(e =>
        [zulu.displayLabel, alpha.displayLabel].includes(e.displayLabel)
      );
    expect((await ours()).map(e => e.displayLabel)).toEqual([
      zulu.displayLabel,
      alpha.displayLabel,
    ]);

    expect((await deleteClassificationEntry(zulu.id)).errors).toEqual([]);
    const readded = await mustCreate('order zulu', ['z']);
    const after = await ours();
    expect(after.map(e => e.displayLabel)).toEqual([
      alpha.displayLabel,
      readded.displayLabel,
    ]);
    expect(after[1].sortOrder).toBeGreaterThan(after[0].sortOrder);
    expect(after[1].selectedValueIDs).toEqual([]);
  });
});

describe('Space classifications — write rules (FR-002a, FR-011c, FR-012c)', () => {
  test.each([
    { count: 0, accepted: false, verdict: 'rejected' },
    { count: 1, accepted: true, verdict: 'accepted' },
    { count: 50, accepted: true, verdict: 'accepted' },
    { count: 51, accepted: false, verdict: 'rejected' },
  ])(
    'an ad-hoc entry with $count values is $verdict',
    async ({ count, accepted }) => {
      const res = await createClassificationEntry(
        spaceId,
        label(`bound ${count}`),
        Array.from({ length: count }, (_, i) => ({ label: `v${i}` }))
      );
      if (accepted) {
        expect(res.errors).toEqual([]);
        expect(res.data?.createClassificationEntry.values).toHaveLength(count);
      } else {
        expect(res.data).toBeNull();
        expect(res.errors.map(e => e.extensions?.code)).toEqual([
          'BAD_USER_INPUT',
        ]);
        expect(res.errors[0].message).toContain(
          count === 0 ? 'arrayMinSize' : 'arrayMaxSize'
        );
      }
    }
  );

  test.each([
    { count: 0, accepted: false, verdict: 'rejected' },
    { count: 1, accepted: true, verdict: 'accepted' },
    { count: 50, accepted: true, verdict: 'accepted' },
    { count: 51, accepted: false, verdict: 'rejected' },
  ])(
    'a classification template with $count values is $verdict',
    async ({ count, accepted }) => {
      const res = await createClassificationTemplate(
        templatesSetId,
        label(`template bound ${count}`),
        Array.from({ length: count }, (_, i) => ({ label: `v${i}` }))
      );
      if (accepted) {
        expect(res.errors).toEqual([]);
        expect(res.data?.createTemplate.classification.values).toHaveLength(
          count
        );
      } else {
        expect(res.data).toBeNull();
        expect(res.errors.map(e => e.extensions?.code)).toEqual([
          'BAD_USER_INPUT',
        ]);
      }
    }
  );

  test('a case/whitespace variant of an existing display label is rejected; the stored label keeps its casing', async () => {
    const original = await mustCreate('Casing Probe', ['x']);
    const variant = await createClassificationEntry(
      spaceId,
      `  ${original.displayLabel.toUpperCase()}   `,
      values('y')
    );
    expect(variant.data).toBeNull();
    expect(variant.errors.map(e => e.extensions?.code)).toEqual([
      'BAD_USER_INPUT',
    ]);
    expect(variant.errors[0].message).toContain('display label already exists');
    const labels = (await spaceClassificationsOf(spaceId)).map(
      e => e.displayLabel
    );
    expect(
      labels.filter(
        l => l.toLowerCase().trim() === original.displayLabel.toLowerCase()
      )
    ).toEqual([original.displayLabel]);
  });

  test('narrowing multi→single with two values selected is rejected atomically and names the selection', async () => {
    const entry = await mustCreate('narrow', ['Red', 'Blue']);
    const both = entry.values.map(v => v.id);
    expect(
      (await updateClassificationEntrySelection(entry.id, both)).errors
    ).toEqual([]);
    const res = await updateClassificationEntry(entry.id, {
      cardinality: 'SINGLE_SELECT',
    });
    expect(res.data).toBeNull();
    expect(res.errors.map(e => e.extensions?.code)).toEqual(['BAD_USER_INPUT']);
    expect(res.errors[0].extensions?.details).toEqual({
      selectedValueIDs: both,
    });
    const stored = (await spaceClassificationsOf(spaceId)).find(
      e => e.id === entry.id
    );
    expect(stored).toMatchObject({
      cardinality: 'MULTI_SELECT',
      selectedValueIDs: both,
    });
  });
});

describe('Space classifications — value ids (FR-002c, FR-010c, SC-007)', () => {
  test('template ids are slugified, duplicate labels are suffixed, a label rename keeps the id', async () => {
    const created = await createClassificationTemplate(
      templatesSetId,
      label('slugs'),
      [
        { label: 'Dutch' },
        { label: 'Dutch' },
        { label: "SDG's Goals" },
        { label: '13 · Climate Action' },
      ]
    );
    expect(created.errors).toEqual([]);
    const template = created.data!.createTemplate;
    expect(template.classification.values.map(v => v.id)).toEqual([
      'dutch',
      'dutch-2',
      'sdg-s-goals',
      '13-climate-action',
    ]);
    const renamed = await updateClassificationTemplateValues(
      template.id,
      template.classification.values.map(v =>
        v.id === 'dutch' ? { ...v, label: 'Nederlands' } : v
      )
    );
    expect(renamed.errors).toEqual([]);
    expect(renamed.data?.updateTemplate.classification.values[0]).toEqual({
      id: 'dutch',
      label: 'Nederlands',
    });
  });

  test('an explicit id that duplicates another id in the set is rejected, never suffixed', async () => {
    const res = await createClassificationTemplate(
      templatesSetId,
      label('dup ids'),
      [
        { label: 'A', id: 'same' },
        { label: 'B', id: 'same' },
      ]
    );
    expect(res.data).toBeNull();
    expect(res.errors.map(e => e.extensions?.code)).toEqual(['BAD_USER_INPUT']);
    expect(res.errors[0].extensions?.details).toEqual({ id: 'same' });
  });

  test('two Spaces that add the same template hold the template’s value ids verbatim and in order', async () => {
    const created = await createClassificationTemplate(
      templatesSetId,
      label('shared vocabulary'),
      values('Zeta', 'Alpha', 'Mu')
    );
    expect(created.errors).toEqual([]);
    const { id, classification } = created.data!.createTemplate;
    const onSpace = await addClassificationEntryFromTemplate(spaceId, id);
    const onSubspace = await addClassificationEntryFromTemplate(subspaceId, id);
    expect(onSpace.errors).toEqual([]);
    expect(onSubspace.errors).toEqual([]);
    expect(onSpace.data?.addClassificationEntryFromTemplate.values).toEqual(
      classification.values
    );
    expect(onSubspace.data?.addClassificationEntryFromTemplate.values).toEqual(
      classification.values
    );
  });
});
