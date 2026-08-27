// Deliberately missing `getMails` — proves the guard fails closed when a
// hazard-rule symbol no longer resolves to a real export.
export const assignPlatformRole = async (..._args: unknown[]) => {};
export const removePlatformRole = async (..._args: unknown[]) => {};
export const updateUser = async (..._args: unknown[]) => {};
export const updateUserSettings = async (..._args: unknown[]) => {};
export const updateUserSettingsWithPush = async (..._args: unknown[]) => {};
export const deleteMailSlurperMails = async () => {};
export const getMailsData = async () => {};
