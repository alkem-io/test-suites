// 86-reset-steps.mjs: steps file for 79-run-as-user.mjs, run as a platform admin: ask the server for a full authorization reset.
export default async ({ gq, short }) => { const r = await gq('mutation{ authorizationPolicyResetAll }'); return { authorizationPolicyResetAll: short(r) }; };
