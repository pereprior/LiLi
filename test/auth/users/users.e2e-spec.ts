import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { AppModule } from '@/app.module.js';
import { configureApp } from '@/config/app.config.js';
import { PrismaService } from '@/database/prisma.service.js';

describe('POST /auth/users', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = module.createNestApplication();
    configureApp(app);
    await app.listen(0);
    prisma = module.get(PrismaService);
  });

  beforeEach(async () => {
    await prisma.user.deleteMany();
  });

  afterAll(async () => {
    await prisma.user.deleteMany();
    await app.close();
  });

  it('creates a user and returns its public representation', async () => {
    const response = await fetch(`${await app.getUrl()}/auth/users`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        username: 'lili',
        password: 'a-secure-password',
      }),
    });

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toMatchObject({
      username: 'lili',
    });

    const user = await prisma.user.findUnique({ where: { username: 'lili' } });
    expect(user).toMatchObject({ username: 'lili' });
    expect(user?.passwordHash).not.toBe('a-secure-password');
  });

  it('rejects a username shorter than three characters', async () => {
    const response = await fetch(`${await app.getUrl()}/auth/users`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        username: 'li',
        password: 'a-secure-password',
      }),
    });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      statusCode: 400,
    });
  });

  it('rejects properties outside the create user payload', async () => {
    const response = await fetch(`${await app.getUrl()}/auth/users`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        username: 'lili',
        password: 'a-secure-password',
        role: 'admin',
      }),
    });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      statusCode: 400,
    });
  });

  it('rejects a username that already exists', async () => {
    await fetch(`${await app.getUrl()}/auth/users`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        username: 'lili',
        password: 'a-secure-password',
      }),
    });

    const response = await fetch(`${await app.getUrl()}/auth/users`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        username: 'lili',
        password: 'another-secure-password',
      }),
    });

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({
      message: 'A user with this username already exists.',
      statusCode: 409,
    });
  });
});
