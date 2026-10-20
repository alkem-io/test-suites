/**
 * `adminRepairTemplateFiles` (server#6596 / server#6656) as the template-repair
 * specs call it.
 *
 * The negatives have to see the GraphQL error object (`extensions.code` and
 * `message`) and the caller may be anonymous or a platform-role user that is not
 * a `TestUser`, so this is a thin POST rather than the generated SDK (which
 * throws) or `graphqlErrorWrapper` (which only knows `TestUser`).
 */
import { TestUser, TestUserManager } from '@alkemio/tests-lib';
import type {
  AdminRepairTemplateFilesMutation,
  AdminTemplateFileRepairInput,
} from '@alkemio/tests-lib/core/generated/alkemio-schema';
import { postGraphqlRaw } from '@functional-api/graphql-guard/me-degradation.request.params';

const ADMIN_REPAIR_TEMPLATE_FILES = `
  mutation adminRepairTemplateFiles($repairData: AdminTemplateFileRepairInput!) {
    adminRepairTemplateFiles(repairData: $repairData) {
      dryRun
      templatesScanned
      templatesWithForeignFiles
      copiedReferences
      references {
        templateID
        templateName
        location
        entityID
        fileID
        storageBucketID
        ownerCanRead
        copied
      }
      missingFiles {
        templateID
        templateName
        location
        entityID
        fileID
      }
      failed {
        templateID
        location
        entityID
        reason
      }
    }
  }
`;

export type GraphqlErrorShape = {
  message: string;
  extensions?: { code?: string };
};

/**
 * Who calls. A `TestUser` is itself a string enum, so a bare string cannot be
 * both "a TestUser" and "a raw bearer": the two are tagged.
 */
export type RepairCaller =
  | { user: TestUser }
  | { token: string }
  | { anonymous: true };

const bearerOf = (caller: RepairCaller): string | undefined =>
  'token' in caller
    ? caller.token
    : 'user' in caller
      ? TestUserManager.getUserModelByType(caller.user).authToken
      : undefined;

export const adminRepairTemplateFiles = async (
  repairData: Partial<AdminTemplateFileRepairInput>,
  caller: RepairCaller
): Promise<{
  data?: AdminRepairTemplateFilesMutation;
  error?: GraphqlErrorShape;
}> => {
  const response = await postGraphqlRaw<AdminRepairTemplateFilesMutation>(
    ADMIN_REPAIR_TEMPLATE_FILES,
    bearerOf(caller),
    { repairData }
  );
  // A GraphQL answer carries `data` and/or `errors`; anything else (a 401/429
  // body, an HTML page) is a transport failure, never "no error".
  if (
    !response.body ||
    typeof response.body !== 'object' ||
    !('data' in response.body || 'errors' in response.body)
  ) {
    throw new Error(
      `adminRepairTemplateFiles: non-GraphQL response (HTTP ${response.status}): ${response.raw.slice(0, 200)}`
    );
  }
  return {
    data: response.body.data ?? undefined,
    error: response.body.errors?.[0] as GraphqlErrorShape | undefined,
  };
};
