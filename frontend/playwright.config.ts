import { defineConfig } from '@playwright/test';

/** Run browser tests serially against independently configured local tiers. */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  use: {
    baseURL: 'http://127.0.0.1:3000',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: [
    {
      command: 'node node_modules/next/dist/bin/next dev -p 3001',
      cwd: '../backend',
      url: 'http://127.0.0.1:3001/api/health',
      reuseExistingServer: !process.env.CI,
      env: {
        DATABASE_URL: '/tmp/bmss-playwright-e2e.sqlite',
        JWT_SIGNING_SECRET: 'playwright-test-signing-secret',
        FRONTEND_ORIGIN: 'http://127.0.0.1:3000',
      },
    },
    {
      command: 'node node_modules/next/dist/bin/next dev -p 3000',
      cwd: '.',
      url: 'http://127.0.0.1:3000/login',
      reuseExistingServer: !process.env.CI,
      env: {
        NEXT_PUBLIC_API_BASE_URL: 'http://127.0.0.1:3001',
      },
    },
  ],
});
