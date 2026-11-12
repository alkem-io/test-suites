import axios, { type AxiosResponse, type Method } from 'axios';
import { assertLoopbackInternal } from '../../config/loopback-guard';
import { testConfiguration } from '../../config/test.configuration';
import { identityTraits } from '../registration/provision-test-identities';
import { totpCode, wrongTotpCode } from './totp';

/**
 * Kratos self-service and admin calls for the second-factor suites.
 *
 * Every self-service call goes to `KRATOS_ENDPOINT` — the public identity host,
 * which routes `POST /self-service/login` through kratos-webhooks' login proxy
 * and its per-address counter — unless a caller asks for `via: 'kratos'`, which
 * goes to Kratos' own public port (`KRATOS_PUBLIC_DIRECT_URL`), past the proxy.
 * Nothing here throws on a status: the low-level calls return status and body,
 * and the composed helpers throw with the body when a step a test relies on
 * did not happen, so a broken helper turns its spec red.
 */
export type KratosAnswer = {
  status: number;
  body: any;
  headers: Record<string, string | string[] | undefined>;
};

export type Via = 'proxy' | 'kratos';

const trim = (url: string) => url.replace(/\/$/, '');

const publicBase = (via: Via = 'proxy'): string => {
  if (via === 'proxy') return trim(testConfiguration.endPoints.kratos.public);
  const direct = process.env.KRATOS_PUBLIC_DIRECT_URL ?? 'http://localhost:4433';
  assertLoopbackInternal('Kratos public port past the login proxy (KRATOS_PUBLIC_DIRECT_URL)', {
    url: direct,
  });
  return trim(direct);
};

const adminBase = (): string => {
  const admin = testConfiguration.endPoints.kratos.admin;
  if (!admin) {
    throw new Error(
      'second-factor: KRATOS_ADMIN_URL is not set — the suite reads credentials and deletes identities through the Kratos admin API'
    );
  }
  assertLoopbackInternal('Kratos admin API (KRATOS_ADMIN_URL)', { url: admin });
  return trim(admin);
};

const send = async (
  method: Method,
  url: string,
  options: {
    body?: unknown;
    sessionToken?: string;
    cookie?: string;
    headers?: Record<string, string>;
  } = {}
): Promise<KratosAnswer> => {
  const response: AxiosResponse = await axios.request({
    method,
    url,
    data: options.body,
    headers: {
      Accept: 'application/json',
      ...(options.body !== undefined
        ? { 'Content-Type': 'application/json' }
        : {}),
      ...(options.sessionToken
        ? { 'X-Session-Token': options.sessionToken }
        : {}),
      ...(options.cookie ? { Cookie: options.cookie } : {}),
      ...options.headers,
    },
    maxRedirects: 0,
    validateStatus: () => true,
    // A hung Kratos or proxy fails the call, not the whole case's budget.
    timeout: 15_000,
  });
  return {
    status: response.status,
    body: response.data,
    headers: response.headers as KratosAnswer['headers'],
  };
};

const fail = (step: string, answer: KratosAnswer): never => {
  throw new Error(
    `second-factor: ${step} answered ${answer.status}: ${JSON.stringify(answer.body).slice(0, 600)}`
  );
};

/** Kratos' error id on an error answer (`session_aal2_required`, …). */
export const kratosErrorId = (answer: KratosAnswer): string | undefined =>
  answer.body?.error?.id;

/** Every message the flow's UI carries, form-level and per node. */
export const flowMessages = (answer: KratosAnswer): string[] => {
  const ui = answer.body?.ui;
  if (!ui) return [];
  return [
    ...(ui.messages ?? []),
    ...(ui.nodes ?? []).flatMap((n: any) => n.messages ?? []),
  ].map((m: any) => `${m.id}:${m.text}`);
};

/** Kratos' verdict on a code: "the provided authentication code is invalid". */
export const isInvalidCodeVerdict = (answer: KratosAnswer): boolean =>
  flowMessages(answer).some(m => /^4000008:|code is invalid/i.test(m));

// ---------------------------------------------------------------- native login

export type NativeSession = {
  sessionToken: string;
  session: {
    id: string;
    authenticator_assurance_level: string;
    authentication_methods: { method: string }[];
    identity: { id: string };
  };
};

const password = () => testConfiguration.identities.admin.password;

/** A fresh native login flow; `sessionToken` + `aal2` opens a second step. */
export const createLoginFlow = async (
  options: { aal?: 'aal2'; sessionToken?: string; via?: Via } = {}
): Promise<string> => {
  const query = options.aal ? `?aal=${options.aal}` : '';
  const answer = await send(
    'GET',
    `${publicBase(options.via)}/self-service/login/api${query}`,
    { sessionToken: options.sessionToken }
  );
  if (answer.status !== 200 || !answer.body?.id) {
    fail('create login flow', answer);
  }
  return answer.body.id;
};

/** One submission to a login flow, by any method and over either route. */
export const submitLogin = (
  flowId: string,
  body: Record<string, unknown>,
  options: {
    sessionToken?: string;
    via?: Via;
    method?: 'POST' | 'GET' | 'PUT' | 'PATCH';
    headers?: Record<string, string>;
  } = {}
): Promise<KratosAnswer> => {
  const method = options.method ?? 'POST';
  const url = new URL(`${publicBase(options.via)}/self-service/login`);
  url.searchParams.set('flow', flowId);
  if (method === 'GET') {
    for (const [k, v] of Object.entries(body)) {
      url.searchParams.set(k, String(v));
    }
  }
  return send(method, url.toString(), {
    body: method === 'GET' ? undefined : body,
    sessionToken: options.sessionToken,
    headers: options.headers,
  });
};

/** The password step, raw: 200 with a session token, or Kratos' refusal. */
export const passwordLogin = async (
  email: string,
  options: { password?: string; via?: Via; headers?: Record<string, string> } = {}
): Promise<KratosAnswer> =>
  submitLogin(
    await createLoginFlow({ via: options.via }),
    {
      method: 'password',
      identifier: email,
      password: options.password ?? password(),
    },
    { via: options.via, headers: options.headers }
  );

/** The password step; throws unless Kratos signed the identity in. */
export const loginWithPassword = async (
  email: string,
  options: { password?: string } = {}
): Promise<NativeSession> => {
  const answer = await passwordLogin(email, options);
  if (answer.status !== 200 || !answer.body?.session_token) {
    fail(`password login of ${email}`, answer);
  }
  return {
    sessionToken: answer.body.session_token,
    session: answer.body.session,
  };
};

/** A second step owed by a password session: its flow id and that session. */
export type SecondStep = { flowId: string; sessionToken: string };

export const startSecondStep = async (
  sessionToken: string,
  via: Via = 'proxy'
): Promise<SecondStep> => ({
  flowId: await createLoginFlow({ aal: 'aal2', sessionToken, via }),
  sessionToken,
});

const completeSecondStep = async (
  step: SecondStep,
  body: Record<string, unknown>,
  what: string
): Promise<NativeSession> => {
  const answer = await submitLogin(step.flowId, body, {
    sessionToken: step.sessionToken,
  });
  if (answer.status !== 200 || !answer.body?.session) {
    fail(what, answer);
  }
  return {
    sessionToken: answer.body.session_token ?? step.sessionToken,
    session: answer.body.session,
  };
};

/** Password, then a code computed from `secret` at the second step. */
export const loginWithTotp = async (
  email: string,
  secret: string
): Promise<NativeSession> => {
  const first = await loginWithPassword(email);
  return completeSecondStep(
    await startSecondStep(first.sessionToken),
    { method: 'totp', totp_code: totpCode(secret) },
    `second step (totp) of ${email}`
  );
};

/** Password, then one recovery code at the second step. */
export const loginWithRecoveryCode = async (
  email: string,
  code: string
): Promise<NativeSession> => {
  const first = await loginWithPassword(email);
  return completeSecondStep(
    await startSecondStep(first.sessionToken),
    { method: 'lookup_secret', lookup_secret: code },
    `second step (recovery code) of ${email}`
  );
};

/**
 * `n` wrong codes at a second step, one submission each, by `method`, through
 * the login proxy or straight to Kratos. `headers(i)` adds per-submission
 * headers (the forged-address case). Returns every answer, in order.
 */
export const submitWrongTotp = async (
  step: SecondStep & { secret: string },
  n: number,
  options: {
    via?: Via;
    method?: 'POST' | 'GET' | 'PUT' | 'PATCH';
    headers?: (i: number) => Record<string, string>;
  } = {}
): Promise<KratosAnswer[]> => {
  const answers: KratosAnswer[] = [];
  for (let i = 0; i < n; i++) {
    answers.push(
      await submitLogin(
        step.flowId,
        { method: 'totp', totp_code: wrongTotpCode(step.secret) },
        {
          sessionToken: step.sessionToken,
          via: options.via,
          method: options.method,
          headers: options.headers?.(i),
        }
      )
    );
  }
  return answers;
};


export const whoami = (sessionToken: string): Promise<KratosAnswer> =>
  send('GET', `${publicBase()}/sessions/whoami`, { sessionToken });

// ----------------------------------------------------------- native settings

/** A fresh native settings flow, raw (403 when Kratos owes a second step). */
export const readSettingsFlow = (sessionToken: string): Promise<KratosAnswer> =>
  send('GET', `${publicBase()}/self-service/settings/api`, { sessionToken });

export const createSettingsFlow = async (sessionToken: string): Promise<string> => {
  const answer = await readSettingsFlow(sessionToken);
  if (answer.status !== 200 || !answer.body?.id) {
    fail('create settings flow', answer);
  }
  return answer.body.id;
};

export const submitSettings = (
  sessionToken: string,
  flowId: string,
  body: Record<string, unknown>
): Promise<KratosAnswer> =>
  send(
    'POST',
    `${publicBase()}/self-service/settings?flow=${encodeURIComponent(flowId)}`,
    { body, sessionToken }
  );

/** One settings submission on a fresh native flow, raw. */
export const updateSettings = async (
  sessionToken: string,
  body: Record<string, unknown>
): Promise<KratosAnswer> =>
  submitSettings(sessionToken, await createSettingsFlow(sessionToken), body);

const textNode = (flow: any, id: string): any =>
  (flow?.ui?.nodes ?? []).find((n: any) => n.attributes?.id === id)
    ?.attributes?.text;

/**
 * Enrols an authenticator app on the identity behind `sessionToken` and
 * returns its secret: reads the `totp_secret_key` node of a native settings
 * flow and confirms it with a computed code.
 */
export const enrolTotp = async (sessionToken: string): Promise<string> => {
  const flowAnswer = await readSettingsFlow(sessionToken);
  const secret: string | undefined = textNode(
    flowAnswer.body,
    'totp_secret_key'
  )?.text;
  if (flowAnswer.status !== 200 || !secret) {
    fail('read totp_secret_key from the settings flow', flowAnswer);
  }
  const answer = await submitSettings(sessionToken, flowAnswer.body.id, {
    method: 'totp',
    totp_code: totpCode(secret!),
  });
  if (answer.status !== 200) fail('confirm totp enrolment', answer);
  return secret!;
};

/** `totp_unlink` — needs a session that completed the second step. */
export const removeTotp = async (sessionToken: string): Promise<void> => {
  const answer = await updateSettings(sessionToken, {
    method: 'totp',
    totp_unlink: true,
  });
  if (answer.status !== 200) fail('totp_unlink', answer);
};

/** The recovery codes a settings flow shows (none unless just generated or revealed). */
export const recoveryCodesOf = (flow: any): string[] => {
  const text = textNode(flow, 'lookup_secret_codes');
  const secrets: string[] =
    text?.context?.secrets?.map((s: any) => s.text ?? s.context?.secret) ?? [];
  if (secrets.length > 0) return secrets;
  return String(text?.text ?? '')
    .split(/[\s,]+/)
    .filter(Boolean);
};

/** `lookup_secret_regenerate` then `lookup_secret_confirm`: the new codes. */
export const generateRecoveryCodes = async (
  sessionToken: string
): Promise<string[]> => {
  const flowId = await createSettingsFlow(sessionToken);
  const regenerated = await submitSettings(sessionToken, flowId, {
    method: 'lookup_secret',
    lookup_secret_regenerate: true,
  });
  const codes = recoveryCodesOf(regenerated.body);
  if (codes.length === 0) fail('lookup_secret_regenerate', regenerated);
  const confirmed = await submitSettings(sessionToken, flowId, {
    method: 'lookup_secret',
    lookup_secret_confirm: true,
  });
  if (confirmed.status !== 200) fail('lookup_secret_confirm', confirmed);
  return codes;
};

export const disableRecoveryCodes = async (
  sessionToken: string
): Promise<void> => {
  const answer = await updateSettings(sessionToken, {
    method: 'lookup_secret',
    lookup_secret_disable: true,
  });
  if (answer.status !== 200) fail('lookup_secret_disable', answer);
};

// ------------------------------------------------------- browser-style flows

/** A cookie jar for the flows a browser runs (recovery link, aal2 upgrade). */
export class CookieJar {
  private readonly cookies = new Map<string, string>();

  store(answer: KratosAnswer): void {
    const setCookie = answer.headers['set-cookie'];
    for (const line of Array.isArray(setCookie) ? setCookie : []) {
      const [pair] = line.split(';');
      const eq = pair.indexOf('=');
      this.cookies.set(pair.slice(0, eq).trim(), pair.slice(eq + 1).trim());
    }
  }

  header(): string {
    return [...this.cookies].map(([k, v]) => `${k}=${v}`).join('; ');
  }
}

const browserCall = async (
  jar: CookieJar,
  method: Method,
  url: string,
  body?: Record<string, unknown>,
  accept = 'application/json'
): Promise<KratosAnswer> => {
  const answer = await send(method, url, {
    body,
    cookie: jar.header(),
    headers: { Accept: accept },
  });
  jar.store(answer);
  return answer;
};

const csrfOf = (flow: any): string =>
  (flow?.ui?.nodes ?? []).find((n: any) => n.attributes?.name === 'csrf_token')
    ?.attributes?.value ?? '';

/**
 * Follows a recovery link Kratos admin minted for `identityId` with a fresh
 * cookie jar, as the member's browser would, and returns that jar (now holding
 * the session the link signed in) and the settings flow Kratos sent it to.
 */
export const recoverViaLink = async (
  identityId: string
): Promise<{ jar: CookieJar; settingsFlowId: string }> => {
  const minted = await send('POST', `${adminBase()}/admin/recovery/link`, {
    body: { identity_id: identityId, expires_in: '15m' },
  });
  if (minted.status !== 200 || !minted.body?.recovery_link) {
    fail('mint recovery link', minted);
  }
  const jar = new CookieJar();
  let url: string = minted.body.recovery_link;
  for (let hop = 0; hop < 10; hop++) {
    const answer = await browserCall(jar, 'GET', url, undefined, 'text/html');
    const location =
      (answer.headers.location as string | undefined) ??
      answer.body?.redirect_browser_to;
    if (!location) fail('follow the recovery link', answer);
    const next = new URL(location!, url);
    const flow = next.searchParams.get('flow');
    if (flow && !next.pathname.includes('/self-service/')) {
      return { jar, settingsFlowId: flow };
    }
    url = next.toString();
  }
  throw new Error('second-factor: the recovery link did not reach a settings flow');
};

/**
 * A password change on the browser settings flow `flowId`, raw. When Kratos
 * already refuses to hand out the flow (a second step owed), that refusal is
 * the answer: a submission without the flow's CSRF token would be refused for
 * a reason that is not the one under test.
 */
export const changePasswordInBrowser = async (
  jar: CookieJar,
  flowId: string,
  newPassword: string
): Promise<KratosAnswer> => {
  const flow = await browserCall(
    jar,
    'GET',
    `${publicBase()}/self-service/settings/flows?id=${encodeURIComponent(flowId)}`
  );
  if (flow.status !== 200) return flow;
  return browserCall(
    jar,
    'POST',
    `${publicBase()}/self-service/settings?flow=${encodeURIComponent(flowId)}`,
    { method: 'password', password: newPassword, csrf_token: csrfOf(flow.body) }
  );
};

/** A fresh browser settings flow for the jar's session, raw. */
export const createBrowserSettingsFlow = (
  jar: CookieJar
): Promise<KratosAnswer> =>
  browserCall(jar, 'GET', `${publicBase()}/self-service/settings/browser`);

/** Completes the second step in the browser jar with a code from `secret`. */
export const upgradeBrowserSessionWithTotp = async (
  jar: CookieJar,
  secret: string
): Promise<KratosAnswer> => {
  const flow = await browserCall(
    jar,
    'GET',
    `${publicBase()}/self-service/login/browser?aal=aal2`
  );
  if (flow.status !== 200 || !flow.body?.id) fail('aal2 browser flow', flow);
  return browserCall(
    jar,
    'POST',
    `${publicBase()}/self-service/login?flow=${encodeURIComponent(flow.body.id)}`,
    {
      method: 'totp',
      totp_code: totpCode(secret),
      csrf_token: csrfOf(flow.body),
    }
  );
};

/**
 * The product's two-step sign-up as the browser runs it: a browser
 * registration flow, the traits posted with `method: profile`, then the
 * password. Returns both answers; the second carries the new identity.
 */
export const registerTwoStep = async (
  email: string
): Promise<{ profileStep: KratosAnswer; passwordStep: KratosAnswer }> => {
  const jar = new CookieJar();
  const flow = await browserCall(
    jar,
    'GET',
    `${publicBase()}/self-service/registration/browser`
  );
  if (flow.status !== 200 || !flow.body?.id) fail('registration flow', flow);
  const action = `${publicBase()}/self-service/registration?flow=${encodeURIComponent(flow.body.id)}`;
  const traits = identityTraits(email);
  const profileStep = await browserCall(jar, 'POST', action, {
    method: 'profile',
    traits,
    csrf_token: csrfOf(flow.body),
  });
  const passwordStep = await browserCall(jar, 'POST', action, {
    method: 'password',
    password: password(),
    traits,
    csrf_token: csrfOf(profileStep.body) || csrfOf(flow.body),
  });
  return { profileStep, passwordStep };
};

// ---------------------------------------------------------------- admin reads

export type KratosIdentity = {
  id: string;
  traits: { email: string };
  credentials?: Record<string, { updated_at?: string }>;
  recovery_addresses?: { value: string }[];
  verifiable_addresses?: { value: string; verified: boolean }[];
};

/** The identity as Kratos admin reads it — never with credential secrets. */
export const readIdentity = async (
  identityId: string
): Promise<KratosIdentity> => {
  const answer = await send(
    'GET',
    `${adminBase()}/admin/identities/${identityId}`
  );
  if (answer.status !== 200) fail(`read identity ${identityId}`, answer);
  return answer.body;
};

/** The credential types the identity holds (`password`, `totp`, …), sorted. */
export const credentialTypes = async (identityId: string): Promise<string[]> =>
  Object.keys((await readIdentity(identityId)).credentials ?? {}).sort();

/**
 * The second-factor credential types the identity still holds, sorted. A
 * `webauthn` entry holding no key (only the identity's passkey identifier)
 * is none: there is nothing left to sign in with.
 */
export const secondFactorCredentialsLeft = async (
  identityId: string
): Promise<string[]> => {
  const answer = await send(
    'GET',
    `${adminBase()}/admin/identities/${identityId}?include_credential=webauthn`
  );
  if (answer.status !== 200) fail(`read identity ${identityId}`, answer);
  const credentials: Record<string, { config?: { credentials?: unknown[] } }> =
    answer.body.credentials ?? {};
  return ['lookup_secret', 'totp', 'webauthn']
    .filter(type => type in credentials)
    .filter(
      type =>
        type !== 'webauthn' ||
        (credentials.webauthn.config?.credentials?.length ?? 0) > 0
    );
};

/** The identity's active Kratos sessions. */
export const identitySessions = async (
  identityId: string
): Promise<NativeSession['session'][]> => {
  const answer = await send(
    'GET',
    `${adminBase()}/admin/identities/${identityId}/sessions?active=true`
  );
  if (answer.status === 404) return [];
  if (answer.status !== 200) fail(`list sessions of ${identityId}`, answer);
  return answer.body;
};

/** Creates an active identity with the harness password and a verified email. */
export const createIdentity = async (email: string): Promise<string> => {
  const answer = await send('POST', `${adminBase()}/admin/identities`, {
    body: {
      schema_id: 'default',
      state: 'active',
      traits: identityTraits(email),
      credentials: { password: { config: { password: password() } } },
      verifiable_addresses: [
        { value: email, verified: true, via: 'email', status: 'completed' },
      ],
      recovery_addresses: [{ value: email, via: 'email' }],
    },
  });
  if (answer.status !== 201) fail(`create identity ${email}`, answer);
  return answer.body.id;
};

/** Deletes an identity; one already gone is not an error. */
export const deleteIdentity = async (identityId: string): Promise<void> => {
  const answer = await send(
    'DELETE',
    `${adminBase()}/admin/identities/${identityId}`
  );
  if (answer.status !== 204 && answer.status !== 404) {
    fail(`delete identity ${identityId}`, answer);
  }
};
