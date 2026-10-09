import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createServer, request } from 'node:http';
import { mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { PassThrough, Readable, Transform, Writable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import test from 'node:test';
import {
  AttachmentRows,
  type AttachmentFixture,
  createSizedPdf,
  loadAttachmentFixture,
  sha256File,
  validateAttachmentFixture,
} from './attachments.helpers';
import {
  assertBytesBeforeEof,
  ByteObserver,
  createStreamingProxy,
  sampleProcessMemory,
  UpstreamEofGate,
  waitUntil,
} from './attachments.streaming';

const uuid = (n: number) =>
  `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
function fixture(): AttachmentFixture {
  return {
    isolated: true,
    runID: 'harness-self-test',
    baseURL: 'http://127.0.0.1:12345',
    matrixURL: 'http://127.0.0.1:12346',
    postgresURL: 'postgres://127.0.0.1:12347/fixture',
    maxFileBytes: 1024 * 1024,
    users: [1, 2].map(n => ({
      actorID: uuid(n),
      email: `user${n}@fixture.invalid`,
      password: 'test-only',
      matrixAccessToken: 'test-only',
      matrixUserID: `@${n}:fixture.invalid`,
    })) as AttachmentFixture['users'],
    independentRooms: [3, 4].map(n => ({
      roomID: uuid(n),
      bucketID: uuid(n + 10),
      matrixRoomID: `!${n}:fixture.invalid`,
    })) as AttachmentFixture['independentRooms'],
    sharedBucketRooms: [5, 6].map(n => ({
      roomID: uuid(n),
      bucketID: uuid(20),
      matrixRoomID: `!${n}:fixture.invalid`,
    })) as AttachmentFixture['sharedBucketRooms'],
  };
}

test('fixture rejects wrong topology, shared remote hosts and readable credentials', async () => {
  validateAttachmentFixture(fixture());
  const invalid = fixture();
  invalid.sharedBucketRooms[1].bucketID = uuid(21);
  assert.throws(() => validateAttachmentFixture(invalid), /topology/);
  assert.throws(
    () =>
      validateAttachmentFixture({
        ...fixture(),
        baseURL: 'https://dev-alkem.io',
      }),
    /loopback/
  );
  const dir = await mkdtemp(path.join(tmpdir(), 'attachments-harness-'));
  try {
    const file = path.join(dir, 'fixture.json');
    await writeFile(file, JSON.stringify(fixture()), { mode: 0o644 });
    await assert.rejects(loadAttachmentFixture(file), /private/);
  } finally {
    await rm(dir, { recursive: true });
  }
});

test('row assertions reject unscoped and out-of-fixture reads before connecting', async () => {
  const rows = new AttachmentRows(fixture());
  try {
    await assert.rejects(rows.files({}), /bounded fixture IDs/);
    await assert.rejects(
      rows.files({ bucketIDs: [uuid(999)] }),
      /bounded fixture IDs/
    );
    await assert.rejects(
      rows.files({ mediaIDs: ["x' OR 1=1"] }),
      /bounded fixture IDs/
    );
  } finally {
    await rows.close();
  }
});

test('exact-size PDF fixtures are bounded, validly indexed and deterministic', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'attachments-harness-'));
  try {
    const file = path.join(dir, 'one.pdf');
    const second = path.join(dir, 'two.pdf');
    await createSizedPdf(file, 65537, 131074);
    await createSizedPdf(second, 65537, 131074);
    assert.equal((await stat(file)).size, 65537);
    const body = await readFile(file, 'utf8');
    const offset = Number(/startxref\n(\d+)/.exec(body)?.[1]);
    assert.equal(body.slice(offset, offset + 4), 'xref');
    assert.equal(await sha256File(file), await sha256File(second));
    await assert.rejects(
      createSizedPdf(path.join(dir, 'large'), 131075, 131074),
      /maximum/
    );
  } finally {
    await rm(dir, { recursive: true });
  }
});

test('byte ordering accepts streaming and rejects a whole-body accumulator', async () => {
  for (const buffered of [false, true]) {
    const gate = new UpstreamEofGate(1024);
    const observer = new ByteObserver();
    const chunks: Buffer[] = [];
    const forwarder = buffered
      ? new Transform({
          transform(chunk, _encoding, callback) {
            chunks.push(chunk);
            callback();
          },
          flush(callback) {
            callback(null, Buffer.concat(chunks));
          },
        })
      : new PassThrough();
    const running = pipeline(
      Readable.from([Buffer.alloc(4096)]),
      gate,
      forwarder,
      observer,
      new Writable({
        write(_chunk, _encoding, callback) {
          callback();
        },
      })
    );
    try {
      if (buffered)
        await assert.rejects(
          assertBytesBeforeEof(gate, observer, 100),
          /No downstream bytes/
        );
      else await assertBytesBeforeEof(gate, observer);
    } finally {
      gate.release();
      await running;
    }
    assert.equal(observer.bytes, 4096);
  }
});

test('fixture HTTP proxy gates actual request bytes and cleans up', async () => {
  let received = 0;
  const sink = createServer((incoming, outgoing) => {
    incoming.on('data', chunk => {
      received += chunk.length;
    });
    incoming.on('end', () => outgoing.end('done'));
  });
  await new Promise<void>(resolve => sink.listen(0, '127.0.0.1', resolve));
  const address = sink.address();
  assert.ok(address && typeof address !== 'string');
  const gate = new UpstreamEofGate(1024);
  const proxy = await createStreamingProxy({
    target: `http://127.0.0.1:${address.port}`,
    requestGate: gate,
  });
  const completed = new Promise<void>((resolve, reject) => {
    const upload = request(
      proxy.url,
      { method: 'POST', headers: { 'content-length': 4096 } },
      response => {
        response.resume();
        response.on('end', resolve);
      }
    );
    upload.on('error', reject);
    upload.end(Buffer.alloc(4096));
  });
  try {
    await waitUntil(() => received > 0, 'Receiver got no streaming prefix');
    assert.equal(received, 1024);
    assert.equal(gate.released, false);
    gate.release();
    await completed;
    assert.equal(received, 4096);
    assert.deepEqual(proxy.counts(), { requests: 1, failures: 0 });
  } finally {
    await proxy.close();
    await new Promise<void>(resolve => sink.close(() => resolve()));
  }
});

test('memory sampler records three real processes and marks missing heap attribution', async () => {
  const children = [1, 2, 3].map(() =>
    spawn(process.execPath, ['-e', 'setInterval(() => {}, 1000)'], {
      stdio: 'ignore',
    })
  );
  try {
    const sampler = await sampleProcessMemory(
      {
        server: children[0].pid!,
        'matrix-adapter': children[1].pid!,
        'file-service': children[2].pid!,
      },
      { intervalMs: 10 }
    );
    const result = await sampler.stop();
    assert.equal(result.runtimeAttributionProvided, false);
    for (const samples of Object.values(result.samples)) {
      assert.ok(samples.length > 0);
      assert.ok(samples[0].rssBytes > 0);
      assert.equal(samples[0].heapBytes, undefined);
    }
  } finally {
    for (const child of children) child.kill();
  }
});

test('proxy negative control buffers only the selected hop and leaves setup traffic unobserved', async () => {
  const sink = createServer((incoming, outgoing) => {
    incoming.resume();
    incoming.on('end', () => outgoing.end('ok'));
  });
  await new Promise<void>(resolve => sink.listen(0, '127.0.0.1', resolve));
  const address = sink.address();
  assert.ok(address && typeof address !== 'string');
  const proxy = await createStreamingProxy({
    target: `http://127.0.0.1:${address.port}`,
    observePath: value => value === '/upload',
    bufferObservedRequest: true,
  });
  const gate = new UpstreamEofGate(1024);
  let running: Promise<unknown> | undefined;
  let completed: Promise<unknown> | undefined;
  try {
    assert.equal((await fetch(`${proxy.url}/health`)).status, 200);
    assert.equal(proxy.counts().requests, 0);
    let sender!: ReturnType<typeof request>;
    completed = new Promise<void>((resolve, reject) => {
      sender = request(
        `${proxy.url}/upload`,
        { method: 'POST', headers: { 'content-length': 4096 } },
        response => {
          response.resume();
          response.on('end', resolve);
        }
      );
      sender.on('error', reject);
    });
    running = pipeline(Readable.from([Buffer.alloc(4096)]), gate, sender);
    await assert.rejects(
      assertBytesBeforeEof(gate, proxy.requestBytes, 100),
      /No downstream bytes/
    );
    gate.release();
    await running;
    await completed;
    assert.equal(proxy.requestBytes.bytes, 4096);
    assert.deepEqual(proxy.counts(), { requests: 1, failures: 0 });
  } finally {
    gate.release();
    await running;
    await completed;
    await proxy.close();
    await new Promise<void>(resolve => sink.close(() => resolve()));
  }
});
