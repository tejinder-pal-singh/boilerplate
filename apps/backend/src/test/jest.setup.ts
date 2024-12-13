import { setGlobalOptions } from '@golevelup/ts-jest';

setGlobalOptions({
  // Increase test timeout for integration tests
  setTimeout: 30000,
});

// Global test setup
beforeAll(async () => {
  // Add global setup if needed
});

// Global test cleanup
afterAll(async () => {
  // Add global cleanup if needed
});
