import { createServer, request, type Server } from 'node:http';
import { readFile } from 'node:fs/promises';
import { performance } from 'node:perf_hooks';
import { Transform, type TransformCallback } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { setTimeout as delay } from 'node:timers/promises';
import type { Socket } from 'node:net';

export function loopbackURL(value: string): URL {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error('Attachment harness requires a valid loopback endpoint');
  }
  if (
    !['http:', 'https:'].includes(url.protocol) ||
    !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname) ||
    url.username ||
    url.password
  )
    throw new Error('Attachment harness requires a loopback HTTP endpoint');
  return url;
}

/** Test watchdog, not a product latency assertion. */
export async function waitUntil(
  predicate: () => boolean,
  description: string,
  timeoutMs = 10_000
): Promise<void> {
  const deadline = performance.now() + timeoutMs;
  while (!predicate()) {
    if (performance.now() >= deadline) throw new Error(description);
    await delay(10);
  }
}

/** Stops after a bounded prefix until released; never accumulates the body. */
export class UpstreamEofGate extends Transform {
  released = false;
  held = false;
  private remaining: number;
  private continueChunk?: () => void;

  constructor(prefixBytes: number) {
    super();
    if (!Number.isSafeInteger(prefixBytes) || prefixBytes < 1)
      throw new Error('Gate prefix must be a positive byte count');
    this.remaining = prefixBytes;
  }

  override _transform(
    chunk: Buffer,
    _encoding: string,
    done: TransformCallback
  ) {
    if (this.released) return done(null, chunk);
    const count = Math.min(this.remaining, chunk.length);
    if (count) this.push(chunk.subarray(0, count));
    this.remaining -= count;
    if (this.remaining > 0) return done();
    this.held = true;
    // At most one upstream chunk is retained; the callback applies backpressure.
    this.continueChunk = () => done(null, chunk.subarray(count));
  }

  release(): void {
    this.released = true;
    this.continueChunk?.();
    this.continueChunk = undefined;
  }

  override _destroy(error: Error | null, done: (error?: Error | null) => void) {
    this.continueChunk = undefined;
    done(error);
  }
}

export class ByteObserver extends Transform {
  bytes = 0;
  firstByteAt?: number;
  endedAt?: number;

  constructor(private readonly throttleMs = 0) {
    super();
  }

  override _transform(
    chunk: Buffer,
    _encoding: string,
    done: TransformCallback
  ) {
    this.bytes += chunk.length;
    if (chunk.length && this.firstByteAt === undefined)
      this.firstByteAt = performance.now();
    if (this.throttleMs) setTimeout(() => done(null, chunk), this.throttleMs);
    else done(null, chunk);
  }

  override _flush(done: TransformCallback) {
    this.endedAt = performance.now();
    done();
  }
}

/** This must run before release; a whole-body accumulator cannot pass it. */
export async function assertBytesBeforeEof(
  gate: UpstreamEofGate,
  downstream: ByteObserver,
  timeoutMs = 10_000
): Promise<void> {
  await waitUntil(
    () => gate.held,
    'Upstream never reached its prefix gate',
    timeoutMs
  );
  if (gate.released)
    throw new Error('EOF gate was released before observation');
  await waitUntil(
    () => downstream.bytes > 0,
    'No downstream bytes before upstream EOF',
    timeoutMs
  );
  if (gate.released || downstream.endedAt !== undefined)
    throw new Error('Observation did not precede upstream EOF');
}

async function listen(server: Server): Promise<string> {
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  const address = server.address();
  if (!address || typeof address === 'string')
    throw new Error('No fixture listener address');
  return `http://127.0.0.1:${address.port}`;
}

/**
 * A fixture-only HTTP hop. Use responseGate before server forwarding and
 * requestGate before adapter forwarding. A separate downstream proxy's
 * requestBytes measures delivery, not just bytes emitted by the source.
 * No request headers, credentials or body content are recorded.
 */
export async function createStreamingProxy(options: {
  target: string;
  requestGate?: UpstreamEofGate;
  responseGate?: UpstreamEofGate;
  downstreamDelayMs?: number;
  observePath?: (path: string) => boolean;
  /** Negative control only: intentionally violates bounded streaming in the fixture. */
  bufferObservedRequest?: boolean;
}) {
  const target = loopbackURL(options.target);
  if (target.protocol !== 'http:')
    throw new Error('Fixture proxy requires local HTTP');
  const requestBytes = new ByteObserver(options.downstreamDelayMs);
  const responseBytes = new ByteObserver();
  const sockets = new Set<Socket>();
  let requests = 0;
  let failures = 0;
  const server = createServer((incoming, outgoing) => {
    const observed =
      options.observePath?.(new URL(incoming.url ?? '/', target).pathname) ??
      true;
    if (observed && ++requests > 1) {
      outgoing.writeHead(409).end();
      return;
    }
    const upstream = request(new URL(incoming.url ?? '/', target), {
      method: incoming.method,
      headers: { ...incoming.headers, host: target.host },
    });
    const failed = () => {
      if (observed) failures++;
      incoming.destroy();
      upstream.destroy();
      outgoing.destroy();
    };
    upstream.on('error', failed);
    outgoing.on('close', () => {
      if (!outgoing.writableFinished) failed();
    });
    upstream.on('response', response => {
      outgoing.writeHead(response.statusCode ?? 502, response.headers);
      if (!observed) {
        void pipeline(response, outgoing).catch(failed);
        return;
      }
      const flow = options.responseGate
        ? pipeline(response, options.responseGate, responseBytes, outgoing)
        : pipeline(response, responseBytes, outgoing);
      void flow.catch(failed);
    });
    if (!observed) {
      void pipeline(incoming, upstream).catch(failed);
      return;
    }
    if (options.bufferObservedRequest) {
      const chunks: Buffer[] = [];
      const accumulator = new Transform({
        transform(chunk, _encoding, done) {
          chunks.push(chunk);
          done();
        },
        flush(done) {
          done(null, Buffer.concat(chunks));
        },
      });
      void pipeline(incoming, accumulator, requestBytes, upstream).catch(
        failed
      );
      return;
    }
    const flow = options.requestGate
      ? pipeline(incoming, options.requestGate, requestBytes, upstream)
      : pipeline(incoming, requestBytes, upstream);
    void flow.catch(failed);
  });
  server.on('connection', socket => {
    sockets.add(socket);
    socket.once('close', () => sockets.delete(socket));
  });
  const url = await listen(server);
  return {
    url,
    requestBytes,
    responseBytes,
    counts: () => ({ requests, failures }),
    async close() {
      options.requestGate?.destroy();
      options.responseGate?.destroy();
      for (const socket of sockets) socket.destroy();
      await new Promise<void>(resolve => server.close(() => resolve()));
    },
  };
}

export type ProcessName = 'server' | 'matrix-adapter' | 'file-service';
export type MemorySample = {
  elapsedMs: number;
  rssBytes: number;
  anonymousBytes: number;
  // Supply only from test-owned runtime inspection when attribution is needed.
  heapBytes?: number;
  externalBytes?: number;
  arrayBufferBytes?: number;
};

/** Read host PIDs (including container host PIDs) without adding product endpoints. */
export async function sampleProcessMemory(
  pids: Record<ProcessName, number>,
  options: {
    intervalMs?: number;
    maximumMs?: number;
    runtimeSample?: (name: ProcessName) => Promise<Partial<MemorySample>>;
  } = {}
) {
  const entries = Object.entries(pids) as [ProcessName, number][];
  if (
    entries.length !== 3 ||
    new Set(entries.map(([, pid]) => pid)).size !== 3 ||
    entries.some(([, pid]) => !Number.isSafeInteger(pid) || pid <= 0)
  )
    throw new Error(
      'Supply distinct host PIDs for server, adapter and file-service'
    );
  const samples: Record<ProcessName, MemorySample[]> = {
    server: [],
    'matrix-adapter': [],
    'file-service': [],
  };
  const started = performance.now();
  const identities = new Map<ProcessName, string>();
  let stopped = false;
  let failure: Error | undefined;
  async function capture() {
    for (const [name, pid] of entries) {
      const [status, stat] = await Promise.all([
        readFile(`/proc/${pid}/status`, 'utf8'),
        readFile(`/proc/${pid}/stat`, 'utf8'),
      ]);
      // Field 22 (starttime) catches PID reuse during the measured upload.
      const identity = stat.slice(stat.lastIndexOf(')') + 2).split(' ')[19];
      if (identities.has(name) && identities.get(name) !== identity)
        throw new Error(`Measured ${name} process was replaced`);
      identities.set(name, identity);
      const kb = (field: string) => {
        const match = status.match(new RegExp(`^${field}:\\s+(\\d+) kB$`, 'm'));
        if (!match) throw new Error(`Missing ${field} for ${name}`);
        return Number(match[1]) * 1024;
      };
      samples[name].push({
        ...(await options.runtimeSample?.(name)),
        elapsedMs: performance.now() - started,
        rssBytes: kb('VmRSS'),
        anonymousBytes: kb('RssAnon'),
      });
    }
  }
  await capture(); // Missing/exited processes fail rather than yielding an empty report.
  const running = (async () => {
    try {
      while (!stopped) {
        await delay(options.intervalMs ?? 250);
        if (stopped) break;
        if (performance.now() - started > (options.maximumMs ?? 120_000))
          throw new Error('Memory sampling watchdog expired');
        await capture();
      }
    } catch {
      failure = new Error(
        'Process memory sampling failed or exceeded its watchdog'
      );
    }
  })();
  return {
    async stop() {
      stopped = true;
      await running;
      if (failure) throw failure;
      return { samples, runtimeAttributionProvided: !!options.runtimeSample };
    },
  };
}
