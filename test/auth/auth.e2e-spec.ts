import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { AppModule } from '#src/app.module.js';
import { configureApp } from '#src/config/app.config.js';

describe('retired user API', () => {
  let app: INestApplication;
  let baseUrl: string;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = module.createNestApplication();
    configureApp(app);
    await app.listen(0);
    baseUrl = await app.getUrl();
  });

  afterAll(async () => {
    await app.close();
  });

  it.each([
    ['GET', '/auth/users'],
    ['POST', '/auth/users'],
    ['PATCH', '/auth/users/any'],
    ['DELETE', '/auth/users/any'],
  ])('%s %s is unavailable', async (method, path) => {
    const response = await fetch(new URL(path, baseUrl), { method });
    expect(response.status).toBe(404);
  });
});
