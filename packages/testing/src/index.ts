import { faker } from '@faker-js/faker';
import { execSync } from 'child_process';
import { Pool } from 'pg';

// Database utilities
export const createTestDatabase = async (name: string) => {
  const pool = new Pool({
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '5432'),
  });

  await pool.query(`DROP DATABASE IF EXISTS ${name}`);
  await pool.query(`CREATE DATABASE ${name}`);
  await pool.end();

  // Run migrations
  execSync(`NODE_ENV=test DATABASE_URL=postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${name} pnpm migrate:latest`);
};

// Mock data generators
export const createMockUser = () => ({
  id: faker.string.uuid(),
  email: faker.internet.email().toLowerCase(),
  firstName: faker.person.firstName(),
  lastName: faker.person.lastName(),
  createdAt: faker.date.past(),
  updatedAt: faker.date.recent(),
});

export const createMockPost = (userId: string) => ({
  id: faker.string.uuid(),
  title: faker.lorem.sentence(),
  content: faker.lorem.paragraphs(),
  userId,
  createdAt: faker.date.past(),
  updatedAt: faker.date.recent(),
});

// Test utilities
export const waitFor = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const retryOperation = async <T>(
  operation: () => Promise<T>,
  { maxRetries = 3, delay = 1000 } = {}
): Promise<T> => {
  let lastError: Error | undefined;

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      if (i < maxRetries - 1) {
        await waitFor(delay);
      }
    }
  }

  throw lastError;
};

// Mock service responses
export const mockApiResponse = (status: number, data?: any, headers?: Record<string, string>) => {
  return {
    status,
    data,
    headers: {
      'content-type': 'application/json',
      ...headers,
    },
  };
};

// Test matchers
export const toBeWithinRange = (actual: number, floor: number, ceiling: number) => {
  const pass = actual >= floor && actual <= ceiling;
  if (pass) {
    return {
      message: () => `expected ${actual} not to be within range ${floor} - ${ceiling}`,
      pass: true,
    };
  } else {
    return {
      message: () => `expected ${actual} to be within range ${floor} - ${ceiling}`,
      pass: false,
    };
  }
};

// Performance testing utilities
export const measureExecutionTime = async <T>(
  fn: () => Promise<T>
): Promise<{ result: T; duration: number }> => {
  const start = performance.now();
  const result = await fn();
  const duration = performance.now() - start;
  return { result, duration };
};
export default ExperimentManager;
