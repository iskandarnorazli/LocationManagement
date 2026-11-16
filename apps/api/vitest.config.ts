import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // API tests share one database; run files one after another.
    fileParallelism: false,
    globalSetup: ['test/globalSetup.ts'],
  },
});
