import { expect } from '@playwright/test';
import {
  readOrganization,
  readOrganizationVerification,
  TestScenarioFactory,
} from '@alkemio/tests-lib';
import type { OrganizationWithSpaceModel } from '@alkemio/tests-lib/scenario/models/OrganizationWithSpaceModel';
import { must } from '../helpers/lib-actor.helper';

/**
 * Shared set-up and reads for the Administration › Organisations walks (W2
 * journey 12, docs/qa/server-rebuild/plan.md § W2, audit L2 / H5). The list's
 * row and delete helpers are contributors-crud's (`adminOrganizationRow`), so
 * one page object serves every admin-organisation case.
 */

export {
  expectMutationAnswered,
  openPersonaPage,
  type PersonaPage,
} from '../helpers/space-access.helper';
export {
  adminOrganizationRow,
  runCleanup,
  runId,
  teardownScenario,
} from '../contributors-crud/contributors-crud.helpers';

/**
 * An organisation-only scenario left UNVERIFIED (contributors-crud's
 * `seedOrganizationScenario` verifies it), so the admin's toggle has a
 * state to change.
 */
export const seedUnverifiedOrganization = async (
  name: string
): Promise<OrganizationWithSpaceModel> => {
  const scenario = await TestScenarioFactory.createBaseScenarioOrganization({
    name,
  });
  expect(scenario.scenarioSetupSucceeded, `scenario '${name}' set up`).toBe(
    true
  );
  return scenario;
};

/** The organisation's verification status as the server holds it. */
export const serverVerification = async (organizationId: string) =>
  must(
    await readOrganizationVerification(organizationId),
    `readOrganizationVerification(${organizationId})`
  ).organization.verification.status;

/** The organisation as the server holds it (platform admin read); its profile always exists. */
export const serverOrganization = async (organizationId: string) => {
  const org = must(
    await readOrganization(organizationId),
    `readOrganization(${organizationId})`
  ).organization;
  return { ...org, profile: org.profile! };
};
