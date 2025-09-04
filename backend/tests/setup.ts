import dotenv from 'dotenv';

// Load test environment variables
dotenv.config({ path: '.env.test' });

// Global test setup
beforeAll(async () => {
  // Setup test database or other global resources
});

afterAll(async () => {
  // Cleanup test database or other global resources
});

// Mock console methods in tests to reduce noise
global.console = {
  ...console,
  // Uncomment to disable console.log in tests
  // log: jest.fn(),
  // error: jest.fn(),
  // warn: jest.fn(),
};
