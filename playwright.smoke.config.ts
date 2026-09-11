import { defineConfig, devices } from '@playwright/test';

// 06-smoke-test-plan.md 7번 — 배포된 URL을 대상으로 하므로 webServer가 없다.
// 로컬 서버를 띄우는 playwright.config.ts와 이 점이 유일하게 다른 목적이라 config를 분리했다.
const DEPLOYMENT_URL = process.env.DEPLOYMENT_URL;

if (!DEPLOYMENT_URL) {
  throw new Error('DEPLOYMENT_URL이 설정되지 않았다. 예: DEPLOYMENT_URL=https://... pnpm test:smoke');
}

export default defineConfig({
  testDir: './smoke',
  forbidOnly: Boolean(process.env.CI),
  reporter: process.env.CI ? [['list'], ['github']] : 'list',
  retries: 0,
  use: {
    baseURL: DEPLOYMENT_URL,
    trace: 'retain-on-failure'
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }]
});
