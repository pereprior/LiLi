import dotenv from 'dotenv';
import dotenvExpand from 'dotenv-expand';
import { defineConfig, env } from 'prisma/config';

import { getEnvironmentFilePath } from './src/config/environment.config.js';

dotenvExpand.expand(
  dotenv.config({
    path: getEnvironmentFilePath(),
  }),
);

export default defineConfig({
  schema: 'prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: env('DATABASE_URL'),
  },
});
