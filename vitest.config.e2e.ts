import { fileURLToPath, URL } from 'node:url';

import dotenv from 'dotenv';
import { configDefaults, defineConfig } from 'vitest/config';

const testEnvironment = dotenv.config({
  path: '.env.test',
  quiet: true,
}).parsed;

export default defineConfig({
  resolve: {
    alias: {
      '#src': fileURLToPath(new URL('./src', import.meta.url)),
      '#test-factories': fileURLToPath(
        new URL('./test-factories', import.meta.url),
      ),
    },
  },
  test: {
    clearMocks: true,
    environment: 'node',
    env: {
      ...testEnvironment,
      NODE_ENV: 'test',
    },
    exclude: [...configDefaults.exclude, 'dist/**'],
    fileParallelism: false,
    include: ['test/**/*.e2e-spec.ts'],
  },
});
