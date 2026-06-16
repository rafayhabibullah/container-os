import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./src/test/setup.ts'],
    testTimeout: 15000,
    coverage: { reporter: ['text', 'lcov'] },
    passWithNoTests: true,
  },
  resolve: {
    alias: {
      '@sitelager/domain-types': resolve(__dirname, '../../packages/domain-types/src'),
      '@sitelager/i18n': resolve(__dirname, '../../packages/i18n/src'),
    },
  },
});
