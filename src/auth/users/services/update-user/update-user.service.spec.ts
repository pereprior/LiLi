import { Test, type TestingModule } from '@nestjs/testing';
import { Prisma } from '@prisma/client';
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';

import type { UserEntity } from '#src/auth/users/entities/user.entity.js';
import { UserException } from '#src/auth/users/exceptions/user.exception.js';
import { UserNotFoundException } from '#src/auth/users/exceptions/user-not-found.exception.js';
import { UsernameAlreadyExistsException } from '#src/auth/users/exceptions/username-already-exists.exception.js';
import { UserRepository } from '#src/auth/users/repositories/user.repository.js';
import { UpdateUserService } from '#src/auth/users/services/update-user/update-user.service.js';
import type { UpdateUserData } from '#src/auth/users/types/data/update-user.data.js';
import { PasswordHasherUtils } from '#src/auth/users/utils/password-hasher/password-hasher.utils.js';
import { AppLogger } from '#src/logging/app-logger.js';
import { userEntityFactory } from '#test-factories/auth/users/user-entity.factory.js';

describe('UpdateUserService', () => {
  let module: TestingModule;
  let userRepository: {
    update: ReturnType<
      typeof vi.fn<(uuid: string, data: UpdateUserData) => Promise<UserEntity>>
    >;
  };
  let passwordHasher: ReturnType<
    typeof vi.fn<(password: string) => Promise<string>>
  >;
  let service: UpdateUserService;

  const uuid = 'ccbb81f0-7bc0-4fa8-b7a3-3e4550982035';

  beforeAll(() => {
    vi.spyOn(AppLogger.prototype, 'log').mockImplementation(() => undefined);
    vi.spyOn(AppLogger.prototype, 'error').mockImplementation(() => undefined);
  });

  beforeEach(async () => {
    userRepository = {
      update:
        vi.fn<(uuid: string, data: UpdateUserData) => Promise<UserEntity>>(),
    } satisfies Pick<UserRepository, 'update'>;
    passwordHasher = vi
      .fn<(password: string) => Promise<string>>()
      .mockResolvedValue('hashed-password');
    vi.spyOn(PasswordHasherUtils, 'hash').mockImplementation(passwordHasher);

    module = await Test.createTestingModule({
      providers: [
        UpdateUserService,
        {
          provide: UserRepository,
          useValue: userRepository,
        },
      ],
    }).compile();

    service = module.get(UpdateUserService);
  });

  afterEach(async () => {
    await module.close();
  });

  afterAll(() => {
    vi.restoreAllMocks();
  });

  it('updates the username directly from the DTO', async () => {
    userRepository.update.mockResolvedValue(userEntityFactory.build());

    await service.execute(uuid, { username: 'lili-updated' });

    expect(userRepository.update).toHaveBeenCalledWith(uuid, {
      username: 'lili-updated',
    });
    expect(passwordHasher).not.toHaveBeenCalled();
  });

  it('hashes a password before updating it', async () => {
    userRepository.update.mockResolvedValue(userEntityFactory.build());

    await service.execute(uuid, { password: 'another-secure-password' });

    expect(passwordHasher).toHaveBeenCalledWith('another-secure-password');
    expect(userRepository.update).toHaveBeenCalledWith(uuid, {
      passwordHash: 'hashed-password',
    });
  });

  it('updates the username and hashed password together', async () => {
    userRepository.update.mockResolvedValue(userEntityFactory.build());

    await service.execute(uuid, {
      username: 'lili-updated',
      password: 'another-secure-password',
    });

    expect(userRepository.update).toHaveBeenCalledWith(uuid, {
      username: 'lili-updated',
      passwordHash: 'hashed-password',
    });
  });

  it('returns the updated user', async () => {
    const updatedUser = userEntityFactory.build();
    userRepository.update.mockResolvedValue(updatedUser);

    await expect(
      service.execute(uuid, { username: 'lili-updated' }),
    ).resolves.toBe(updatedUser);
  });

  it('translates unique-constraint errors into duplicate username errors', async () => {
    userRepository.update.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('Unique constraint failed.', {
        code: 'P2002',
        clientVersion: '7.10.0',
      }),
    );

    await expect(
      service.execute(uuid, { username: 'lili-updated' }),
    ).rejects.toBeInstanceOf(UsernameAlreadyExistsException);
  });

  it('translates record-not-found errors into user-not-found errors', async () => {
    userRepository.update.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('Record not found.', {
        code: 'P2025',
        clientVersion: '7.10.0',
      }),
    );

    await expect(
      service.execute(uuid, { username: 'lili-updated' }),
    ).rejects.toBeInstanceOf(UserNotFoundException);
  });

  it('preserves user errors', async () => {
    userRepository.update.mockRejectedValue(new UserNotFoundException());

    await expect(
      service.execute(uuid, { username: 'lili-updated' }),
    ).rejects.toBeInstanceOf(UserNotFoundException);
  });

  it('wraps unexpected errors as user errors', async () => {
    userRepository.update.mockRejectedValue(new Error('Database error'));

    await expect(
      service.execute(uuid, { username: 'lili-updated' }),
    ).rejects.toBeInstanceOf(UserException);
  });
});
