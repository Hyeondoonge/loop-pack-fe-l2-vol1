import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  test: {
    setupFiles: ['./vitest.setup.ts'],
    env: { APP_ORIGIN: 'http://localhost:3000' },
    projects: [
      {
        extends: true,
        test: {
          name: 'unit',
          environment: 'node',
          include: ['**/*.unit.test.*']
        }
      },
      {
        extends: true,
        test: {
          name: 'integration',
          environment: 'jsdom',
          include: ['**/*.integration.test.*'],
          // extends: true로 루트 setupFiles(MSW)가 이미 상속된다. 여기 다시 적으면 병합되어
          // server.listen()이 두 번 불리고 msw가 "already enabled network"로 죽는다.
          setupFiles: ['./vitest.setup.integration.ts']
        }
      }
    ]
  }
});
