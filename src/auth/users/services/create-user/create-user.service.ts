import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { CreateUserDto } from '@/auth/users/dto/create-user.dto.js';
import { UserEntity } from '@/auth/users/entities/user.entity.js';
import { UserException } from '@/auth/users/exceptions/user.exception.js';
import { UsernameAlreadyExistsException } from '@/auth/users/exceptions/username-already-exists.exception.js';
import { UserRepository } from '@/auth/users/repositories/user.repository.js';
import { PasswordHasher } from '@/auth/users/services/password-hasher/password-hasher.js';
import { AppLogger } from '@/logging/app-logger.js';
import { LoggerContext } from '@/logging/logger-context.enum.js';

const isUniqueConstraintError = (error: unknown): boolean =>
  error instanceof Prisma.PrismaClientKnownRequestError &&
  error.code === 'P2002';

@Injectable()
export class CreateUserService {
  private readonly logger = new AppLogger(LoggerContext.CREATE_USER_SERVICE);

  constructor(
    private readonly userRepository: UserRepository,
    private readonly passwordHasher: PasswordHasher,
  ) {}

  async execute(dto: CreateUserDto): Promise<UserEntity> {
    this.logger.log('Creating user.');

    try {
      const existingUser = await this.userRepository.findByUsername(
        dto.username,
      );

      if (existingUser !== null) {
        throw new UsernameAlreadyExistsException();
      }

      const now = new Date();
      const passwordHash = await this.passwordHasher.hash(dto.password);
      const user = new UserEntity(
        crypto.randomUUID(),
        dto.username,
        passwordHash,
        now,
        now,
      );
      const createdUser = await this.userRepository.create(user);

      this.logger.log('User created successfully.');

      return createdUser;
    } catch (error) {
      this.logger.error(
        'Failed to create user.',
        error instanceof Error ? error : undefined,
      );

      if (error instanceof UserException) {
        throw error;
      }

      if (isUniqueConstraintError(error)) {
        throw new UsernameAlreadyExistsException();
      }

      throw new UserException();
    }
  }
}
