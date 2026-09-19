import { Injectable } from '@nestjs/common';

import { CreateUserDto } from '#src/auth/users/dto/create-user.dto.js';
import { UserEntity } from '#src/auth/users/entities/user.entity.js';
import { UserException } from '#src/auth/users/exceptions/user.exception.js';
import { UsernameAlreadyExistsException } from '#src/auth/users/exceptions/username-already-exists.exception.js';
import { UserRepository } from '#src/auth/users/repositories/user.repository.js';
import { UserLoggerContext } from '#src/auth/users/types/enum/user-logger-context.enum.js';
import { PasswordHasherUtils } from '#src/auth/users/utils/password-hasher/password-hasher.utils.js';
import { PrismaErrorUtils } from '#src/database/utils/prisma-error.utils.js';
import { AppLogger } from '#src/logging/app-logger.js';

@Injectable()
export class CreateUserService {
  private readonly logger = new AppLogger(
    UserLoggerContext.CREATE_USER_SERVICE,
  );

  constructor(private readonly userRepository: UserRepository) {}

  async execute(dto: CreateUserDto): Promise<UserEntity> {
    this.logger.log('Creating user.');

    try {
      const passwordHash = await PasswordHasherUtils.hash(dto.password);
      const createdUser = await this.userRepository.create({
        username: dto.username,
        passwordHash,
      });

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

      if (PrismaErrorUtils.isUniqueConstraintError(error)) {
        throw new UsernameAlreadyExistsException();
      }

      throw new UserException();
    }
  }
}
