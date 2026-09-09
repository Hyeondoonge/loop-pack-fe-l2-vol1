import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

// ponytail: Stryker 전용. vitest-runner에 project 선택 옵션이 없어서, unit 프로젝트만 담은
// 별도 설정 파일로 대체한다. mutate 범위가 단위 로직뿐이라 jsdom/RTL 셋업이 필요 없다.
export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  test: {
    setupFiles: ['./vitest.setup.ts'],
    env: { APP_ORIGIN: 'http://localhost:3000' },
    environment: 'node',
    include: ['**/*.unit.test.*']
  }
});
