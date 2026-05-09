import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./src/test/setup.ts'],
    coverage: { reporter: ['text', 'lcov'] },
    passWithNoTests: true,
  },
  resolve: {
    alias: {
      '@container-os/domain-types': resolve(__dirname, '../../packages/domain-types/src'),
      '@container-os/i18n': resolve(__dirname, '../../packages/i18n/src'),
    },
  },
});
