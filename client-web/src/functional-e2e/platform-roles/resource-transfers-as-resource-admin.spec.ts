// workspace#027 — platform role redesign. Manual checklist E15, automated:
// Platform Resource Admin OWNS the account-to-account transfers, and the
// "Conversions & Transfers" section is the only Administration section the role
// is given — so the transfers must actually be usable from it.
//
// Both tests work on DISPOSABLE fixtures (an organization with a space and an
// Innovation Pack, and a second organization as the target), so nothing real
// moves on the day the defects below are fixed and the transfers go through.
import { expect } from '@playwright/test';
import {
  createInnovationPack,
  createOrganization,
  deleteInnovationPack,
  deleteOrganization,
  platformRoleEmail,
  seedPlatformRoleUsers,
  TestScenarioFactory,
} from '@alkemio/tests-lib';
import { OrganizationWithSpaceModel } from '@alkemio/tests-lib/scenario/models/OrganizationWithSpaceModel';
import { createPersonaTest } from '../fixtures/authenticated-session.fixture';

const baseUrl = process.env.ALKEMIO_BASE_URL || 'http://localhost:3000';
const asResourceAdmin = createPersonaTest(platformRoleEmail('PLATFORM_RESOURCE_ADMIN'));

let scenario: OrganizationWithSpaceModel;
let target: { id: string; nameID: string; displayName: string };
let pack: { id: string; nameID: string };

asResourceAdmin.describe('PLATFORM_RESOURCE_ADMIN — transfers from the Administration section', () => {
  asResourceAdmin.describe.configure({ mode: 'serial' });

  asResourceAdmin.beforeAll(async () => {
    asResourceAdmin.setTimeout(180_000);
    await seedPlatformRoleUsers();
    scenario = await TestScenarioFactory.createBaseScenario({
      name: 'pr-transfer-ui',
      space: {},
    });
    const uid = Math.random().toString(36).slice(2, 8);
    const displayName = `pr-transfer-target-${uid}`;
    const org = await createOrganization(displayName, `pr-xfer-tgt-${uid}`);
    target = { ...org.data!.createOrganization, displayName };
    const created = await createInnovationPack(
      scenario.organization.accountId,
      `pr-transfer-pack-${uid}`,
      `pr-xfer-pack-${uid}`
    );
    pack = created.data!.createInnovationPack;
  });

  asResourceAdmin.afterAll(async () => {
    if (pack) await deleteInnovationPack(pack.id).catch(() => undefined);
    // A space that DID move now lives on the target's account: the scenario
    // clean-up deletes it by id, so the order below works either way.
    if (scenario) await TestScenarioFactory.cleanUpBaseScenario(scenario).catch(() => undefined);
    if (target) await deleteOrganization(target.id).catch(() => undefined);
  });

  asResourceAdmin('Transfer Space: a confirmed transfer is sent to the server', async ({ page }) => {
    // KNOWN DEFECT (027), server + client:
    //  - server: `Organization.account` / `User.account` resolve to null for
    //    this role (gated on the owner's UPDATE / READ_USER_PII, opened only to
    //    ACCOUNT_LICENSE_MANAGE holders), so the client never learns the target
    //    account's id — although the role holds TRANSFER_RESOURCE_ACCEPT on it;
    //  - client: `useTransferSpace.handleTransfer` then returns silently. The
    //    target resolves by name, Transfer is enabled, the confirm dialog opens
    //    and closes — and NO request is made, no error is shown.
    // Expected to fail until both are fixed — then this turns RED: delete it.
    asResourceAdmin.fail(true, '027: target account id is null for Resource Admin; client returns silently');

    await page.goto(`${baseUrl}/admin/transfer`);
    const main = page.getByRole('main');
    const source = main.getByRole('textbox', { name: 'Source space URL (L0)' });
    await source.fill(`${baseUrl}/${scenario.space.nameId}`);
    await source.press('Enter');
    const owner = main.getByRole('textbox', { name: 'Target account URL (user or organisation)' });
    await owner.fill(`${baseUrl}/organization/${target.nameID}`);
    await owner.press('Enter');
    await expect(main.getByText(target.displayName, { exact: true })).toBeVisible({ timeout: 20_000 });

    const sent = page.waitForRequest(
      request =>
        request.url().includes('/graphql') &&
        request.postDataJSON()?.operationName === 'TransferSpaceToAccount',
      { timeout: 10_000 }
    );
    await main.getByRole('button', { name: 'Transfer', exact: true }).click();
    const confirm = page.getByRole('alertdialog', { name: 'Confirm space transfer' });
    await confirm.getByRole('button', { name: 'Transfer', exact: true }).click();
    const response = await (await sent).response();
    expect((await response!.json()).errors, 'transferSpaceToAccount errors').toBeUndefined();
  });

  asResourceAdmin('Transfer Innovation Pack: the target account can be found', async ({ page }) => {
    // KNOWN DEFECT (027), client: the hub / pack / VC cards pick the target
    // through `platformAdmin.users` / `platformAdmin.organizations`. The server
    // refuses both to this role — correctly: Resource Admin may not list users
    // or organizations — so the picker always reads "No matching accounts."
    // and these three transfers cannot be started from the UI at all.
    // Expected to fail until the picker stops depending on those lists.
    asResourceAdmin.fail(true, '027: target picker uses lists Resource Admin may not read');

    await page.goto(`${baseUrl}/admin/transfer`);
    const main = page.getByRole('main');
    // "Source URL" boxes, in page order: convert space, convert VC, hub, PACK, VC.
    const source = main.getByRole('textbox', { name: 'Source URL', exact: true }).nth(3);
    await source.fill(`${baseUrl}/innovation-packs/${pack.nameID}`);
    await source.press('Enter');
    const search = main.getByRole('searchbox', { name: 'Search users or organisations…' });
    await expect(search).toBeVisible({ timeout: 20_000 });
    await search.pressSequentially(target.displayName, { delay: 20 });
    await expect(page.getByText(/\(Organi[sz]ation\)/).filter({ hasText: target.displayName })).toBeVisible({
      timeout: 15_000,
    });
  });
});
