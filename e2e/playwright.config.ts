import { defineConfig, devices } from '@playwright/test';

/**
 * E2E smoke của UI (ADR 0003). API luôn được giả lập bằng page.route trong từng test, nên không cần backend.
 *
 * - E2E_BASE_URL: nếu đặt (ví dụ trỏ tới staging), dùng địa chỉ đó và không tự khởi động server.
 * - Không đặt: khởi động `ng serve` (cấu hình development) ở cổng 4200. Không dùng bản build production
 *   vì index.prod.html ép chuyển sang https.
 */
const externalBaseUrl = process.env['E2E_BASE_URL'];
const localPort = 4200;
const isCi = Boolean(process.env['CI']);

export default defineConfig({
  testDir: '.',
  testMatch: '**/*.e2e.ts',
  outputDir: '../test-results',
  fullyParallel: true,
  forbidOnly: isCi,
  retries: isCi ? 1 : 0,
  reporter: isCi
    ? [['list'], ['html', { open: 'never', outputFolder: '../playwright-report' }]]
    : [['list']],
  use: {
    baseURL: externalBaseUrl ?? `http://localhost:${localPort}`,
    trace: 'retain-on-failure',
    locale: 'vi-VN',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: externalBaseUrl
    ? undefined
    : {
      command: `npm start -- --port ${localPort}`,
      cwd: '..',
      url: `http://localhost:${localPort}/auth/login`,
      reuseExistingServer: !isCi,
      timeout: 240_000,
    },
});
