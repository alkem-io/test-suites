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
  FormCallout,
  submitFormResponse,
  uniqueFormName,
} from './form.request.params';

/**
 * The one presentation rule that needs the mail sink (R17/R18): a Form's
 * `title` and `description` never reach a notification — the response receipt
 * names the Post by its display name.
 *
 * Split out of `form-presentation.it-spec.ts` and kept OFF the nightly
 * (`vitest.config.ts`, nightly `exclude`): its positive control is a single
 * receipt mail, and the shared test cluster's MailSlurper drops a few mails per
 * run mid-DATA (2026-10-29 01:09:55 UTC, run 40792632135), which reads as a
 * red for a rule the product has never broken. Run it locally with
 * `pnpm test:callouts`; put it back on the nightly once the sink is replaced.
 */

const uniqueId = UniqueIDGenerator.getID();
const ADMINS = CalloutFormResponseVisibility.Admins;

const scenarioConfig: TestScenarioConfig = {
  name: 'form-presentation-receipt',
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

      const memberEmail = TestUserManager.users.spaceMember.email;
      const isReceipt = (mail: MailItem) =>
        aboutForm(mail) &&
        Boolean(mail.toAddresses?.includes(memberEmail)) &&
        Boolean(mail.subject?.includes('was received'));

      await respond(form);

      // The receipt is always sent (no setting); any admin mail arrives with it.
      // Wait for the receipt itself: an admin mail about the same Form can land
      // first and would otherwise end the wait before the receipt arrives.
      await getMailsDataSettled(1, { scope: isReceipt });
      const [mails] = await getMailsDataSettled(1, { scope: aboutForm });
      const receipts = mails.filter(isReceipt);
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
