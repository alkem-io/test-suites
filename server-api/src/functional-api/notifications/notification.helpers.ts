// Shared helper for building NotificationSettingInput objects in specs
// Keeps tests concise and consistent with schema shape.
export const notif = (v: boolean) => ({ email: v, inApp: v });

// Extended helper that includes push channel for PWA push notification tests
export const notifWithPush = (v: boolean) => ({ email: v, inApp: v, push: v });

// Helper for setting push channel independently
export const notifPush = (emailInApp: boolean, push: boolean) => ({
  email: emailInApp,
  inApp: emailInApp,
  push,
});
