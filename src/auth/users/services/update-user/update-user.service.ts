import { Injectable } from '@nestjs/common';

import { UpdateUserDto } from '#src/auth/users/dto/update-user.dto.js';
import { UserEntity } from '#src/auth/users/entities/user.entity.js';
import { UserException } from '#src/auth/users/exceptions/user.exception.js';
import { UserNotFoundException } from '#src/auth/users/exceptions/user-not-found.exception.js';
import { UsernameAlreadyExistsException } from '#src/auth/users/exceptions/username-already-exists.exception.js';
import { UserRepository } from '#src/auth/users/repositories/user.repository.js';
import type { UpdateUserData } from '#src/auth/users/types/data/update-user.data.js';
import { UserLoggerContext } from '#src/auth/users/types/enum/user-logger-context.enum.js';
import { PasswordHasherUtils } from '#src/auth/users/utils/password-hasher/password-hasher.utils.js';
import { PrismaErrorUtils } from '#src/database/utils/prisma-error.utils.js';
import { AppLogger } from '#src/logging/app-logger.js';

@Injectable()
export class UpdateUserService {
  private readonly logger = new AppLogger(
    UserLoggerContext.UPDATE_USER_SERVICE,
  );

  constructor(private readonly userRepository: UserRepository) {}

  async execute(uuid: string, dto: UpdateUserDto): Promise<UserEntity> {
    this.logger.log('Updating user.');

    try {
      const { password, ...data } = dto;
      const updateData: UpdateUserData = data;

      if (password !== undefined) {
        updateData.passwordHash = await PasswordHasherUtils.hash(password);
      }

      const user = await this.userRepository.update(uuid, updateData);

      this.logger.log('User updated successfully.');

      return user;
    } catch (error) {
      this.logger.error(
        'Failed to update user.',
        error instanceof Error ? error : undefined,
      );

      if (error instanceof UserException) {
        throw error;
      }

      if (PrismaErrorUtils.isUniqueConstraintError(error)) {
        throw new UsernameAlreadyExistsException();
      }

      if (PrismaErrorUtils.isRecordNotFoundError(error)) {
        throw new UserNotFoundException();
      }

      throw new UserException();
    }
  }
}
