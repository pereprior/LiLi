import { fileURLToPath, URL } from 'node:url';

import { configDefaults, defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@test-factories': fileURLToPath(
        new URL('./test-factories', import.meta.url),
      ),
    },
  },
  test: {
    clearMocks: true,
    environment: 'node',
    exclude: [...configDefaults.exclude, 'dist/**'],
  },
});
