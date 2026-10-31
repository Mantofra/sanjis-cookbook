import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Only pick up files under server/tests/ ending in .test.ts.
    include: ['tests/**/*.test.ts'],
    // Fake env vars so config.ts (task 1.2) validates during tests without a real .env.
    env: {
      NODE_ENV: 'test',
      JWT_SECRET: 'test-secret',
      MONGODB_URI: 'mongodb://unused',
    },
  },
});
