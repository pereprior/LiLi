import { Test, type TestingModule } from '@nestjs/testing';
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
import { UserRepository } from '#src/auth/users/repositories/user.repository.js';
import { FindUserService } from '#src/auth/users/services/find-user/find-user.service.js';
import { AppLogger } from '#src/logging/app-logger.js';
import { userEntityFactory } from '#test-factories/auth/users/user-entity.factory.js';

describe('FindUserService', () => {
  let module: TestingModule;
  let userRepository: {
    findByUuid: ReturnType<
      typeof vi.fn<(uuid: string) => Promise<UserEntity | null>>
    >;
  };
  let service: FindUserService;

  const uuid = 'ccbb81f0-7bc0-4fa8-b7a3-3e4550982035';

  beforeAll(() => {
    vi.spyOn(AppLogger.prototype, 'log').mockImplementation(() => undefined);
    vi.spyOn(AppLogger.prototype, 'error').mockImplementation(() => undefined);
  });

  beforeEach(async () => {
    userRepository = {
      findByUuid: vi.fn<(uuid: string) => Promise<UserEntity | null>>(),
    } satisfies Pick<UserRepository, 'findByUuid'>;

    module = await Test.createTestingModule({
      providers: [
        FindUserService,
        {
          provide: UserRepository,
          useValue: userRepository,
        },
      ],
    }).compile();

    service = module.get(FindUserService);
  });

  afterEach(async () => {
    await module.close();
  });

  afterAll(() => {
    vi.restoreAllMocks();
  });

  it('returns the user found by UUID', async () => {
    const user = userEntityFactory.build();
    userRepository.findByUuid.mockResolvedValue(user);

    await expect(service.execute(uuid)).resolves.toBe(user);
    expect(userRepository.findByUuid).toHaveBeenCalledWith(uuid);
  });

  it('throws a not-found error when the user does not exist', async () => {
    userRepository.findByUuid.mockResolvedValue(null);

    await expect(service.execute(uuid)).rejects.toBeInstanceOf(
      UserNotFoundException,
    );
  });

  it('preserves user errors from the repository', async () => {
    userRepository.findByUuid.mockRejectedValue(new UserNotFoundException());

    await expect(service.execute(uuid)).rejects.toBeInstanceOf(
      UserNotFoundException,
    );
  });

  it('wraps unexpected repository errors as user errors', async () => {
    userRepository.findByUuid.mockRejectedValue(new Error('Database error'));

    await expect(service.execute(uuid)).rejects.toBeInstanceOf(UserException);
  });
});
