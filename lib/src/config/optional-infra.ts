import dotenv from "dotenv";

/**
 * Presence checks for the harness's OPTIONAL infrastructure: loopback Postgres
 * (`queryHarnessDb`) and the RabbitMQ management API (`getQueueStats`). Both
 * exist on a local/CI compose stack, where the harness config's `localhost`
 * defaults are valid; the nightly run targets a remote cluster and sets neither
 * variable, and those defaults would then dial a socket nobody is listening on.
 *
 * "Configured" therefore means either the operator explicitly pointed the
 * harness at the service, or the harness itself targets a loopback server (so
 * the defaults apply). Use these as the condition of a `test.skipIf(...)` on the
 * individual cases that need the service, so the rest of the file still runs
 * wherever it can.
 */
const targetsLoopbackServer = (): boolean => {
  const target =
    process.env.ALKEMIO_SERVER || process.env.ALKEMIO_BASE_URL || "";
  return target === "" || /\/\/(localhost|127\.0\.0\.1)(:|\/|$)/.test(target);
};

export const harnessPostgresConfigured = (): boolean => {
  dotenv.config();
  return Boolean(process.env.POSTGRES_HOST) || targetsLoopbackServer();
};

export const rabbitMqManagementConfigured = (): boolean => {
  dotenv.config();
  return (
    Boolean(process.env.RABBITMQ_MANAGEMENT_ENDPOINT) || targetsLoopbackServer()
  );
};
