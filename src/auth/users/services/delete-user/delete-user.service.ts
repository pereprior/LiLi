import { Injectable } from '@nestjs/common';

import { UserException } from '@/auth/users/exceptions/user.exception.js';
import { UserNotFoundException } from '@/auth/users/exceptions/user-not-found.exception.js';
import { UserRepository } from '@/auth/users/repositories/user.repository.js';
import { DeleteResponse } from '@/auth/users/responses/delete.response.js';
import { PrismaErrorUtils } from '@/database/utils/prisma-error.utils.js';
import { AppLogger } from '@/logging/app-logger.js';
import { LoggerContext } from '@/logging/logger-context.enum.js';

@Injectable()
export class DeleteUserService {
  private readonly logger = new AppLogger(LoggerContext.DELETE_USER_SERVICE);

  constructor(private readonly userRepository: UserRepository) {}

  async execute(uuid: string): Promise<DeleteResponse> {
    this.logger.log('Deleting user.');

    try {
      await this.userRepository.delete(uuid);

      this.logger.log('User deleted successfully.');

      return new DeleteResponse(true);
    } catch (error) {
      this.logger.error(
        'Failed to delete user.',
        error instanceof Error ? error : undefined,
      );

      if (error instanceof UserException) {
        throw error;
      }

      if (PrismaErrorUtils.isRecordNotFoundError(error)) {
        throw new UserNotFoundException();
      }

      throw new UserException();
    }
  }
}
