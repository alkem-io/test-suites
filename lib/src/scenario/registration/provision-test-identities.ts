import { Configuration, IdentityApi } from '@ory/kratos-client';
import { testConfiguration } from '../../config/test.configuration';
import { TestUser } from '../../common/enums/test.user';
import { LogManager } from '../LogManager';
import { buildPoolIdentifierEmail } from '../pool-identity';

/**
 * Deterministic Kratos identity provisioning (test-suites#565 Phase 2).
 *
 * Upserts every {@link TestUser} directly via the Kratos ADMIN API with the
 * harness password, instead of relying on self-service registration. The admin
 * API has none of the non-determinism that made registration flaky: no password
 * policy / breached-password (HIBP) network check, no "already exists" no-op,
 * no swallowed failures — a `PUT`/`POST` sets the password credential outright,
 * idempotently.
 *
 * Runs only when the admin endpoint is available (`endPoints.kratos.admin`,
 * set on CI via an in-cluster port-forward). The admin API is network-isolated
 * (ClusterIP), so no API key is required. Local dev, without admin access,
 * keeps using self-registration.
 *
 * `TestUser` stays the single source of the user list — no duplicated list in
 * the pipeline (that would reintroduce the exact drift class this hardening
 * closes).
 */

const IDENTITY_SCHEMA_ID = 'default';

// Mirror the harness's self-service name parsing (register-test-user.ts) so the
// traits match what the rest of the suite expects.
const parseUserName = (userName: string): [string, string] => {
  const parts = userName.split('.');
  const first = parts[0];
  const last = parts.length > 1 ? parts[1] : first;
  return [first, last];
};

/**
 * `workerCount` provisions a full `TestUser` role set PER worker slot
 * (`beta.tester@alkem.io`, `beta.tester+w1@alkem.io`, … `+w<workerCount-1>`)
 * — see `pool-identity.ts`. Defaults to 1 (today's single shared pool).
 * Sequential, like the original 13-identity loop: the admin API has none of
 * self-service registration's non-determinism (no HIBP check, no flow
 * override races), so `workerCount`× more identities only cost `workerCount`×
 * more idempotent upserts, not `workerCount`× more risk.
 */
export const provisionTestIdentities = async (
  workerCount = 1
): Promise<void> => {
  const logger = LogManager.getLogger();
  const adminBaseUrl = testConfiguration.endPoints.kratos.admin;
  const password = testConfiguration.identities.admin.password;

  if (!adminBaseUrl) {
    throw new Error(
      'provisionTestIdentities called without a Kratos admin URL (endPoints.kratos.admin / KRATOS_ADMIN_URL)'
    );
  }

  const identityApi = new IdentityApi(
    new Configuration({ basePath: adminBaseUrl.replace(/\/$/, '') })
  );

  let created = 0;
  let updated = 0;
  for (let workerIndex = 0; workerIndex < workerCount; workerIndex++) {
    for (const userName of Object.values(TestUser)) {
      const email = buildPoolIdentifierEmail(userName, workerIndex);
      const [first, last] = parseUserName(userName);
      const traits = {
        email,
        accepted_terms: true,
        name: { first, last },
      };
      const credentials = { password: { config: { password } } };

      const { data: matches } = await identityApi.listIdentities({
        credentialsIdentifier: email,
      });
      const existing = matches.find(
        identity => (identity.traits as { email?: string })?.email === email
      );

      if (existing) {
        await identityApi.updateIdentity({
          id: existing.id,
          updateIdentityBody: {
            schema_id: IDENTITY_SCHEMA_ID,
            state: 'active',
            traits,
            credentials,
          },
        });
        updated++;
      } else {
        await identityApi.createIdentity({
          createIdentityBody: {
            schema_id: IDENTITY_SCHEMA_ID,
            state: 'active',
            traits,
            credentials,
            verifiable_addresses: [
              { value: email, verified: true, via: 'email', status: 'completed' },
            ],
          },
        });
        created++;
      }
    }
  }

  logger.info?.(
    `[provision] Kratos test identities upserted via admin API: ${created} created, ${updated} updated (${created + updated} total)`
  );
};
