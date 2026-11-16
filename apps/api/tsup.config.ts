import { defineConfig } from 'tsup';

// One ESM bundle for the Docker image. @lm/shared is TypeScript source, so it is bundled in.
export default defineConfig({
  entry: ['src/server.ts', 'src/db/migrateCli.ts'],
  format: ['esm'],
  target: 'node22',
  platform: 'node',
  noExternal: [/^@lm\//],
  clean: true,
});
