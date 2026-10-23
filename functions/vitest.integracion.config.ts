import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['test/integracion.test.ts'],
    testTimeout: 60000,
    fileParallelism: false,
  },
});
