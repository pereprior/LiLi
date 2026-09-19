import { Test, type TestingModule } from '@nestjs/testing';
import { userEntityFactory } from '@test-factories/auth/users/user-entity.factory.js';
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

import type { UserEntity } from '@/auth/users/entities/user.entity.js';
import { UserException } from '@/auth/users/exceptions/user.exception.js';
import { UserRepository } from '@/auth/users/repositories/user.repository.js';
import { ListUsersService } from '@/auth/users/services/list-users/list-users.service.js';
import { AppLogger } from '@/logging/app-logger.js';

describe('ListUsersService', () => {
  let module: TestingModule;
  let userRepository: {
    findAll: ReturnType<typeof vi.fn<() => Promise<UserEntity[]>>>;
  };
  let service: ListUsersService;

  beforeAll(() => {
    vi.spyOn(AppLogger.prototype, 'log').mockImplementation(() => undefined);
    vi.spyOn(AppLogger.prototype, 'error').mockImplementation(() => undefined);
  });

  beforeEach(async () => {
    userRepository = {
      findAll: vi.fn<() => Promise<UserEntity[]>>(),
    } satisfies Pick<UserRepository, 'findAll'>;

    module = await Test.createTestingModule({
      providers: [
        ListUsersService,
        {
          provide: UserRepository,
          useValue: userRepository,
        },
      ],
    }).compile();

    service = module.get(ListUsersService);
  });

  afterEach(async () => {
    await module.close();
  });

  afterAll(() => {
    vi.restoreAllMocks();
  });

  it('returns all users from the repository', async () => {
    const users = userEntityFactory.buildList(2);
    userRepository.findAll.mockResolvedValue(users);

    await expect(service.execute()).resolves.toBe(users);
    expect(userRepository.findAll).toHaveBeenCalledOnce();
  });

  it('wraps repository errors as user errors', async () => {
    userRepository.findAll.mockRejectedValue(new Error('Database error'));

    await expect(service.execute()).rejects.toBeInstanceOf(UserException);
  });
});
