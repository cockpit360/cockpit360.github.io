const { defineConfig } = require('@playwright/test');
module.exports = defineConfig({
  testDir: 'tests',
  timeout: 30000,
  use: { baseURL: 'http://localhost:4173' },
  webServer: { command: 'npx http-server . -p 4173 -s -c-1', url: 'http://localhost:4173/index.html', reuseExistingServer: !process.env.CI, timeout: 60000 },
});
