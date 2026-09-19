import { Injectable } from '@nestjs/common';

import { CreateUserDto } from '@/auth/users/dto/create-user.dto.js';
import { UserEntity } from '@/auth/users/entities/user.entity.js';
import { UserException } from '@/auth/users/exceptions/user.exception.js';
import { UsernameAlreadyExistsException } from '@/auth/users/exceptions/username-already-exists.exception.js';
import { UserRepository } from '@/auth/users/repositories/user.repository.js';
import { PasswordHasherUtils } from '@/auth/users/utils/password-hasher/password-hasher.utils.js';
import { PrismaErrorUtils } from '@/database/utils/prisma-error.utils.js';
import { AppLogger } from '@/logging/app-logger.js';
import { LoggerContext } from '@/logging/logger-context.enum.js';

@Injectable()
export class CreateUserService {
  private readonly logger = new AppLogger(LoggerContext.CREATE_USER_SERVICE);

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
