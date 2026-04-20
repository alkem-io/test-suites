/**
 * JSON Schemas for the structured artifacts. These are inlined copies of
 * `specs/004-qa-test-plans/contracts/*.schema.json` — keep them in sync by
 * convention when the contracts evolve.
 */

export const CASE_METADATA_SCHEMA = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  $id: 'https://alkem.io/schemas/test-plans/test-case.json',
  title: 'Test Case (per-section fenced YAML)',
  type: 'object',
  additionalProperties: false,
  required: ['priority', 'type', 'state', 'automation'],
  properties: {
    priority: { type: 'string', enum: ['P1', 'P2', 'P3'] },
    type: { type: 'string', enum: ['functional', 'integration', 'e2e', 'other'] },
    state: { type: 'string', enum: ['Draft', 'Ready', 'Retired'] },
    automation: { type: 'string', enum: ['required', 'optional'] },
    owner: { type: 'string' },
    links: {
      type: 'object',
      additionalProperties: false,
      properties: {
        stories: { type: 'array', items: { $ref: '#/$defs/crossRepoRef' } },
        bugs: { type: 'array', items: { $ref: '#/$defs/crossRepoRef' } },
        prs: { type: 'array', items: { $ref: '#/$defs/crossRepoRef' } },
      },
    },
  },
  $defs: {
    crossRepoRef: {
      type: 'string',
      pattern: '^[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+#[1-9][0-9]*$',
    },
  },
} as const;

export const RELEASE_PLAN_FRONT_MATTER_SCHEMA = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  $id: 'https://alkem.io/schemas/test-plans/release-plan.json',
  title: 'Release Plan front-matter',
  type: 'object',
  additionalProperties: false,
  required: ['release'],
  properties: {
    release: {
      type: 'string',
      pattern: '^R[1-9][0-9]*(\\.[1-9][0-9]*)?$',
    },
    target_date: { type: 'string', format: 'date' },
    description: { type: 'string' },
  },
} as const;

export const RUN_SUMMARY_SCHEMA = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  $id: 'https://alkem.io/schemas/test-plans/run-summary.json',
  title: 'Run Summary',
  type: 'object',
  additionalProperties: false,
  required: ['date', 'suite', 'runs'],
  properties: {
    date: { type: 'string', format: 'date' },
    suite: { type: 'string', enum: ['server-api', 'client-web'] },
    runs: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['runId', 'startedAt', 'completedAt', 'commit', 'branch', 'tests'],
        properties: {
          runId: { type: 'string' },
          startedAt: { type: 'string', format: 'date-time' },
          completedAt: { type: 'string', format: 'date-time' },
          commit: { type: 'string', pattern: '^[0-9a-f]{7,40}$' },
          branch: { type: 'string' },
          tests: {
            type: 'array',
            items: {
              type: 'object',
              additionalProperties: false,
              required: ['file', 'status'],
              properties: {
                file: { type: 'string' },
                status: { type: 'string', enum: ['passed', 'failed', 'skipped'] },
                durationMs: { type: 'integer', minimum: 0 },
                failures: {
                  type: 'array',
                  items: {
                    type: 'object',
                    additionalProperties: false,
                    required: ['name', 'message'],
                    properties: {
                      name: { type: 'string' },
                      message: { type: 'string' },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
} as const;
