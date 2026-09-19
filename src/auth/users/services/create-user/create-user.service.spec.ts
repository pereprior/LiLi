import { Test, type TestingModule } from '@nestjs/testing';
import { Prisma } from '@prisma/client';
import { userEntityFactory } from '@test-factories/auth/users/user-entity.factory.js';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { UserEntity } from '@/auth/users/entities/user.entity.js';
import { UserException } from '@/auth/users/exceptions/user.exception.js';
import { UsernameAlreadyExistsException } from '@/auth/users/exceptions/username-already-exists.exception.js';
import { UserRepository } from '@/auth/users/repositories/user.repository.js';
import { CreateUserService } from '@/auth/users/services/create-user/create-user.service.js';
import type { CreateUserData } from '@/auth/users/types/data/create-user.data.js';
import { PasswordHasherUtils } from '@/auth/users/utils/password-hasher/password-hasher.utils.js';

describe('CreateUserService', () => {
  let module: TestingModule;
  let userRepository: {
    create: ReturnType<
      typeof vi.fn<(data: CreateUserData) => Promise<UserEntity>>
    >;
  };
  let service: CreateUserService;

  const dto = {
    username: 'lili',
    password: 'a-secure-password',
  };

  beforeEach(async () => {
    userRepository = {
      create: vi.fn<(data: CreateUserData) => Promise<UserEntity>>(),
    } satisfies UserRepository;
    vi.spyOn(PasswordHasherUtils, 'hash').mockResolvedValue('hashed-password');

    module = await Test.createTestingModule({
      providers: [
        CreateUserService,
        {
          provide: UserRepository,
          useValue: userRepository,
        },
      ],
    }).compile();

    service = module.get(CreateUserService);
  });

  afterEach(async () => {
    await module.close();
  });

  it('persists the password hasher output with the username', async () => {
    userRepository.create.mockResolvedValue(userEntityFactory.build());

    await service.execute(dto);

    expect(userRepository.create).toHaveBeenCalledWith({
      username: dto.username,
      passwordHash: 'hashed-password',
    });
  });

  it('returns the persisted user', async () => {
    const createdUser = userEntityFactory.build();
    userRepository.create.mockResolvedValue(createdUser);

    await expect(service.execute(dto)).resolves.toBe(createdUser);
  });

  it('translates unique-constraint errors into duplicate username errors', async () => {
    userRepository.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('Unique constraint failed.', {
        code: 'P2002',
        clientVersion: '7.10.0',
      }),
    );

    await expect(service.execute(dto)).rejects.toBeInstanceOf(
      UsernameAlreadyExistsException,
    );
  });

  it('wraps unexpected errors as user errors', async () => {
    userRepository.create.mockRejectedValue(new Error('Database error'));

    await expect(service.execute(dto)).rejects.toBeInstanceOf(UserException);
  });
});
