// URL utility functions
export const getLastPartOfUrl = (url: string | undefined): string => {
  if (!url) throw new Error('URL is not defined');
  const id = url.substring(url.lastIndexOf('/') + 1);
  return id;
};

// Test data generators
export const generateTestData = (prefix: string, uniqueId: string) => ({
  nameId: `${prefix}-name-id-${uniqueId}`,
  displayName: `${prefix}-display-name-${uniqueId}`,
  description: `${prefix} description ${uniqueId}`,
});

// Common test setup utilities
export const setupTestEnvironment = () => {
  // WebSocket global setup for tests
  if (typeof global !== 'undefined') {
    (global as any).WebSocket = require('ws');
  }
};
