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

import { UserException } from '#src/auth/users/exceptions/user.exception.js';
import { UserNotFoundException } from '#src/auth/users/exceptions/user-not-found.exception.js';
import { UserRepository } from '#src/auth/users/repositories/user.repository.js';
import { DeleteUserService } from '#src/auth/users/services/delete-user/delete-user.service.js';
import { AppLogger } from '#src/logging/app-logger.js';

describe('DeleteUserService', () => {
  let module: TestingModule;
  let userRepository: {
    delete: ReturnType<typeof vi.fn<(uuid: string) => Promise<void>>>;
  };
  let service: DeleteUserService;

  const uuid = 'ccbb81f0-7bc0-4fa8-b7a3-3e4550982035';

  beforeAll(() => {
    vi.spyOn(AppLogger.prototype, 'log').mockImplementation(() => undefined);
    vi.spyOn(AppLogger.prototype, 'error').mockImplementation(() => undefined);
  });

  beforeEach(async () => {
    userRepository = {
      delete: vi.fn<(uuid: string) => Promise<void>>(),
    } satisfies Pick<UserRepository, 'delete'>;

    module = await Test.createTestingModule({
      providers: [
        DeleteUserService,
        {
          provide: UserRepository,
          useValue: userRepository,
        },
      ],
    }).compile();

    service = module.get(DeleteUserService);
  });

  afterEach(async () => {
    await module.close();
  });

  afterAll(() => {
    vi.restoreAllMocks();
  });

  it('deletes the user and returns a successful delete response', async () => {
    userRepository.delete.mockResolvedValue(undefined);

    await expect(service.execute(uuid)).resolves.toEqual({ deleted: true });
    expect(userRepository.delete).toHaveBeenCalledWith(uuid);
  });

  it('translates record-not-found errors into user-not-found errors', async () => {
    userRepository.delete.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('Record not found.', {
        code: 'P2025',
        clientVersion: '7.10.0',
      }),
    );

    await expect(service.execute(uuid)).rejects.toBeInstanceOf(
      UserNotFoundException,
    );
  });

  it('preserves user errors', async () => {
    userRepository.delete.mockRejectedValue(new UserNotFoundException());

    await expect(service.execute(uuid)).rejects.toBeInstanceOf(
      UserNotFoundException,
    );
  });

  it('wraps unexpected errors as user errors', async () => {
    userRepository.delete.mockRejectedValue(new Error('Database error'));

    await expect(service.execute(uuid)).rejects.toBeInstanceOf(UserException);
  });
});
