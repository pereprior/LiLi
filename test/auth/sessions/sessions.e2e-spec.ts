import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { AppModule } from '#src/app.module.js';
import { SessionUserUnavailableException } from '#src/auth/sessions/exceptions/session-user-unavailable.exception.js';
import { CreateSessionService } from '#src/auth/sessions/services/create-session/create-session.service.js';
import { RevokeSessionService } from '#src/auth/sessions/services/revoke-session/revoke-session.service.js';
import { ValidateSessionService } from '#src/auth/sessions/services/validate-session/validate-session.service.js';
import { SessionSecretsUtils } from '#src/auth/sessions/utils/session-secrets/session-secrets.utils.js';
import { UserEntity } from '#src/auth/users/entities/user.entity.js';
import { PrismaService } from '#src/database/prisma.service.js';

describe('session persistence', () => {
  let module: TestingModule;
  let prisma: PrismaService;
  let createSession: CreateSessionService;
  let validateSession: ValidateSessionService;
  let revokeSession: RevokeSessionService;

  beforeAll(async () => {
    module = await Test.createTestingModule({ imports: [AppModule] }).compile();
    await module.init();
    prisma = module.get(PrismaService);
    createSession = module.get(CreateSessionService);
    validateSession = module.get(ValidateSessionService);
    revokeSession = module.get(RevokeSessionService);
  });

  afterAll(async () => {
    await prisma.user.deleteMany({
      where: {
        username: {
          in: [
            'auth03-session-test',
            'auth03-disabled-test',
            'auth03-current-user-test',
          ],
        },
      },
    });
    await module.close();
  });

  it('persists hashes, reads the current user, and revokes the session', async () => {
    const user = await prisma.user.create({
      data: { username: 'auth03-session-test' },
    });

    const created = await createSession.execute(user.uuid);
    const stored = await prisma.session.findUniqueOrThrow({
      where: { tokenHash: SessionSecretsUtils.hash(created.token) },
    });

    expect(stored.csrfTokenHash).toBe(
      SessionSecretsUtils.hash(created.csrfToken),
    );
    expect(stored.tokenHash).not.toBe(created.token);
    expect(stored.csrfTokenHash).not.toBe(created.csrfToken);

    const validated = await validateSession.execute(created.token);
    expect(validated?.user.uuid).toBe(user.uuid);
    expect(validated?.user).toBeInstanceOf(UserEntity);

    await revokeSession.execute(created.token);
    await expect(validateSession.execute(created.token)).resolves.toBeNull();
  });
  it('uses the current role and status when validating', async () => {
    const user = await prisma.user.create({
      data: { username: 'auth03-current-user-test' },
    });
    const created = await createSession.execute(user.uuid);

    await prisma.user.update({
      where: { uuid: user.uuid },
      data: { role: 'ADMIN' },
    });
    const promoted = await validateSession.execute(created.token);
    expect(promoted?.user.role).toBe('ADMIN');

    await prisma.user.update({
      where: { uuid: user.uuid },
      data: { status: 'DISABLED' },
    });
    await expect(validateSession.execute(created.token)).resolves.toBeNull();
  });

  it('does not create a session for a disabled user', async () => {
    const user = await prisma.user.create({
      data: { username: 'auth03-disabled-test', status: 'DISABLED' },
    });

    await expect(createSession.execute(user.uuid)).rejects.toBeInstanceOf(
      SessionUserUnavailableException,
    );
    await expect(
      prisma.session.count({ where: { userUuid: user.uuid } }),
    ).resolves.toBe(0);
  });
});
