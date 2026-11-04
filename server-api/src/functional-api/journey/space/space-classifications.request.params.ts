/**
 * Raw GraphQL wrappers for Space classifications (workspace#024-classifications).
 *
 * Inline documents rather than codegen operations: the generated schema in
 * `lib` already carries the types, and these cases assert on the raw
 * `errors[].extensions` of denials and validation failures, which the shared
 * `graphqlErrorWrapper` reshapes. `postGraphqlRaw` keeps both `data` and
 * `errors`; omitting `as` sends the request anonymously.
 */
import { postGraphqlRaw, TestUser, TestUserManager } from '@alkemio/tests-lib';

export type GqlError = {
  message: string;
  extensions?: { code?: string; details?: Record<string, unknown> };
};
export type GqlResult<T> = { data: T | null; errors: GqlError[] };

export type Cardinality = 'MULTI_SELECT' | 'SINGLE_SELECT';
export type ClassificationValue = { id: string; label: string };
export type ClassificationEntry = {
  id: string;
  displayLabel: string;
  display: boolean;
  sortOrder: number;
  cardinality: Cardinality;
  selectedValueIDs: string[];
  values: ClassificationValue[];
};

const ENTRY =
  'id displayLabel display sortOrder cardinality selectedValueIDs values { id label }';

export const classificationsRequest = async <T>(
  query: string,
  variables: Record<string, unknown> = {},
  as?: TestUser
): Promise<GqlResult<T>> => {
  const bearerToken = as
    ? TestUserManager.getUserModelByType(as).authToken
    : undefined;
  const res = await postGraphqlRaw<T>(query, { variables, bearerToken });
  if (res.status !== 200 || !res.body || typeof res.body !== 'object') {
    throw new Error(
      `GraphQL transport failure (HTTP ${res.status}): ${res.raw}`
    );
  }
  return {
    data: (res.body.data ?? null) as T | null,
    errors: (res.body.errors ?? []) as unknown as GqlError[],
  };
};

/** A set-up or read call that must simply work. */
export const classificationsOk = async <T>(
  query: string,
  variables: Record<string, unknown> = {},
  as: TestUser = TestUser.SPACE_ADMIN
): Promise<T> => {
  const { data, errors } = await classificationsRequest<T>(
    query,
    variables,
    as
  );
  if (errors.length > 0 || !data) {
    throw new Error(
      `classifications call failed: ${errors.map(e => `${e.extensions?.code}: ${e.message}`).join(' | ') || 'no data'}`
    );
  }
  return data;
};

export const readSpaceClassifications = (spaceId: string, as?: TestUser) =>
  classificationsRequest<{
    lookup: { space: { about: { classifications: ClassificationEntry[] } } };
  }>(
    `query SpaceClassifications($spaceId: UUID!) {
      lookup { space(ID: $spaceId) { about { classifications { ${ENTRY} } } } }
    }`,
    { spaceId },
    as
  );

export const spaceClassificationsOf = async (spaceId: string) => {
  const res = await readSpaceClassifications(spaceId, TestUser.SPACE_ADMIN);
  if (res.errors.length > 0 || !res.data) {
    throw new Error(`read failed: ${JSON.stringify(res.errors)}`);
  }
  return res.data.lookup.space.about.classifications;
};

export const templatesSetOfSpace = async (spaceId: string) =>
  (
    await classificationsOk<{
      lookup: { space: { templatesManager: { templatesSet: { id: string } } } };
    }>(
      `query SpaceTemplatesSet($spaceId: UUID!) {
        lookup { space(ID: $spaceId) { templatesManager { templatesSet { id } } } }
      }`,
      { spaceId },
      TestUser.GLOBAL_ADMIN
    )
  ).lookup.space.templatesManager.templatesSet.id;

export const createClassificationTemplate = (
  templatesSetID: string,
  displayName: string,
  values: { label: string; id?: string }[],
  cardinality: Cardinality = 'MULTI_SELECT',
  as: TestUser = TestUser.SPACE_ADMIN
) =>
  classificationsRequest<{
    createTemplate: {
      id: string;
      classification: { values: ClassificationValue[] };
    };
  }>(
    `mutation ClassificationTemplateCreate($data: CreateTemplateOnTemplatesSetInput!) {
      createTemplate(templateData: $data) { id classification { values { id label } } }
    }`,
    {
      data: {
        templatesSetID,
        type: 'CLASSIFICATION',
        profileData: { displayName, description: `e2e024 ${displayName}` },
        classificationData: { cardinality, values },
      },
    },
    as
  );

export const updateClassificationTemplateValues = (
  templateId: string,
  values: { label: string; id?: string }[],
  cardinality: Cardinality = 'MULTI_SELECT'
) =>
  classificationsRequest<{
    updateTemplate: { classification: { values: ClassificationValue[] } };
  }>(
    `mutation ClassificationTemplateUpdate($data: UpdateTemplateInput!) {
      updateTemplate(updateData: $data) { classification { values { id label } } }
    }`,
    { data: { ID: templateId, classificationData: { cardinality, values } } },
    TestUser.SPACE_ADMIN
  );

export const addClassificationEntryFromTemplate = (
  spaceID: string,
  templateID: string,
  displayLabel?: string,
  as: TestUser = TestUser.SPACE_ADMIN
) =>
  classificationsRequest<{
    addClassificationEntryFromTemplate: ClassificationEntry;
  }>(
    `mutation ClassificationEntryAdd($data: AddClassificationEntryFromTemplateInput!) {
      addClassificationEntryFromTemplate(classificationData: $data) { ${ENTRY} }
    }`,
    { data: { spaceID, templateID, displayLabel } },
    as
  );

export const createClassificationEntry = (
  spaceID: string,
  displayLabel: string,
  values: { label: string; id?: string }[],
  options: { cardinality?: Cardinality; selectedValueIDs?: string[] } = {},
  as: TestUser = TestUser.SPACE_ADMIN
) =>
  classificationsRequest<{ createClassificationEntry: ClassificationEntry }>(
    `mutation ClassificationEntryCreate($data: CreateClassificationEntryInput!) {
      createClassificationEntry(classificationData: $data) { ${ENTRY} }
    }`,
    {
      data: {
        spaceID,
        displayLabel,
        cardinality: options.cardinality ?? 'MULTI_SELECT',
        values,
        selectedValueIDs: options.selectedValueIDs,
      },
    },
    as
  );

export const updateClassificationEntrySelection = (
  classificationEntryID: string,
  selectedValueIDs: string[],
  as: TestUser = TestUser.SPACE_ADMIN
) =>
  classificationsRequest<{
    updateClassificationEntrySelection: ClassificationEntry;
  }>(
    `mutation ClassificationEntrySelect($data: UpdateClassificationEntrySelectionInput!) {
      updateClassificationEntrySelection(classificationData: $data) { ${ENTRY} }
    }`,
    { data: { classificationEntryID, selectedValueIDs } },
    as
  );

export const updateClassificationEntryDisplay = (
  classificationEntryID: string,
  display: boolean,
  as: TestUser = TestUser.SPACE_ADMIN
) =>
  classificationsRequest<{
    updateClassificationEntryDisplay: ClassificationEntry;
  }>(
    `mutation ClassificationEntryDisplay($data: UpdateClassificationEntryDisplayInput!) {
      updateClassificationEntryDisplay(classificationData: $data) { ${ENTRY} }
    }`,
    { data: { classificationEntryID, display } },
    as
  );

export const updateClassificationEntry = (
  classificationEntryID: string,
  update: {
    displayLabel?: string;
    cardinality?: Cardinality;
    values?: { label: string; id?: string }[];
  },
  as: TestUser = TestUser.SPACE_ADMIN
) =>
  classificationsRequest<{ updateClassificationEntry: ClassificationEntry }>(
    `mutation ClassificationEntryUpdate($data: UpdateClassificationEntryInput!) {
      updateClassificationEntry(classificationData: $data) { ${ENTRY} }
    }`,
    { data: { classificationEntryID, ...update } },
    as
  );

export const deleteClassificationEntry = (
  ID: string,
  as: TestUser = TestUser.SPACE_ADMIN
) =>
  classificationsRequest<{ deleteClassificationEntry: { id: string } }>(
    `mutation ClassificationEntryDelete($data: DeleteClassificationEntryInput!) {
      deleteClassificationEntry(classificationData: $data) { id }
    }`,
    { data: { ID } },
    as
  );
