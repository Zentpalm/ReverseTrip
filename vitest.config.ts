import { defineConfig } from 'vitest/config';
export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'],
    fileParallelism: false,
    testTimeout: 15000,
  },
  resolve: { alias: { '@': new URL('./src', import.meta.url).pathname } },
});
