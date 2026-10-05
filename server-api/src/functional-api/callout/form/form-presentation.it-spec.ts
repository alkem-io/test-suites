import {
  mailSinkConfigured,
  TestScenarioConfig,
  TestScenarioFactory,
  TestUser,
  TestUserManager,
  UniqueIDGenerator,
} from '@alkemio/tests-lib';
import { CalloutFormResponseVisibility } from '@alkemio/tests-lib/core/generated/alkemio-schema';
import { OrganizationWithSpaceModel } from '@alkemio/tests-lib/scenario/models/OrganizationWithSpaceModel';
import {
  getMailsDataSettled,
  MailItem,
} from '../../notifications/notification.helpers';
import {
  answersFor,
  createFormCallout,
  createFormCalloutRaw,
  errorCode,
  FormCallout,
  getFormDefinition,
  submitFormResponse,
  uniqueFormName,
  updateCalloutForm,
} from './form.request.params';

/**
 * Presentation fields of the Form (R17/R18): the optional plain-text `title`
 * (<= 512) and `description` (<= 2048), trimmed with empty stored as null, and
 * the `settings.defaultCollapsed` flag (default false). All three stay editable
 * while the Form holds responses, and the title/description never reach a
 * notification (the Post's display name stays the reference).
 *
 * Over-length is a DTO validation error: there is no Form reason code for it,
 * so the cases assert the rejection and the absence of `details.code`.
 */

const uniqueId = UniqueIDGenerator.getID();
const ADMINS = CalloutFormResponseVisibility.Admins;

/**
 * `UpdateCalloutFormInput` types its optional fields as `T | undefined`; the
 * wire contract also accepts an explicit `null` (title/description: cleared;
 * defaultCollapsed: unchanged). JSON keeps a `null` where it drops `undefined`.
 */
const NULL = null as unknown as undefined;

const scenarioConfig: TestScenarioConfig = {
  name: 'form-presentation',
  space: {
    collaboration: {
      addPostCallout: false,
      addPostCollectionCallout: false,
      addWhiteboardCallout: false,
      addTutorialCallouts: false,
    },
    community: {
      admins: [TestUser.SPACE_ADMIN],
      members: [TestUser.SPACE_MEMBER, TestUser.SPACE_ADMIN],
    },
  },
};

let baseScenario: OrganizationWithSpaceModel;

const setId = () => baseScenario.space.collaboration.calloutsSetId;

const newForm = (
  tag: string,
  options: Omit<Parameters<typeof createFormCallout>[1], 'displayName'> = {}
) =>
  createFormCallout(setId(), {
    ...options,
    displayName: uniqueFormName(`${tag}-${uniqueId}`),
  });

/** The Form definition as `lookup.callout` returns it to a reader. */
const readForm = async (form: FormCallout, user = TestUser.SPACE_MEMBER) => {
  const result = await getFormDefinition(form.calloutId, user);
  const definition = result.data?.lookup.callout?.framing.form;
  if (!definition) {
    throw new Error(
      `lookup.callout returned no Form for ${user}: ${JSON.stringify(
        result.error?.errors ?? result
      )}`
    );
  }
  return definition;
};

const respond = async (form: FormCallout) => {
  const result = await submitFormResponse(
    form.formId,
    answersFor(form.questions),
    ADMINS,
    TestUser.SPACE_MEMBER
  );
  if (!result.data?.submitCalloutFormResponse.id) {
    throw new Error(
      `the member could not respond: ${JSON.stringify(
        result.error?.errors ?? result
      )}`
    );
  }
};

beforeAll(async () => {
  baseScenario = await TestScenarioFactory.createBaseScenario(scenarioConfig);
});

afterAll(async () => {
  await TestScenarioFactory.cleanUpBaseScenario(baseScenario);
});

describe('Form presentation — title and description on create', () => {
  test('both are stored trimmed and returned by lookup.callout', async () => {
    const form = await newForm('trimmed', {
      title: '  Event sign-up  ',
      description: '\n Tell us how you will join. \t',
    });

    expect(form.title).toBe('Event sign-up');
    expect(form.description).toBe('Tell us how you will join.');
    const read = await readForm(form);
    expect(read.title).toBe('Event sign-up');
    expect(read.description).toBe('Tell us how you will join.');
  });

  test('without them both are null', async () => {
    const form = await newForm('absent');

    const read = await readForm(form);
    expect(read.title).toBeNull();
    expect(read.description).toBeNull();
  });

  test('whitespace-only values are stored as null', async () => {
    const form = await newForm('blank', { title: '   ', description: ' \n ' });

    const read = await readForm(form);
    expect(read.title).toBeNull();
    expect(read.description).toBeNull();
  });

  test('a 512-character title and a 2048-character description are stored', async () => {
    const title = 't'.repeat(512);
    const description = 'd'.repeat(2048);

    const form = await newForm('at-limit', { title, description });

    const read = await readForm(form);
    expect(read.title).toBe(title);
    expect(read.description).toBe(description);
  });

  test.each([
    { field: 'title', input: { title: 't'.repeat(513) } },
    { field: 'description', input: { description: 'd'.repeat(2049) } },
  ])('an over-length $field is rejected', async ({ input }) => {
    const result = await createFormCalloutRaw(setId(), {
      ...input,
      displayName: uniqueFormName(`over-${uniqueId}`),
    });

    expect(result.error).toBeDefined();
    expect(result.data?.createCalloutOnCalloutsSet).toBeFalsy();
    // A DTO validation error, not a Form reason code.
    expect(errorCode(result)).toBeUndefined();
  });
});

describe('Form presentation — editing title and description', () => {
  // The tests below share one Form and run in order.
  let form: FormCallout;

  beforeAll(async () => {
    form = await newForm('edit', {
      title: 'First title',
      description: 'First description',
    });
  });

  test('an update that leaves both out keeps them', async () => {
    const result = await updateCalloutForm(form.formId, {
      settings: { visibility: ADMINS },
    });

    expect(result.error).toBeUndefined();
    expect(result.data?.updateCalloutForm.title).toBe('First title');
    expect(result.data?.updateCalloutForm.description).toBe(
      'First description'
    );
  });

  test('a new value is set (trimmed) and the other field is unchanged', async () => {
    const result = await updateCalloutForm(form.formId, {
      title: '  Second title ',
    });

    expect(result.error).toBeUndefined();
    expect(result.data?.updateCalloutForm.title).toBe('Second title');
    expect(result.data?.updateCalloutForm.description).toBe(
      'First description'
    );
  });

  test('an empty string clears the description', async () => {
    const result = await updateCalloutForm(form.formId, { description: '' });

    expect(result.error).toBeUndefined();
    expect(result.data?.updateCalloutForm.description).toBeNull();
    expect(result.data?.updateCalloutForm.title).toBe('Second title');
  });

  test('an explicit null clears the title', async () => {
    const result = await updateCalloutForm(form.formId, { title: NULL });

    expect(result.error).toBeUndefined();
    expect(result.data?.updateCalloutForm.title).toBeNull();
  });

  test('an over-length value on update is rejected and nothing changes', async () => {
    const set = await updateCalloutForm(form.formId, { title: 'Kept title' });
    expect(set.error).toBeUndefined();

    const tooLong = await updateCalloutForm(form.formId, {
      title: 't'.repeat(513),
    });
    expect(tooLong.error).toBeDefined();
    expect(errorCode(tooLong)).toBeUndefined();

    const tooLongDescription = await updateCalloutForm(form.formId, {
      description: 'd'.repeat(2049),
    });
    expect(tooLongDescription.error).toBeDefined();

    const read = await readForm(form);
    expect(read.title).toBe('Kept title');
    expect(read.description).toBeNull();
  });

  test('both stay editable while the Form holds a response', async () => {
    await respond(form);

    const result = await updateCalloutForm(form.formId, {
      title: 'Title with responses',
      description: 'Description with responses',
    });

    expect(result.error).toBeUndefined();
    expect(errorCode(result)).toBeUndefined();
    const read = await readForm(form);
    expect(read.title).toBe('Title with responses');
    expect(read.description).toBe('Description with responses');
  });
});

describe('Form presentation — defaultCollapsed', () => {
  test('defaults to false when the settings are left out', async () => {
    const form = await newForm('collapsed-default');

    expect((await readForm(form)).settings.defaultCollapsed).toBe(false);
  });

  test('defaults to false when other settings are given without it', async () => {
    const form = await newForm('collapsed-default-settings', {
      settings: { visibility: ADMINS },
    });

    expect((await readForm(form)).settings.defaultCollapsed).toBe(false);
  });

  describe('on a Form created collapsed', () => {
    // The tests below share one Form and run in order.
    let form: FormCallout;

    const collapsed = async () =>
      (await readForm(form)).settings.defaultCollapsed;

    beforeAll(async () => {
      form = await newForm('collapsed', {
        settings: { defaultCollapsed: true },
      });
    });

    test('create with true round-trips', async () => {
      expect(await collapsed()).toBe(true);
    });

    test('an update without it, or with null, leaves it unchanged', async () => {
      const absent = await updateCalloutForm(form.formId, {
        settings: { visibility: ADMINS },
      });
      expect(absent.error).toBeUndefined();
      expect(absent.data?.updateCalloutForm.settings.defaultCollapsed).toBe(
        true
      );

      const explicitNull = await updateCalloutForm(form.formId, {
        settings: { defaultCollapsed: NULL },
      });
      expect(explicitNull.error).toBeUndefined();
      expect(await collapsed()).toBe(true);
    });

    test('an update toggles it', async () => {
      const off = await updateCalloutForm(form.formId, {
        settings: { defaultCollapsed: false },
      });
      expect(off.error).toBeUndefined();
      expect(await collapsed()).toBe(false);

      const on = await updateCalloutForm(form.formId, {
        settings: { defaultCollapsed: true },
      });
      expect(on.error).toBeUndefined();
      expect(await collapsed()).toBe(true);
    });

    test('it stays changeable while the Form holds a response, and null still leaves it unchanged', async () => {
      await respond(form);

      const off = await updateCalloutForm(form.formId, {
        settings: { defaultCollapsed: false },
      });
      expect(off.error).toBeUndefined();
      expect(errorCode(off)).toBeUndefined();
      expect(await collapsed()).toBe(false);

      const explicitNull = await updateCalloutForm(form.formId, {
        settings: { defaultCollapsed: NULL },
      });
      expect(explicitNull.error).toBeUndefined();
      expect(await collapsed()).toBe(false);
    });
  });
});

describe('Form presentation — never in a notification', () => {
  test.skipIf(!mailSinkConfigured())(
    'the receipt for a titled Form names the Post, not the Form title or description',
    async () => {
      const titleMarker = `form-title-${uniqueId}`;
      const descriptionMarker = `form-description-${uniqueId}`;
      const form = await newForm('mail', {
        title: titleMarker,
        description: descriptionMarker,
      });
      // Scope by the Post's display name, never by clearing the shared
      // mailbox (other notification specs may be running).
      const aboutForm = (mail: MailItem) =>
        Boolean(mail.subject?.includes(form.displayName)) ||
        Boolean(mail.body?.includes(titleMarker)) ||
        Boolean(mail.body?.includes(descriptionMarker));

      await respond(form);

      // The receipt is always sent (no setting); any admin mail arrives with it.
      const [mails] = await getMailsDataSettled(1, { scope: aboutForm });
      const memberEmail = TestUserManager.users.spaceMember.email;
      const receipts = mails.filter(
        mail =>
          mail.toAddresses?.includes(memberEmail) &&
          Boolean(mail.subject?.includes('was received'))
      );
      // Positive control: the receipt arrived and names the Post.
      expect(receipts.length).toBeGreaterThanOrEqual(1);
      for (const mail of mails) {
        expect(mail.subject ?? '').toContain(form.displayName);
        expect(mail.subject ?? '').not.toContain(titleMarker);
        expect(mail.body ?? '').not.toContain(titleMarker);
        expect(mail.subject ?? '').not.toContain(descriptionMarker);
        expect(mail.body ?? '').not.toContain(descriptionMarker);
      }
    }
  );
});
