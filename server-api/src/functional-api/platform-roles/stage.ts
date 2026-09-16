/**
 * workspace#027-platform-role-redesign (T006).
 *
 * The rollout stage this run of the platform-roles matrix asserts.
 *
 * - `A` (default): positive cells only. The legacy broad grants
 *   (`GLOBAL_ADMIN`'s root cascade, `GLOBAL_SUPPORT`'s cascade) still reach
 *   every action at Slice A, so a denial cell would pass for the wrong
 *   reason — it isn't exercising what it thinks it is (D18). Every spec in
 *   this directory MUST read its stage through {@link platformRolesStage} (or
 *   {@link isStageB}) rather than hard-coding an assumption, so flipping the
 *   default at Slice B (T022) is a one-line change here, not a repo-wide
 *   find/replace.
 * - `B`: the full matrix, denials included — meaningful only once the
 *   server's Slice B PR has removed the legacy grants.
 *
 * An explicitly-set but invalid value is a hard failure rather than a
 * silent skip: a typo'd `PLATFORM_ROLES_STAGE` must never quietly fall back
 * to running the (looser) Slice A half.
 */
export type PlatformRolesStage = 'A' | 'B';

const VALID_STAGES: ReadonlySet<string> = new Set<PlatformRolesStage>([
  'A',
  'B',
]);

const DEFAULT_STAGE: PlatformRolesStage = 'A';

export const PLATFORM_ROLES_STAGE_ENV_VAR = 'PLATFORM_ROLES_STAGE';

/**
 * Reads the active rollout stage from `process.env.PLATFORM_ROLES_STAGE`.
 * Unset -> `DEFAULT_STAGE` ('A'). Set to anything other than 'A' or 'B' ->
 * throws, so a misconfigured CI job fails loudly instead of quietly running
 * (and passing) only the easier half of the suite.
 */
export const platformRolesStage = (): PlatformRolesStage => {
  const raw = process.env[PLATFORM_ROLES_STAGE_ENV_VAR];

  if (raw === undefined) {
    return DEFAULT_STAGE;
  }

  if (!VALID_STAGES.has(raw)) {
    throw new Error(
      `Invalid ${PLATFORM_ROLES_STAGE_ENV_VAR}='${raw}' — must be 'A' or 'B' (unset defaults to '${DEFAULT_STAGE}')`
    );
  }

  return raw as PlatformRolesStage;
};

export const isStageB = (): boolean => platformRolesStage() === 'B';
