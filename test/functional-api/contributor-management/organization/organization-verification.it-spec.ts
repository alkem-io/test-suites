import '@test/utils/array.matcher';
import { uniqueId } from '@test/utils/mutations/create-mutation';
import {
  deleteOrganization,
  createOrganization,
  getOrganizationDataCodegen,
} from './organization.request.params';
import { eventOnOrganizationVerificationCodegen } from '..//lifecycle/innovation-flow.request.params';

let organizationId = '';
let organizationVerificationId = '';
const organizationName = 'veirify-org-name' + uniqueId;
const hostNameId = 'veirify-org-nameid' + uniqueId;

beforeAll(async () => {
  const res = await createOrganization(organizationName, hostNameId);
  const orgData = res.data?.createOrganization;
  organizationId = orgData?.id ?? '';
  organizationVerificationId = orgData?.verification?.id ?? '';
});

afterAll(async () => {
  await deleteOrganization(organizationId);
});

describe('Organization verification status', () => {
  afterAll(async () => {
    await deleteOrganization(organizationId);
  });
  // Arrange

  // Skipping the scenarios until fix is implemented for bug #1791
  // ${'MANUALLY_VERIFY'}      | ${'manuallyVerified'}    | ${['RESET']}
  // ${'RESET'}                | ${'notVerified'}         | ${['VERIFICATION_REQUEST']}
  // ${'VERIFICATION_REQUEST'} | ${'verificationPending'} | ${['MANUALLY_VERIFY', 'REJECT']}

  test.each`
    setEvent                  | state                    | nextEvents
    ${'VERIFICATION_REQUEST'} | ${'verificationPending'} | ${['MANUALLY_VERIFY', 'REJECT']}
    ${'REJECT'}               | ${'rejected'}            | ${['REOPEN', 'ARCHIVE']}
    ${'REOPEN'}               | ${'notVerified'}         | ${['VERIFICATION_REQUEST']}
    ${'VERIFICATION_REQUEST'} | ${'verificationPending'} | ${['MANUALLY_VERIFY', 'REJECT']}
    ${'REJECT'}               | ${'rejected'}            | ${['REOPEN', 'ARCHIVE']}
    ${'ARCHIVE'}              | ${'archived'}            | ${[]}
  `(
    'should update organization verification status, when set event: "$setEvent" to state: "$state", nextEvents: "$nextEvents"',
    async ({ setEvent, state, nextEvents }) => {
      // Act
      const updateState = await eventOnOrganizationVerificationCodegen(
        organizationVerificationId,
        setEvent
      );

      const data = updateState.data?.eventOnOrganizationVerification?.lifecycle;
      const organizationData = await getOrganizationDataCodegen(organizationId);
      const organizationDataResponse =
        organizationData?.data?.organization.verification.lifecycle;

      // Assert
      expect(data?.state).toEqual(state);
      expect(data?.nextEvents).toEqual(nextEvents);
      expect(data).toEqual(organizationDataResponse);
    }
  );
});
