const { defineConfig } = require('@playwright/test')

// Cible la PROD (https, cookie `__Secure-`). `channel: 'chrome'` = Chrome système, aucun
// navigateur Playwright téléchargé. Séquentiel (workers:1) : les tests mutent un contact.
module.exports = defineConfig({
  testDir: './tests',
  timeout: 60_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report' }]],
  use: {
    baseURL: process.env.E2E_BASE || 'https://app.atline.ai',
    channel: 'chrome',
    headless: true,
    viewport: { width: 1280, height: 900 },
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
})
