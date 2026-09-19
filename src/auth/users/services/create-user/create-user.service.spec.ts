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
import { UsernameAlreadyExistsException } from '#src/auth/users/exceptions/username-already-exists.exception.js';
import { UserRepository } from '#src/auth/users/repositories/user.repository.js';
import { CreateUserService } from '#src/auth/users/services/create-user/create-user.service.js';
import type { CreateUserData } from '#src/auth/users/types/data/create-user.data.js';
import { PasswordHasherUtils } from '#src/auth/users/utils/password-hasher/password-hasher.utils.js';
import { AppLogger } from '#src/logging/app-logger.js';
import { userEntityFactory } from '#test-factories/auth/users/user-entity.factory.js';

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

  beforeAll(() => {
    vi.spyOn(AppLogger.prototype, 'log').mockImplementation(() => undefined);
    vi.spyOn(AppLogger.prototype, 'error').mockImplementation(() => undefined);
  });

  beforeEach(async () => {
    userRepository = {
      create: vi.fn<(data: CreateUserData) => Promise<UserEntity>>(),
    } satisfies Pick<UserRepository, 'create'>;
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

  afterAll(() => {
    vi.restoreAllMocks();
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

  it('preserves user errors', async () => {
    userRepository.create.mockRejectedValue(
      new UsernameAlreadyExistsException(),
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
