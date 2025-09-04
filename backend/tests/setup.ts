import dotenv from 'dotenv';

// Load test environment variables
dotenv.config({ path: '.env.test' });

// Increase test timeout
jest.setTimeout(30000);

// Global test setup
beforeAll(async () => {
  // Setup test database or other global resources
  console.log('Setting up test environment...');
});

afterAll(async () => {
  // Cleanup test database or other global resources
  console.log('Cleaning up test environment...');
});

// Mock console methods in tests to reduce noise if needed
// global.console = {
//   ...console,
//   log: jest.fn(),
//   error: jest.fn(),
//   warn: jest.fn(),
// };
