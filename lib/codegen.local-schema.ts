import type { CodegenConfig } from "@graphql-codegen/cli";
import baseConfig from "./codegen";

/**
 * 027-platform-role-redesign (T020, Slice B) — codegen against the COMMITTED
 * server schema snapshot instead of a live `localhost:3000`.
 *
 * Slice B is a coordinated release train (FR-029): the server, `client-web` and
 * this repo merge together, so while the work is in flight there is no develop
 * server carrying the Slice B vocabulary to generate against. `../../server` is
 * the sibling worktree on the same `feat/027-platform-role-redesign-slice-b`
 * branch, and its `schema.graphql` is regenerated and diff-verified by the
 * server's own contract gates (`schema:print`/`sort`/`diff`/`validate`).
 *
 * Use the ordinary `pnpm codegen` once Slice B has merged to develop. Mirrors
 * the pattern `client-web` already uses (`codegen.local-schema.yml`).
 */
const config: CodegenConfig = {
  ...baseConfig,
  schema: "../../server/schema.graphql",
};

export default config;
