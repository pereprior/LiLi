import { beforeEach, describe, expect, it, vi } from 'vitest';

import { UserEntity } from '@/auth/users/entities/user.entity.js';
import { UsernameAlreadyExistsException } from '@/auth/users/exceptions/username-already-exists.exception.js';
import type { UserRepository } from '@/auth/users/repositories/user.repository.js';
import { CreateUserService } from '@/auth/users/services/create-user/create-user.service.js';
import type { PasswordHasher } from '@/auth/users/services/password-hasher/password-hasher.js';

describe('CreateUserService', () => {
  const userRepository = {
    create: vi.fn<(user: UserEntity) => Promise<UserEntity>>(),
    findByUsername: vi.fn<(username: string) => Promise<UserEntity | null>>(),
  } satisfies UserRepository;
  const passwordHasher = {
    hash: vi.fn<(password: string) => Promise<string>>(),
  } satisfies PasswordHasher;
  let service: CreateUserService;

  beforeEach(() => {
    vi.resetAllMocks();
    service = new CreateUserService(userRepository, passwordHasher);
  });

  it('hashes the password and persists a new user', async () => {
    const now = new Date('2026-09-12T00:00:00.000Z');
    const createdUser = new UserEntity(
      'user-id',
      'lili',
      'hashed-password',
      now,
      now,
    );

    userRepository.findByUsername.mockResolvedValue(null);
    passwordHasher.hash.mockResolvedValue('hashed-password');
    userRepository.create.mockResolvedValue(createdUser);

    const result = await service.execute({
      username: 'lili',
      password: 'a-secure-password',
    });

    expect(passwordHasher.hash).toHaveBeenCalledWith('a-secure-password');
    expect(userRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        username: 'lili',
        passwordHash: 'hashed-password',
      }),
    );
    expect(result).toBe(createdUser);
  });

  it('rejects a duplicate username', async () => {
    const existingUser = new UserEntity(
      'user-id',
      'lili',
      'hashed-password',
      new Date(),
      new Date(),
    );

    userRepository.findByUsername.mockResolvedValue(existingUser);

    await expect(
      service.execute({
        username: 'lili',
        password: 'a-secure-password',
      }),
    ).rejects.toBeInstanceOf(UsernameAlreadyExistsException);
    expect(passwordHasher.hash).not.toHaveBeenCalled();
    expect(userRepository.create).not.toHaveBeenCalled();
  });
});
