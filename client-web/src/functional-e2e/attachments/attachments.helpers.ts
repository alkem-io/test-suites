import { createHash, randomUUID } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { open, readFile, stat } from 'node:fs/promises';
import { Readable } from 'node:stream';
import { setTimeout as delay } from 'node:timers/promises';
import type { Browser, BrowserContext, Page, Route } from '@playwright/test';
import { Pool } from 'pg';
import { loginViaCrd } from '../helpers/login.helper';
import {
  loopbackURL,
  waitUntil,
  type UpstreamEofGate,
} from './attachments.streaming';

export * from './attachments.streaming';

export const MATRIX_STAGING_BUCKET = '00000000-0000-4000-8000-000000000013';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type AttachmentPersona = {
  actorID: string;
  email: string;
  password: string;
  matrixUserID: string;
  matrixAccessToken: string;
};
export type AttachmentRoom = {
  roomID: string;
  bucketID: string;
  matrixRoomID: string;
};
export type AttachmentFixture = {
  /** Explicit acknowledgement: no shared-stack lifecycle operations are offered. */
  isolated: true;
  runID: string;
  baseURL: string;
  matrixURL: string;
  postgresURL: string;
  maxFileBytes: number;
  users: [AttachmentPersona, AttachmentPersona];
  independentRooms: [AttachmentRoom, AttachmentRoom];
  sharedBucketRooms: [AttachmentRoom, AttachmentRoom];
};

/** Read a mode-0600 fixture made by the isolated stack's API-based setup. */
export async function loadAttachmentFixture(
  filename = process.env.ATTACHMENTS_FIXTURE_FILE
): Promise<AttachmentFixture> {
  if (!filename)
    throw new Error(
      'ATTACHMENTS_FIXTURE_FILE is required; no shared-stack defaults'
    );
  const info = await stat(filename);
  if ((info.mode & 0o077) !== 0)
    throw new Error('Attachment fixture must be private (mode 0600)');
  let fixture: AttachmentFixture;
  try {
    fixture = JSON.parse(await readFile(filename, 'utf8'));
  } catch {
    throw new Error('Attachment fixture is not valid JSON');
  }
  validateAttachmentFixture(fixture);
  return fixture;
}

export function validateAttachmentFixture(fixture: AttachmentFixture): void {
  if (
    !fixture ||
    fixture.isolated !== true ||
    !/^[a-z0-9-]{4,64}$/.test(fixture.runID)
  )
    throw new Error(
      'An isolated, run-namespaced attachment fixture is required'
    );
  loopbackURL(fixture.baseURL);
  loopbackURL(fixture.matrixURL);
  let db: URL;
  try {
    db = new URL(fixture.postgresURL);
  } catch {
    throw new Error('Attachment fixture requires a valid database endpoint');
  }
  if (
    !['postgres:', 'postgresql:'].includes(db.protocol) ||
    !['localhost', '127.0.0.1', '[::1]'].includes(db.hostname)
  )
    throw new Error(
      'Attachment assertions require isolated loopback PostgreSQL'
    );
  if (
    !Number.isSafeInteger(fixture.maxFileBytes) ||
    fixture.maxFileBytes < 4096
  )
    throw new Error('Supply the stack actual maximum file size');
  if (
    fixture.users?.length !== 2 ||
    fixture.independentRooms?.length !== 2 ||
    fixture.sharedBucketRooms?.length !== 2
  )
    throw new Error(
      'Fixture requires two users, two independent rooms and two shared-bucket rooms'
    );
  for (const user of fixture.users) {
    if (
      !UUID.test(user.actorID) ||
      !user.email ||
      !user.password ||
      !user.matrixUserID?.startsWith('@') ||
      !user.matrixAccessToken
    )
      throw new Error('Attachment persona is incomplete');
  }
  if (
    new Set(fixture.users.map(user => user.actorID)).size !== 2 ||
    new Set(fixture.users.map(user => user.matrixUserID)).size !== 2
  )
    throw new Error('Attachment users must be distinct real accounts');
  const rooms = [...fixture.independentRooms, ...fixture.sharedBucketRooms];
  for (const room of rooms) {
    if (
      !UUID.test(room.roomID) ||
      !UUID.test(room.bucketID) ||
      !room.matrixRoomID?.startsWith('!')
    )
      throw new Error('Attachment room identifiers are incomplete');
  }
  if (
    new Set(rooms.map(room => room.roomID)).size !== 4 ||
    new Set(rooms.map(room => room.matrixRoomID)).size !== 4 ||
    fixture.independentRooms[0].bucketID ===
      fixture.independentRooms[1].bucketID ||
    fixture.sharedBucketRooms[0].bucketID !==
      fixture.sharedBucketRooms[1].bucketID ||
    new Set(rooms.map(room => room.bucketID)).size !== 3
  )
    throw new Error(
      'Fixture must contain independent and shared-bucket topology'
    );
}

type GraphqlResult<T> = { data?: T; errors?: unknown[] };

async function checkedJson<T>(
  response: Response,
  operation: string
): Promise<T> {
  // Do not include error bodies: login/Matrix/upstream errors can echo secrets.
  if (!response.ok)
    throw new Error(`${operation} failed (HTTP ${response.status})`);
  try {
    return (await response.json()) as T;
  } catch {
    throw new Error(`${operation} did not return JSON`);
  }
}

export class AttachmentActor {
  private token = '';
  constructor(
    readonly fixture: AttachmentFixture,
    private readonly user: AttachmentPersona
  ) {}

  async authenticate(): Promise<void> {
    const login = await checkedJson<{ api_token: string }>(
      await fetch(`${this.fixture.baseURL}/api/auth/non-interactive-login`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          email: this.user.email,
          password: this.user.password,
        }),
        signal: AbortSignal.timeout(30_000),
      }),
      'Alkemio login'
    );
    if (!login.api_token)
      throw new Error('Alkemio login returned no API token');
    this.token = login.api_token;
    const [me, matrix] = await Promise.all([
      this.graphql<{ me: { user: { id: string } } }>('{ me { user { id } } }'),
      this.matrixJson<{ user_id: string }>('/_matrix/client/v3/account/whoami'),
    ]);
    if (
      me.me.user.id !== this.user.actorID ||
      matrix.user_id !== this.user.matrixUserID
    )
      throw new Error('Authenticated account does not match fixture persona');
  }

  async browserContext(browser: Browser): Promise<BrowserContext> {
    const context = await browser.newContext();
    try {
      await loginViaCrd(
        await context.newPage(),
        this.user.email,
        this.user.password,
        this.fixture.baseURL
      );
      return context;
    } catch {
      await context.close();
      throw new Error('Attachment browser login failed');
    }
  }

  async graphql<T>(
    query: string,
    variables: Record<string, unknown> = {}
  ): Promise<T> {
    if (!this.token)
      throw new Error('Authenticate attachment actor before GraphQL');
    const result = await checkedJson<GraphqlResult<T>>(
      await fetch(
        `${this.fixture.baseURL}/api/private/non-interactive/graphql`,
        {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            authorization: `Bearer ${this.token}`,
          },
          body: JSON.stringify({ query, variables }),
          signal: AbortSignal.timeout(30_000),
        }
      ),
      'Attachment GraphQL'
    );
    if (result.errors?.length || !result.data)
      throw new Error('Attachment GraphQL operation failed');
    return result.data;
  }

  /** Real multipart upload; does not buffer the fixture in Playwright's driver. */
  async uploadGraphql<T>(options: {
    query: string;
    variables: Record<string, unknown>;
    file: string;
    name: string;
    mimeType: string;
    signal?: AbortSignal;
    sourceChunkDelayMs?: number;
    sourceGate?: UpstreamEofGate;
  }): Promise<T> {
    if (!this.token)
      throw new Error('Authenticate attachment actor before upload');
    if (/[\r\n]/.test(options.mimeType))
      throw new Error('Invalid fixture MIME');
    const boundary = `attachment-${randomUUID()}`;
    const name = options.name.replace(/[\r\n"\\]/g, '_');
    const prefix = Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="operations"\r\n\r\n` +
        JSON.stringify({
          query: options.query,
          variables: { ...options.variables, file: null },
        }) +
        `\r\n--${boundary}\r\nContent-Disposition: form-data; name="map"\r\n\r\n` +
        `{"0":["variables.file"]}\r\n--${boundary}\r\n` +
        `Content-Disposition: form-data; name="0"; filename="${name}"\r\n` +
        `Content-Type: ${options.mimeType}\r\n\r\n`
    );
    const suffix = Buffer.from(`\r\n--${boundary}--\r\n`);
    const size = (await stat(options.file)).size;
    if (size > this.fixture.maxFileBytes)
      throw new Error('Fixture exceeds configured maximum');
    const body = Readable.from(
      (async function* () {
        yield prefix;
        for await (const chunk of createReadStream(options.file, {
          highWaterMark: 65_536,
        })) {
          yield chunk;
          if (options.sourceChunkDelayMs)
            await delay(options.sourceChunkDelayMs);
        }
        yield suffix;
      })()
    );
    const response = await fetch(
      `${this.fixture.baseURL}/api/private/non-interactive/graphql`,
      {
        method: 'POST',
        headers: {
          authorization: `Bearer ${this.token}`,
          'apollo-require-preflight': 'true',
          'content-type': `multipart/form-data; boundary=${boundary}`,
          'content-length': String(prefix.length + size + suffix.length),
        },
        body: Readable.toWeb(
          options.sourceGate ? body.pipe(options.sourceGate) : body
        ) as ReadableStream,
        duplex: 'half',
        signal: options.signal ?? AbortSignal.timeout(120_000),
      } as RequestInit & { duplex: string }
    );
    const result = await checkedJson<GraphqlResult<T>>(
      response,
      'Attachment upload'
    );
    if (result.errors?.length || !result.data)
      throw new Error('Attachment upload GraphQL failed');
    return result.data;
  }

  private async matrixJson<T>(
    path: string,
    init: RequestInit = {}
  ): Promise<T> {
    return checkedJson<T>(
      await fetch(`${this.fixture.matrixURL}${path}`, {
        ...init,
        headers: {
          ...init.headers,
          authorization: `Bearer ${this.user.matrixAccessToken}`,
        },
        signal: init.signal ?? AbortSignal.timeout(30_000),
      }),
      'Matrix fixture operation'
    );
  }

  async matrixUpload(
    file: string,
    name: string,
    mimeType: string
  ): Promise<string> {
    const size = (await stat(file)).size;
    if (size > this.fixture.maxFileBytes)
      throw new Error('Fixture exceeds configured maximum');
    const result = await this.matrixJson<{ content_uri: string }>(
      `/_matrix/media/v3/upload?filename=${encodeURIComponent(name)}`,
      {
        method: 'POST',
        headers: { 'content-type': mimeType, 'content-length': String(size) },
        body: Readable.toWeb(createReadStream(file)) as ReadableStream,
        duplex: 'half',
        signal: AbortSignal.timeout(120_000),
      } as RequestInit & { duplex: string }
    );
    if (!result.content_uri?.startsWith('mxc://'))
      throw new Error('Matrix upload returned no media URI');
    return result.content_uri;
  }

  async matrixSend(
    room: AttachmentRoom,
    content: Record<string, unknown>
  ): Promise<string> {
    if (
      ![
        ...this.fixture.independentRooms,
        ...this.fixture.sharedBucketRooms,
      ].some(value => value.matrixRoomID === room.matrixRoomID)
    )
      throw new Error('Cannot send to a room outside the fixture');
    const result = await this.matrixJson<{ event_id: string }>(
      `/_matrix/client/v3/rooms/${encodeURIComponent(room.matrixRoomID)}/send/m.room.message/${randomUUID()}`,
      {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(content),
      }
    );
    if (!result.event_id) throw new Error('Matrix send returned no event ID');
    return result.event_id;
  }

  async matrixLeave(room: AttachmentRoom): Promise<void> {
    if (
      !this.fixture.independentRooms.some(
        value => value.matrixRoomID === room.matrixRoomID
      )
    )
      throw new Error('Cannot leave a room outside the fixture conversations');
    await this.matrixJson(
      `/_matrix/client/v3/rooms/${encodeURIComponent(room.matrixRoomID)}/leave`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: '{}',
      }
    );
  }

  async matrixMessages(
    roomID: string
  ): Promise<{ event_id: string; content: Record<string, unknown> }[]> {
    if (
      ![
        ...this.fixture.independentRooms,
        ...this.fixture.sharedBucketRooms,
      ].some(room => room.matrixRoomID === roomID)
    )
      throw new Error('Cannot read a room outside the fixture');
    const result = await this.matrixJson<{
      chunk: { event_id: string; content: Record<string, unknown> }[];
    }>(
      `/_matrix/client/v3/rooms/${encodeURIComponent(roomID)}/messages?dir=b&limit=100`
    );
    return result.chunk;
  }

  async matrixDownload(mxc: string): Promise<Response> {
    const match = /^mxc:\/\/([^/]+)\/([^/?#]+)$/.exec(mxc);
    if (!match) throw new Error('Invalid fixture media URI');
    return fetch(
      `${this.fixture.matrixURL}/_matrix/client/v1/media/download/` +
        `${encodeURIComponent(match[1])}/${encodeURIComponent(match[2])}`,
      {
        headers: { authorization: `Bearer ${this.user.matrixAccessToken}` },
        signal: AbortSignal.timeout(120_000),
      }
    );
  }
}

export type AttachmentRow = {
  id: string;
  storageBucketId: string;
  externalReference: string | null;
  externalID: string;
  authorizationId: string | null;
  tagsetId: string | null;
  createdBy: string | null;
  displayName: string;
  mimeType: string;
  contentMetadata: { imageWidth?: number; imageHeight?: number } | null;
  size: string;
  createdDate: Date;
  temporaryLocation: boolean;
};

/** No arbitrary SQL surface, no writes, no unscoped file-table inventory. */
export class AttachmentRows {
  private readonly pool: Pool;
  private readonly buckets: Set<string>;
  constructor(private readonly fixture: AttachmentFixture) {
    validateAttachmentFixture(fixture);
    this.buckets = new Set(
      [...fixture.independentRooms, ...fixture.sharedBucketRooms].map(
        r => r.bucketID
      )
    );
    this.pool = new Pool({
      connectionString: fixture.postgresURL,
      max: 1,
      connectionTimeoutMillis: 5000,
      options: '-c default_transaction_read_only=on -c statement_timeout=5000',
    });
    this.pool.on('error', () => {
      /* Query/connection failures are reported without credential-bearing URLs. */
    });
  }

  async files(scope: {
    bucketIDs?: string[];
    mediaIDs?: string[];
    fileIDs?: string[];
  }): Promise<AttachmentRow[]> {
    const buckets = scope.bucketIDs ?? [];
    const media = scope.mediaIDs ?? [];
    const files = scope.fileIDs ?? [];
    if (
      (!buckets.length && !media.length && !files.length) ||
      Math.max(buckets.length, media.length, files.length) > 100 ||
      buckets.some(id => !this.buckets.has(id)) ||
      files.some(id => !UUID.test(id)) ||
      media.some(id => !/^[a-zA-Z0-9_-]{1,256}$/.test(id))
    )
      throw new Error('File assertions require bounded fixture IDs');
    // Staging is included only with explicit media/file IDs, never as a bucket-wide scan.
    const allowed = [
      ...this.buckets,
      ...(media.length || files.length ? [MATRIX_STAGING_BUCKET] : []),
    ];
    try {
      const result = await this.pool.query<AttachmentRow>(
        `SELECT id, "storageBucketId", "externalReference", "externalID", "authorizationId", "tagsetId",
          "createdBy", "displayName", "mimeType", content_metadata AS "contentMetadata", size, "createdDate", "temporaryLocation"
         FROM file WHERE "storageBucketId" = ANY($1::uuid[])
          AND ("storageBucketId" = ANY($2::uuid[]) OR "externalReference" = ANY($3::text[])
            OR id = ANY($4::uuid[])) ORDER BY "createdDate", id`,
        [allowed, buckets, media, files]
      );
      return result.rows;
    } catch {
      throw new Error('Scoped attachment row query failed');
    }
  }

  async policyRuleNames(fileID: string): Promise<string[]> {
    if (!UUID.test(fileID))
      throw new Error('Policy assertion requires a fixture file ID');
    try {
      const result = await this.pool.query<{ name: string }>(
        `SELECT rule->>'name' AS name FROM file f
         JOIN authorization_policy a ON a.id=f."authorizationId"
         CROSS JOIN LATERAL jsonb_array_elements(a."credentialRules") rule
         WHERE f.id=$1::uuid AND f."storageBucketId"=ANY($2::uuid[])`,
        [fileID, [...this.buckets]]
      );
      return result.rows.map(row => row.name);
    } catch {
      throw new Error('Scoped attachment policy query failed');
    }
  }

  async verifyIndependentRooms(): Promise<void> {
    try {
      const { rows } = await this.pool.query<{
        roomID: string;
        bucketID: string;
      }>(
        `SELECT c."roomId" AS "roomID", a."directStorageId" AS "bucketID"
         FROM conversation c JOIN storage_aggregator a ON a.id = c."storageAggregatorId"
         WHERE c."roomId" = ANY($1::uuid[])`,
        [this.fixture.independentRooms.map(r => r.roomID)]
      );
      if (
        this.fixture.independentRooms.some(
          room =>
            !rows.some(
              r => r.roomID === room.roomID && r.bucketID === room.bucketID
            )
        )
      )
        throw new Error('mismatch');
    } catch {
      throw new Error(
        'Fixture conversation bucket ownership does not match persisted data'
      );
    }
  }

  /** The fixture uses callout/post rooms in one Space; VC/template coverage is later US3 work. */
  async verifySharedSpaceRooms(): Promise<void> {
    const ids = this.fixture.sharedBucketRooms.map(room => room.roomID);
    try {
      const { rows } = await this.pool.query<{
        roomID: string;
        bucketID: string;
      }>(
        `WITH owner AS (
          SELECT c."commentsId" AS "roomID", c.id AS "calloutID" FROM callout c WHERE c."commentsId" = ANY($1::uuid[])
          UNION ALL
          SELECT p."commentsId", cc."calloutId" FROM post p
            JOIN callout_contribution cc ON cc."postId" = p.id WHERE p."commentsId" = ANY($1::uuid[])
        ) SELECT owner."roomID", a."directStorageId" AS "bucketID" FROM owner
          JOIN callout c ON c.id = owner."calloutID"
          JOIN collaboration cb ON cb."calloutsSetId" = c."calloutsSetId"
          JOIN space s ON s."collaborationId" = cb.id
          JOIN storage_aggregator a ON a.id = s."storageAggregatorId"`,
        [ids]
      );
      if (
        this.fixture.sharedBucketRooms.some(
          room =>
            !rows.some(
              r => r.roomID === room.roomID && r.bucketID === room.bucketID
            )
        )
      )
        throw new Error('mismatch');
    } catch {
      throw new Error(
        'Fixture shared Space bucket ownership does not match persisted data'
      );
    }
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}

/** Pause the actual UI send after its upload returned, without fabricating success. */
export async function pauseAttachmentSend(page: Page) {
  let held: Route | undefined;
  let release!: () => void;
  const released = new Promise<void>(resolve => {
    release = resolve;
  });
  const handler = async (route: Route) => {
    // Upload bodies can be large. Only inspect metadata-only JSON send mutations.
    if (
      !route.request().headers()['content-type']?.startsWith('application/json')
    ) {
      await route.continue();
      return;
    }
    let operation: {
      query?: string;
      variables?: {
        messageData?: {
          attachmentUpload?: { externalReference: string; displayName: string };
        };
      };
    };
    try {
      operation = route.request().postDataJSON();
    } catch {
      await route.continue();
      return;
    }
    if (
      !operation?.variables?.messageData?.attachmentUpload ||
      !/\b(sendMessageToRoom|sendMessageReplyToRoom)\b/.test(
        operation.query ?? ''
      )
    ) {
      await route.continue();
      return;
    }
    if (held) {
      await route.abort();
      return;
    }
    held = route;
    await released;
    await route.continue().catch(() => undefined);
  };
  await page.route('**/*graphql', handler);
  return {
    wait: (timeoutMs = 30_000) =>
      waitUntil(() => !!held, 'Attachment send was not intercepted', timeoutMs),
    release,
    async close() {
      if (held) await held.abort().catch(() => undefined);
      release();
      await page.unroute('**/*graphql', handler);
    },
  };
}

/** Valid exact-size non-image fixture. Padding is a PDF comment, not heap allocation. */
export async function createSizedPdf(
  file: string,
  size: number,
  maximum: number
): Promise<void> {
  if (!Number.isSafeInteger(size) || size < 1024 || size > maximum)
    throw new Error(
      'PDF size must be between 1024 bytes and the fixture maximum'
    );
  const objects = [
    '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n',
    '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n',
    '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 200 200] >>\nendobj\n',
  ];
  let prefix = '%PDF-1.4\n';
  const offsets = objects.map(object => {
    const offset = prefix.length;
    prefix += object;
    return offset;
  });
  const footer = (xref: number) =>
    'xref\n0 4\n0000000000 65535 f \n' +
    offsets
      .map(offset => `${String(offset).padStart(10, '0')} 00000 n \n`)
      .join('') +
    `trailer\n<< /Size 4 /Root 1 0 R >>\nstartxref\n${String(xref).padStart(10, '0')}\n%%EOF\n`;
  const end = footer(size - footer(0).length);
  let padding = size - prefix.length - end.length;
  const handle = await open(file, 'wx', 0o600);
  try {
    await handle.writeFile(prefix);
    while (padding) {
      const count = Math.min(padding, 64 * 1024);
      // Each line ends; even the final short line is a valid comment/whitespace.
      await handle.writeFile(
        count === 1 ? '\n' : `%${'x'.repeat(count - 2)}\n`
      );
      padding -= count;
    }
    await handle.writeFile(end);
  } finally {
    await handle.close();
  }
}

export async function sha256File(filename: string): Promise<string> {
  const hash = createHash('sha256');
  for await (const chunk of createReadStream(filename)) hash.update(chunk);
  return hash.digest('hex');
}
