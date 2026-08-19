// Fixture-only stand-ins for the real hazard symbols the lane guard resolves
// against — the fail-closed staleness check just needs these names to exist
// as real exports somewhere under server-api/src or lib/src.
export const assignPlatformRole = async (..._args: unknown[]) => {};
export const removePlatformRole = async (..._args: unknown[]) => {};
export const updateUser = async (..._args: unknown[]) => {};
export const updateUserSettings = async (..._args: unknown[]) => {};
export const updateUserSettingsWithPush = async (..._args: unknown[]) => {};
export const deleteMailSlurperMails = async () => {};
export const getMails = async () => {};
export const getMailsData = async () => {};
