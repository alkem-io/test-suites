import { stat } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { expect, test } from '@playwright/test';
import {
  assertBytesBeforeEof,
  AttachmentActor,
  AttachmentRows,
  createSizedPdf,
  createStreamingProxy,
  sampleProcessMemory,
  UpstreamEofGate,
  waitUntil,
  type MemorySample,
  type ProcessName,
} from './attachments.helpers';
import {
  loadAcceptanceFixture,
  uploadIdentity,
} from './attachments.acceptance';

test.describe.configure({ timeout: 300_000 });

type Samples = Record<ProcessName, MemorySample[]>;
/** Fixture code owns only local wiring/diagnostics; assertions remain in this spec. */
export type StreamingFixtureDriver = {
  isolated: true;
  runID: string;
  warmed: true;
  targets: { fileService: string; adapter: string; synapse: string };
  configureForwarding(urls: {
    fileService: string;
    adapter: string;
    synapse: string;
  }): Promise<void>;
  restoreForwarding(): Promise<void>;
  pids(): Promise<Record<ProcessName, number>>;
  runtimeSample(name: ProcessName): Promise<Partial<MemorySample>>;
  temporaryUploadFiles(): Promise<number>;
  temporaryUploadBytes(): Promise<number>;
  runtimeLimits: string;
};

async function loadDriver(runID: string): Promise<StreamingFixtureDriver> {
  const filename = process.env.ATTACHMENTS_STREAMING_DRIVER;
  if (!filename?.startsWith('/'))
    throw new Error(
      'Streaming acceptance requires an explicit private fixture driver'
    );
  if (((await stat(filename)).mode & 0o077) !== 0)
    throw new Error('Streaming fixture driver must be private');
  const driver = (await import(pathToFileURL(filename).href))
    .default as StreamingFixtureDriver;
  if (
    !driver ||
    driver.isolated !== true ||
    driver.runID !== runID ||
    driver.warmed !== true ||
    !driver.runtimeSample ||
    !driver.temporaryUploadBytes ||
    !driver.temporaryUploadFiles ||
    !driver.runtimeLimits
  )
    throw new Error(
      'Streaming needs the matching warmed isolated fixture and runtime attribution'
    );
  return driver;
}

function requireAttribution(samples: Samples) {
  for (const name of ['server', 'matrix-adapter', 'file-service'] as const) {
    if (!samples[name]?.length)
      throw new Error(`Incomplete ${name} memory evidence`);
    for (const sample of samples[name]) {
      const required =
        name === 'server'
          ? (['heapBytes', 'externalBytes', 'arrayBufferBytes'] as const)
          : (['heapBytes'] as const);
      if (
        required.some(
          field => !Number.isFinite(sample[field]) || sample[field]! < 0
        )
      )
        throw new Error(
          `Incomplete ${name} allocation attribution; RSS alone is not a pass`
        );
    }
  }
}

for (const hop of ['adapter'] as const) {
  for (const scale of ['half', 'max'] as const) {
    test(`${hop} forwards ${scale}-size original media before upstream EOF`, async ({}, testInfo) => {
      const fixture = await loadAcceptanceFixture();
      const driver = await loadDriver(fixture.runID);
      const size =
        scale === 'half'
          ? Math.floor(fixture.maxFileBytes / 2)
          : fixture.maxFileBytes;
      const file = testInfo.outputPath(`${scale}.pdf`);
      await createSizedPdf(file, size, fixture.maxFileBytes);
      const actor = new AttachmentActor(fixture, fixture.users[0]);
      await actor.authenticate();
      const gate = new UpstreamEofGate(Math.floor(fixture.maxFileBytes / 8));
      const fileService = await createStreamingProxy({
        target: driver.targets.fileService,
        observePath: path => path === '/internal/file',
      });
      const adapter = await createStreamingProxy({
        target: driver.targets.adapter,
        observePath: path => path === '/rest/messaging/media/upload',
        requestGate: gate,
      });
      const synapse = await createStreamingProxy({
        target: driver.targets.synapse,
        observePath: path =>
          /\/_matrix\/(media\/v3|client\/v1\/media)\/upload$/.test(path),
        downstreamDelayMs: scale === 'max' ? 5 : undefined,
      });
      let sampling: Awaited<ReturnType<typeof sampleProcessMemory>> | undefined;
      let pending: Promise<unknown> | undefined;
      try {
        await driver.configureForwarding({
          fileService: fileService.url,
          adapter: adapter.url,
          synapse: synapse.url,
        });
        const temporaryBefore = await driver.temporaryUploadFiles();
        let diskPeakBytes = await driver.temporaryUploadBytes();
        sampling = await sampleProcessMemory(await driver.pids(), {
          runtimeSample: async name => {
            if (name === 'file-service')
              diskPeakBytes = Math.max(
                diskPeakBytes,
                await driver.temporaryUploadBytes()
              );
            return driver.runtimeSample(name);
          },
        });
        const started = Date.now();
        // Attach rejection immediately: a failing byte assertion must still cancel/clean up the real upload.
        const upload = actor.uploadMedia({
          file,
          name: `${fixture.runID}-${hop}-${scale}.pdf`,
          mimeType: 'application/pdf',
          sourceChunkDelayMs: 12,
        });
        pending = upload.catch(() => undefined);
        await assertBytesBeforeEof(gate, synapse.requestBytes);
        gate.release();
        const result = await upload;
        const rows = new AttachmentRows(fixture);
        try {
          expect(
            (
              await uploadIdentity(
                rows,
                result,
                fixture
              )
            ).size
          ).toBe(size);
        } finally {
          await rows.close();
        }
        expect(fileService.counts()).toEqual({ requests: 0, failures: 0 });
        expect(adapter.counts()).toEqual({ requests: 1, failures: 0 });
        expect(synapse.counts()).toEqual({ requests: 1, failures: 0 });
        expect(synapse.requestBytes.bytes).toBe(size);
        await expect
          .poll(() => driver.temporaryUploadFiles())
          .toBe(temporaryBefore);
        const measured = await sampling.stop();
        sampling = undefined;
        expect(measured.runtimeAttributionProvided).toBe(true);
        requireAttribution(measured.samples);
        await testInfo.attach('streaming-memory-evidence', {
          contentType: 'application/json',
          body: JSON.stringify({
            hop,
            scale,
            size,
            elapsedMs: Date.now() - started,
            sourceThrottle:
              '64KiB per 12ms; direct public raw upload measurement',
            runtimeLimits: driver.runtimeLimits,
            candidateDiskPeakBytes: diskPeakBytes,
            candidate: measured.samples,
            bytesBeforeEOF: true,
            downstreamBytes: synapse.requestBytes.bytes,
            allocationInterpretation:
              'T068 must explain measured growth and inspect forwarding code; no RSS budget is inferred.',
          }),
        });
      } finally {
        gate.release();
        await Promise.all([
          fileService.close(),
          adapter.close(),
          synapse.close(),
        ]);
        await pending;
        try {
          await sampling?.stop();
        } finally {
          await driver.restoreForwarding();
        }
      }
    });
  }

  test(`${hop} byte-order assertion rejects a fixture whole-body accumulator`, async ({}, testInfo) => {
    const fixture = await loadAcceptanceFixture();
    const driver = await loadDriver(fixture.runID);
    const file = testInfo.outputPath('negative-control.pdf');
    await createSizedPdf(
      file,
      Math.floor(fixture.maxFileBytes / 2),
      fixture.maxFileBytes
    );
    const actor = new AttachmentActor(fixture, fixture.users[0]);
    await actor.authenticate();
    const gate = new UpstreamEofGate(Math.floor(fixture.maxFileBytes / 8));
    const fileService = await createStreamingProxy({
      target: driver.targets.fileService,
      observePath: path => path === '/internal/file',
    });
    const adapter = await createStreamingProxy({
      target: driver.targets.adapter,
      observePath: path => path === '/rest/messaging/media/upload',
      requestGate: gate,
    });
    const synapse = await createStreamingProxy({
      target: driver.targets.synapse,
      observePath: path =>
        /\/_matrix\/(media\/v3|client\/v1\/media)\/upload$/.test(path),
      bufferObservedRequest: true,
    });
    let pending: Promise<unknown> | undefined;
    try {
      await driver.configureForwarding({
        fileService: fileService.url,
        adapter: adapter.url,
        synapse: synapse.url,
      });
      const upload = actor.uploadMedia({
        file,
        name: `${fixture.runID}-${hop}-negative.pdf`,
        mimeType: 'application/pdf',
      });
      pending = upload.catch(() => undefined);
      await expect(
        assertBytesBeforeEof(gate, synapse.requestBytes, 2000)
      ).rejects.toThrow('No downstream bytes before upstream EOF');
      gate.release();
      await upload; // The negative control is buffering, not an unavailable or rejected endpoint.
    } finally {
      gate.release();
      await Promise.all([
        fileService.close(),
        adapter.close(),
        synapse.close(),
      ]);
      await pending;
      await driver.restoreForwarding();
    }
  });
}

test('cancelling a throttled fixture-maximum upload stops forwarding without upload spool', async ({}, testInfo) => {
  const fixture = await loadAcceptanceFixture();
  const driver = await loadDriver(fixture.runID);
  const file = testInfo.outputPath('cancel.pdf');
  await createSizedPdf(file, fixture.maxFileBytes, fixture.maxFileBytes);
  const actor = new AttachmentActor(fixture, fixture.users[0]);
  await actor.authenticate();
  const gate = new UpstreamEofGate(Math.floor(fixture.maxFileBytes / 8));
  const fileService = await createStreamingProxy({
    target: driver.targets.fileService,
    observePath: path => path === '/internal/file',
  });
  const adapter = await createStreamingProxy({
    target: driver.targets.adapter,
    observePath: path => path === '/rest/messaging/media/upload',
    requestGate: gate,
  });
  const synapse = await createStreamingProxy({
    target: driver.targets.synapse,
    observePath: path =>
      /\/_matrix\/(media\/v3|client\/v1\/media)\/upload$/.test(path),
    downstreamDelayMs: 20,
  });
  const abort = new AbortController();
  let pending: Promise<string> | undefined;
  try {
    await driver.configureForwarding({
      fileService: fileService.url,
      adapter: adapter.url,
      synapse: synapse.url,
    });
    const before = await driver.temporaryUploadFiles();
    pending = actor
      .uploadMedia({
        file,
        name: `${fixture.runID}-cancel.pdf`,
        mimeType: 'application/pdf',
        signal: abort.signal,
      })
      .then(
        () => 'completed',
        () => 'cancelled'
      );
    await assertBytesBeforeEof(gate, synapse.requestBytes);
    abort.abort();
    expect(await pending).toBe('cancelled');
    // Resume the artificial read pause so TCP close can be observed after queued bytes.
    // The downstream must still fail before receiving the complete upload.
    gate.release();
    await expect.poll(() => adapter.counts().failures).toBeGreaterThan(0);
    await expect
      .poll(() => driver.temporaryUploadFiles(), { timeout: 15_000 })
      .toBe(before);
    expect(synapse.requestBytes.bytes).toBeLessThan(fixture.maxFileBytes);
    expect(adapter.counts().requests).toBe(1);
    expect(synapse.counts().requests).toBe(1);
  } finally {
    abort.abort();
    gate.release();
    await Promise.all([fileService.close(), adapter.close(), synapse.close()]);
    await pending;
    await driver.restoreForwarding();
  }
});

test('raw public upload reaches Synapse before caller request EOF', async ({}, testInfo) => {
  const fixture = await loadAcceptanceFixture();
  const driver = await loadDriver(fixture.runID);
  const actor = new AttachmentActor(fixture, fixture.users[0]);
  await actor.authenticate();
  const file = testInfo.outputPath('count-original.pdf');
  await createSizedPdf(file, fixture.maxFileBytes, fixture.maxFileBytes);
  const sourceGate = new UpstreamEofGate(Math.floor(fixture.maxFileBytes / 8));
  const adapter = await createStreamingProxy({
    target: driver.targets.adapter,
    observePath: path => path === '/rest/messaging/media/upload',
  });
  const synapse = await createStreamingProxy({ target: driver.targets.synapse,
    observePath: path => /\/_matrix\/(media\/v3|client\/v1\/media)\/upload$/.test(path),
  });
  let pending: Promise<unknown> | undefined;
  try {
    await driver.configureForwarding({
      ...driver.targets,
      adapter: adapter.url,
      synapse: synapse.url,
    });
    const upload = actor.uploadMedia({
      file,
      name: `${fixture.runID}-count-original.pdf`,
      mimeType: 'application/pdf',
      sourceGate,
    });
    pending = upload.catch(() => undefined);
    await waitUntil(
      () => sourceGate.held,
      'Caller source gate was not reached'
    );
    await assertBytesBeforeEof(sourceGate, synapse.requestBytes);
    expect(adapter.counts().requests).toBe(1);
    sourceGate.release();
    await upload;
    expect(adapter.counts()).toEqual({ requests: 1, failures: 0 });
    expect(adapter.requestBytes.bytes).toBe(fixture.maxFileBytes);
  } finally {
    sourceGate.release();
    await pending;
    await Promise.all([adapter.close(), synapse.close()]);
    await driver.restoreForwarding();
  }
});
