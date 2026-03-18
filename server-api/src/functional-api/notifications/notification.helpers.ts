// Shared helper for building NotificationSettingInput objects in specs
// Keeps tests concise and consistent with schema shape.
export const notif = (v: boolean) => ({ email: v, inApp: v });
