// spec: client-web/src/functional-e2e/contributors-crud/contributors-crud-test-plan.md
// Story: alkem-io/alkemio#1699 (QA P1: Contributors - CRUD Full), section "Virtual Contributor".
//
// Since alkem-io/client-web#10398 (shipped) VCs are paused: nobody can
// create one, add one to a Space or mention one, while existing VCs stay
// visible, editable and deletable. So the VCs here are seeded over the API on
// the scenario organisation's account, the cases for the paused steps pin
// the pause itself (they go red the day VCs come back, which is the signal
// to restore the story's original flow), and every other case drives the UI
// that still exists. Writes are proven by the reloaded page AND the API.

import { test, expect } from '@playwright/test';
import {
  AiPersonaEngine,
  createCalloutWithData,
  createVirtualContributorWithData,
  readCalloutContributions,
  readCalloutsSetCallouts,
  readVirtualContributor,
  SearchVisibility,
  TestUser,
  TestUserManager,
  updateVirtualContributorSettings,
  updateVirtualContributorVisibility,
  VirtualContributorBodyOfKnowledgeType,
  SpacePrivacyMode,
  CalloutFramingType,
} from '@alkemio/tests-lib';
import path from 'path';
import type { OrganizationWithSpaceModel } from '@alkemio/tests-lib/scenario/models/OrganizationWithSpaceModel';
import { must } from '../helpers/lib-actor.helper';
import {
  expectMutationAnswered,
  openPersonaPage,
  type PersonaPage,
} from '../helpers/space-access.helper';
import {
  baseUrl,
  deleteVcIfPresent,
  escapeRegExp,
  expectSettingsTabs,
  orgSettingsUrl,
  runCleanup,
  runId,
  teardownScenario,
  vcPausedNotice,
} from './contributors-crud.helpers';
import { TestScenarioFactory } from '@alkemio/tests-lib';

const RUN = runId();
const documentFile = path.resolve(
  __dirname,
  '../../../../server-api/src/functional-api/storage/files-to-upload/doc.pdf'
);

type SeededVc = {
  id: string;
  nameId: string;
  url: string;
  name: string;
  kbCalloutsSetId: string;
};

let scenario: OrganizationWithSpaceModel | undefined;
let orgAdmin: PersonaPage | undefined;
let member: PersonaPage | undefined;
/** Additive cases only (knowledge, profile, mention, BoK visit). */
let vcMain: SeededVc | undefined;
/** 3.7 hides it. */
let vcHidden: SeededVc | undefined;
/** 3.9 deletes it. */
let vcDoomed: SeededVc | undefined;
/** A post seeded into vcMain's knowledge base for the BoK visit (3.8). */
const seededPost = {
  title: `Seeded knowledge ${RUN}`,
  body: `Seeded body ${RUN}`,
};

/** A VC with its own knowledge base on the scenario organisation's account, visible to everyone. */
const seedVc = async (label: string): Promise<SeededVc> => {
  const name = `Crud VC ${label} ${RUN}`;
  const nameId = `crud-vc-${label}-${RUN}`;
  const vc = must(
    await createVirtualContributorWithData(
      {
        accountID: scenario!.organization.accountId,
        nameID: nameId,
        profileData: { displayName: name, description: `About ${name}` },
        aiPersona: { engine: AiPersonaEngine.Guidance },
        bodyOfKnowledgeType:
          VirtualContributorBodyOfKnowledgeType.AlkemioKnowledgeBase,
        knowledgeBaseData: {
          profile: { displayName: `KB ${name}` },
          calloutsSetData: {},
        },
      },
      TestUser.GLOBAL_ADMIN
    ),
    `create VC ${name}`
  ).createVirtualContributor;
  try {
    must(
      await updateVirtualContributorVisibility(vc.id, {
        searchVisibility: SearchVisibility.Public,
      }),
      `make ${name} public`
    );
  } catch (error) {
    // Nothing tracks the id yet: a VC left behind blocks its account's deletion.
    await deleteVcIfPresent(vc.id);
    throw error;
  }
  return {
    id: vc.id,
    nameId,
    url: vc.profile!.url,
    name,
    kbCalloutsSetId: vc.knowledgeBase!.calloutsSet!.id,
  };
};

test.beforeAll(async ({ browser }) => {
  test.setTimeout(180_000);
  scenario = await TestScenarioFactory.createBaseScenario({
    name: `vc-crud-${RUN}`,
    organization: { verification: { setVerified: true } },
    space: {
      collaboration: { addPostCallout: true, addTutorialCallouts: false },
      community: {
        admins: [TestUser.SPACE_ADMIN],
        members: [TestUser.SPACE_MEMBER],
      },
      settings: { privacy: { mode: SpacePrivacyMode.Public } },
    },
  });
  expect(scenario.scenarioSetupSucceeded, 'VC scenario set up').toBe(true);
  // The account's VC entitlement is 3 (ACCOUNT_LICENSE_PLUS): exactly these three.
  vcMain = await seedVc('main');
  vcHidden = await seedVc('hidden');
  vcDoomed = await seedVc('doomed');
  // The plan's BoK visit is by a non-member: open vcMain's knowledge base to
  // users without access (the default keeps it closed to them).
  must(
    await updateVirtualContributorSettings({
      virtualContributorID: vcMain.id,
      settings: { privacy: { knowledgeBaseContentVisible: true } },
    }),
    'open vcMain knowledge base to non-members'
  );
  must(
    await createCalloutWithData({
      calloutsSetID: vcMain.kbCalloutsSetId,
      framing: {
        profile: {
          displayName: seededPost.title,
          description: seededPost.body,
        },
        type: CalloutFramingType.None,
      },
    }),
    'seed a knowledge-base post'
  );
  orgAdmin = await openPersonaPage(
    browser,
    TestUserManager.users.organizationAdmin.email
  );
  member = await openPersonaPage(
    browser,
    TestUserManager.users.spaceMember.email
  );
});

// File level, so it also runs when a failure retires the worker mid-file.
test.afterAll(async () => {
  // VCs block their account's deletion: remove them before the organisation.
  await runCleanup([
    ['close orgAdmin', () => orgAdmin?.close() ?? Promise.resolve()],
    ['close member', () => member?.close() ?? Promise.resolve()],
    ['delete vcMain', () => deleteVcIfPresent(vcMain?.id)],
    ['delete vcHidden', () => deleteVcIfPresent(vcHidden?.id)],
    ['delete vcDoomed', () => deleteVcIfPresent(vcDoomed?.id)],
    ['teardown scenario', () => teardownScenario(scenario)],
  ]);
});

const knowledgeFeed = (page: PersonaPage['page']) =>
  page.getByRole('main').getByRole('region', { name: 'Space content feed' });

/** Creates a post in a VC knowledge base through the page's Add → Create Post dialog. */
const openCreatePost = async (page: PersonaPage['page'], vc: SeededVc) => {
  await page.goto(`${vc.url}/knowledge-base`);
  await expect(
    page.getByRole('heading', { level: 1, name: 'Knowledge Base' })
  ).toBeVisible();
  await page
    .getByRole('main')
    .getByRole('button', { name: 'Add', exact: true })
    .first()
    .click();
  const dialog = page.getByRole('dialog', { name: 'Create Post', exact: true });
  await expect(dialog).toBeVisible();
  return dialog;
};

const kbCalloutNamed = async (vc: SeededVc, title: string) =>
  (
    must(
      await readCalloutsSetCallouts(vc.kbCalloutsSetId),
      'knowledge-base callouts'
    ).lookup.calloutsSet?.callouts ?? []
  ).find(c => c.framing.profile.displayName === title);

test.describe('Contributors CRUD — Virtual Contributor', () => {
  test.skip('3.0 Manually go through whole flow - all flows together', async ({
    page,
  }) => {
    await page.getByRole('tab', { name: 'account' }).click();
    await page.getByRole('button', { name: 'Add' }).nth(1).click();
    await page.getByRole('textbox', { name: 'Name' }).click();
    await page
      .getByRole('textbox', { name: 'Name' })
      .fill('vc name of some sort');
    await page.getByRole('textbox', { name: 'Tagline' }).click();
    await page
      .getByRole('textbox', { name: 'Tagline' })
      .fill('tagline of some sort');
    await page
      .getByRole('textbox', { name: 'Markdown editor' })
      .getByRole('paragraph')
      .click();
    await page
      .getByRole('textbox', { name: 'Markdown editor' })
      .fill('vs decription here');
    await page
      .getByRole('button', { name: 'Written knowledge in text AI' })
      .click();

    await page.getByRole('button', { name: 'Create' }).click();
    await page.getByRole('textbox', { name: 'Markdown editor' }).click();
    await page.getByRole('textbox', { name: 'Post title' }).click();
    await page.getByRole('button', { name: 'Continue' }).click();
    await page
      .getByRole('button', { name: 'Proceed without membership' })
      .click();
    await page
      .getByRole('button', { name: 'Proceed without membership' })
      .click();
    await page.getByRole('link', { name: "Visit big bang's Profile" }).click();
    await page.getByRole('button', { name: 'Visit' }).click();
    await page
      .getByText(
        'Tip: Create a structured and specific text, for example: Background Alkemio,'
      )
      .click();
    await page.getByRole('button', { name: 'Post' }).click();
    await page.getByRole('textbox', { name: 'Title' }).click();
    await page.getByRole('textbox', { name: 'Title' }).fill('new post by VC');
    await page.getByRole('button', { name: 'Post' }).click();
    await page.getByRole('button', { name: 'Update Knowledge' }).click();
    await page.getByText('Body of Knowledge ingestion').click();
    await page.getByRole('button', { name: 'Close' }).click();
  });

  test("3.1 creating a VC is paused (client-web#10398): the Account tab lists the host's VCs and shows the upgrade notice instead of a create action", async () => {
    const page = orgAdmin!.page;
    await page.goto(orgSettingsUrl(scenario!.organization.nameId, 'account'));
    await page
      .getByRole('heading', { level: 3, name: /^Virtual Contributors / })
      .getByRole('button')
      .click();
    for (const vc of [vcMain!, vcHidden!, vcDoomed!]) {
      await expect(
        page.getByRole('main').getByRole('link', { name: vc.name, exact: true })
      ).toBeVisible();
    }
    await expect(vcPausedNotice(page)).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Create new contributor', exact: true })
    ).toHaveCount(0);
    // Positive control: the same account still offers to create a template pack.
    await page
      .getByRole('heading', { level: 3, name: /^Template Packs / })
      .getByRole('button')
      .click();
    await expect(
      page.getByRole('button', { name: 'Create new pack', exact: true })
    ).toBeVisible();
  });

  // Known defect alkem-io/client-web#10125: today no knowledge-base post renders — the client requests classification.flowState and the server throws ENTITY_NOT_FOUND, so the feed stays on "Loading Post". Drop the skip when fixed.
  test.skip('3.2 the host adds a text post to the VC knowledge base; it is stored and listed there (alkem-io/client-web#10125)', async () => {
    const page = orgAdmin!.page;
    const title = `KB post ${RUN}`;
    const dialog = await openCreatePost(page, vcMain!);
    await dialog
      .getByRole('textbox', { name: 'Title', exact: true })
      .fill(title);
    await dialog
      .getByRole('textbox', { name: 'Write something...', exact: true })
      .fill(`Knowledge text ${RUN}`);
    await dialog.getByRole('button', { name: 'Post', exact: true }).click();
    await expect(dialog).toBeHidden();

    await expect
      .poll(async () => (await kbCalloutNamed(vcMain!, title))?.id)
      .toBeTruthy();
    await page.reload();
    await expect(
      knowledgeFeed(page).getByRole('heading', { name: title, exact: true })
    ).toBeVisible();
  });

  // Known defect alkem-io/client-web#10125: today no knowledge-base post renders — the client requests classification.flowState and the server throws ENTITY_NOT_FOUND, so the feed stays on "Loading Post". Drop the skip when fixed.
  test.skip('3.3 the host adds a document to the VC knowledge base; it is stored as a file link and listed there (alkem-io/client-web#10125)', async () => {
    const page = orgAdmin!.page;
    const title = `KB document ${RUN}`;
    const dialog = await openCreatePost(page, vcMain!);
    await dialog
      .getByRole('textbox', { name: 'Title', exact: true })
      .fill(title);
    await dialog
      .getByRole('radio', { name: 'Links & Files', exact: true })
      .click();
    await dialog
      .getByRole('button', { name: 'Add another link', exact: true })
      .click();
    // The pre-populated link row: its "Title" shares the post title's label, so go by placeholder.
    await dialog
      .getByPlaceholder('Link title', { exact: true })
      .fill(`Document ${RUN}`);
    const chooser = page.waitForEvent('filechooser');
    await dialog
      .getByRole('button', { name: 'Attach file', exact: true })
      .click();
    await (await chooser).setFiles(documentFile);
    await expect(
      dialog.getByRole('textbox', { name: 'URL', exact: true })
    ).toHaveValue(/^https?:\/\/.+/);
    await dialog.getByRole('button', { name: 'Post', exact: true }).click();
    await expect(dialog).toBeHidden();

    await expect
      .poll(async () => (await kbCalloutNamed(vcMain!, title))?.id)
      .toBeTruthy();
    const callout = (await kbCalloutNamed(vcMain!, title))!;
    const counts = must(
      await readCalloutContributions(callout.id),
      'document callout contributions'
    ).lookup.callout!.contributionsCount;
    expect(counts.link).toBe(1);
    await page.reload();
    await expect(
      knowledgeFeed(page).getByRole('heading', { name: title, exact: true })
    ).toBeVisible();
  });

  test('3.4 adding a VC to a Space is paused (client-web#10398): Space settings › Community lists its VCs and shows the upgrade notice instead of the add actions', async ({
    browser,
  }) => {
    const admin = await openPersonaPage(
      browser,
      TestUserManager.users.spaceAdmin.email
    );
    try {
      const page = admin.page;
      await page.goto(
        `${baseUrl}/${scenario!.space.nameId}/settings/community`
      );
      // Positive control: the members table of the same tab rendered.
      await expect(
        page.getByRole('heading', { level: 3, name: /^Space Members / })
      ).toBeVisible();
      await page
        .getByRole('heading', { level: 3, name: /^Virtual Contributors / })
        .getByRole('button')
        .click();
      await expect(vcPausedNotice(page)).toBeVisible();
      await expect(
        page.getByRole('button', {
          name: 'Add Virtual Contributor',
          exact: true,
        })
      ).toHaveCount(0);
      await expect(
        page.getByRole('button', {
          name: 'Invite External Virtual Contributor',
          exact: true,
        })
      ).toHaveCount(0);
    } finally {
      await admin.close();
    }
  });

  test('3.5 mentioning a VC is paused (client-web#10398): the comment box offers the VC as "Temporarily unavailable" and picking it inserts nothing', async () => {
    const page = member!.page;
    await page.goto(`${baseUrl}/${scenario!.space.nameId}`);
    const callout = page
      .getByRole('region', { name: 'Space content feed' })
      .getByRole('heading', {
        level: 3,
        name: scenario!.space.collaboration.calloutPostDisplayName,
        exact: true,
      });
    await expect(callout).toBeVisible();
    await callout.click();
    const dialog = page.getByRole('dialog', {
      name: scenario!.space.collaboration.calloutPostDisplayName,
    });
    const comment = dialog
      .getByRole('textbox', { name: 'Add a comment...' })
      .or(dialog.getByRole('combobox', { name: 'Add a comment...' }));
    await expect(comment).toBeVisible();

    // Positive control first: a user is offered and picking them inserts the mention.
    await comment.click();
    await comment.pressSequentially('@space');
    const userOption = page
      .getByRole('listbox')
      .getByRole('option', { name: /^space admin/ });
    await expect(userOption).toBeVisible();
    await userOption.click();
    await expect(comment).toHaveValue(/@space admin/);

    await comment.fill('');
    const typed = '@Crud VC main';
    await comment.pressSequentially(typed);
    const vcOption = page.getByRole('listbox').getByRole('option', {
      name: new RegExp(`^${escapeRegExp(vcMain!.name)}`),
    });
    await expect(vcOption).toBeVisible();
    await expect(vcOption.getByText(/^Temporarily unavailable/)).toBeVisible();
    await vcOption.click();
    await expect(comment).toHaveValue(typed);
  });

  test("3.6 a signed-in user reaches the VC profile from its host's profile; it shows the name, the host and the Body of Knowledge", async () => {
    const page = member!.page;
    await page.goto(`${baseUrl}/organization/${scenario!.organization.nameId}`);
    await page
      .getByRole('tablist', { name: 'Resource sections' })
      .getByRole('tab', { name: 'Other Resources' })
      .click();
    // The resource card is a link named "<VC name> Virtual Contributor".
    const card = page.getByRole('main').getByRole('link', {
      name: `${vcMain!.name} Virtual Contributor`,
      exact: true,
    });
    await expect(card).toBeVisible();
    await card.click();
    await expect(page).toHaveURL(vcMain!.url);
    await expect(
      page.getByRole('heading', { level: 1, name: vcMain!.name, exact: true })
    ).toBeVisible();
    await expect(
      page.getByRole('main').getByText(`About ${vcMain!.name}`, { exact: true })
    ).toBeVisible();
    await expect(
      page.getByRole('main').getByRole('link', {
        name: scenario!.organization.profile.displayName,
        exact: true,
      })
    ).toHaveAttribute(
      'href',
      `${baseUrl}/organization/${scenario!.organization.nameId}`
    );
    await expect(
      page.getByRole('heading', { level: 3, name: 'Body of Knowledge' })
    ).toBeVisible();
    await expect(
      page.getByRole('main').getByRole('link', { name: 'Visit', exact: true })
    ).toHaveAttribute('href', `${vcMain!.url}/knowledge-base`);
    // The visitor does not administer the VC.
    await expect(
      page.getByRole('link', { name: 'Open virtual contributor settings' })
    ).toHaveCount(0);
  });

  test('3.7 the host sets a VC to Hidden on its Settings tab; it is saved and survives a reload', async () => {
    const page = orgAdmin!.page;
    await page.goto(`${vcHidden!.url}/settings/settings`);
    await expectSettingsTabs(page, ['Profile', 'Membership', 'Settings']);
    const hidden = page.getByRole('radio', { name: /^Hidden / });
    await expect(page.getByRole('radio', { name: /^Public / })).toBeChecked();
    await hidden.click();
    await expect(hidden).toBeChecked();
    await expect
      .poll(
        async () =>
          must(await readVirtualContributor(vcHidden!.id), 'VC visibility')
            .lookup.virtualContributor?.searchVisibility
      )
      .toBe(SearchVisibility.Hidden);
    await page.reload();
    await expect(page.getByRole('radio', { name: /^Hidden / })).toBeChecked();
  });

  // Known defect (QA-PF-02 on test-suites#492, issue pending — put its number here once filed): today the switch writes the opposite of its label, "Hide" ON sends knowledgeBaseContentVisible: true and exposes the content. Drop the skip when fixed.
  test.skip('3.7b the host\'s "Hide knowledge-base content from non-members" switch reads ON exactly when the content is hidden, before and after a toggle (QA-PF-02, issue pending)', async () => {
    const page = orgAdmin!.page;
    const contentVisible = async () =>
      must(await readVirtualContributor(vcHidden!.id), 'VC privacy').lookup
        .virtualContributor?.settings.privacy.knowledgeBaseContentVisible;
    const hide = page.getByRole('switch', {
      name: 'Hide knowledge-base content from non-members',
      exact: true,
    });

    await page.goto(`${vcHidden!.url}/settings/settings`);
    const before = await contentVisible();
    await expect(
      hide,
      `stored knowledgeBaseContentVisible=${before}`
    ).toBeChecked({ checked: before === false });

    await hide.click();
    await expect.poll(contentVisible).toBe(!before);
    await page.reload();
    await expect(
      hide,
      `stored knowledgeBaseContentVisible=${!before}`
    ).toBeChecked({ checked: before === true });
  });

  // Known defect alkem-io/client-web#10125: today no knowledge-base post renders — the client requests classification.flowState and the server throws ENTITY_NOT_FOUND, so the feed stays on "Loading Post". Drop the skip when fixed.
  test.skip('3.8 a signed-in user visits the Body of Knowledge from the VC profile and reads the knowledge in it (alkem-io/client-web#10125)', async () => {
    const page = member!.page;
    await page.goto(vcMain!.url);
    const visit = page
      .getByRole('main')
      .getByRole('link', { name: 'Visit', exact: true });
    await expect(visit).toBeVisible();
    await visit.click();
    await expect(page).toHaveURL(`${vcMain!.url}/knowledge-base`);
    await expect(
      page.getByRole('heading', { level: 1, name: 'Knowledge Base' })
    ).toBeVisible();
    // A visitor gets no authoring action.
    await expect(
      page.getByRole('main').getByRole('button', { name: 'Add', exact: true })
    ).toHaveCount(0);
    const post = knowledgeFeed(page).getByRole('heading', {
      name: seededPost.title,
      exact: true,
    });
    await expect(post).toBeVisible();
    await expect(
      knowledgeFeed(page).getByText(seededPost.body, { exact: true })
    ).toBeVisible();
    await page.goBack();
    await expect(
      page.getByRole('heading', { level: 1, name: vcMain!.name, exact: true })
    ).toBeVisible();
  });

  test('3.9 the host deletes a VC from the Account tab; it leaves the list and the platform', async () => {
    const page = orgAdmin!.page;
    expect(
      must(await readVirtualContributor(vcDoomed!.id), 'VC before delete')
        .lookup.virtualContributor?.id
    ).toBe(vcDoomed!.id);
    await page.goto(orgSettingsUrl(scenario!.organization.nameId, 'account'));
    await page
      .getByRole('heading', { level: 3, name: /^Virtual Contributors / })
      .getByRole('button')
      .click();
    const card = page
      .getByRole('main')
      .locator('div')
      .filter({
        has: page.getByRole('link', { name: vcDoomed!.name, exact: true }),
      })
      .filter({ has: page.getByRole('button', { name: 'More actions' }) })
      .last();
    await card.getByRole('button', { name: 'More actions' }).click();
    await page.getByRole('menuitem', { name: 'Delete', exact: true }).click();
    const confirm = page.getByRole('alertdialog', {
      name: 'Delete this resource?',
    });
    await expect(
      confirm.getByText(
        `This will permanently remove "${vcDoomed!.name}". This cannot be undone.`
      )
    ).toBeVisible();
    const deleted = expectMutationAnswered(page, 'deleteVirtualContributor');
    await confirm.getByRole('button', { name: 'Delete', exact: true }).click();
    await deleted();
    await expect(confirm).toBeHidden();

    await expect(
      page
        .getByRole('main')
        .getByRole('link', { name: vcDoomed!.name, exact: true })
    ).toHaveCount(0);
    await expect(
      page
        .getByRole('main')
        .getByRole('link', { name: vcMain!.name, exact: true })
    ).toBeVisible();
    const after = await readVirtualContributor(vcDoomed!.id);
    expect(after.error?.errors?.[0]?.code).toBe('ENTITY_NOT_FOUND');
  });
});
