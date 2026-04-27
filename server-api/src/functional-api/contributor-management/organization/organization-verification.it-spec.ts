/**
 * This file contains integration tests for verifying the organization verification status within the platform.
 * It includes tests for creating organizations and updating their verification status through various events.
 * The tests cover scenarios such as:
 * - Creating an organization with specific details like name and host name ID.
 * - Updating the verification status of an organization through different events.
 * - Verifying the state transitions and available next events for each verification status.
 * - Cleaning up by deleting the created organizations after tests.
 *
 * The tests ensure that the organization verification process works as expected,
 * and that the API responses match the expected values.
 */
import {
  TestScenarioFactory,
  TestScenarioNoPreCreationConfig,
  UniqueIDGenerator,
} from '@alkemio/tests-lib';
const uniqueId = UniqueIDGenerator.getID();
import {
  deleteOrganization,
  createOrganization,
  getOrganizationData,
} from './organization.request.params';
import { eventOnOrganizationVerification } from './organization-verification.events.request.params';

let organizationId = '';
let organizationVerificationId = '';
const organizationName = 'veirify-org-name' + uniqueId;
const hostNameId = 'veirify-org-nameid' + uniqueId;

const scenarioConfig: TestScenarioNoPreCreationConfig = {
  name: 'organization-verification',
};
beforeAll(async () => {
  await TestScenarioFactory.createBaseScenarioEmpty(scenarioConfig);
  const res = await createOrganization(organizationName, hostNameId);
  const orgData = res.data?.createOrganization;
  organizationId = orgData?.id ?? '';
  organizationVerificationId = orgData?.verification?.id ?? '';
});

afterAll(async () => {
  await deleteOrganization(organizationId);
});

/** @testCase TC-1502 */
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
      const updateState = await eventOnOrganizationVerification(
        organizationVerificationId,
        setEvent
      );

      const data = updateState.data?.eventOnOrganizationVerification;
      const organizationData = await getOrganizationData(organizationId);
      const organizationDataResponse =
        organizationData?.data?.organization.verification;

      // Assert
      expect(data?.state).toEqual(state);
      expect(data?.nextEvents).toEqual(nextEvents);
      expect(data).toEqual(organizationDataResponse);
    }
  );
});
