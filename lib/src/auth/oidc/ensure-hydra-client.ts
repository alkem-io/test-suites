import axios, { AxiosError } from 'axios';
import { testConfiguration } from '../../config/test.configuration';

interface HydraClientSpec {
  client_id: string;
  client_name: string;
  grant_types: string[];
  response_types: string[];
  scope: string;
  audience: string[];
  redirect_uris: string[];
  token_endpoint_auth_method: 'none' | 'client_secret_basic' | 'client_secret_post';
  skip_consent: boolean;
  subject_type: 'public' | 'pairwise';
}

interface HydraClientRecord {
  client_id?: string;
  scope?: string;
  grant_types?: string[];
  response_types?: string[];
  audience?: string[];
  redirect_uris?: string[];
  token_endpoint_auth_method?: string;
  skip_consent?: boolean;
}

const buildSpec = (): HydraClientSpec => {
  const { clientId, redirectUri, scopes, audience } =
    testConfiguration.endPoints.oidc;
  return {
    client_id: clientId,
    client_name: `${clientId} (auto-managed by alkemio test-suites)`,
    grant_types: ['authorization_code', 'refresh_token'],
    response_types: ['code'],
    scope: scopes,
    audience: audience ? [audience] : [],
    redirect_uris: [redirectUri],
    token_endpoint_auth_method: 'none',
    skip_consent: false,
    subject_type: 'public',
  };
};

const arrayEq = (a: unknown, b: unknown): boolean => {
  if (!Array.isArray(a) || !Array.isArray(b)) return false;
  if (a.length !== b.length) return false;
  const sa = [...a].sort();
  const sb = [...b].sort();
  return sa.every((v, i) => v === sb[i]);
};

const driftedFields = (
  have: HydraClientRecord,
  want: HydraClientSpec
): string[] => {
  const drift: string[] = [];
  if (have.scope !== want.scope) drift.push('scope');
  if (!arrayEq(have.grant_types, want.grant_types)) drift.push('grant_types');
  if (!arrayEq(have.response_types, want.response_types)) drift.push('response_types');
  if (!arrayEq(have.audience, want.audience)) drift.push('audience');
  if (!arrayEq(have.redirect_uris, want.redirect_uris)) drift.push('redirect_uris');
  if (have.token_endpoint_auth_method !== want.token_endpoint_auth_method) {
    drift.push('token_endpoint_auth_method');
  }
  if (have.skip_consent !== want.skip_consent) drift.push('skip_consent');
  return drift;
};

const formatAxiosError = (
  err: unknown,
  context: string
): Error => {
  const ax = err as AxiosError<{ error?: string; error_description?: string }>;
  const status = ax.response?.status ?? 'no-status';
  const desc = ax.response?.data?.error_description ?? ax.message;
  return new Error(`${context} failed (${status}): ${desc}`);
};

const doEnsure = async (): Promise<void> => {
  if (process.env.OIDC_TEST_SKIP_CLIENT_PROVISION === 'true') {
    return;
  }
  const { hydraAdmin } = testConfiguration.endPoints.oidc;
  const spec = buildSpec();
  const baseClients = `${hydraAdmin.replace(/\/$/, '')}/admin/clients`;
  const detail = `${baseClients}/${encodeURIComponent(spec.client_id)}`;

  let existing: HydraClientRecord | undefined;
  try {
    const res = await axios.get<HydraClientRecord>(detail, {
      validateStatus: (s) => s === 200 || s === 404,
      timeout: 10000,
    });
    if (res.status === 200) existing = res.data;
  } catch (err) {
    throw formatAxiosError(err, `Hydra admin GET clients/${spec.client_id}`);
  }

  if (!existing) {
    try {
      await axios.post(baseClients, spec, {
        headers: { 'Content-Type': 'application/json' },
        validateStatus: (s) => s >= 200 && s < 300,
        timeout: 10000,
      });
      return;
    } catch (err) {
      throw formatAxiosError(err, 'Hydra admin POST clients');
    }
  }

  const drift = driftedFields(existing, spec);
  if (drift.length === 0) return;

  try {
    await axios.put(detail, spec, {
      headers: { 'Content-Type': 'application/json' },
      validateStatus: (s) => s >= 200 && s < 300,
      timeout: 10000,
    });
  } catch (err) {
    throw formatAxiosError(
      err,
      `Hydra admin PUT clients/${spec.client_id} (drift: ${drift.join(',')})`
    );
  }
};

let ensurePromise: Promise<void> | undefined;

/**
 * Ensure the Hydra OAuth2 client used by the test bearer walker exists with
 * the spec the walker expects. Once-per-process — first call triggers a GET
 * + (POST | PUT | no-op); subsequent calls return the cached promise.
 *
 * Set `OIDC_TEST_SKIP_CLIENT_PROVISION=true` in environments where Hydra
 * admin is locked down (e.g. prod-mirror) and the client is provisioned out
 * of band.
 *
 * Idempotent: re-runs against a correctly-configured client are zero-write.
 */
export const ensureHydraTestClient = (): Promise<void> => {
  if (!ensurePromise) {
    ensurePromise = doEnsure().catch((err) => {
      ensurePromise = undefined;
      throw err;
    });
  }
  return ensurePromise;
};
