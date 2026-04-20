#!/usr/bin/env node
/**
 * @alkemio/test-plans — CLI entry point.
 *
 * Scaffold stage: parses subcommands and global flags. Subcommand bodies
 * delegate to placeholder implementations under src/{parse,join,enrich,render,write}/,
 * which throw "not implemented" at this stage and are filled in by Phase 3+ tasks.
 */

import { validateCommand } from './commands/validate.js';
import { scanCommand } from './commands/scan.js';
import { buildCommand } from './commands/build.js';
import { ingestRunsCommand } from './commands/ingest-runs.js';

export interface GlobalFlags {
  pullRuns: boolean;
  outDir: string;
  strict: boolean;
  contentRoot: string;
  runsDir: string;
  generatedAt: string;
}

const DEFAULT_OUT_DIR = 'dist';
const DEFAULT_CONTENT_ROOT = 'content';
const DEFAULT_RUNS_DIR = 'gh-pages-root/test-plans/runs';

function parseFlags(args: string[]): { flags: GlobalFlags; positional: string[] } {
  const flags: GlobalFlags = {
    pullRuns: false,
    outDir: DEFAULT_OUT_DIR,
    strict: false,
    contentRoot: DEFAULT_CONTENT_ROOT,
    runsDir: DEFAULT_RUNS_DIR,
    generatedAt: process.env.GITHUB_SHA ?? 'local-dev',
  };
  const positional: string[] = [];

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    switch (arg) {
      case '--pull-runs':
        flags.pullRuns = true;
        break;
      case '--strict':
        flags.strict = true;
        break;
      case '--out-dir':
        flags.outDir = requireValue(args, ++i, '--out-dir');
        break;
      case '--content-root':
        flags.contentRoot = requireValue(args, ++i, '--content-root');
        break;
      case '--runs-dir':
        flags.runsDir = requireValue(args, ++i, '--runs-dir');
        break;
      case '--generated-at':
        flags.generatedAt = requireValue(args, ++i, '--generated-at');
        break;
      default:
        if (arg.startsWith('--out-dir=')) {
          flags.outDir = arg.slice('--out-dir='.length);
        } else if (arg.startsWith('--content-root=')) {
          flags.contentRoot = arg.slice('--content-root='.length);
        } else if (arg.startsWith('--runs-dir=')) {
          flags.runsDir = arg.slice('--runs-dir='.length);
        } else if (arg.startsWith('--generated-at=')) {
          flags.generatedAt = arg.slice('--generated-at='.length);
        } else {
          positional.push(arg);
        }
    }
  }
  return { flags, positional };
}

function requireValue(args: string[], index: number, name: string): string {
  const value = args[index];
  if (!value || value.startsWith('--')) {
    throw new Error(`[test-plans] flag ${name} requires a value`);
  }
  return value;
}

function printUsage(): void {
  console.log('Usage: test-plans <subcommand> [options]');
  console.log('');
  console.log('Subcommands:');
  console.log('  validate      Validate feature libraries and release plans against schemas.');
  console.log('  scan          Scan test code for @testCase tags; report coverage defects.');
  console.log('  build         Render the dashboard to --out-dir (default: dist/).');
  console.log('  ingest-runs   Normalize a Vitest JSON report and append it to the runs store.');
  console.log('');
  console.log('Global flags:');
  console.log('  --content-root <dir>   Content root for feature libraries and release plans (default: content).');
  console.log('  --out-dir <dir>        Output directory for the rendered dashboard (default: dist).');
  console.log('  --pull-runs            For build: load automated run summaries from --runs-dir before rendering.');
  console.log('  --runs-dir <dir>       Path to a gh-pages checkout\'s runs/ tree (default: gh-pages-root/test-plans/runs).');
  console.log('  --generated-at <str>   Stable content version used in the footer (default: $GITHUB_SHA or "local-dev").');
  console.log('  --strict               For scan/validate: exit non-zero on any coverage defect.');
  console.log('');
}

async function main(argv: string[]): Promise<number> {
  const [, , subcommand, ...rest] = argv;
  if (!subcommand || subcommand === '--help' || subcommand === '-h' || subcommand === 'help') {
    printUsage();
    return subcommand ? 0 : 1;
  }
  const { flags } = parseFlags(rest);

  switch (subcommand) {
    case 'validate':
      return await validateCommand(flags);
    case 'scan':
      return await scanCommand(flags);
    case 'build':
      return await buildCommand(flags);
    case 'ingest-runs':
      return await ingestRunsCommand(flags, rest);
    default:
      console.error(`[test-plans] unknown subcommand: ${subcommand}`);
      printUsage();
      return 1;
  }
}

main(process.argv).then(
  code => process.exit(code),
  err => {
    console.error('[test-plans] unhandled error:', err);
    process.exit(3);
  }
);
