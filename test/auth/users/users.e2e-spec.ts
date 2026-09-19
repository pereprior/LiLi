import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';

import { AppModule } from '@/app.module.js';
import { configureApp } from '@/config/app.config.js';
import { PrismaService } from '@/database/prisma.service.js';
import { AppLogger } from '@/logging/app-logger.js';

describe('/auth/users', () => {
  let app: INestApplication;
  let baseUrl: string;
  let prisma: PrismaService;

  beforeAll(async () => {
    vi.spyOn(AppLogger.prototype, 'log').mockImplementation(() => undefined);
    vi.spyOn(AppLogger.prototype, 'error').mockImplementation(() => undefined);

    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = module.createNestApplication();
    configureApp(app);
    await app.listen(0);
    baseUrl = await app.getUrl();
    prisma = module.get(PrismaService);
  });

  beforeEach(async () => {
    await prisma.user.deleteMany();
  });

  afterAll(async () => {
    await prisma.user.deleteMany();
    await app.close();
    vi.restoreAllMocks();
  });

  describe('POST /auth/users', () => {
    it('creates a user and returns its public representation', async () => {
      const response = await fetch(`${baseUrl}/auth/users`, {
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

      const user = await prisma.user.findUnique({
        where: { username: 'lili' },
      });
      expect(user).toMatchObject({ username: 'lili' });
      expect(user?.passwordHash).not.toBe('a-secure-password');
    });

    it('rejects a username shorter than three characters', async () => {
      const response = await fetch(`${baseUrl}/auth/users`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ username: 'li', password: 'a-secure-password' }),
      });

      expect(response.status).toBe(400);
    });

    it('rejects a password shorter than twelve characters', async () => {
      const response = await fetch(`${baseUrl}/auth/users`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ username: 'lili', password: 'short-pass' }),
      });

      expect(response.status).toBe(400);
    });

    it('rejects properties outside the create user payload', async () => {
      const response = await fetch(`${baseUrl}/auth/users`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          username: 'lili',
          password: 'a-secure-password',
          role: 'admin',
        }),
      });

      expect(response.status).toBe(400);
    });

    it('rejects a username that already exists', async () => {
      await prisma.user.create({
        data: { username: 'lili', passwordHash: 'existing-password-hash' },
      });

      const response = await fetch(`${baseUrl}/auth/users`, {
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

  describe('GET /auth/users', () => {
    it('returns an empty user list when no users exist', async () => {
      const response = await fetch(`${baseUrl}/auth/users`);

      expect(response.status).toBe(200);
      await expect(response.json()).resolves.toEqual({ users: [] });
    });

    it('returns the public representation of every user', async () => {
      const firstUser = await prisma.user.create({
        data: { username: 'lili-one', passwordHash: 'existing-password-hash' },
      });
      const secondUser = await prisma.user.create({
        data: { username: 'lili-two', passwordHash: 'existing-password-hash' },
      });

      const response = await fetch(`${baseUrl}/auth/users`);

      expect(response.status).toBe(200);
      await expect(response.json()).resolves.toMatchObject({
        users: [
          { uuid: firstUser.uuid, username: firstUser.username },
          { uuid: secondUser.uuid, username: secondUser.username },
        ],
      });
    });
  });

  describe('GET /auth/users/:uuid', () => {
    it('returns the public representation of the requested user', async () => {
      const user = await prisma.user.create({
        data: { username: 'lili', passwordHash: 'existing-password-hash' },
      });

      const response = await fetch(`${baseUrl}/auth/users/${user.uuid}`);

      expect(response.status).toBe(200);
      await expect(response.json()).resolves.toMatchObject({
        uuid: user.uuid,
        username: user.username,
      });
    });

    it('rejects an invalid UUID', async () => {
      const response = await fetch(`${baseUrl}/auth/users/not-a-uuid`);

      expect(response.status).toBe(400);
    });

    it('reports a valid but nonexistent UUID as not found', async () => {
      const response = await fetch(
        `${baseUrl}/auth/users/ccbb81f0-7bc0-4fa8-b7a3-3e4550982035`,
      );

      expect(response.status).toBe(404);
      await expect(response.json()).resolves.toMatchObject({
        message: 'User not found.',
        statusCode: 404,
      });
    });
  });

  describe('PATCH /auth/users/:uuid', () => {
    it('updates the username', async () => {
      const user = await prisma.user.create({
        data: { username: 'lili', passwordHash: 'existing-password-hash' },
      });

      const response = await fetch(`${baseUrl}/auth/users/${user.uuid}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ username: 'lili-updated' }),
      });

      expect(response.status).toBe(200);
      await expect(response.json()).resolves.toMatchObject({
        uuid: user.uuid,
        username: 'lili-updated',
      });
      await expect(
        prisma.user.findUnique({ where: { uuid: user.uuid } }),
      ).resolves.toMatchObject({ username: 'lili-updated' });
    });

    it('replaces the password with a hash', async () => {
      const user = await prisma.user.create({
        data: { username: 'lili', passwordHash: 'existing-password-hash' },
      });

      const response = await fetch(`${baseUrl}/auth/users/${user.uuid}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ password: 'another-secure-password' }),
      });

      expect(response.status).toBe(200);
      const updatedUser = await prisma.user.findUnique({
        where: { uuid: user.uuid },
      });
      expect(updatedUser?.passwordHash).not.toBe('existing-password-hash');
      expect(updatedUser?.passwordHash).not.toBe('another-secure-password');
    });

    it('updates both mutable fields', async () => {
      const user = await prisma.user.create({
        data: { username: 'lili', passwordHash: 'existing-password-hash' },
      });

      const response = await fetch(`${baseUrl}/auth/users/${user.uuid}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          username: 'lili-updated',
          password: 'another-secure-password',
        }),
      });

      expect(response.status).toBe(200);
      await expect(response.json()).resolves.toMatchObject({
        uuid: user.uuid,
        username: 'lili-updated',
      });
    });

    it('rejects invalid update payloads', async () => {
      const user = await prisma.user.create({
        data: { username: 'lili', passwordHash: 'existing-password-hash' },
      });

      const response = await fetch(`${baseUrl}/auth/users/${user.uuid}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ username: 'li', role: 'admin' }),
      });

      expect(response.status).toBe(400);
    });

    it('rejects an update that duplicates a username', async () => {
      const user = await prisma.user.create({
        data: { username: 'lili', passwordHash: 'existing-password-hash' },
      });
      await prisma.user.create({
        data: {
          username: 'other-user',
          passwordHash: 'existing-password-hash',
        },
      });

      const response = await fetch(`${baseUrl}/auth/users/${user.uuid}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ username: 'other-user' }),
      });

      expect(response.status).toBe(409);
      await expect(response.json()).resolves.toMatchObject({
        message: 'A user with this username already exists.',
        statusCode: 409,
      });
    });

    it('rejects an invalid UUID', async () => {
      const response = await fetch(`${baseUrl}/auth/users/not-a-uuid`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ username: 'lili-updated' }),
      });

      expect(response.status).toBe(400);
    });

    it('reports a valid but nonexistent UUID as not found', async () => {
      const response = await fetch(
        `${baseUrl}/auth/users/ccbb81f0-7bc0-4fa8-b7a3-3e4550982035`,
        {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ username: 'lili-updated' }),
        },
      );

      expect(response.status).toBe(404);
      await expect(response.json()).resolves.toMatchObject({
        message: 'User not found.',
        statusCode: 404,
      });
    });
  });

  describe('DELETE /auth/users/:uuid', () => {
    it('deletes the user and returns a successful delete response', async () => {
      const user = await prisma.user.create({
        data: { username: 'lili', passwordHash: 'existing-password-hash' },
      });

      const response = await fetch(`${baseUrl}/auth/users/${user.uuid}`, {
        method: 'DELETE',
      });

      expect(response.status).toBe(200);
      await expect(response.json()).resolves.toEqual({ deleted: true });
      await expect(
        prisma.user.findUnique({ where: { uuid: user.uuid } }),
      ).resolves.toBeNull();
    });

    it('rejects an invalid UUID', async () => {
      const response = await fetch(`${baseUrl}/auth/users/not-a-uuid`, {
        method: 'DELETE',
      });

      expect(response.status).toBe(400);
    });

    it('reports a valid but nonexistent UUID as not found', async () => {
      const response = await fetch(
        `${baseUrl}/auth/users/ccbb81f0-7bc0-4fa8-b7a3-3e4550982035`,
        {
          method: 'DELETE',
        },
      );

      expect(response.status).toBe(404);
      await expect(response.json()).resolves.toMatchObject({
        message: 'User not found.',
        statusCode: 404,
      });
    });
  });
});
