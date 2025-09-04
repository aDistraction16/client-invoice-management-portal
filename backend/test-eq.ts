// Test file to verify drizzle-orm eq function works
import { eq } from 'drizzle-orm';
import { users } from './src/db/schema';

// This should compile without errors
const testQuery = eq(users.email, 'test@example.com');
console.log('eq function test passed!');
