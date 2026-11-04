import base from './vitest.config';
// Collection-only config: no globalSetup / setupFiles, no server needed.
const stub = { platformRoles: { runId: 'stub', tokens: {}, userIds: {}, bootstrapToken: '', fixtures: {} } };
const cfg: any = base;
cfg.test.globalSetup = [];
cfg.test.setupFiles = [];
cfg.test.reporters = ['default'];
cfg.test.provide = stub;
delete cfg.test.outputFile;
for (const p of cfg.test.projects) { if (p.test) { p.test.globalSetup = []; p.test.setupFiles = []; p.test.provide = stub; } }
export default cfg;
