import { Injectable } from '@nestjs/common';

import { UpdateUserDto } from '@/auth/users/dto/update-user.dto.js';
import { UserEntity } from '@/auth/users/entities/user.entity.js';
import { UserException } from '@/auth/users/exceptions/user.exception.js';
import { UserNotFoundException } from '@/auth/users/exceptions/user-not-found.exception.js';
import { UsernameAlreadyExistsException } from '@/auth/users/exceptions/username-already-exists.exception.js';
import { UserRepository } from '@/auth/users/repositories/user.repository.js';
import type { UpdateUserData } from '@/auth/users/types/data/update-user.data.js';
import { PasswordHasherUtils } from '@/auth/users/utils/password-hasher/password-hasher.utils.js';
import { PrismaErrorUtils } from '@/database/utils/prisma-error.utils.js';
import { AppLogger } from '@/logging/app-logger.js';
import { LoggerContext } from '@/logging/logger-context.enum.js';

@Injectable()
export class UpdateUserService {
  private readonly logger = new AppLogger(LoggerContext.UPDATE_USER_SERVICE);

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
