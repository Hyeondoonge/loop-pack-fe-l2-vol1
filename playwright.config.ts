// AI 생성
import { defineConfig, devices } from '@playwright/test';

const APP_ORIGIN = 'http://localhost:3000';

export default defineConfig({
  testDir: './e2e',
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  use: {
    baseURL: APP_ORIGIN,
    trace: 'retain-on-failure'
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    // production build 위에서만 구동
    // test:e2e를 단독 실행하면 직전 빌드를 쓰게 되는데, 정확성은 CI(check 전체 실행)에서 보장
    command: 'pnpm start',
    url: APP_ORIGIN,
    reuseExistingServer: false,
    timeout: 120_000
  }
});
