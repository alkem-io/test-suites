#!/usr/bin/env node
/**
 * Verify the Collabora analytics ownership-lookup timing records (SC-003 of
 * server feature 110-collabora-editor-url-latency / server#6360).
 *
 * The acceptance signal is a structured INFO record the lifecycle subscriber
 * emits once per lookup attempt, on success and on failure:
 *
 *   message:             Collabora document analytics space lookup completed
 *   eventName:           collabora.document.{opened|replaced|uploaded}
 *   collaboraDocumentId: <the document>
 *   outcome:             success | failure
 *   durationMs:          <non-negative number>
 *
 * Production acceptance reads these in Kibana. This script is the stand-in for
 * environments where Kibana is not wired up (dev): pipe the server log through
 * it and it applies the same rules.
 *
 * Two rules from the spec are encoded deliberately:
 *   - every durationMs must be below the threshold (default 100 ms);
 *   - ZERO records is "unverified", NOT a pass — it exits non-zero, because a
 *     dead subscriber and a fast subscriber are indistinguishable from silence.
 *
 * Usage:
 *   docker logs alkemio-server 2>&1 | node scripts/verify-collabora-lookup-records.mjs
 *   kubectl logs deploy/alkemio-server | node scripts/verify-collabora-lookup-records.mjs
 *   node scripts/verify-collabora-lookup-records.mjs --file server.log
 *
 * Options:
 *   --file <path>          read from a file instead of stdin
 *   --threshold-ms <n>     per-record ceiling (default 100)
 *   --document-ids <list>  comma-separated; only consider these documents
 *   --expect <n>           also require at least n records
 *   --json                 emit the summary as JSON
 */

import { readFileSync } from 'node:fs';
import { createInterface } from 'node:readline';

const LOOKUP_MESSAGE = 'Collabora document analytics space lookup completed';
const FAILURE_MESSAGE = 'Failed to process Collabora document analytics';

/**
 * The subscriber logs an OBJECT as the Winston message. Only the JSON console
 * format (`LOGGING_FORMAT_JSON=true`) preserves its fields; the default dev
 * format (`nestLike`) stringifies it to the literal "[object Object]", so
 * durationMs / outcome / collaboraDocumentId are gone before they reach the
 * log. Detecting that is more useful than reporting "no records found", which
 * is what it would otherwise look like.
 */
const LOST_STRUCTURE_MARKER = '[collaboration] [object Object]';

const parseArgs = argv => {
  const options = {
    file: undefined,
    thresholdMs: 100,
    documentIds: undefined,
    expect: 1,
    json: false,
  };
  for (let i = 0; i < argv.length; i++) {
    switch (argv[i]) {
      case '--file':
        options.file = argv[++i];
        break;
      case '--threshold-ms':
        options.thresholdMs = Number(argv[++i]);
        break;
      case '--document-ids':
        options.documentIds = new Set(
          argv[++i]
            .split(',')
            .map(value => value.trim())
            .filter(Boolean)
        );
        break;
      case '--expect':
        options.expect = Number(argv[++i]);
        break;
      case '--json':
        options.json = true;
        break;
      default:
        break;
    }
  }
  return options;
};

/**
 * Pull a lookup record out of one log line.
 *
 * Winston writes the payload object either as the log entry itself or nested
 * under `message`, depending on the transport/format in use, so both shapes are
 * accepted rather than assuming one deployment's formatting.
 */
const extractRecord = line => {
  const start = line.indexOf('{');
  if (start === -1) return undefined;

  let parsed;
  try {
    parsed = JSON.parse(line.slice(start));
  } catch {
    return undefined;
  }

  const candidates = [parsed, parsed?.message, parsed?.meta, parsed?.payload];
  for (const candidate of candidates) {
    if (candidate && typeof candidate === 'object') {
      if (candidate.message === LOOKUP_MESSAGE) {
        return { kind: 'lookup', ...candidate };
      }
      if (candidate.message === FAILURE_MESSAGE) {
        return { kind: 'failure', ...candidate };
      }
    }
  }
  return undefined;
};

const percentile = (sortedValues, fraction) => {
  if (sortedValues.length === 0) return undefined;
  const index = Math.min(
    sortedValues.length - 1,
    Math.ceil(fraction * sortedValues.length) - 1
  );
  return sortedValues[Math.max(0, index)];
};

const main = async () => {
  const options = parseArgs(process.argv.slice(2));

  const lines = [];
  if (options.file) {
    lines.push(...readFileSync(options.file, 'utf8').split('\n'));
  } else {
    const rl = createInterface({ input: process.stdin, crlfDelay: Infinity });
    for await (const line of rl) lines.push(line);
  }

  const lookups = [];
  const failures = [];
  let structureLostLines = 0;
  for (const line of lines) {
    if (line.includes(LOST_STRUCTURE_MARKER)) structureLostLines++;
    const record = extractRecord(line);
    if (!record) continue;
    if (
      options.documentIds &&
      !options.documentIds.has(record.collaboraDocumentId)
    ) {
      continue;
    }
    if (record.kind === 'lookup') lookups.push(record);
    else failures.push(record);
  }

  const durations = lookups
    .map(record => Number(record.durationMs))
    .filter(value => Number.isFinite(value))
    .sort((a, b) => a - b);

  const byEventOutcome = {};
  for (const record of lookups) {
    const key = `${record.eventName ?? 'unknown'} / ${record.outcome ?? 'unknown'}`;
    byEventOutcome[key] = (byEventOutcome[key] ?? 0) + 1;
  }

  const overThreshold = lookups.filter(
    record => Number(record.durationMs) >= options.thresholdMs
  );

  const problems = [];
  if (lookups.length === 0 && structureLostLines > 0) {
    problems.push(
      `${structureLostLines} collaboration log line(s) rendered as "[object Object]" — the subscriber IS running, but this log's format discards the record fields. Restart the server with LOGGING_FORMAT_JSON=true and collect again.`
    );
  } else if (lookups.length === 0) {
    problems.push(
      'no lookup timing records found — UNVERIFIED, not a pass. The subscriber may not be running, or the log stream may not include it.'
    );
  } else if (lookups.length < options.expect) {
    problems.push(
      `found ${lookups.length} record(s), expected at least ${options.expect}`
    );
  }
  if (overThreshold.length > 0) {
    problems.push(
      `${overThreshold.length} record(s) at or above the ${options.thresholdMs} ms ceiling`
    );
  }

  const summary = {
    records: lookups.length,
    byEventOutcome,
    durationMs: {
      max: durations.at(-1),
      p95: percentile(durations, 0.95),
      median: percentile(durations, 0.5),
    },
    thresholdMs: options.thresholdMs,
    overThreshold: overThreshold.map(record => ({
      collaboraDocumentId: record.collaboraDocumentId,
      eventName: record.eventName,
      outcome: record.outcome,
      durationMs: record.durationMs,
    })),
    handlerFailures: failures.map(record => ({
      collaboraDocumentId: record.collaboraDocumentId,
      eventName: record.eventName,
      errorMessage: record.errorMessage,
    })),
    verdict: problems.length === 0 ? 'pass' : 'fail',
    problems,
  };

  if (options.json) {
    console.log(JSON.stringify(summary, null, 2));
  } else {
    console.log(`Collabora ownership-lookup timing records\n`);
    console.log(`  records found : ${summary.records}`);
    for (const [key, count] of Object.entries(byEventOutcome)) {
      console.log(`    ${key}: ${count}`);
    }
    console.log(
      `  durationMs    : median ${summary.durationMs.median ?? '-'}, p95 ${
        summary.durationMs.p95 ?? '-'
      }, max ${summary.durationMs.max ?? '-'} (ceiling ${options.thresholdMs})`
    );
    if (summary.handlerFailures.length > 0) {
      console.log(
        `\n  contained handler failures (expected for documents with no owning Space):`
      );
      for (const failure of summary.handlerFailures) {
        console.log(
          `    ${failure.collaboraDocumentId} ${failure.eventName} — ${failure.errorMessage}`
        );
      }
    }
    if (summary.overThreshold.length > 0) {
      console.log(`\n  OVER CEILING:`);
      for (const record of summary.overThreshold) {
        console.log(
          `    ${record.collaboraDocumentId} ${record.eventName} ${record.outcome} ${record.durationMs} ms`
        );
      }
    }
    console.log(`\n  verdict: ${summary.verdict.toUpperCase()}`);
    for (const problem of problems) console.log(`    - ${problem}`);
  }

  process.exit(problems.length === 0 ? 0 : 1);
};

main().catch(error => {
  console.error(error);
  process.exit(2);
});
