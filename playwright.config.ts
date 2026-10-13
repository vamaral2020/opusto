import { defineConfig, devices } from '@playwright/test'

const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:3000'

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL,
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium-desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'chromium-mobile', use: { ...devices['Pixel 7'] } },
  ],
  webServer: process.env.PLAYWRIGHT_BASE_URL
    ? undefined
    : {
        command: 'pnpm dev',
        env: {
          DATABASE_URL:
            process.env.DATABASE_URL || 'postgresql://opusto:opusto-dev@127.0.0.1:5432/opusto',
          PAYLOAD_SECRET: process.env.PAYLOAD_SECRET || 'playwright-local-secret',
          SITE_URL: baseURL,
        },
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
        url: `${baseURL}/api/health/ready`,
      },
})
